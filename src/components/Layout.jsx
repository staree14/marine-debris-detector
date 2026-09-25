import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'

const LINKS = [
  { to: '/dashboard', label: 'Overview', end: true },
  { to: '/upload', label: 'Upload' },
  { to: '/review', label: 'Review' },
  { to: '/map', label: 'Map' },
  { to: '/reports', label: 'Reports' },
]

const THEME_KEY = 'aquascan-theme'

function getInitialTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'light'
  } catch {
    return 'light'
  }
}

export default function Layout() {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // private/blocked storage — theme just won't persist across reloads
    }
  }, [theme])

  return (
    <div>
      <nav
        style={{
          background: 'var(--panel)',
          borderBottom: '1px solid var(--border)',
          padding: '0 28px',
          display: 'flex',
          alignItems: 'center',
          height: 56,
          gap: 32,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, flex: 'none' }}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--ocean)" strokeWidth="1.6">
            <path d="M3 12h4l2-6 4 12 2-6h6" />
          </svg>
          AquaScan
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--ink-faint)', fontWeight: 400, marginLeft: 2 }}>
            Seabed Debris Detection Platform
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              style={({ isActive }) => ({
                padding: '9px 15px',
                borderRadius: 20,
                fontSize: 13.5,
                fontWeight: 500,
                textDecoration: 'none',
                color: isActive ? '#fff' : 'var(--ink-dim)',
                background: isActive ? 'var(--ocean-deep)' : 'transparent',
              })}
            >
              {l.label}
            </NavLink>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle color theme"
          style={{
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '1px solid var(--border-strong)',
            background: 'transparent',
            color: 'var(--ink-dim)',
            cursor: 'pointer',
          }}
        >
          {theme === 'dark' ? (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
            </svg>
          )}
        </button>
      </nav>
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 28px 64px' }}>
        <Outlet />
      </main>
    </div>
  )
}
