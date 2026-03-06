import { tmdbImage } from '@/api/tmdb'
import type { Cast } from '@/types/tmdb'

interface CastCardProps {
  cast: Cast
}

export default function CastCard({ cast }: CastCardProps) {
  const photoUrl = tmdbImage(cast.profile_path, 'w185')

  return (
    <div className="flex-shrink-0 w-24 sm:w-24 text-center glass-card p-2.5 card-hover">
      <div className="w-[4.5rem] h-[4.5rem] sm:w-16 sm:h-16 rounded-full overflow-hidden bg-muted mx-auto mb-2 border border-border">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={cast.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            {cast.name[0]}
          </div>
        )}
      </div>
      <p className="text-foreground text-xs font-semibold leading-tight line-clamp-2">{cast.name}</p>
      <p className="text-muted-foreground text-[11px] leading-tight line-clamp-1 mt-1">{cast.character}</p>
    </div>
  )
}
