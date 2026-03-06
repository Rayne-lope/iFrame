import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getGenres, discoverByGenre } from '@/api/tmdb'
import MovieGrid from '@/components/ui/MovieGrid'
import type { MediaItem } from '@/types/tmdb'

export default function Genre() {
  const { id } = useParams<{ id: string }>()
  const [page, setPage] = useState(1)

  const { data: genresData } = useQuery({
    queryKey: ['genres', 'movie'],
    queryFn: () => getGenres('movie'),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['genre', id, page],
    queryFn: () => discoverByGenre(id!, page),
    enabled: !!id,
  })

  const genreName = genresData?.genres.find((genre) => String(genre.id) === id)?.name ?? 'Browse'
  const totalPages = data?.total_pages ?? 1

  return (
    <div className="page-shell">
      <section className="page-block p-5 sm:p-7 mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="page-title">Genre: {genreName}</h1>
            <p className="page-subtitle mt-1">Curated picks from TMDB genre discovery.</p>
          </div>
          <Link
            to="/browse/movies"
            className="btn-ghost"
          >
            Back To Browse
          </Link>
        </div>
      </section>

      <MovieGrid
        items={(data?.results ?? []) as unknown as MediaItem[]}
        loading={isLoading}
      />

      {!isLoading && totalPages > 1 && (
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <button
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={page === 1}
            className="btn-ghost w-full sm:w-auto disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </button>
          <span className="text-muted-foreground text-sm">
            Page {page} of {Math.min(totalPages, 500)}
          </span>
          <button
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={page >= totalPages}
            className="btn-ghost w-full sm:w-auto disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
