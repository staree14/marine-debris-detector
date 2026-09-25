import { Container, Eyebrow, ImageSlot, Reveal } from './primitives.jsx'

const FEATURES = [
  {
    title: 'One model, the full taxonomy',
    body: 'A single YOLO model trained across crab pots, wrecks, mines and derived classes, instead of stitching together per-class heuristics. NMS still resolves overlapping boxes on the same tile.',
    spec: 'YOLO · single pass · NMS IoU 0.5',
  },
  {
    title: 'Real georeferencing',
    body: 'Pixel offset → ground range → heading → UTM via pyproj, from the vessel nav fix. Every detection gets a lat/lon.',
    spec: 'dead reckoning · WGS84 / UTM',
  },
  {
    title: 'Explainable preprocessing',
    body: 'Live per-column gain normalisation and CLAHE shown stage by stage on the uploaded image, plus the acoustic shadow corridor the detection rests on.',
    spec: 'column norm · CLAHE · shadow',
  },
  {
    title: 'Confidence triage',
    body: 'Auto-confirmed, needs-review or rejected, so the operator sees the ambiguous cases first.',
    spec: '3 review states',
  },
  {
    title: 'Human-in-the-loop',
    body: 'Operator corrections export as YOLO labels. Rejections are logged as hard negatives for the next training round.',
    spec: 'YOLO labels · hard negatives',
  },
  {
    title: 'Survey-grade export',
    body: 'CSV, JSON and KML for GIS, and a multi-section PDF built like a hydrographic deliverable.',
    spec: 'CSV · JSON · KML · PDF',
  },
]

export default function Features() {
  return (
    <section id="capabilities" className="border-b border-line py-24 lg:py-32">
      <Container className="grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <Reveal>
              <Eyebrow index="03">Capabilities</Eyebrow>
              <h2 className="mt-6 font-sans text-3xl font-medium leading-tight tracking-tight text-fg sm:text-4xl">
                Built for the review, not the demo.
              </h2>
              <p className="mt-5 max-w-[40ch] leading-relaxed text-fg-dim">
                Each part exists because a surveyor has to trust, locate or hand off a contact.
              </p>
            </Reveal>

            {/* SCREENSHOT: Map page — georeferenced detections on the basemap.
                Pass src="/landing/map.png" once captured. */}
            <Reveal delay={120} className="mt-10 hidden lg:block">
              <ImageSlot
                src="/landing/map.jpg"
                alt="Map — georeferenced detections"
                aspect="1692 / 772"
                caption="fig. 3 — detections plotted from the nav fix"
              />
            </Reveal>
          </div>
        </div>

        <ol className="lg:col-span-8">
          {FEATURES.map((f, i) => (
            <Reveal
              as="li"
              key={f.title}
              delay={i * 60}
              className="grid gap-x-8 gap-y-3 border-t border-line py-8 first:border-t-0 first:pt-0 sm:grid-cols-[3rem_1fr] lg:first:pt-0"
            >
              <span className="font-mono text-[11px] text-fg-faint sm:pt-1">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="font-sans text-lg font-medium text-fg">{f.title}</h3>
                <p className="mt-2 max-w-[62ch] leading-relaxed text-fg-dim">{f.body}</p>
                <p className="mt-4 font-mono text-[11px] text-fg-faint">{f.spec}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </Container>
    </section>
  )
}
