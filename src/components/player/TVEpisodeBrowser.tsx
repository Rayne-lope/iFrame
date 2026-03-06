import { Link } from 'react-router-dom'
import { Check, Play, Tv2 } from 'lucide-react'
import { tmdbImage } from '@/api/tmdb'
import { cn } from '@/lib/utils'
import type { Episode } from '@/types/tmdb'
import type { WatchedItem } from '@/store/historyStore'

interface TVEpisodeBrowserProps {
  tvId: string
  currentSeason: number
  currentEpisode: number
  browserSeason: number
  seasonCount: number
  episodes: Episode[]
  loading?: boolean
  episodeProgress: Map<number, WatchedItem>
  onSeasonChange: (season: number) => void
}

function clampPercent(value?: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

export default function TVEpisodeBrowser({
  tvId,
  currentSeason,
  currentEpisode,
  browserSeason,
  seasonCount,
  episodes,
  loading = false,
  episodeProgress,
  onSeasonChange,
}: TVEpisodeBrowserProps) {
  const isBrowsingCurrentSeason = browserSeason === currentSeason

  return (
    <section className="mt-7 border-t border-border/60 pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="section-title-mini !text-lg sm:!text-xl">Episodes</h2>
          <p className="page-subtitle mt-1">
            {isBrowsingCurrentSeason
              ? `Jump langsung ke episode lain di Season ${browserSeason}.`
              : `Browsing Season ${browserSeason} sambil tetap memutar S${currentSeason}E${currentEpisode}.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="muted-chip">
            <Tv2 className="w-3.5 h-3.5" />
            Season {browserSeason}
          </span>
          <span className="muted-chip">{episodes.length} Episodes</span>
        </div>
      </div>

      {seasonCount > 1 && (
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hidden">
          {Array.from({ length: seasonCount }, (_, index) => index + 1).map((seasonNumber) => (
            <button
              key={seasonNumber}
              type="button"
              onClick={() => onSeasonChange(seasonNumber)}
              className={cn(
                'flex-shrink-0',
                browserSeason === seasonNumber
                  ? 'gold-chip !text-sm'
                  : 'muted-chip !text-sm hover:border-accent/35 hover:text-foreground transition-colors',
              )}
            >
              Season {seasonNumber}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-36 rounded-2xl bg-muted animate-pulse sm:h-32" />
          ))}
        </div>
      ) : episodes.length > 0 ? (
        <div className="mt-4 space-y-3">
          {episodes.map((episode) => {
            const watchState = episodeProgress.get(episode.episode_number)
            const isActive = isBrowsingCurrentSeason && episode.episode_number === currentEpisode

            return (
              <EpisodeBrowserRow
                key={episode.id}
                tvId={tvId}
                seasonNumber={browserSeason}
                episode={episode}
                watchState={watchState}
                isActive={isActive}
              />
            )
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-border/70 bg-background/35 px-4 py-5 text-sm text-muted-foreground">
          No episodes available for Season {browserSeason}.
        </div>
      )}
    </section>
  )
}

function EpisodeBrowserRow({
  tvId,
  seasonNumber,
  episode,
  watchState,
  isActive,
}: {
  tvId: string
  seasonNumber: number
  episode: Episode
  watchState?: WatchedItem
  isActive: boolean
}) {
  const thumbUrl = tmdbImage(episode.still_path, 'w300')
  const progressPercent = watchState?.completed ? 100 : clampPercent(watchState?.progress_percent)
  const hasProgress = progressPercent > 0

  let stateLabel: string | null = null
  let stateClassName = 'muted-chip !text-[11px]'

  if (isActive) {
    stateLabel = 'Now Watching'
    stateClassName = 'gold-chip !text-[11px]'
  } else if (watchState?.completed) {
    stateLabel = 'Completed'
    stateClassName = 'inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300'
  } else if (hasProgress) {
    stateLabel = `Resume ${progressPercent}%`
  }

  return (
    <Link
      to={`/watch/tv/${tvId}/${seasonNumber}/${episode.episode_number}`}
      aria-current={isActive ? 'page' : undefined}
      className={cn('episode-browser-row group', isActive && 'episode-browser-row-active')}
    >
      <div className="episode-browser-index">{String(episode.episode_number).padStart(2, '0')}</div>

      <div className="episode-browser-thumb">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={episode.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-background text-xs text-muted-foreground">
            Episode {episode.episode_number}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground sm:text-lg">
                {episode.name || `Episode ${episode.episode_number}`}
              </h3>
              {stateLabel && (
                <span className={stateClassName}>
                  {watchState?.completed && !isActive && <Check className="h-3 w-3" />}
                  {stateLabel}
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Episode {episode.episode_number}
              {episode.runtime ? ` • ${episode.runtime}m` : ''}
              {episode.air_date ? ` • ${episode.air_date}` : ''}
            </p>
          </div>

          <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-border/70 bg-surface/80 text-muted-foreground transition-colors group-hover:border-accent/40 group-hover:text-foreground">
            <Play className="h-4 w-4" />
          </span>
        </div>

        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {episode.overview || 'No episode overview available.'}
        </p>

        <div className="mt-4 flex items-center gap-3">
          <div className="episode-browser-progress">
            <div className="episode-browser-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>

          <span className="min-w-12 text-right text-[11px] font-medium text-muted-foreground">
            {watchState?.completed ? 'Done' : hasProgress ? `${progressPercent}%` : ''}
          </span>
        </div>
      </div>
    </Link>
  )
}
