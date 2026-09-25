import { Link } from 'react-router-dom'
import { Container } from './primitives.jsx'

export default function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-abyss">
      <Container className="flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 text-fg no-underline">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-signal-text" aria-hidden="true">
            <path d="M3 12h4l2-6 4 12 2-6h6" />
          </svg>
          <span className="text-[15px] font-medium tracking-tight">AquaScan</span>
        </Link>
        <Link
          to="/dashboard"
          className="rounded-sm border border-line-strong px-3.5 py-1.5 text-[13px] font-medium text-fg no-underline transition-colors hover:border-fg-faint"
        >
          Open dashboard
        </Link>
      </Container>
    </header>
  )
}
