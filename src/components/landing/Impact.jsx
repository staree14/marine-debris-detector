import { Container, Eyebrow, Reveal } from './primitives.jsx'

const LINES = [
  {
    label: 'Faster surveys',
    body: 'Operators start from the ambiguous detections instead of scrubbing hours of empty seafloor.',
  },
  {
    label: 'Ghost-net recovery',
    body: 'Contacts carry coordinates and confidence, so recovery crews can be sent to the likeliest sites first.',
  },
  {
    label: 'Safer navigation',
    body: 'Wrecks and mine-like contacts are flagged and positioned before a vessel crosses the line.',
  },
]

export default function Impact() {
  return (
    <section id="impact" className="border-b border-line py-24 lg:py-32">
      <Container className="grid gap-14 lg:grid-cols-12">
        <Reveal className="lg:col-span-4">
          <Eyebrow index="06">Impact</Eyebrow>
        </Reveal>
        <div className="lg:col-span-8">
          <dl>
            {LINES.map((l, i) => (
              <Reveal
                key={l.label}
                delay={i * 80}
                className="grid gap-2 border-t border-line py-6 first:border-t-0 first:pt-0 sm:grid-cols-[12rem_1fr] sm:gap-8"
              >
                <dt className="font-mono text-[12px] uppercase tracking-[0.1em] text-fg-faint sm:pt-1">{l.label}</dt>
                <dd className="leading-relaxed text-fg-dim">{l.body}</dd>
              </Reveal>
            ))}
          </dl>
          <Reveal as="blockquote" className="mt-16 border-l-2 border-signal pl-6">
            <p className="max-w-[30ch] font-sans text-2xl font-medium leading-snug tracking-tight text-fg sm:text-3xl">
              We don’t replace the sonar expert — we help the expert find what matters first.
            </p>
          </Reveal>
        </div>
      </Container>
    </section>
  )
}
