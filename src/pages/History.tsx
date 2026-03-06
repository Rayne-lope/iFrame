import { Clock, Flame } from 'lucide-react'
import { useHistoryStore } from '@/store/historyStore'
import MovieGrid from '@/components/ui/MovieGrid'
import type { MediaItem } from '@/types/tmdb'

export default function History() {
  const { items, clear } = useHistoryStore()

  return (
    <div className="page-shell">
      <section className="page-block p-5 sm:p-7 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="page-title">
              Watch History
              {items.length > 0 && <span className="text-muted-foreground font-medium text-xl ml-2">({items.length})</span>}
            </h1>
            <p className="page-subtitle mt-1">Your recently watched movies and episodes.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span className="gold-chip">
              <Flame className="w-3.5 h-3.5" />
              Continue Momentum
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
          <Clock className="w-16 h-16 text-muted-foreground/45 mx-auto mb-4" />
          <p className="text-xl font-semibold text-foreground">No watch history yet</p>
          <p className="text-muted-foreground text-sm mt-2">Start watching to build your personal timeline.</p>
        </div>
      ) : (
        <MovieGrid items={items as unknown as MediaItem[]} />
      )}
    </div>
  )
}
