import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import MovieCard from '@/components/ui/MovieCard'
import SkeletonCard from '@/components/ui/SkeletonCard'
import type { MediaItem } from '@/types/tmdb'
import type { PaginatedResponse } from '@/types/tmdb'

interface MovieRowProps {
  title: string
  queryKey: string[]
  queryFn: () => Promise<PaginatedResponse<MediaItem>>
}

export default function MovieRow({ title, queryKey, queryFn }: MovieRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn,
  })

  function scroll(dir: 'left' | 'right') {
    if (!rowRef.current) return
    const amount = rowRef.current.clientWidth * 0.75
    rowRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  return (
    <section className="relative group/row py-2">
      <h2 className="text-foreground font-semibold text-lg sm:text-xl px-4 sm:px-8 lg:px-16 mb-3">
        {title}
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
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : isError
              ? <p className="text-muted-foreground text-sm py-4">Failed to load</p>
              : data?.results.map((item) => (
                  <MovieCard key={item.id} item={item as MediaItem} />
                ))}
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
