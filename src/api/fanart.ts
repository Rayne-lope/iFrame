const BASE = 'https://webservice.fanart.tv/v3'

export interface FanartImage {
  id: string
  url: string
  lang: string
  likes: string
}

export interface FanartMovieImages {
  tmdb_id?: string
  imdb_id?: string
  name?: string
  movielogo?: FanartImage[]
  moviebackground?: FanartImage[]
  moviethumb?: FanartImage[]
  moviebanner?: FanartImage[]
  movieart?: FanartImage[]
  moviedisc?: FanartImage[]
  movieposter?: FanartImage[]
}

export interface FanartTVImages {
  name?: string
  thetvdb_id?: string
  hdtvlogo?: FanartImage[]
  clearlogo?: FanartImage[]
  showbackground?: FanartImage[]
  tvthumb?: FanartImage[]
  tvbanner?: FanartImage[]
  clearart?: FanartImage[]
}

async function fanartFetch<T>(endpoint: string): Promise<T> {
  const key = import.meta.env.VITE_FANART_KEY as string
  if (!key) throw new Error('VITE_FANART_KEY not set')
  const res = await fetch(`${BASE}${endpoint}?api_key=${key}`)
  if (!res.ok) throw new Error(`Fanart.tv ${res.status}`)
  return res.json() as Promise<T>
}

function normalizeFanartUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('//')) return `https:${url}`
  if (url.startsWith('http://')) return `https://${url.slice('http://'.length)}`
  return url
}

export function getFanartMovie(tmdbId: number | string): Promise<FanartMovieImages> {
  return fanartFetch<FanartMovieImages>(`/movies/${tmdbId}`)
}

export function getFanartTV(tvdbId: number | string): Promise<FanartTVImages> {
  return fanartFetch<FanartTVImages>(`/tv/${tvdbId}`)
}

/**
 * Pick the best image from a Fanart array.
 * Priority: English > language-neutral > other, then by most likes.
 */
export function bestFanartImage(images?: FanartImage[]): string | null {
  if (!images || images.length === 0) return null
  const langPriority = (x: FanartImage) =>
    x.lang === 'en' ? 2 : x.lang === '' ? 1 : 0
  const likes = (x: FanartImage) => {
    const n = parseInt(x.likes, 10)
    return isNaN(n) ? 0 : n
  }
  const sorted = [...images].sort((a, b) => {
    const diff = langPriority(b) - langPriority(a)
    return diff !== 0 ? diff : likes(b) - likes(a)
  })
  return normalizeFanartUrl(sorted[0].url)
}
