import { Link } from 'react-router-dom'
import { Container } from './primitives.jsx'

export default function Footer() {
  return (
    <footer className="py-12">
      <Container className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-fg">AquaScan · Team Aquanauts</p>
          <p className="font-mono text-[11px] text-fg-faint">SIH26057 · Ministry of Earth Sciences / NIOT</p>
          <p className="font-mono text-[11px] text-fg-faint">Ramaiah Institute of Technology</p>
        </div>
        <Link to="/dashboard" className="font-mono text-[12px] text-fg-dim no-underline transition-colors hover:text-fg">
          Open dashboard →
        </Link>
      </Container>
    </footer>
  )
}
