import { Container, Eyebrow, Reveal } from './primitives.jsx'

export default function EdgeCase() {
  return (
    <section id="edge" className="border-b border-line bg-deep py-24 lg:py-28">
      <Container className="grid gap-8 lg:grid-cols-12">
        <Reveal className="lg:col-span-4">
          <Eyebrow index="05">Why edge</Eyebrow>
        </Reveal>
        <Reveal delay={100} className="lg:col-span-8">
          <p className="max-w-[34ch] font-sans text-2xl font-medium leading-snug tracking-tight text-fg sm:text-3xl">
            Radio doesn’t propagate through seawater, so an AUV can’t stream imagery to a cloud model mid-mission.
          </p>
          <p className="mt-6 max-w-[34ch] font-sans text-2xl font-medium leading-snug tracking-tight text-fg-dim sm:text-3xl">
            Detection has to happen onboard, on the vehicle’s own compute.
          </p>
        </Reveal>
      </Container>
    </section>
  )
}
