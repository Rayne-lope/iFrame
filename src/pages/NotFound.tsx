import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="page-shell">
      <section className="page-block p-8 sm:p-12 text-center max-w-2xl mx-auto">
        <Compass className="w-14 h-14 text-accent mx-auto mb-4" />
        <h1 className="page-title">Page Not Found</h1>
        <p className="page-subtitle mt-2">The page you requested does not exist or may have moved.</p>

        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <Link to="/" className="btn-primary w-full sm:w-auto">
            Go Home
          </Link>
          <Link to="/browse/movies" className="btn-secondary w-full sm:w-auto">
            Browse Movies
          </Link>
        </div>
      </section>
    </div>
  )
}
