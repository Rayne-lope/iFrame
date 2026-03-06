import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, AlertCircle, Keyboard, MonitorUp } from 'lucide-react'
import { getMovieDetail } from '@/api/tmdb'
import VideoPlayer from '@/components/player/VideoPlayer'
import SourceSelector from '@/components/player/SourceSelector'
import SubtitleSelector from '@/components/player/SubtitleSelector'
import MobileAccordionSection from '@/components/ui/MobileAccordionSection'
import { useHistoryStore } from '@/store/historyStore'
import { getFailureCount, usePlayerStore } from '@/store/playerStore'

type SourceOption = {
  label: string
  url: string
  unstable: boolean
}

const WATCH_PROGRESS_TICK_MS = 5000
const COMPLETED_PROGRESS_PERCENT = 95

function contentKey(id: string | undefined): string {
  return `movie:${id ?? ''}`
}

function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element) return false

  const tagName = element.tagName.toLowerCase()
  return tagName === 'input' || tagName === 'textarea' || element.isContentEditable
}

function computeProgressPercent(positionSeconds: number, durationSeconds?: number): number | undefined {
  if (!durationSeconds || durationSeconds <= 0) return undefined
  const raw = (positionSeconds / durationSeconds) * 100
  return Math.max(0, Math.min(100, Math.round(raw)))
}

export default function WatchMovie() {
  const { id } = useParams<{ id: string }>()
  const addHistory = useHistoryStore((state) => state.add)
  const historyItems = useHistoryStore((state) => state.items)

  const preferredSources = usePlayerStore((state) => state.preferredSources)
  const sourceHealth = usePlayerStore((state) => state.sourceHealth)
  const setPreferredSource = usePlayerStore((state) => state.setPreferredSource)
  const markSourceFailure = usePlayerStore((state) => state.markSourceFailure)
  const markSourceSuccess = usePlayerStore((state) => state.markSourceSuccess)
  const shortcutsEnabled = usePlayerStore((state) => state.shortcutsEnabled)
  const toggleShortcuts = usePlayerStore((state) => state.toggleShortcuts)

  const [activeSource, setActiveSource] = useState('')
  const [attemptedSources, setAttemptedSources] = useState<string[]>([])
  const [sourceNotice, setSourceNotice] = useState<string | null>(null)
  const [hotkeyHelpOpen, setHotkeyHelpOpen] = useState(false)
  const [hotkeyHint, setHotkeyHint] = useState<string | null>(null)
  const [mutedHint, setMutedHint] = useState(false)

  const hintTimeoutRef = useRef<number | null>(null)
  const playerWrapRef = useRef<HTMLDivElement>(null)
  const watchedSecondsRef = useRef(0)

  const { data: movie, isLoading, isError } = useQuery({
    queryKey: ['movie', id],
    queryFn: () => getMovieDetail(id!),
    enabled: !!id,
  })

  useEffect(() => {
    if (!movie) return

    const originalLanguage = (movie as { original_language?: string }).original_language
    const genreIds = movie.genres?.map((genre) => genre.id)

    addHistory({
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path,
      media_type: 'movie',
      vote_average: movie.vote_average,
      year: movie.release_date?.slice(0, 4) ?? '',
      genre_ids: genreIds,
      original_language: originalLanguage,
      watchedAt: Date.now(),
    })
  }, [movie?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!movie?.id) return

    const existing = historyItems.find(
      (item) => item.media_type === 'movie' && item.id === movie.id,
    )
    watchedSecondsRef.current = existing?.position_seconds ?? 0
  }, [historyItems, movie?.id])

  useEffect(() => {
    if (!movie) return

    const durationSeconds = movie.runtime ? movie.runtime * 60 : undefined
    const originalLanguage = (movie as { original_language?: string }).original_language
    const genreIds = movie.genres?.map((genre) => genre.id)
    let lastTickAt = Date.now()

    const saveProgress = (elapsedSeconds: number) => {
      if (elapsedSeconds <= 0) return

      watchedSecondsRef.current += elapsedSeconds

      const progressPercent = computeProgressPercent(watchedSecondsRef.current, durationSeconds)
      const completed = typeof progressPercent === 'number' && progressPercent >= COMPLETED_PROGRESS_PERCENT

      addHistory({
        id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
        media_type: 'movie',
        vote_average: movie.vote_average,
        year: movie.release_date?.slice(0, 4) ?? '',
        genre_ids: genreIds,
        original_language: originalLanguage,
        position_seconds: watchedSecondsRef.current,
        duration_seconds: durationSeconds,
        progress_percent: progressPercent,
        completed,
        watchedAt: Date.now(),
      })
    }

    const onTick = () => {
      const now = Date.now()
      const elapsedSeconds = Math.round((now - lastTickAt) / 1000)
      lastTickAt = now

      if (document.visibilityState !== 'visible') return
      saveProgress(elapsedSeconds)
    }

    const onVisibilityChange = () => {
      lastTickAt = Date.now()
    }

    const timer = window.setInterval(onTick, WATCH_PROGRESS_TICK_MS)
    window.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('visibilitychange', onVisibilityChange)

      if (document.visibilityState !== 'visible') return
      const elapsedSeconds = Math.round((Date.now() - lastTickAt) / 1000)
      saveProgress(elapsedSeconds)
    }
  }, [movie, addHistory])

  const key = contentKey(id)
  const preferredLabel = preferredSources[key]

  const rawSources = useMemo(
    () =>
      movie
        ? [
            { label: 'VidSrc', url: `https://vidsrc.cc/v2/embed/movie/${id}` },
            { label: 'embed.su', url: `https://embed.su/embed/movie/${id}` },
            ...(movie.imdb_id
              ? [{ label: '2embed', url: `https://www.2embed.cc/embed/${movie.imdb_id}` }]
              : []),
          ]
        : [],
    [movie, id],
  )

  const sources = useMemo<SourceOption[]>(
    () =>
      rawSources.map((source) => ({
        ...source,
        unstable: getFailureCount(sourceHealth, key, source.label) >= 2,
      })),
    [rawSources, sourceHealth, key],
  )

  const sortedSources = useMemo(() => {
    const next = [...sources]
    if (preferredLabel) {
      next.sort((a, b) => {
        if (a.label === preferredLabel) return -1
        if (b.label === preferredLabel) return 1
        return 0
      })
    }
    return next
  }, [sources, preferredLabel])

  const defaultSource = useMemo(() => {
    if (sortedSources.length === 0) return ''
    const preferred = sortedSources.find((source) => source.label === preferredLabel)
    if (preferred && !preferred.unstable) return preferred.url

    const healthy = sortedSources.find((source) => !source.unstable)
    return (healthy ?? preferred ?? sortedSources[0]).url
  }, [sortedSources, preferredLabel])

  const explicitSourceItem = sortedSources.find((source) => source.url === activeSource)
  const effectiveSource = explicitSourceItem?.url ?? defaultSource
  const effectiveSourceItem = explicitSourceItem ?? sortedSources.find((source) => source.url === defaultSource)

  useEffect(() => {
    return () => {
      if (hintTimeoutRef.current) {
        window.clearTimeout(hintTimeoutRef.current)
      }
    }
  }, [])

  const showHotkeyHint = useCallback((message: string) => {
    setHotkeyHint(message)

    if (hintTimeoutRef.current) {
      window.clearTimeout(hintTimeoutRef.current)
    }

    hintTimeoutRef.current = window.setTimeout(() => {
      setHotkeyHint(null)
    }, 2200)
  }, [])

  const selectSource = useCallback((url: string, manual: boolean) => {
    const found = sortedSources.find((source) => source.url === url)
    if (!found) return

    setActiveSource(url)
    setAttemptedSources([])
    setSourceNotice(null)

    if (manual) {
      setPreferredSource(key, found.label)
      showHotkeyHint(`${found.label} selected`)
    }
  }, [sortedSources, setPreferredSource, key, showHotkeyHint])

  const moveSource = useCallback((direction: 'prev' | 'next') => {
    if (!sortedSources.length) return

    const currentIndex = sortedSources.findIndex((source) => source.url === effectiveSource)
    const safeIndex = currentIndex >= 0 ? currentIndex : 0
    const delta = direction === 'next' ? 1 : -1
    const nextIndex = (safeIndex + delta + sortedSources.length) % sortedSources.length

    selectSource(sortedSources[nextIndex].url, true)
  }, [sortedSources, effectiveSource, selectSource])

  const handleSourceTimeout = useCallback(() => {
    if (!effectiveSourceItem) return

    markSourceFailure(key, effectiveSourceItem.label)

    const attempted = new Set([...attemptedSources, effectiveSourceItem.url])
    setAttemptedSources(Array.from(attempted))

    const fallback = sortedSources.find((source) => !attempted.has(source.url))

    if (!fallback) {
      setSourceNotice('All sources look unstable right now. Please try again later.')
      return
    }

    setSourceNotice(`${effectiveSourceItem.label} timed out. Switched to ${fallback.label}.`)
    setActiveSource(fallback.url)
  }, [effectiveSourceItem, markSourceFailure, key, attemptedSources, sortedSources])

  const handleSourceReady = useCallback(() => {
    if (!effectiveSourceItem) return
    markSourceSuccess(key, effectiveSourceItem.label)
    setPreferredSource(key, effectiveSourceItem.label)
  }, [effectiveSourceItem, markSourceSuccess, setPreferredSource, key])

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        showHotkeyHint('Exit fullscreen')
        return
      }

      if (playerWrapRef.current?.requestFullscreen) {
        await playerWrapRef.current.requestFullscreen()
        showHotkeyHint('Fullscreen enabled')
      }
    } catch {
      showHotkeyHint('Fullscreen not available')
    }
  }, [showHotkeyHint])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return

      if (event.key === '?') {
        event.preventDefault()
        setHotkeyHelpOpen((value) => !value)
        return
      }

      if (!shortcutsEnabled) return

      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault()
        void toggleFullscreen()
        return
      }

      if (event.key === ']') {
        event.preventDefault()
        moveSource('next')
        return
      }

      if (event.key === '[') {
        event.preventDefault()
        moveSource('prev')
        return
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        moveSource('next')
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        moveSource('prev')
        return
      }

      if (event.key === ' ') {
        event.preventDefault()
        showHotkeyHint('Use embedded player controls for play/pause.')
        return
      }

      if (event.key.toLowerCase() === 'm') {
        event.preventDefault()
        setMutedHint((value) => !value)
        showHotkeyHint('Mute state depends on provider player controls.')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    shortcutsEnabled,
    moveSource,
    toggleFullscreen,
    showHotkeyHint,
  ])

  if (isError) {
    return (
      <div className="page-shell flex items-center justify-center">
        <div className="page-block p-8 text-center max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-foreground font-semibold text-lg">Failed to load movie</p>
          <p className="text-muted-foreground text-sm mt-1">Please try again in a moment.</p>
          <Link to="/" className="btn-primary mt-5">
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  const year = movie?.release_date?.slice(0, 4) ?? ''

  return (
    <div className="page-shell !pt-20">
      <section className="page-block p-4 sm:p-6 lg:p-7">
        <Link to={`/movie/${id}`} className="btn-ghost mb-4">
          <ChevronLeft className="w-4 h-4" />
          Back to details
        </Link>

        <div ref={playerWrapRef}>
          {isLoading || !effectiveSource ? (
            <div className="w-full aspect-video bg-muted animate-pulse rounded-xl" />
          ) : (
            <VideoPlayer
              src={effectiveSource}
              title={movie?.title}
              onLoad={handleSourceReady}
              onProviderTimeout={handleSourceTimeout}
            />
          )}
        </div>

        <div className="mt-5">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-7 w-64 bg-muted animate-pulse rounded" />
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            </div>
          ) : (
            <h1 className="page-title !text-2xl sm:!text-3xl">
              {movie?.title}
              {year && <span className="text-muted-foreground font-normal ml-2 text-base">({year})</span>}
            </h1>
          )}
        </div>

        <MobileAccordionSection
          title="Playback Controls"
          description="Source selector and playback helpers."
          defaultOpenMobile
        >
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {sources.length > 0 && (
              <SourceSelector
                sources={sortedSources}
                active={effectiveSource}
                onChange={(url) => selectSource(url, true)}
              />
            )}

            <button type="button" onClick={toggleShortcuts} className="btn-ghost">
              <Keyboard className="w-3.5 h-3.5" />
              {shortcutsEnabled ? 'Shortcuts On' : 'Shortcuts Off'}
            </button>

            <button
              type="button"
              onClick={() => setHotkeyHelpOpen((value) => !value)}
              className="btn-ghost"
            >
              <MonitorUp className="w-3.5 h-3.5" />
              Hotkeys
            </button>
          </div>

          {sourceNotice && (
            <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {sourceNotice}
            </div>
          )}

          {hotkeyHint && (
            <div className="mt-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent-foreground">
              {hotkeyHint}
            </div>
          )}

          {mutedHint && (
            <div className="mt-2 text-xs text-muted-foreground">
              Mute preference toggled locally. Final audio is controlled by the embedded provider.
            </div>
          )}
        </MobileAccordionSection>

        {id && (
          <MobileAccordionSection
            title="Subtitles"
            description="Load subtitle options for this movie."
          >
            <SubtitleSelector tmdbId={id} mediaType="movie" />
          </MobileAccordionSection>
        )}
      </section>

      {hotkeyHelpOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md page-block p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-foreground font-semibold">Keyboard Shortcuts</h2>
              <button
                type="button"
                onClick={() => setHotkeyHelpOpen(false)}
                className="btn-ghost"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p><span className="text-foreground font-medium">?</span> Toggle this help panel</p>
              <p><span className="text-foreground font-medium">F</span> Toggle fullscreen</p>
              <p><span className="text-foreground font-medium">[ / ]</span> Previous or next source</p>
              <p><span className="text-foreground font-medium">Left / Right</span> Previous or next source</p>
              <p><span className="text-foreground font-medium">Space</span> Show playback hint</p>
              <p><span className="text-foreground font-medium">M</span> Toggle local mute hint state</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
