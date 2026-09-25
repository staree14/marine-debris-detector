import { Link } from 'react-router-dom'
import { Container, ImageSlot, Reveal } from './primitives.jsx'
import SonarWaterfall from './SonarWaterfall.jsx'
import { usePrefersReducedMotion } from './useScrollReveal.js'

export default function Hero() {
  const reduce = usePrefersReducedMotion()

  const scrollToApproach = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <section className="relative isolate overflow-hidden border-b border-line">
      <div className="absolute inset-0 -z-10 opacity-70">
        <SonarWaterfall />
      </div>
      <div className="absolute inset-0 -z-10 bg-linear-to-r from-abyss via-abyss/85 to-abyss/15" aria-hidden="true" />

      <Container className="grid min-h-[calc(100svh-3.5rem)] items-center gap-12 py-20 lg:grid-cols-12 lg:py-24">
        <Reveal className="lg:col-span-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-faint">Side-scan sonar · debris &amp; hazard detection</p>
          <h1 className="mt-6 max-w-[16ch] font-sans text-4xl font-medium leading-[1.08] tracking-tight text-fg sm:text-5xl lg:text-6xl">
            Finding what matters on the seafloor.
          </h1>
          <p className="mt-6 max-w-[52ch] text-base leading-relaxed text-fg-dim sm:text-lg">
            Automated detection of marine debris and hazards in side-scan sonar imagery. Edge-deployable, georeferenced,
            operator-verified.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              to="/dashboard"
              className="rounded-sm bg-signal px-5 py-2.5 text-sm font-medium text-white no-underline transition-colors hover:bg-signal-hover"
            >
              View the system
            </Link>
            <button
              type="button"
              onClick={scrollToApproach}
              className="rounded-sm border border-line-strong px-5 py-2.5 text-sm font-medium text-fg transition-colors hover:border-fg-faint"
            >
              Read the approach
            </button>
          </div>
        </Reveal>

        <Reveal delay={150} className="lg:col-span-6">
          <ImageSlot
            src="/landing/hero-review.jpg"
            alt="Review — detections on waterfall"
            caption="fig. 1 — operator review of model detections"
            aspect="2244 / 890"
          />
        </Reveal>
      </Container>

      <div className="border-t border-line">
        <Container className="flex flex-wrap gap-x-6 gap-y-1 py-3 font-mono text-[11px] text-fg-faint">
          <span>SSS · 100 m swath</span>
          <span>ground-range corrected</span>
          <span>WGS84 → UTM</span>
          <span>unified detector · NMS-merged</span>
        </Container>
      </div>
    </section>
  )
}
