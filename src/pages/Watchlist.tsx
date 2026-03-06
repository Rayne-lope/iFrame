import { Link } from 'react-router-dom'
import { Bookmark, Sparkles } from 'lucide-react'
import { useWatchlistStore } from '@/store/watchlistStore'
import MovieGrid from '@/components/ui/MovieGrid'
import type { MediaItem } from '@/types/tmdb'

export default function Watchlist() {
  const { items, clear } = useWatchlistStore()

  return (
    <div className="page-shell">
      <section className="page-block p-5 sm:p-7 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="page-title">
              My Watchlist
              {items.length > 0 && <span className="text-muted-foreground font-medium text-xl ml-2">({items.length})</span>}
            </h1>
            <p className="page-subtitle mt-1">Your saved picks, ready when you are.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span className="gold-chip">
              <Sparkles className="w-3.5 h-3.5" />
              Personal Shelf
            </span>
            {items.length > 0 && (
              <button onClick={clear} className="btn-ghost hover:!text-red-300 hover:!border-red-400/35">
                Clear All
              </button>
            )}
          </div>
        </div>
      </section>

      {items.length === 0 ? (
        <div className="page-block p-8 sm:p-12 text-center">
          <Bookmark className="w-16 h-16 text-muted-foreground/45 mx-auto mb-4" />
          <p className="text-xl font-semibold text-foreground">Your watchlist is empty</p>
          <p className="text-muted-foreground text-sm mt-2">Add movies and shows from detail pages.</p>
          <Link to="/" className="btn-primary mt-5">
            Browse Home
          </Link>
        </div>
      ) : (
        <MovieGrid items={items as unknown as MediaItem[]} />
      )}
    </div>
  )
}
