import { Container, Eyebrow, ImageSlot, Reveal } from './primitives.jsx'

const STEPS = [
  {
    label: 'Sonar ingest',
    detail: 'Raw waterfall exports or image tiles, with the vessel nav fix per line.',
    spec: ['XTF', 'JSF', 'SEG-Y', 'PNG / JPG'],
  },
  {
    label: 'Sonar-aware preprocessing',
    detail: 'Per-column gain normalisation removes along-track striping; CLAHE lifts local contrast without flattening shadows.',
    spec: ['column norm', 'CLAHE 2.5'],
  },
  {
    label: 'YOLO detection',
    detail: 'One model, trained across the full debris taxonomy, runs on every tile. NMS resolves overlapping boxes.',
    spec: ['crab pot', 'wreck', 'mine', 'IoU 0.5'],
  },
  {
    label: 'Georeferencing',
    detail: 'Pixel offset → ground range → vessel heading → easting / northing, projected to UTM.',
    spec: ['dead reckoning', 'pyproj'],
  },
  {
    label: 'Review & export',
    detail: 'Operator confirms, rejects or draws missed contacts, then exports the survey record.',
    spec: ['CSV', 'JSON', 'PDF', 'KML'],
  },
]

export default function Pipeline() {
  return (
    <section id="how-it-works" className="scroll-mt-14 border-b border-line py-24 lg:py-32">
      <Container>
        <div className="grid gap-6 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <Eyebrow index="02">How it works</Eyebrow>
            <h2 className="mt-6 font-sans text-3xl font-medium leading-tight tracking-tight text-fg sm:text-4xl">
              One tile, five stages.
            </h2>
          </Reveal>
          <Reveal delay={100} className="lg:col-span-6 lg:col-start-7 lg:pt-12">
            <p className="max-w-[56ch] leading-relaxed text-fg-dim">
              Every uploaded line runs the same pass. Nothing is skipped for speed and every stage leaves an
              inspectable output, so an operator can see why a contact was flagged.
            </p>
          </Reveal>
        </div>

        <ol className="mt-16 grid md:grid-cols-5">
          {STEPS.map((step, i) => (
            <Reveal
              as="li"
              key={step.label}
              delay={i * 90}
              className="relative border-l border-line pb-10 pl-6 md:border-l-0 md:border-t md:pb-0 md:pl-0 md:pr-6 md:pt-8"
            >
              <span
                className="absolute -left-[5px] top-0 size-[9px] border border-fg-faint bg-abyss md:left-0 md:top-[-5px]"
                aria-hidden="true"
              />
              <p className="font-mono text-[11px] text-fg-faint">{String(i + 1).padStart(2, '0')}</p>
              <h3 className="mt-2 font-mono text-[12px] font-medium uppercase tracking-[0.1em] text-fg">{step.label}</h3>
              <p className="mt-3 text-sm leading-relaxed text-fg-dim">{step.detail}</p>
              <ul className="mt-4 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-fg-faint">
                {step.spec.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </Reveal>
          ))}
        </ol>

        <Reveal className="mt-20">
          <ImageSlot
            src="/landing/pipeline.jpg"
            alt="Detection pipeline stages"
            aspect="2140 / 722"
            caption="fig. 2 — each preprocessing stage rendered live on the uploaded tile"
          />
        </Reveal>
      </Container>
    </section>
  )
}
