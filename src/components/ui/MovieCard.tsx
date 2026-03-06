import { useNavigate, useLocation } from "react-router-dom";
import { Star } from "lucide-react";
import { tmdbImage } from "@/api/tmdb";
import type { MediaItem } from "@/types/tmdb";

interface MovieCardProps {
  item: MediaItem;
}

export default function MovieCard({ item }: MovieCardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const title = item.title ?? item.name ?? "Unknown";
  const year = (item.release_date ?? item.first_air_date ?? "").slice(0, 4);
  const mediaType = item.media_type === "tv" ? "tv" : "movie";
  const href = `/${mediaType}/${item.id}`;
  const posterUrl = tmdbImage(item.poster_path, "w342");
  const rating = Number.isFinite(item.vote_average)
    ? item.vote_average.toFixed(1)
    : "N/A";

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    navigate(href, { state: { backgroundLocation: location } });
  }

  return (
    <a href={href} onClick={handleClick} className="group block cursor-pointer">
      <div className="relative overflow-hidden rounded-xl aspect-[2/3] glass-card card-hover">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-surface text-muted-foreground text-sm text-center px-3">
            {title}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent" />

        <div className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full border border-black/30 bg-black/65 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
          <Star className="h-3 w-3 fill-accent text-accent" />
          {rating}
        </div>

        <div className="absolute left-2.5 right-2.5 bottom-2.5 rounded-lg border border-border/70 bg-black/55 backdrop-blur-md p-2.5 translate-y-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <p className="text-white font-semibold text-sm line-clamp-2">
            {title}
          </p>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-300">
            <span className="inline-flex items-center gap-1 text-accent font-semibold">
              <Star className="w-3 h-3 fill-accent text-accent" />
              {rating}
            </span>
            {year && <span>{year}</span>}
            <span className="uppercase tracking-wide text-[10px]">
              {mediaType}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2 px-1">
        <p className="text-sm font-semibold text-foreground line-clamp-1 transition-colors group-hover:text-accent">
          {title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {year || "Unknown year"}
        </p>
      </div>
    </a>
  );
}
