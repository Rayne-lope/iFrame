import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Subtitles } from 'lucide-react'
import { searchSubtitles, downloadSubtitle } from '@/api/opensubtitles'
import type { SubtitleResult } from '@/api/opensubtitles'

const LANG_FLAGS: Record<string, string> = {
  id: '🇮🇩',
  en: '🇬🇧',
}

interface SubtitleSelectorProps {
  tmdbId: string
  mediaType: 'movie' | 'tv'
  season?: string
  episode?: string
}

export default function SubtitleSelector({ tmdbId, mediaType, season, episode }: SubtitleSelectorProps) {
  const [enabled, setEnabled] = useState(false)
  const [downloading, setDownloading] = useState<number | null>(null)

  const { data, isLoading, isError } = useQuery<SubtitleResult[]>({
    queryKey: ['subtitles', tmdbId, mediaType, season, episode],
    queryFn: () => searchSubtitles(tmdbId, mediaType, season, episode),
    enabled,
  })

  async function handleDownload(fileId: number) {
    setDownloading(fileId)
    try {
      const link = await downloadSubtitle(fileId)
      window.open(link, '_blank', 'noopener,noreferrer')
    } catch {
      // silently fail — user will see nothing happened
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="mt-4 page-block p-3 sm:p-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium">
          <Subtitles className="w-4 h-4" />
          <span>Subtitles:</span>
        </div>

        {!enabled && (
          <button
            onClick={() => setEnabled(true)}
            className="btn-ghost"
          >
            Load Subtitles
          </button>
        )}

        {enabled && isLoading && (
          <span className="text-sm text-muted-foreground">Loading subtitle options...</span>
        )}

        {enabled && isError && (
          <span className="text-sm text-red-400">Failed to load subtitles</span>
        )}

        {enabled && data && data.length === 0 && (
          <span className="text-sm text-muted-foreground">No subtitles found for this episode.</span>
        )}

        {enabled && data && data.length > 0 &&
          data.map((result) => {
            const file = result.attributes.files[0]
            if (!file) return null
            const lang = result.attributes.language
            const flag = LANG_FLAGS[lang] ?? ''
            const label = lang.toUpperCase()

            return (
              <button
                key={result.id}
                onClick={() => handleDownload(file.file_id)}
                disabled={downloading === file.file_id}
                className="muted-chip !text-sm hover:!border-accent/45 hover:!text-foreground disabled:opacity-50"
              >
                {downloading === file.file_id ? '...' : `${flag} ${label}`}
              </button>
            )
          })
        }
      </div>
    </div>
  )
}
