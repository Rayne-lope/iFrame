import { useEffect, useState, type FormEvent } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Search, History, Menu, X, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'

type NavEntry = {
  label: string
  to: string
}

const navEntries: NavEntry[] = [
  { label: 'Home', to: '/' },
  { label: 'Sports', to: '/sports' },
  { label: 'Movies', to: '/browse/movies' },
  { label: 'Series', to: '/browse/series' },
  { label: 'Anime', to: '/browse/anime' },
  { label: 'Watchlist', to: '/watchlist' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const navigate = useNavigate()
  const { isDark, toggle: toggleTheme } = useTheme()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    const query = searchQuery.trim()
    if (!query) return
    navigate(`/search?q=${encodeURIComponent(query)}`)
    setMobileSearchOpen(false)
    setSearchQuery('')
  }

  function navLinkClass(active: boolean): string {
    return cn(
      'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
      active
        ? 'bg-accent text-black shadow-[0_0_18px_rgba(243,188,22,0.28)]'
        : 'text-muted-foreground hover:text-foreground',
    )
  }

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300',
        scrolled
          ? 'border-border/90 bg-background/86 backdrop-blur-2xl'
          : 'border-transparent bg-background/58 backdrop-blur-xl',
      )}
    >
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-1 leading-none">
            <span className="text-[1.45rem] font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              i<span className="text-accent">Frame</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 rounded-full border border-border/90 bg-surface/75 p-1 backdrop-blur-2xl">
            {navEntries.map((entry) => (
              <NavLink key={entry.label} to={entry.to} className={({ isActive }) => navLinkClass(isActive)}>
                {entry.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <form onSubmit={submitSearch} className="hidden md:block">
              <div className="input-shell flex items-center gap-2 px-3 w-56 xl:w-64">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search movies, series..."
                  className="input-control px-0 py-2 text-sm"
                />
              </div>
            </form>

            <Link to="/history" className="floating-icon-btn hidden sm:inline-flex" aria-label="History">
              <History className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={toggleTheme}
              className="floating-icon-btn hidden sm:inline-flex"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setMobileSearchOpen((value) => !value)}
              className="floating-icon-btn md:hidden"
              aria-label="Open search"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen((value) => !value)}
              className="floating-icon-btn lg:hidden"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {mobileSearchOpen && (
          <form onSubmit={submitSearch} className="md:hidden pb-3">
            <div className="input-shell flex items-center gap-2 px-3">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search movies, series..."
                className="input-control px-0 py-2.5"
              />
            </div>
          </form>
        )}

        {mobileOpen && (
          <nav className="lg:hidden pb-4 border-t border-border/80 mt-1 pt-3 flex flex-col gap-2">
            {navEntries.map((entry) => (
              <NavLink
                key={entry.label}
                to={entry.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent/18 text-accent border border-accent/35'
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface/70 border border-transparent',
                  )
                }
              >
                {entry.label}
              </NavLink>
            ))}

            <NavLink
              to="/history"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent/18 text-accent border border-accent/35'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface/70 border border-transparent',
                )
              }
            >
              History
            </NavLink>
          </nav>
        )}
      </div>
    </header>
  )
}
