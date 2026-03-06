import type {
  Movie,
  TVShow,
  MediaItem,
  PaginatedResponse,
  CreditsResponse,
  VideosResponse,
  Season,
  Genre,
  ExternalIds,
  DiscoverMediaType,
  DiscoverParams,
} from '@/types/tmdb'

const BASE_URL = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p'

async function tmdbFetch<T>(endpoint: string): Promise<T> {
  const sep = endpoint.includes('?') ? '&' : '?'
  const url = `${BASE_URL}${endpoint}${sep}api_key=${import.meta.env.VITE_TMDB_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TMDB error: ${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export function tmdbImage(path: string | null | undefined, size: string = 'w500'): string {
  if (!path) return ''

  const normalized = path.trim()
  if (!normalized) return ''

  if (normalized.startsWith('https://') || normalized.startsWith('http://')) {
    return normalized
  }

  if (normalized.startsWith('//')) {
    return `https:${normalized}`
  }

  const pathWithSlash = normalized.startsWith('/') ? normalized : `/${normalized}`
  return `${IMAGE_BASE}/${size}${pathWithSlash}`
}

export function getTrending(
  mediaType: string = 'all',
  timeWindow: string = 'week',
): Promise<PaginatedResponse<MediaItem>> {
  return tmdbFetch(`/trending/${mediaType}/${timeWindow}`)
}

export function getPopularMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
  return tmdbFetch(`/movie/popular?page=${page}`)
}

export function getPopularTV(page: number = 1): Promise<PaginatedResponse<TVShow>> {
  return tmdbFetch(`/tv/popular?page=${page}`)
}

export function getTopRatedMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
  return tmdbFetch(`/movie/top_rated?page=${page}`)
}

export function getTopRatedTV(page: number = 1): Promise<PaginatedResponse<TVShow>> {
  return tmdbFetch(`/tv/top_rated?page=${page}`)
}

export function getUpcomingMovies(page: number = 1): Promise<PaginatedResponse<Movie>> {
  return tmdbFetch(`/movie/upcoming?page=${page}`)
}

export function getOnTheAirTV(page: number = 1): Promise<PaginatedResponse<TVShow>> {
  return tmdbFetch(`/tv/on_the_air?page=${page}`)
}

export function getMovieDetail(id: number | string): Promise<Movie> {
  return tmdbFetch(`/movie/${id}`)
}

export function getMovieCredits(id: number | string): Promise<CreditsResponse> {
  return tmdbFetch(`/movie/${id}/credits`)
}

export function getMovieVideos(id: number | string): Promise<VideosResponse> {
  return tmdbFetch(`/movie/${id}/videos`)
}

export function getMovieSimilar(id: number | string): Promise<PaginatedResponse<Movie>> {
  return tmdbFetch(`/movie/${id}/similar`)
}

export function getTVSimilar(id: number | string): Promise<PaginatedResponse<TVShow>> {
  return tmdbFetch(`/tv/${id}/similar`)
}

export function getTVDetail(id: number | string): Promise<TVShow> {
  return tmdbFetch(`/tv/${id}`)
}

export function getTVVideos(id: number | string): Promise<VideosResponse> {
  return tmdbFetch(`/tv/${id}/videos`)
}

export function getTVSeason(id: number | string, seasonNumber: number): Promise<Season> {
  return tmdbFetch(`/tv/${id}/season/${seasonNumber}`)
}

export function searchMulti(query: string, page: number = 1): Promise<PaginatedResponse<MediaItem>> {
  return tmdbFetch(`/search/multi?query=${encodeURIComponent(query)}&page=${page}`)
}

export function getGenres(type: string = 'movie'): Promise<{ genres: Genre[] }> {
  return tmdbFetch(`/genre/${type}/list`)
}

function buildDiscoverQuery(params: DiscoverParams): string {
  const query = new URLSearchParams()

  if (params.page) query.set('page', String(params.page))
  if (params.withGenres) query.set('with_genres', params.withGenres)
  if (params.sortBy) query.set('sort_by', params.sortBy)
  if (typeof params.voteAverageGte === 'number') {
    query.set('vote_average.gte', String(params.voteAverageGte))
    query.set('vote_count.gte', '100')
  }
  if (typeof params.year === 'number') {
    query.set('year', String(params.year))
    query.set('first_air_date_year', String(params.year))
  }
  if (typeof params.includeAdult === 'boolean') {
    query.set('include_adult', String(params.includeAdult))
  }
  if (params.withOriginalLanguage) {
    query.set('with_original_language', params.withOriginalLanguage)
  }

  return query.toString()
}

export function discoverMedia(
  mediaType: DiscoverMediaType,
  params: DiscoverParams = {},
): Promise<PaginatedResponse<Movie | TVShow>> {
  const query = buildDiscoverQuery(params)
  return tmdbFetch(`/discover/${mediaType}${query ? `?${query}` : ''}`)
}

export function discoverByGenre(genreId: number | string, page: number = 1): Promise<PaginatedResponse<Movie>> {
  return discoverMedia('movie', {
    withGenres: String(genreId),
    page,
  }) as Promise<PaginatedResponse<Movie>>
}

export function getTVExternalIds(id: number | string): Promise<ExternalIds> {
  return tmdbFetch(`/tv/${id}/external_ids`)
}
