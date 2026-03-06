import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Play, Plus, Bookmark, Star, CalendarDays, AlertCircle, Tv2, Layers } from 'lucide-react'
import { getTVDetail, getTVSeason, getTVExternalIds, tmdbImage } from '@/api/tmdb'
import { getFanartTV, bestFanartImage } from '@/api/fanart'
import { getTVResumeItem } from '@/lib/historyResume'
import type { Episode } from '@/types/tmdb'
import { useWatchlistStore } from '@/store/watchlistStore'
import { useHistoryStore } from '@/store/historyStore'

export default function TVDetail() {
  const { id } = useParams<{ id: string }>()
  const [selectedSeason, setSelectedSeason] = useState(1)
  const { isAdded, toggle } = useWatchlistStore()
  const historyItems = useHistoryStore((state) => state.items)

  const { data: show, isLoading, isError } = useQuery({
    queryKey: ['tv', id],
    queryFn: () => getTVDetail(id!),
    enabled: !!id,
  })

  const { data: season, isLoading: seasonLoading } = useQuery({
    queryKey: ['tv', id, 'season', selectedSeason],
    queryFn: () => getTVSeason(id!, selectedSeason),
    enabled: !!id && !!show,
  })

  const { data: externalIds } = useQuery({
    queryKey: ['tv', id, 'external_ids'],
    queryFn: () => getTVExternalIds(id!),
    enabled: !!id,
  })

  const { data: fanart } = useQuery({
    queryKey: ['fanart', 'tv', externalIds?.tvdb_id],
    queryFn: () => getFanartTV(externalIds!.tvdb_id!),
    enabled: !!externalIds?.tvdb_id,
    retry: false,
    staleTime: 60 * 60 * 1000,
  })

  const heroImageCandidates = useMemo(() => {
    const candidates = [
      bestFanartImage(fanart?.showbackground),
      tmdbImage(show?.backdrop_path ?? null, 'original'),
      tmdbImage(show?.poster_path ?? null, 'original'),
    ].filter((src): src is string => Boolean(src))

    return [...new Set(candidates)]
  }, [fanart?.showbackground, show?.backdrop_path, show?.poster_path])

  const [failedHeroImages, setFailedHeroImages] = useState<Record<string, true>>({})

  if (isError) {
    return (
      <div className="page-shell flex items-center justify-center">
        <div className="page-block p-8 text-center max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-foreground font-semibold text-lg">Failed to load show</p>
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

  if (isLoading || !show) {
    return (
      <div className="min-h-screen pt-16">
        <div className="w-full h-[56vh] bg-muted animate-pulse" />
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-16 py-8 space-y-4">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="h-4 w-full max-w-xl bg-muted animate-pulse rounded" />
        </div>
      </div>
    )
  }

  const heroImageEntries = heroImageCandidates.map((url, index) => ({
    key: `${id ?? 'tv'}:${index}:${url}`,
    url,
  }))
  const heroImageEntry = heroImageEntries.find((entry) => !failedHeroImages[entry.key])
  const heroImageUrl = heroImageEntry?.url ?? null
  const logoUrl = bestFanartImage(fanart?.hdtvlogo) ?? bestFanartImage(fanart?.clearlogo)
  const posterUrl = tmdbImage(show.poster_path, 'w342')
  const year = show.first_air_date?.slice(0, 4) ?? ''
  const numSeasons = show.number_of_seasons ?? 1
  const added = isAdded(show.id, 'tv')

  const resumeItem = getTVResumeItem(historyItems, show.id)
  const resumeSeason = resumeItem?.season ?? 1
  const resumeEpisode = resumeItem?.episode ?? 1
  const resumeLabel = resumeItem ? `Continue S${resumeSeason}E${resumeEpisode}` : 'Play Now'

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
            alt={show.name}
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
          <Link to="/browse/series" className="btn-ghost">
            Back To Series
          </Link>
        </div>

        <section className="page-block p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
            <div className="flex-shrink-0 self-center lg:self-start">
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt={show.name}
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
                  alt={show.name}
                  className="max-w-[220px] sm:max-w-[320px] h-auto mb-3"
                />
              ) : (
                <h1 className="page-title !text-3xl sm:!text-5xl">{show.name}</h1>
              )}

              {show.tagline && <p className="text-muted-foreground italic mt-2">{show.tagline}</p>}

              <div className="flex flex-wrap items-center gap-2 mt-4">
                {year && (
                  <span className="muted-chip">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {year}
                  </span>
                )}

                <span className="muted-chip">
                  <Layers className="w-3.5 h-3.5" />
                  {numSeasons} Season{numSeasons !== 1 ? 's' : ''}
                </span>

                <span className="gold-chip">
                  <Star className="w-3.5 h-3.5 fill-accent text-accent" />
                  {show.vote_average.toFixed(1)}
                </span>

                {show.status && <span className="muted-chip">{show.status}</span>}
              </div>

              {show.genres && show.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {show.genres.map((genre) => (
                    <span key={genre.id} className="muted-chip">{genre.name}</span>
                  ))}
                </div>
              )}

              <p className="text-foreground/90 text-sm sm:text-base leading-relaxed max-w-3xl mt-5">
                {show.overview || 'No overview available.'}
              </p>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-center">
                <Link to={`/watch/tv/${show.id}/${resumeSeason}/${resumeEpisode}`} className="btn-primary w-full justify-center sm:w-auto">
                  <Play className="w-4 h-4 fill-black" />
                  {resumeLabel}
                </Link>

                <button
                  onClick={() =>
                    toggle({
                      id: show.id,
                      name: show.name,
                      poster_path: show.poster_path,
                      media_type: 'tv',
                      vote_average: show.vote_average,
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

        <section className="page-block p-4 sm:p-6 lg:p-8 mt-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="section-title-mini">Episodes</h2>
            <span className="muted-chip">
              <Tv2 className="w-3.5 h-3.5" />
              Season {selectedSeason}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hidden">
            {Array.from({ length: numSeasons }, (_, index) => index + 1).map((seasonNumber) => (
              <button
                key={seasonNumber}
                onClick={() => setSelectedSeason(seasonNumber)}
                className={
                  selectedSeason === seasonNumber
                    ? 'gold-chip !text-sm'
                    : 'muted-chip !text-sm hover:text-foreground hover:border-accent/35 transition-colors'
                }
              >
                Season {seasonNumber}
              </button>
            ))}
          </div>

          {seasonLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-24 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {season?.episodes?.map((episode) => (
                <EpisodeCard
                  key={episode.id}
                  episode={episode}
                  tvId={id!}
                  seasonNum={selectedSeason}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function EpisodeCard({
  episode,
  tvId,
  seasonNum,
}: {
  episode: Episode
  tvId: string
  seasonNum: number
}) {
  const thumbUrl = tmdbImage(episode.still_path, 'w300')

  return (
    <article className="glass-card p-3 sm:p-4 flex gap-3 sm:gap-4 card-hover">
      <div className="flex-shrink-0 w-28 sm:w-40 aspect-video rounded-lg overflow-hidden bg-muted border border-border/70">
        {thumbUrl ? (
          <img src={thumbUrl} alt={episode.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs text-center px-2">
            Episode {episode.episode_number}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-foreground font-semibold text-sm sm:text-base line-clamp-1">
          {episode.episode_number}. {episode.name}
        </p>

        {episode.air_date && <p className="text-muted-foreground text-xs mt-1">{episode.air_date}</p>}

        <p className="text-muted-foreground text-xs sm:text-sm mt-2 line-clamp-2">
          {episode.overview || 'No episode overview available.'}
        </p>
      </div>

      <div className="flex-shrink-0 flex items-center">
        <Link
          to={`/watch/tv/${tvId}/${seasonNum}/${episode.episode_number}`}
          className="btn-primary !px-3 !py-2"
          aria-label="Play episode"
        >
          <Play className="w-4 h-4 fill-black" />
        </Link>
      </div>
    </article>
  )
}
