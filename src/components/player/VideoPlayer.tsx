import { useEffect, useState } from 'react'

interface VideoPlayerProps {
  src: string
  title?: string
  loadTimeoutMs?: number
  onLoad?: () => void
  onProviderTimeout?: () => void
}

export default function VideoPlayer({
  src,
  title,
  loadTimeoutMs = 12000,
  onLoad,
  onProviderTimeout,
}: VideoPlayerProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const loaded = Boolean(src) && loadedSrc === src

  useEffect(() => {
    if (!src || loaded) return

    const timeout = window.setTimeout(() => {
      onProviderTimeout?.()
    }, loadTimeoutMs)

    return () => window.clearTimeout(timeout)
  }, [src, loaded, loadTimeoutMs, onProviderTimeout])

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <iframe
        key={src}
        src={src}
        title={title ?? 'Video Player'}
        className="absolute inset-0 w-full h-full"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
        referrerPolicy="no-referrer"
        onLoad={() => {
          setLoadedSrc(src)
          onLoad?.()
        }}
      />
    </div>
  )
}
