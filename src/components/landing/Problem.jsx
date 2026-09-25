import { useCallback, useEffect, useRef, useState } from 'react'
import { Container, Eyebrow, Reveal } from './primitives.jsx'
import { usePrefersReducedMotion } from './useScrollReveal.js'

const SONAR_IMG = '/landing/sonar-net-detection.png'

const STEPS = [
  {
    body: (
      <>
        <span className="font-mono">640,000+</span> tonnes of fishing gear are abandoned in the ocean every year.
      </>
    ),
    source: 'FAO / UNEP',
  },
  { body: 'Ghost nets keep killing for decades after they’re lost.' },
  {
    body: 'Side-scan sonar can see them — but a human has to look at every frame.',
    image: { src: SONAR_IMG, alt: 'Side-scan sonar return of a submerged net', caption: 'A ghost net’s acoustic shadow, either side of nadir.' },
  },
  {
    body: 'A single survey line produces hours of imagery. Most of it is seafloor.',
    image: { src: SONAR_IMG, alt: 'Side-scan sonar return of a submerged net', caption: 'One contact, hours of empty seabed around it.' },
  },
  {
    body: (
      <>
        <span className="text-fg-dim">The bottleneck isn’t the sonar.</span> It’s the review.
      </>
    ),
    closer: true,
  },
]

function Statement({ step, index }) {
  return (
    <div className="grid w-full flex-none grid-cols-1 items-center gap-10 px-1 sm:grid-cols-12">
      <div className={step.image ? 'sm:col-span-7' : 'sm:col-span-10'}>
        <p className="font-mono text-[11px] text-fg-faint">
          {String(index + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
        </p>
        <p
          className={`mt-5 max-w-[22ch] font-sans font-medium leading-[1.12] tracking-tight text-fg ${
            step.closer ? 'text-4xl sm:text-5xl lg:text-6xl' : 'text-3xl sm:text-4xl lg:text-5xl'
          }`}
        >
          {step.body}
        </p>
        {step.source && <p className="mt-5 font-mono text-[11px] text-fg-faint">Source: {step.source}</p>}
      </div>

      {step.image && (
        <div className="sm:col-span-5">
          <figure className="border border-line-strong/70 bg-deep/60 p-2">
            <img src={step.image.src} alt={step.image.alt} className="w-full object-contain" style={{ maxHeight: '15rem' }} />
            <figcaption className="mt-2 px-1 font-mono text-[10.5px] text-fg-faint">{step.image.caption}</figcaption>
          </figure>
        </div>
      )}
    </div>
  )
}

function ArrowButton({ dir, onClick, disabled, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-9 flex-none place-items-center border border-line-strong text-fg-dim transition-colors hover:border-fg-faint hover:text-fg disabled:pointer-events-none disabled:opacity-30"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        {dir === 'prev' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
      </svg>
    </button>
  )
}

// A single-viewport horizontal carousel — swapped out from a scroll-jacked
// sticky section so every statement is reachable without scrolling the page,
// just stepping the slider.
export default function Problem() {
  const reduce = usePrefersReducedMotion()
  const [active, setActive] = useState(0)
  const touch = useRef(null)

  const go = useCallback((next) => {
    setActive((v) => Math.max(0, Math.min(STEPS.length - 1, typeof next === 'function' ? next(v) : next)))
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go((v) => v + 1)
      if (e.key === 'ArrowLeft') go((v) => v - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const onTouchStart = (e) => (touch.current = e.touches[0].clientX)
  const onTouchEnd = (e) => {
    if (touch.current == null) return
    const dx = e.changedTouches[0].clientX - touch.current
    if (dx < -40) go((v) => v + 1)
    if (dx > 40) go((v) => v - 1)
    touch.current = null
  }

  return (
    <section id="problem" className="relative overflow-hidden border-b border-line py-24 lg:py-28">
      {/* Ghost-gear photography, kept faint so it reads as texture, not imagery competing with the text. */}
      <img
        src="/landing/problem-bg-1.jpg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full object-cover opacity-[0.1] grayscale"
      />
      <div className="pointer-events-none absolute inset-0 bg-abyss/70" aria-hidden="true" />

      <Container className="relative">
        <Reveal>
          <Eyebrow index="01">The problem</Eyebrow>
        </Reveal>

        <Reveal
          delay={100}
          className="mt-12 min-h-[20rem] overflow-hidden sm:min-h-[16rem]"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            className={`flex ${reduce ? '' : 'transition-transform duration-500 ease-out'}`}
            style={{ transform: `translateX(-${active * 100}%)` }}
          >
            {STEPS.map((step, i) => (
              <Statement key={i} step={step} index={i} />
            ))}
          </div>
        </Reveal>

        <Reveal delay={150} className="mt-10 flex items-center justify-between gap-6">
          <div className="flex gap-1.5" aria-hidden="true">
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to statement ${i + 1}`}
                className="h-px w-8 bg-line-strong transition-colors"
                style={{ backgroundColor: i <= active ? 'var(--color-fg-dim)' : undefined }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <ArrowButton dir="prev" onClick={() => go((v) => v - 1)} disabled={active === 0} label="Previous statement" />
            <ArrowButton dir="next" onClick={() => go((v) => v + 1)} disabled={active === STEPS.length - 1} label="Next statement" />
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
