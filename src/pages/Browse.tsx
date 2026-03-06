import { useMemo } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { discoverMedia, getGenres } from '@/api/tmdb'
import MovieGrid from '@/components/ui/MovieGrid'
import type { DiscoverMediaType, DiscoverSortBy, Genre, MediaItem } from '@/types/tmdb'

type BrowseType = 'movies' | 'series' | 'anime'
type AnimeSource = 'all' | 'tv' | 'movie'

type TypeConfig = {
  title: string
  subtitle: string
  mediaType: DiscoverMediaType
  genreType: DiscoverMediaType
  defaultSort: DiscoverSortBy
}

const TYPE_CONFIG: Record<Exclude<BrowseType, 'anime'>, TypeConfig> = {
  movies: {
    title: 'Browse Movies',
    subtitle: 'Discover films by genre, year, rating, and popularity',
    mediaType: 'movie',
    genreType: 'movie',
    defaultSort: 'popularity.desc',
  },
  series: {
    title: 'Browse Series',
    subtitle: 'Explore TV shows with smart filtering options',
    mediaType: 'tv',
    genreType: 'tv',
    defaultSort: 'popularity.desc',
  },
}

const SORT_OPTIONS: Record<BrowseType, { value: DiscoverSortBy; label: string }[]> = {
  movies: [
    { value: 'popularity.desc', label: 'Most Popular' },
    { value: 'vote_average.desc', label: 'Top Rated' },
    { value: 'release_date.desc', label: 'Newest Release' },
  ],
  series: [
    { value: 'popularity.desc', label: 'Most Popular' },
    { value: 'vote_average.desc', label: 'Top Rated' },
    { value: 'first_air_date.desc', label: 'Newest Air Date' },
  ],
  anime: [
    { value: 'popularity.desc', label: 'Most Popular' },
    { value: 'vote_average.desc', label: 'Top Rated' },
    { value: 'first_air_date.desc', label: 'Newest Air Date' },
  ],
}

const ANIME_GENRE_ID = '16'

function isBrowseType(value: string | undefined): value is BrowseType {
  return value === 'movies' || value === 'series' || value === 'anime'
}

function normalizeSort(type: BrowseType, rawSort: string | null): DiscoverSortBy {
  const options = SORT_OPTIONS[type]
  const found = options.find((option) => option.value === rawSort)
  return found?.value ?? options[0].value
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return parsed
}

function parseYear(value: string | null): number | undefined {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1900 || parsed > 2100) return undefined
  return parsed
}

function parseRating(value: string | null): number | undefined {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 10) return undefined
  return parsed
}

function mapSortForMedia(sortBy: DiscoverSortBy, mediaType: DiscoverMediaType): DiscoverSortBy {
  if (mediaType === 'movie' && sortBy.startsWith('first_air_date')) {
    return sortBy === 'first_air_date.asc' ? 'release_date.asc' : 'release_date.desc'
  }
  if (mediaType === 'tv' && sortBy.startsWith('release_date')) {
    return sortBy === 'release_date.asc' ? 'first_air_date.asc' : 'first_air_date.desc'
  }
  return sortBy
}

function normalizeMediaResults(items: MediaItem[], mediaType: DiscoverMediaType): MediaItem[] {
  return items.map((item) => ({
    ...item,
    media_type: mediaType,
  }))
}

function interleave(itemsA: MediaItem[], itemsB: MediaItem[]): MediaItem[] {
  const merged: MediaItem[] = []
  const maxLength = Math.max(itemsA.length, itemsB.length)

  for (let index = 0; index < maxLength; index += 1) {
    if (itemsA[index]) merged.push(itemsA[index])
    if (itemsB[index]) merged.push(itemsB[index])
  }

  return merged
}

function buildGenreOptions(genres: Genre[] | undefined): { value: string; label: string }[] {
  return [
    { value: 'all', label: 'All Genres' },
    ...(genres ?? []).map((genre) => ({ value: String(genre.id), label: genre.name })),
  ]
}

export default function Browse() {
  const { type } = useParams<{ type: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const browseType: BrowseType = isBrowseType(type) ? type : 'movies'
  const shouldRedirect = !isBrowseType(type)

  const isAnime = browseType === 'anime'
  const baseConfig = browseType === 'anime' ? null : TYPE_CONFIG[browseType]

  const page = parsePositiveInt(searchParams.get('p'), 1)
  const selectedGenre = searchParams.get('g') ?? 'all'
  const selectedYear = parseYear(searchParams.get('y'))
  const selectedRating = parseRating(searchParams.get('r'))
  const selectedSort = normalizeSort(browseType, searchParams.get('s'))
  const animeSource = (searchParams.get('src') as AnimeSource) || 'all'

  const { data: movieGenresData } = useQuery({
    queryKey: ['genres', 'movie'],
    queryFn: () => getGenres('movie'),
  })

  const { data: tvGenresData } = useQuery({
    queryKey: ['genres', 'tv'],
    queryFn: () => getGenres('tv'),
  })

  const genres = useMemo(() => {
    if (isAnime) {
      const tvGenres = tvGenresData?.genres ?? []
      return tvGenres.filter((genre) => genre.id !== Number(ANIME_GENRE_ID))
    }
    return baseConfig?.genreType === 'tv' ? tvGenresData?.genres ?? [] : movieGenresData?.genres ?? []
  }, [isAnime, baseConfig, movieGenresData, tvGenresData])

  const genreOptions = useMemo(() => buildGenreOptions(genres), [genres])

  const discoverParams = {
    page,
    withGenres: selectedGenre !== 'all' ? selectedGenre : undefined,
    sortBy: selectedSort,
    voteAverageGte: selectedRating,
    year: selectedYear,
    includeAdult: false,
  }

  const movieQuery = useQuery({
    queryKey: ['browse', browseType, 'movie', page, selectedGenre, selectedSort, selectedRating, selectedYear, animeSource],
    queryFn: () =>
      discoverMedia('movie', {
        ...discoverParams,
        withGenres:
          isAnime
            ? [ANIME_GENRE_ID, selectedGenre !== 'all' ? selectedGenre : null]
                .filter(Boolean)
                .join(',')
            : discoverParams.withGenres,
        sortBy: mapSortForMedia(selectedSort, 'movie'),
        withOriginalLanguage: isAnime ? 'ja' : undefined,
      }),
    enabled: browseType === 'movies' || browseType === 'anime' ? animeSource !== 'tv' : false,
  })

  const tvQuery = useQuery({
    queryKey: ['browse', browseType, 'tv', page, selectedGenre, selectedSort, selectedRating, selectedYear, animeSource],
    queryFn: () =>
      discoverMedia('tv', {
        ...discoverParams,
        withGenres:
          isAnime
            ? [ANIME_GENRE_ID, selectedGenre !== 'all' ? selectedGenre : null]
                .filter(Boolean)
                .join(',')
            : discoverParams.withGenres,
        sortBy: mapSortForMedia(selectedSort, 'tv'),
        withOriginalLanguage: isAnime ? 'ja' : undefined,
      }),
    enabled: browseType === 'series' || browseType === 'anime' ? animeSource !== 'movie' : false,
  })

  const items = useMemo<MediaItem[]>(() => {
    if (browseType === 'movies') {
      return normalizeMediaResults((movieQuery.data?.results ?? []) as MediaItem[], 'movie')
    }
    if (browseType === 'series') {
      return normalizeMediaResults((tvQuery.data?.results ?? []) as MediaItem[], 'tv')
    }

    const movieItems = normalizeMediaResults((movieQuery.data?.results ?? []) as MediaItem[], 'movie')
    const tvItems = normalizeMediaResults((tvQuery.data?.results ?? []) as MediaItem[], 'tv')

    if (animeSource === 'movie') return movieItems
    if (animeSource === 'tv') return tvItems
    return interleave(tvItems, movieItems)
  }, [browseType, movieQuery.data, tvQuery.data, animeSource])

  const totalPages = useMemo(() => {
    if (browseType === 'movies') return movieQuery.data?.total_pages ?? 1
    if (browseType === 'series') return tvQuery.data?.total_pages ?? 1
    if (animeSource === 'movie') return movieQuery.data?.total_pages ?? 1
    if (animeSource === 'tv') return tvQuery.data?.total_pages ?? 1
    return Math.max(movieQuery.data?.total_pages ?? 1, tvQuery.data?.total_pages ?? 1)
  }, [browseType, animeSource, movieQuery.data, tvQuery.data])

  const isLoading =
    (browseType === 'movies' && movieQuery.isLoading) ||
    (browseType === 'series' && tvQuery.isLoading) ||
    (browseType === 'anime' &&
      ((animeSource !== 'tv' && movieQuery.isLoading) ||
        (animeSource !== 'movie' && tvQuery.isLoading)))

  const isError =
    (browseType === 'movies' && movieQuery.isError) ||
    (browseType === 'series' && tvQuery.isError) ||
    (browseType === 'anime' &&
      ((animeSource !== 'tv' && movieQuery.isError) ||
        (animeSource !== 'movie' && tvQuery.isError)))

  const title =
    browseType === 'anime'
      ? 'Browse Anime'
      : baseConfig?.title ?? 'Browse'

  const subtitle =
    browseType === 'anime'
      ? 'Japanese animation picks across movies and TV'
      : baseConfig?.subtitle ?? 'Browse catalog'

  const years = useMemo(() => {
    const current = new Date().getFullYear()
    return Array.from({ length: 35 }, (_, index) => current - index)
  }, [])

  function updateParams(updates: Record<string, string | null>, resetPage: boolean = true) {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === 'all') {
        next.delete(key)
      } else {
        next.set(key, value)
      }
    })
    if (resetPage) {
      next.set('p', '1')
    }
    setSearchParams(next)
  }

  if (shouldRedirect) {
    return <Navigate to="/browse/movies" replace />
  }

  return (
    <div className="page-shell">
      <section className="page-block p-5 sm:p-7 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-5">
          <div>
            <h1 className="page-title">{title}</h1>
            <p className="page-subtitle mt-1">{subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/browse/movies"
              className={
                browseType === 'movies'
                  ? 'gold-chip !text-sm'
                  : 'muted-chip !text-sm hover:text-foreground hover:border-accent/35 transition-colors'
              }
            >
              Movies
            </Link>
            <Link
              to="/browse/series"
              className={
                browseType === 'series'
                  ? 'gold-chip !text-sm'
                  : 'muted-chip !text-sm hover:text-foreground hover:border-accent/35 transition-colors'
              }
            >
              Series
            </Link>
            <Link
              to="/browse/anime"
              className={
                browseType === 'anime'
                  ? 'gold-chip !text-sm'
                  : 'muted-chip !text-sm hover:text-foreground hover:border-accent/35 transition-colors'
              }
            >
              Anime
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <select
            className="rounded-xl border border-border bg-surface/80 px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent/45"
            value={selectedGenre}
            onChange={(event) => updateParams({ g: event.target.value })}
          >
            {genreOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border border-border bg-surface/80 px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent/45"
            value={selectedYear ?? 'all'}
            onChange={(event) => updateParams({ y: event.target.value === 'all' ? null : event.target.value })}
          >
            <option value="all">All Years</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border border-border bg-surface/80 px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent/45"
            value={selectedRating ?? 'all'}
            onChange={(event) => updateParams({ r: event.target.value === 'all' ? null : event.target.value })}
          >
            <option value="all">Any Rating</option>
            <option value="6">6.0+</option>
            <option value="7">7.0+</option>
            <option value="8">8.0+</option>
          </select>

          <select
            className="rounded-xl border border-border bg-surface/80 px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent/45"
            value={selectedSort}
            onChange={(event) => updateParams({ s: event.target.value })}
          >
            {SORT_OPTIONS[browseType].map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {browseType === 'anime' && (
            <select
              className="rounded-xl border border-border bg-surface/80 px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent/45"
              value={animeSource}
              onChange={(event) => updateParams({ src: event.target.value })}
            >
              <option value="all">All Sources</option>
              <option value="tv">TV Anime</option>
              <option value="movie">Anime Movies</option>
            </select>
          )}

          <button
            type="button"
            className="rounded-xl border border-border bg-surface/80 px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground hover:border-accent/35"
            onClick={() => setSearchParams({})}
          >
            Reset Filters
          </button>
        </div>
      </section>

      {!isLoading && !isError && (
        <p className="text-muted-foreground text-sm mb-4">
          Showing {items.length} title{items.length !== 1 ? 's' : ''} on page {page}
        </p>
      )}

      {isError && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Failed to load discovery results. Try changing filters or refreshing the page.
        </div>
      )}

      <MovieGrid items={items} loading={isLoading} />

      {!isLoading && !isError && items.length === 0 && (
        <div className="page-block mt-8 px-4 py-8 text-center text-muted-foreground">
          No results for the selected filters.
        </div>
      )}

      {!isLoading && totalPages > 1 && (
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <button
            onClick={() => updateParams({ p: String(Math.max(1, page - 1)) }, false)}
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
            onClick={() => updateParams({ p: String(Math.min(totalPages, page + 1)) }, false)}
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
