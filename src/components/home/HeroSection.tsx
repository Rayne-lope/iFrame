import { Link } from 'react-router-dom'
import { Play, Info, Star } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getTrending, tmdbImage } from '@/api/tmdb'
import { getFanartMovie, bestFanartImage } from '@/api/fanart'
import type { MediaItem } from '@/types/tmdb'

export default function HeroSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['trending', 'all', 'week'],
    queryFn: () => getTrending('all', 'week'),
  })

  const item: MediaItem | undefined = data?.results[0]
  const isMovie = item?.media_type !== 'tv'

  const { data: fanart } = useQuery({
    queryKey: ['fanart', 'movie', item?.id],
    queryFn: () => getFanartMovie(item!.id),
    enabled: !!item && isMovie,
    retry: false,
    staleTime: 60 * 60 * 1000,
  })

  if (isLoading || !item) {
    return (
      <div className="relative w-full h-[70vh] sm:h-[80vh] bg-muted animate-pulse" />
    )
  }

  const title = item.title ?? item.name ?? ''
  const year = (item.release_date ?? item.first_air_date ?? '').slice(0, 4)
  const overview = item.overview.length > 150 ? item.overview.slice(0, 150) + '…' : item.overview
  const mediaType = item.media_type === 'tv' ? 'tv' : 'movie'

  // Fanart assets (movies only) — fall back to TMDB if unavailable
  const bgUrl = bestFanartImage(fanart?.moviebackground) ?? tmdbImage(item.backdrop_path, 'original')
  const logoUrl = isMovie ? bestFanartImage(fanart?.movielogo) : null

  return (
    <section className="relative w-full h-[70vh] sm:h-[85vh] overflow-hidden">
      {/* Backdrop */}
      {bgUrl && (
        <img
          src={bgUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-end pb-16 sm:pb-24 px-4 sm:px-8 lg:px-16 max-w-screen-2xl mx-auto">
        {/* Logo or text title */}
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={title}
            className="max-w-[260px] sm:max-w-sm lg:max-w-md w-full h-auto mb-4 drop-shadow-2xl"
          />
        ) : (
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white max-w-2xl leading-tight mb-3">
            {title}
          </h1>
        )}

        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-1 bg-black/50 rounded px-2 py-0.5">
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
            <span className="text-yellow-400 text-sm font-medium">{item.vote_average.toFixed(1)}</span>
          </div>
          {year && <span className="text-gray-300 text-sm">{year}</span>}
          <span className="text-gray-300 text-sm capitalize border border-gray-500 px-2 py-0.5 rounded">
            {mediaType}
          </span>
        </div>

        <p className="text-gray-200 text-sm sm:text-base max-w-xl mb-6 leading-relaxed">
          {overview}
        </p>

        <div className="flex items-center gap-3">
          <Link
            to={`/watch/${mediaType}/${item.id}`}
            className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            <Play className="w-4 h-4 fill-white" />
            Play Now
          </Link>
          <Link
            to={`/${mediaType}/${item.id}`}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors backdrop-blur-sm"
          >
            <Info className="w-4 h-4" />
            More Info
          </Link>
        </div>
      </div>
    </section>
  )
}
