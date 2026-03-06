import MovieCard from './MovieCard'
import SkeletonCard from './SkeletonCard'
import type { MediaItem } from '@/types/tmdb'

interface MovieGridProps {
  items: MediaItem[]
  loading?: boolean
}

export default function MovieGrid({ items, loading = false }: MovieGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
      {items.map((item) => (
        <MovieCard key={item.id} item={item} />
      ))}
    </div>
  )
}
