import { useScrollReveal } from './useScrollReveal.js'

export function Container({ className = '', children }) {
  return <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-10 ${className}`}>{children}</div>
}

export function Eyebrow({ index, children, className = '' }) {
  return (
    <p className={`flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-faint ${className}`}>
      {index && <span className="text-fg-dim">{index}</span>}
      {index && <span className="h-px w-6 bg-line-strong" aria-hidden="true" />}
      <span>{children}</span>
    </p>
  )
}

export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const [ref, shown] = useScrollReveal()
  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: shown ? `${delay}ms` : '0ms' }}
      className={`transition-[opacity,translate] duration-700 ease-out motion-reduce:transition-none ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      } ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  )
}

// Frame for a real product screenshot. Pass `src` once the capture exists;
// until then it renders a labelled empty slot.
export function ImageSlot({ src, alt, caption, aspect = '4 / 3', className = '' }) {
  return (
    <figure className={className}>
      <div className="relative overflow-hidden border border-line bg-deep" style={{ aspectRatio: aspect }}>
        {src ? (
          <img src={src} alt={alt} loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-faint">Screenshot · {alt}</span>
          </div>
        )}
        <span className="pointer-events-none absolute left-2 top-2 size-2.5 border-l border-t border-line-strong" aria-hidden="true" />
        <span className="pointer-events-none absolute bottom-2 right-2 size-2.5 border-b border-r border-line-strong" aria-hidden="true" />
      </div>
      {caption && <figcaption className="mt-2.5 font-mono text-[11px] text-fg-faint">{caption}</figcaption>}
    </figure>
  )
}
