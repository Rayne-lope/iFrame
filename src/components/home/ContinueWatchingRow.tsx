import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { tmdbImage } from '@/api/tmdb'
import type { WatchedItem } from '@/store/historyStore'

interface ContinueWatchingRowProps {
  items: WatchedItem[]
}

export default function ContinueWatchingRow({ items }: ContinueWatchingRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)

  function scroll(dir: 'left' | 'right') {
    if (!rowRef.current) return
    const amount = rowRef.current.clientWidth * 0.75
    rowRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  function watchUrl(item: WatchedItem) {
    if (item.media_type === 'tv') {
      return `/watch/tv/${item.id}/${item.season ?? 1}/${item.episode ?? 1}`
    }
    return `/watch/movie/${item.id}`
  }

  return (
    <section className="relative group/row py-2">
      <h2 className="text-foreground font-semibold text-lg sm:text-xl px-4 sm:px-8 lg:px-16 mb-3">
        Continue Watching
      </h2>

      <div className="relative">
        {/* Left arrow */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 text-white rounded-full p-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Scroll container */}
        <div
          ref={rowRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide px-4 sm:px-8 lg:px-16 pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item) => {
            const title = item.title ?? item.name ?? 'Unknown'
            const posterUrl = tmdbImage(item.poster_path, 'w342')
            const href = watchUrl(item)

            return (
              <Link
                key={`${item.id}-${item.season}-${item.episode}`}
                to={href}
                className="group relative flex-shrink-0 w-36 sm:w-44 md:w-48 cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-lg aspect-[2/3] bg-muted">
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-surface text-muted-foreground text-sm text-center px-2">
                      {title}
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2">
                    <div className="bg-accent rounded-full p-3">
                      <Play className="w-5 h-5 fill-white text-white" />
                    </div>
                    <p className="text-white font-semibold text-xs text-center px-2 line-clamp-2">{title}</p>
                    {item.media_type === 'tv' && item.season != null && item.episode != null && (
                      <span className="text-gray-300 text-xs">S{item.season}E{item.episode}</span>
                    )}
                  </div>
                </div>

                {/* Episode label below poster */}
                {item.media_type === 'tv' && item.season != null && item.episode != null && (
                  <p className="text-muted-foreground text-xs mt-1 px-0.5">
                    S{item.season}E{item.episode}
                  </p>
                )}
              </Link>
            )
          })}
        </div>

        {/* Right arrow */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 text-white rounded-full p-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  )
}
