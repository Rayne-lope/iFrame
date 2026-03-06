import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, AlertCircle, Keyboard, MonitorUp } from 'lucide-react'
import { getTVDetail, getTVSeason } from '@/api/tmdb'
import VideoPlayer from '@/components/player/VideoPlayer'
import SourceSelector from '@/components/player/SourceSelector'
import SubtitleSelector from '@/components/player/SubtitleSelector'
import TVEpisodeBrowser from '@/components/player/TVEpisodeBrowser'
import MobileAccordionSection from '@/components/ui/MobileAccordionSection'
import { useHistoryStore } from '@/store/historyStore'
import { getFailureCount, usePlayerStore } from '@/store/playerStore'

type SourceOption = {
  label: string
  url: string
  unstable: boolean
}

const PLAYER_ORIGIN_HINTS = ['vidsrc', 'embed.su', '2embed', '2embed.cc']
const WATCH_PROGRESS_TICK_MS = 5000
const COMPLETED_PROGRESS_PERCENT = 95

function contentKey(id: string | undefined): string {
  return `tv:${id ?? ''}`
}

function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element) return false

  const tagName = element.tagName.toLowerCase()
  return tagName === 'input' || tagName === 'textarea' || element.isContentEditable
}

function looksLikePlayerEndMessage(event: MessageEvent): boolean {
  if (!event.origin) return false

  const trustedOrigin = PLAYER_ORIGIN_HINTS.some((hint) => event.origin.includes(hint))
  if (!trustedOrigin) return false

  let payload = ''
  if (typeof event.data === 'string') {
    payload = event.data
  } else {
    try {
      payload = JSON.stringify(event.data)
    } catch {
      payload = ''
    }
  }

  const normalized = payload.toLowerCase()
  return (
    normalized.includes('ended') ||
    normalized.includes('complete') ||
    normalized.includes('video_end') ||
    normalized.includes('playback_finished')
  )
}

function computeProgressPercent(positionSeconds: number, durationSeconds?: number): number | undefined {
  if (!durationSeconds || durationSeconds <= 0) return undefined
  const raw = (positionSeconds / durationSeconds) * 100
  return Math.max(0, Math.min(100, Math.round(raw)))
}

export default function WatchTV() {
  const { id, s, e } = useParams<{ id: string; s: string; e: string }>()
  const navigate = useNavigate()
  const addHistory = useHistoryStore((state) => state.add)
  const historyItems = useHistoryStore((state) => state.items)

  const preferredSources = usePlayerStore((state) => state.preferredSources)
  const sourceHealth = usePlayerStore((state) => state.sourceHealth)
  const setPreferredSource = usePlayerStore((state) => state.setPreferredSource)
  const markSourceFailure = usePlayerStore((state) => state.markSourceFailure)
  const markSourceSuccess = usePlayerStore((state) => state.markSourceSuccess)
  const shortcutsEnabled = usePlayerStore((state) => state.shortcutsEnabled)
  const toggleShortcuts = usePlayerStore((state) => state.toggleShortcuts)
  const autoNext = usePlayerStore((state) => state.autoNext)
  const toggleAutoNext = usePlayerStore((state) => state.toggleAutoNext)

  const parsedSeasonNum = Number.parseInt(s ?? '1', 10)
  const parsedEpisodeNum = Number.parseInt(e ?? '1', 10)
  const seasonNum = Number.isFinite(parsedSeasonNum) && parsedSeasonNum > 0 ? parsedSeasonNum : 1
  const episodeNum = Number.isFinite(parsedEpisodeNum) && parsedEpisodeNum > 0 ? parsedEpisodeNum : 1
  const episodeKey = `${id ?? ''}:${seasonNum}:${episodeNum}`

  const [activeSource, setActiveSource] = useState('')
  const [attemptedSources, setAttemptedSources] = useState<string[]>([])
  const [sourceNotice, setSourceNotice] = useState<string | null>(null)
  const [hotkeyHelpOpen, setHotkeyHelpOpen] = useState(false)
  const [hotkeyHint, setHotkeyHint] = useState<string | null>(null)
  const [mutedHint, setMutedHint] = useState(false)
  const [browserSeason, setBrowserSeason] = useState(seasonNum)
  const [autoNextState, setAutoNextState] = useState<{ key: string; value: number | null }>({
    key: '',
    value: null,
  })

  const hintTimeoutRef = useRef<number | null>(null)
  const playerWrapRef = useRef<HTMLDivElement>(null)
  const watchedSecondsRef = useRef(0)

  const { data: show, isError: showError } = useQuery({
    queryKey: ['tv', id],
    queryFn: () => getTVDetail(id!),
    enabled: !!id,
  })

  const { data: season } = useQuery({
    queryKey: ['tv', id, 'season', seasonNum],
    queryFn: () => getTVSeason(id!, seasonNum),
    enabled: !!id,
  })

  const { data: browserSeasonData, isLoading: browserSeasonLoading } = useQuery({
    queryKey: ['tv', id, 'season', browserSeason],
    queryFn: () => getTVSeason(id!, browserSeason),
    enabled: !!id,
  })

  useEffect(() => {
    setBrowserSeason(seasonNum)
  }, [id, seasonNum])

  useEffect(() => {
    if (!show) return

    const originalLanguage = (show as { original_language?: string }).original_language
    const genreIds = show.genres?.map((genre) => genre.id)

    addHistory({
      id: show.id,
      name: show.name,
      poster_path: show.poster_path,
      media_type: 'tv',
      vote_average: show.vote_average,
      year: show.first_air_date?.slice(0, 4) ?? '',
      genre_ids: genreIds,
      original_language: originalLanguage,
      season: seasonNum,
      episode: episodeNum,
      watchedAt: Date.now(),
    })
  }, [show?.id, seasonNum, episodeNum]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!id) return
    const tvId = Number.parseInt(id, 10)
    if (!Number.isFinite(tvId)) return

    const existing = historyItems.find(
      (item) =>
        item.media_type === 'tv' &&
        item.id === tvId &&
        item.season === seasonNum &&
        item.episode === episodeNum,
    )

    watchedSecondsRef.current = existing?.position_seconds ?? 0
  }, [historyItems, id, seasonNum, episodeNum])

  const episodes = season?.episodes ?? []
  const browserEpisodes = browserSeasonData?.episodes ?? []
  const currentEpIndex = episodes.findIndex((episode) => episode.episode_number === episodeNum)
  const prevEp = currentEpIndex > 0 ? episodes[currentEpIndex - 1] : null
  const nextEp =
    currentEpIndex >= 0 && currentEpIndex < episodes.length - 1
      ? episodes[currentEpIndex + 1]
      : null
  const currentEp = episodes[currentEpIndex]
  const episodeProgress = useMemo(() => {
    const progress = new Map<number, (typeof historyItems)[number]>()
    if (!id) return progress

    const tvId = Number.parseInt(id, 10)
    if (!Number.isFinite(tvId)) return progress

    historyItems.forEach((item) => {
      if (
        item.media_type === 'tv' &&
        item.id === tvId &&
        item.season === browserSeason &&
        typeof item.episode === 'number'
      ) {
        progress.set(item.episode, item)
      }
    })

    return progress
  }, [historyItems, id, browserSeason])
  const seasonCount = Math.max(show?.number_of_seasons ?? 0, browserSeason, seasonNum, 1)

  useEffect(() => {
    if (!show) return

    const durationSeconds = currentEp?.runtime ? currentEp.runtime * 60 : undefined
    const originalLanguage = (show as { original_language?: string }).original_language
    const genreIds = show.genres?.map((genre) => genre.id)
    let lastTickAt = Date.now()

    const saveProgress = (elapsedSeconds: number) => {
      if (elapsedSeconds <= 0) return

      watchedSecondsRef.current += elapsedSeconds

      const progressPercent = computeProgressPercent(watchedSecondsRef.current, durationSeconds)
      const completed = typeof progressPercent === 'number' && progressPercent >= COMPLETED_PROGRESS_PERCENT

      addHistory({
        id: show.id,
        name: show.name,
        poster_path: show.poster_path,
        media_type: 'tv',
        vote_average: show.vote_average,
        year: show.first_air_date?.slice(0, 4) ?? '',
        genre_ids: genreIds,
        original_language: originalLanguage,
        season: seasonNum,
        episode: episodeNum,
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
  }, [show, seasonNum, episodeNum, currentEp?.runtime, addHistory])

  const key = contentKey(id)
  const preferredLabel = preferredSources[key]

  const rawSources = useMemo(
    () => [
      { label: 'VidSrc', url: `https://vidsrc.cc/v2/embed/tv/${id}/${seasonNum}/${episodeNum}` },
      { label: 'embed.su', url: `https://embed.su/embed/tv/${id}/${seasonNum}/${episodeNum}` },
    ],
    [id, seasonNum, episodeNum],
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
  const autoNextCountdown = autoNextState.key === episodeKey ? autoNextState.value : null

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

  const navigateEpisode = useCallback((direction: 'prev' | 'next') => {
    if (!id) return

    if (direction === 'prev' && prevEp) {
      navigate(`/watch/tv/${id}/${seasonNum}/${prevEp.episode_number}`)
      return
    }

    if (direction === 'next' && nextEp) {
      navigate(`/watch/tv/${id}/${seasonNum}/${nextEp.episode_number}`)
    }
  }, [id, seasonNum, prevEp, nextEp, navigate])

  const startAutoNextCountdown = useCallback((seconds: number = 8) => {
    if (!nextEp || !autoNext) return
    setAutoNextState({ key: episodeKey, value: seconds })
  }, [nextEp, autoNext, episodeKey])

  useEffect(() => {
    if (!nextEp || !autoNext) return

    function onMessage(event: MessageEvent) {
      if (looksLikePlayerEndMessage(event)) {
        startAutoNextCountdown(8)
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [nextEp, autoNext, startAutoNextCountdown])

  useEffect(() => {
    if (autoNextCountdown == null) return
    if (autoNextCountdown <= 0) {
      if (nextEp && id) {
        navigate(`/watch/tv/${id}/${seasonNum}/${nextEp.episode_number}`)
      }
      return
    }

    const timer = window.setTimeout(() => {
      setAutoNextState((state) => {
        if (state.key !== episodeKey || state.value == null) return state
        return { ...state, value: state.value - 1 }
      })
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [autoNextCountdown, nextEp, id, seasonNum, navigate, episodeKey])

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

      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'n') {
        event.preventDefault()
        navigateEpisode('next')
        return
      }

      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'p') {
        event.preventDefault()
        navigateEpisode('prev')
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
  }, [shortcutsEnabled, toggleFullscreen, moveSource, navigateEpisode, showHotkeyHint])

  if (showError) {
    return (
      <div className="page-shell flex items-center justify-center">
        <div className="page-block p-8 text-center max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-foreground font-semibold text-lg">Failed to load show</p>
          <p className="text-muted-foreground text-sm mt-1">Please try again in a moment.</p>
          <Link to="/" className="btn-primary mt-5">
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell !pt-20">
      <section className="page-block p-4 sm:p-6 lg:p-7">
        <Link to={`/tv/${id}`} className="btn-ghost mb-4">
          <ChevronLeft className="w-4 h-4" />
          Back to details
        </Link>

        <div ref={playerWrapRef}>
          <VideoPlayer
            src={effectiveSource}
            title={show?.name}
            onLoad={handleSourceReady}
            onProviderTimeout={handleSourceTimeout}
          />
        </div>

        {autoNextCountdown != null && nextEp && (
          <div className="mt-3 flex flex-col gap-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>Next episode starts in {autoNextCountdown}s</span>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() =>
                  setAutoNextState((state) =>
                    state.key === episodeKey ? { ...state, value: null } : state,
                  )
                }
                className="btn-ghost w-full !px-2 !py-1 sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!id) return
                  navigate(`/watch/tv/${id}/${seasonNum}/${nextEp.episode_number}`)
                }}
                className="btn-primary w-full !px-2.5 !py-1.5 !text-xs sm:w-auto"
              >
                Skip Now
              </button>
            </div>
          </div>
        )}

        <div className="mt-5">
          <h1 className="page-title !text-2xl sm:!text-3xl">{show?.name ?? '...'}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            S{s}E{e}
            {currentEp ? ` — ${currentEp.name}` : ''}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          {prevEp ? (
            <button onClick={() => navigateEpisode('prev')} className="btn-ghost w-full !text-sm !px-3 !py-1.5 sm:w-auto">
              <ChevronLeft className="w-4 h-4" />
              Prev Episode
            </button>
          ) : (
            <div />
          )}

          {nextEp && (
            <button onClick={() => navigateEpisode('next')} className="btn-ghost w-full !text-sm !px-3 !py-1.5 sm:w-auto">
              Next Episode
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <MobileAccordionSection
          title="Playback Controls"
          description="Source, auto next, and shortcut helpers."
          defaultOpenMobile
        >
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <SourceSelector
              sources={sortedSources}
              active={effectiveSource}
              onChange={(url) => selectSource(url, true)}
            />

            <button
              type="button"
              onClick={toggleAutoNext}
              className={autoNext ? 'gold-chip !text-xs' : 'btn-ghost'}
            >
              Auto Next {autoNext ? 'On' : 'Off'}
            </button>

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
            title="Episodes"
            description="Browse the current season and jump between episodes."
          >
            <TVEpisodeBrowser
              tvId={id}
              currentSeason={seasonNum}
              currentEpisode={episodeNum}
              browserSeason={browserSeason}
              seasonCount={seasonCount}
              episodes={browserEpisodes}
              loading={browserSeasonLoading}
              episodeProgress={episodeProgress}
              onSeasonChange={setBrowserSeason}
            />
          </MobileAccordionSection>
        )}

        {id && (
          <MobileAccordionSection
            title="Subtitles"
            description="Load subtitle options for the active episode."
          >
            <SubtitleSelector
              tmdbId={id}
              mediaType="tv"
              season={String(seasonNum)}
              episode={String(episodeNum)}
            />
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
              <p><span className="text-foreground font-medium">Left / P</span> Previous episode</p>
              <p><span className="text-foreground font-medium">Right / N</span> Next episode</p>
              <p><span className="text-foreground font-medium">Space</span> Show playback hint</p>
              <p><span className="text-foreground font-medium">M</span> Toggle local mute hint state</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
