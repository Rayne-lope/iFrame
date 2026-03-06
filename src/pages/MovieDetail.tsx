import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Play, Plus, Bookmark, Star, Clock3, CalendarDays, AlertCircle, Film } from 'lucide-react'
import { getMovieDetail, getMovieCredits, getMovieVideos, tmdbImage } from '@/api/tmdb'
import { getFanartMovie, bestFanartImage } from '@/api/fanart'
import CastCard from '@/components/detail/CastCard'
import { useWatchlistStore } from '@/store/watchlistStore'

export default function MovieDetail() {
  const { id } = useParams<{ id: string }>()
  const { isAdded, toggle } = useWatchlistStore()

  const { data: movie, isLoading: movieLoading, isError } = useQuery({
    queryKey: ['movie', id],
    queryFn: () => getMovieDetail(id!),
    enabled: !!id,
  })

  const { data: credits } = useQuery({
    queryKey: ['movie', id, 'credits'],
    queryFn: () => getMovieCredits(id!),
    enabled: !!id,
  })

  const { data: videos } = useQuery({
    queryKey: ['movie', id, 'videos'],
    queryFn: () => getMovieVideos(id!),
    enabled: !!id,
  })

  const { data: fanart } = useQuery({
    queryKey: ['fanart', 'movie', id],
    queryFn: () => getFanartMovie(id!),
    enabled: !!id,
    retry: false,
    staleTime: 60 * 60 * 1000,
  })

  const trailer = videos?.results.find((video) => video.type === 'Trailer' && video.site === 'YouTube')

  const heroImageCandidates = useMemo(() => {
    const candidates = [
      bestFanartImage(fanart?.moviebackground),
      tmdbImage(movie?.backdrop_path ?? null, 'original'),
      tmdbImage(movie?.poster_path ?? null, 'original'),
    ].filter((src): src is string => Boolean(src))

    return [...new Set(candidates)]
  }, [fanart?.moviebackground, movie?.backdrop_path, movie?.poster_path])

  const [failedHeroImages, setFailedHeroImages] = useState<Record<string, true>>({})

  if (isError) {
    return (
      <div className="page-shell flex items-center justify-center">
        <div className="page-block p-8 text-center max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-foreground font-semibold text-lg">Failed to load movie</p>
          <p className="text-muted-foreground text-sm mt-1">Check your connection and try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary mt-5"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (movieLoading || !movie) {
    return (
      <div className="min-h-screen pt-16">
        <div className="w-full h-[56vh] bg-muted animate-pulse" />
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-16 py-8 space-y-4">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="h-4 w-full max-w-xl bg-muted animate-pulse rounded" />
          <div className="h-4 w-full max-w-xl bg-muted animate-pulse rounded" />
        </div>
      </div>
    )
  }

  const heroImageEntries = heroImageCandidates.map((url, index) => ({
    key: `${id ?? 'movie'}:${index}:${url}`,
    url,
  }))
  const heroImageEntry = heroImageEntries.find((entry) => !failedHeroImages[entry.key])
  const heroImageUrl = heroImageEntry?.url ?? null
  const logoUrl = bestFanartImage(fanart?.movielogo)
  const posterUrl = tmdbImage(movie.poster_path, 'w342')
  const year = movie.release_date?.slice(0, 4) ?? ''
  const added = isAdded(movie.id, 'movie')

  const hours = movie.runtime ? Math.floor(movie.runtime / 60) : 0
  const mins = movie.runtime ? movie.runtime % 60 : 0
  const runtimeStr = movie.runtime ? `${hours}h ${mins}m` : ''

  function handleHeroImageError() {
    if (!heroImageEntry) return
    setFailedHeroImages((current) => ({
      ...current,
      [heroImageEntry.key]: true,
    }))
  }

  return (
    <div className="min-h-screen pb-16">
      <section className="relative h-[42vh] min-h-[280px] overflow-hidden sm:h-[62vh] sm:min-h-[360px]">
        {heroImageUrl ? (
          <img
            key={heroImageUrl}
            src={heroImageUrl}
            alt={movie.title}
            className="w-full h-full object-cover object-top"
            onError={handleHeroImageError}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-black via-neutral-900 to-black" aria-hidden="true" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/45 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-transparent" />
      </section>

      <div className="relative -mt-24 max-w-screen-2xl mx-auto px-4 sm:-mt-44 sm:px-8 lg:px-16">
        <div className="mb-4">
          <Link to="/" className="btn-ghost">
            Back Home
          </Link>
        </div>

        <section className="page-block p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
            <div className="flex-shrink-0 self-center lg:self-start">
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt={movie.title}
                  className="w-40 sm:w-52 rounded-xl border border-border/80 shadow-[0_24px_55px_rgba(0,0,0,0.5)]"
                />
              ) : (
                <div className="w-40 sm:w-52 aspect-[2/3] rounded-xl bg-muted" />
              )}
            </div>

            <div className="flex-1">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={movie.title}
                  className="max-w-[220px] sm:max-w-[320px] h-auto mb-3"
                />
              ) : (
                <h1 className="page-title !text-3xl sm:!text-5xl">{movie.title}</h1>
              )}

              {movie.tagline && (
                <p className="text-muted-foreground italic mt-2">{movie.tagline}</p>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-4">
                {year && (
                  <span className="muted-chip">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {year}
                  </span>
                )}
                {runtimeStr && (
                  <span className="muted-chip">
                    <Clock3 className="w-3.5 h-3.5" />
                    {runtimeStr}
                  </span>
                )}
                <span className="gold-chip">
                  <Star className="w-3.5 h-3.5 fill-accent text-accent" />
                  {movie.vote_average.toFixed(1)}
                </span>
                {movie.status && <span className="muted-chip">{movie.status}</span>}
              </div>

              {movie.genres && movie.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {movie.genres.map((genre) => (
                    <span key={genre.id} className="muted-chip">{genre.name}</span>
                  ))}
                </div>
              )}

              <p className="text-foreground/90 text-sm sm:text-base leading-relaxed max-w-3xl mt-5">
                {movie.overview || 'No overview available.'}
              </p>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-center">
                <Link to={`/watch/movie/${movie.id}`} className="btn-primary w-full justify-center sm:w-auto">
                  <Play className="w-4 h-4 fill-black" />
                  Play Now
                </Link>
                <button
                  onClick={() =>
                    toggle({
                      id: movie.id,
                      title: movie.title,
                      poster_path: movie.poster_path,
                      media_type: 'movie',
                      vote_average: movie.vote_average,
                      year,
                    })
                  }
                  className={`${added ? 'btn-secondary !border-accent/45 !text-accent' : 'btn-secondary'} w-full justify-center sm:w-auto`}
                >
                  {added ? <Bookmark className="w-4 h-4 fill-accent" /> : <Plus className="w-4 h-4" />}
                  {added ? 'In Watchlist' : 'Add Watchlist'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {credits && credits.cast.length > 0 && (
          <section className="page-block p-4 sm:p-6 lg:p-8 mt-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="section-title-mini">Cast</h2>
              <span className="muted-chip">
                <Film className="w-3.5 h-3.5" />
                {credits.cast.length} people
              </span>
            </div>
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hidden">
              {credits.cast.slice(0, 24).map((cast) => (
                <CastCard key={cast.id} cast={cast} />
              ))}
            </div>
          </section>
        )}

        {trailer && (
          <section className="page-block p-4 sm:p-6 lg:p-8 mt-6">
            <h2 className="section-title-mini mb-4">Trailer</h2>
            <div className="relative w-full max-w-4xl aspect-video rounded-xl overflow-hidden border border-border/80 bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${trailer.key}`}
                title={trailer.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
