"""
Postgres persistence (Neon) for operator annotations, rejected calls, the
source images they were drawn on, and lightweight usage events.

Replaces the old backend/annotations/ filesystem store — that directory
didn't survive a redeploy on ephemeral-disk hosts (Render/Railway free
tiers), so nothing accumulated across sessions. Every function here is a
short-lived connection per call rather than a pooled client, because
DATABASE_URL_POOLED already points at Neon's own PgBouncer pooler — there's
no need to also pool on the app side for this scale.

Includes local filesystem fallback when DATABASE_URL is not configured.
"""

import json
import os
import time
from pathlib import Path
from typing import Iterator, Optional

try:
    import psycopg2
    from psycopg2.extras import Json, RealDictCursor
except ImportError:
    psycopg2 = None
    Json = None
    RealDictCursor = None

from dotenv import load_dotenv

# main.py runs from backend/, so the root .env is one directory up.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Pooled URL is the right one for a web app (short-lived connections per
# request); fall back to the direct URL if only that's set.
DATABASE_URL = os.environ.get("DATABASE_URL_POOLED") or os.environ.get("DATABASE_URL")

LOCAL_ANNOTATIONS_DIR = Path(__file__).resolve().parent / "annotations"
LOCAL_IMAGES_DIR = LOCAL_ANNOTATIONS_DIR / "images"
LOCAL_LABELS_DIR = LOCAL_ANNOTATIONS_DIR / "labels"
LOCAL_REJECTED_LOG = LOCAL_ANNOTATIONS_DIR / "rejected.jsonl"


def get_conn():
    if not DATABASE_URL or not psycopg2:
        return None
    return psycopg2.connect(DATABASE_URL)


def init_db():
    for d in (LOCAL_IMAGES_DIR, LOCAL_LABELS_DIR):
        d.mkdir(parents=True, exist_ok=True)

    if not DATABASE_URL or not psycopg2:
        print("[db] DATABASE_URL not configured — using local filesystem storage in backend/annotations/")
        return

    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute("""
            CREATE TABLE IF NOT EXISTS annotations (
                id SERIAL PRIMARY KEY,
                image_id TEXT NOT NULL,
                class_id INT NOT NULL,
                class_name TEXT NOT NULL,
                bbox_cx FLOAT NOT NULL,
                bbox_cy FLOAT NOT NULL,
                bbox_w FLOAT NOT NULL,
                bbox_h FLOAT NOT NULL,
                source TEXT NOT NULL,
                original_detection_id TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS rejected_annotations (
                id SERIAL PRIMARY KEY,
                image_id TEXT NOT NULL,
                class_id INT NOT NULL,
                class_name TEXT NOT NULL,
                bbox_cx FLOAT NOT NULL,
                bbox_cy FLOAT NOT NULL,
                bbox_w FLOAT NOT NULL,
                bbox_h FLOAT NOT NULL,
                source TEXT NOT NULL,
                original_detection_id TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS annotation_images (
                image_id TEXT PRIMARY KEY,
                ext TEXT NOT NULL,
                data BYTEA NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS events (
                id SERIAL PRIMARY KEY,
                event_type TEXT NOT NULL,
                metadata JSONB,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_annotations_image_id ON annotations (image_id);
            """)
    except Exception as exc:
        print(f"[db] Warning: Could not connect to Postgres ({exc}). Falling back to local filesystem storage.")


def _save_row(conn, table: str, a) -> None:
    cx, cy, w, h = a.bbox_normalized
    with conn.cursor() as cur:
        cur.execute(
            f"""
            INSERT INTO {table}
                (image_id, class_id, class_name, bbox_cx, bbox_cy, bbox_w, bbox_h, source, original_detection_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (a.image_id, a.class_id, a.class_name, cx, cy, w, h, a.source, a.original_detection_id),
        )


def save_annotation(conn, a) -> None:
    _save_row(conn, "annotations", a)


def save_rejected(conn, a) -> None:
    _save_row(conn, "rejected_annotations", a)


def save_annotation_image(conn, image_id: str, ext: str, data: bytes) -> None:
    # Mirrors the old `if not dest.exists(): write` — first save wins,
    # never overwritten by a later one for the same image_id.
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO annotation_images (image_id, ext, data)
            VALUES (%s, %s, %s)
            ON CONFLICT (image_id) DO NOTHING
            """,
            (image_id, ext, psycopg2.Binary(data)),
        )


def log_event(event_type: str, metadata: Optional[dict] = None, conn=None) -> None:
    if not DATABASE_URL or not psycopg2:
        return
    try:
        if conn is not None:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO events (event_type, metadata) VALUES (%s, %s)",
                    (event_type, Json(metadata or {})),
                )
            return
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "INSERT INTO events (event_type, metadata) VALUES (%s, %s)",
                (event_type, Json(metadata or {})),
            )
    except Exception as exc:
        print(f"[db] log_event error ({exc})")


def save_annotation_batch(by_image: dict, image_cache: dict) -> tuple:
    saved = 0
    rejected = 0

    conn = None
    try:
        conn = get_conn()
    except Exception:
        conn = None

    if conn is not None:
        try:
            with conn:
                for image_id, items in by_image.items():
                    for a in items:
                        if a.rejected:
                            save_rejected(conn, a)
                            rejected += 1
                        else:
                            save_annotation(conn, a)
                            saved += 1

                    cached = image_cache.get(image_id)
                    if cached:
                        raw, ext = cached
                        save_annotation_image(conn, image_id, ext, raw)

                log_event("review_save", {"saved": saved, "rejected": rejected, "images": len(by_image)}, conn=conn)
            return saved, rejected
        except Exception as exc:
            print(f"[db] DB save failed ({exc}); falling back to filesystem storage.")

    # Filesystem fallback
    for image_id, items in by_image.items():
        lines = []
        for a in items:
            if a.rejected:
                with LOCAL_REJECTED_LOG.open("a") as fh:
                    fh.write(json.dumps({**a.model_dump(), "logged_at": time.time()}) + "\n")
                rejected += 1
                continue
            cx, cy, w, h = a.bbox_normalized
            lines.append(f"{a.class_id} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}")
            saved += 1

        if lines:
            label_path = LOCAL_LABELS_DIR / f"{image_id}.txt"
            with label_path.open("a") as fh:
                fh.write("\n".join(lines) + "\n")

        cached = image_cache.get(image_id)
        if cached:
            raw, ext = cached
            dest = LOCAL_IMAGES_DIR / f"{image_id}{ext}"
            if not dest.exists():
                dest.write_bytes(raw)

    return saved, rejected


def annotated_image_count() -> int:
    try:
        conn = get_conn()
        if conn:
            with conn, conn.cursor() as cur:
                cur.execute("SELECT COUNT(DISTINCT image_id) FROM annotations")
                return cur.fetchone()[0]
    except Exception:
        pass
    return len(list(LOCAL_LABELS_DIR.glob("*.txt")))


def iter_export_labels() -> Iterator[tuple]:
    try:
        conn = get_conn()
        if conn and RealDictCursor:
            with conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT image_id, class_id, bbox_cx, bbox_cy, bbox_w, bbox_h FROM annotations ORDER BY image_id, id"
                )
                rows = cur.fetchall()
            by_image: dict = {}
            for r in rows:
                line = f"{r['class_id']} {r['bbox_cx']:.6f} {r['bbox_cy']:.6f} {r['bbox_w']:.6f} {r['bbox_h']:.6f}"
                by_image.setdefault(r["image_id"], []).append(line)
            for image_id, lines in by_image.items():
                yield image_id, "\n".join(lines) + "\n"
            return
    except Exception:
        pass

    for label_path in sorted(LOCAL_LABELS_DIR.glob("*.txt")):
        image_id = label_path.stem
        yield image_id, label_path.read_text(encoding="utf-8")


def iter_export_images() -> Iterator[tuple]:
    try:
        conn = get_conn()
        if conn and RealDictCursor:
            with conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT image_id, ext, data FROM annotation_images ORDER BY image_id")
                for r in cur.fetchall():
                    yield r["image_id"], r["ext"], bytes(r["data"])
            return
    except Exception:
        pass

    for image_path in sorted(LOCAL_IMAGES_DIR.iterdir()):
        if image_path.is_file():
            yield image_path.stem, image_path.suffix, image_path.read_bytes()
