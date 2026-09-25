import { Container, Eyebrow, Reveal } from './primitives.jsx'

const PREPROCESSING = [
  { config: 'Raw sonar imagery', p: '0.4730', r: '0.4000', map: '0.3835' },
  { config: '+ column normalisation', p: '0.5962', r: '0.4853', map: '0.4592' },
  { config: '+ sonar-aware augmentation', p: '0.7449', r: '0.6528', map: '0.6021', best: true },
]

const MODEL_SIZE = [
  { model: 'YOLO26n', p: '0.4730', r: '0.4000', map: '0.3860', size: '5.3 MB', deployed: true },
  { model: 'YOLO26s', p: '0.3995', r: '0.4261', map: '0.3735', size: '—' },
  { model: 'YOLO26m', p: '0.4710', r: '0.4520', map: '0.4260', size: '—' },
]

const RUNTIME = [
  { value: '224 ms', label: 'CPU inference per tile' },
  { value: '4.5 FPS', label: 'throughput' },
  { value: '5.3 MB', label: 'model size' },
]

const th = 'py-3 pr-6 text-left font-mono text-[11px] font-normal uppercase tracking-[0.1em] text-fg-faint'
const td = 'py-3 pr-6 font-mono text-sm tabular-nums'

function BlockTitle({ tag, children }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="font-sans text-lg font-medium text-fg">{children}</h3>
      <span className="font-mono text-[11px] text-fg-faint">{tag}</span>
    </div>
  )
}

export default function Benchmarks() {
  return (
    <section id="benchmarks" className="border-b border-line py-24 lg:py-32">
      <Container>
        <Reveal className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Eyebrow index="04">Benchmarks</Eyebrow>
            <h2 className="mt-6 font-sans text-3xl font-medium leading-tight tracking-tight text-fg sm:text-4xl">
              What we measured.
            </h2>
          </div>
          <p className="max-w-[56ch] leading-relaxed text-fg-dim lg:col-span-6 lg:col-start-7 lg:pt-12">
            Two questions drove the design: does sonar-specific preprocessing matter, and does a bigger model help? Numbers
            below are precision, recall and mAP50 on our held-out split.
          </p>
        </Reveal>

        <Reveal className="mt-14 border border-line">
          {/* Block A */}
          <div className="grid lg:grid-cols-12">
            <div className="min-w-0 p-6 sm:p-8 lg:col-span-8">
              <BlockTitle tag="YOLO26n · crab pot dataset">What preprocessing buys us</BlockTitle>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[34rem]">
                  <thead className="border-b border-line">
                    <tr>
                      <th className={`${th} pl-3.5`}>Configuration</th>
                      <th className={th}>Precision</th>
                      <th className={th}>Recall</th>
                      <th className={th}>mAP50</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PREPROCESSING.map((row) => (
                      <tr
                        key={row.config}
                        className={`border-b border-line last:border-b-0 ${row.best ? 'bg-surface text-fg' : 'text-fg-dim'}`}
                      >
                        <td className={`py-3 pr-6 text-sm ${row.best ? 'border-l-2 border-signal pl-3' : 'pl-3.5'}`}>{row.config}</td>
                        <td className={td}>{row.p}</td>
                        <td className={td}>{row.r}</td>
                        <td className={td}>{row.map}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex flex-col justify-center border-t border-line p-6 sm:p-8 lg:col-span-4 lg:border-l lg:border-t-0">
              <p className="font-mono text-5xl font-medium tracking-tight text-fg sm:text-6xl">+57%</p>
              <p className="mt-2 font-mono text-[12px] text-fg-dim">mAP50 over raw imagery</p>
              <p className="mt-6 text-sm leading-relaxed text-fg-faint">
                Sonar-specific preprocessing — per-column gain normalisation and shadow-preserving augmentation — not
                generic image preprocessing.
              </p>
            </div>
          </div>

          {/* Block B */}
          <div className="border-t border-line p-6 sm:p-8">
            <BlockTitle tag="identical 3k-image dataset">Why we ship the smallest model</BlockTitle>
            <div className="mt-6 grid gap-8 lg:grid-cols-12">
              <div className="overflow-x-auto lg:col-span-8">
                <table className="w-full min-w-[34rem]">
                  <thead className="border-b border-line">
                    <tr>
                      <th className={th}>Model</th>
                      <th className={th}>Precision</th>
                      <th className={th}>Recall</th>
                      <th className={th}>mAP50</th>
                      <th className={th}>Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MODEL_SIZE.map((row) => (
                      <tr key={row.model} className={`border-b border-line last:border-b-0 ${row.deployed ? 'text-fg' : 'text-fg-dim'}`}>
                        <td className={td}>
                          {row.model}
                          {row.deployed && (
                            <span className="ml-3 border border-line-strong px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-fg-dim">
                              deployed
                            </span>
                          )}
                        </td>
                        <td className={td}>{row.p}</td>
                        <td className={td}>{row.r}</td>
                        <td className={td}>{row.map}</td>
                        <td className={td}>{row.size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm leading-relaxed text-fg-dim lg:col-span-4">
                Differences here sit at or below our measured mAP50 noise floor (<span className="font-mono">±0.05</span>).
                Scaling the model up does not reliably improve detection on this data — so we deploy the{' '}
                <span className="font-mono">5.3 MB</span> nano, which runs on drone-class hardware without a GPU.
              </p>
            </div>
          </div>

          {/* Block C */}
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3 border-t border-line px-6 py-5 sm:px-8">
            {RUNTIME.map((m, i) => (
              <p key={m.label} className="flex items-baseline gap-2.5">
                {i > 0 && <span className="mr-5 hidden text-fg-faint sm:inline" aria-hidden="true">·</span>}
                <span className="font-mono text-lg text-fg">{m.value}</span>
                <span className="font-mono text-[11px] text-fg-faint">{m.label}</span>
              </p>
            ))}
          </div>
        </Reveal>

        <p className="mt-5 max-w-[70ch] text-[12px] leading-relaxed text-fg-faint">
          Measured on our own evaluation split, not a public leaderboard. All configurations trained on identical data.
        </p>
      </Container>
    </section>
  )
}
