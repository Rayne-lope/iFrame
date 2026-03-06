const BASE_URL = 'https://api.opensubtitles.com/api/v1'
const TOKEN_KEY = 'osToken'

export interface SubtitleFile {
  file_id: number
  file_name: string
}

export interface SubtitleAttributes {
  language: string
  files: SubtitleFile[]
}

export interface SubtitleResult {
  id: string
  attributes: SubtitleAttributes
}

async function osFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': import.meta.env.VITE_OPENSUBTITLES_KEY ?? '',
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`OpenSubtitles error: ${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export async function getOSToken(): Promise<string> {
  const cached = sessionStorage.getItem(TOKEN_KEY)
  if (cached) return cached

  const data = await osFetch<{ token: string }>('/login', {
    method: 'POST',
    body: JSON.stringify({
      username: import.meta.env.VITE_OPENSUBTITLES_USER ?? '',
      password: import.meta.env.VITE_OPENSUBTITLES_PASS ?? '',
    }),
  })

  sessionStorage.setItem(TOKEN_KEY, data.token)
  return data.token
}

export async function searchSubtitles(
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  season?: string,
  episode?: string,
  languages = 'id,en',
): Promise<SubtitleResult[]> {
  const token = await getOSToken()

  const params = new URLSearchParams({
    tmdb_id: tmdbId,
    type: mediaType,
    languages,
  })
  if (season) params.set('season_number', season)
  if (episode) params.set('episode_number', episode)

  const data = await osFetch<{ data: SubtitleResult[] }>(`/subtitles?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  return data.data
}

export async function downloadSubtitle(fileId: number): Promise<string> {
  const token = await getOSToken()

  const data = await osFetch<{ link: string }>('/download', {
    method: 'POST',
    body: JSON.stringify({ file_id: fileId }),
    headers: { Authorization: `Bearer ${token}` },
  })

  return data.link
}
