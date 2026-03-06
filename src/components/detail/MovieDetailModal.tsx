import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Play,
  Plus,
  Bookmark,
  Star,
  Clock3,
  CalendarDays,
  AlertCircle,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  getMovieDetail,
  getMovieCredits,
  getMovieVideos,
  tmdbImage,
} from "@/api/tmdb";
import { getFanartMovie, bestFanartImage } from "@/api/fanart";
import CastCard from "@/components/detail/CastCard";
import { useWatchlistStore } from "@/store/watchlistStore";

interface MovieDetailModalProps {
  id: string;
}

export default function MovieDetailModal({ id }: MovieDetailModalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdded, toggle } = useWatchlistStore();
  const [muted, setMuted] = useState(true);
  const [trailerReady, setTrailerReady] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const {
    data: movie,
    isLoading: movieLoading,
    isError,
  } = useQuery({
    queryKey: ["movie", id],
    queryFn: () => getMovieDetail(id!),
    enabled: !!id,
  });

  const { data: credits } = useQuery({
    queryKey: ["movie", id, "credits"],
    queryFn: () => getMovieCredits(id!),
    enabled: !!id,
  });

  const { data: videos } = useQuery({
    queryKey: ["movie", id, "videos"],
    queryFn: () => getMovieVideos(id!),
    enabled: !!id,
  });

  const { data: fanart } = useQuery({
    queryKey: ["fanart", "movie", id],
    queryFn: () => getFanartMovie(id!),
    enabled: !!id,
    retry: false,
    staleTime: 60 * 60 * 1000,
  });

  const trailer = videos?.results.find(
    (v) => v.type === "Trailer" && v.site === "YouTube",
  );

  const heroImageCandidates = useMemo(() => {
    const candidates = [
      bestFanartImage(fanart?.moviebackground),
      tmdbImage(movie?.backdrop_path ?? null, "original"),
      tmdbImage(movie?.poster_path ?? null, "original"),
    ].filter((src): src is string => Boolean(src));
    return [...new Set(candidates)];
  }, [fanart?.moviebackground, movie?.backdrop_path, movie?.poster_path]);

  const [failedHeroImages, setFailedHeroImages] = useState<
    Record<string, true>
  >({});

  const heroImageEntries = useMemo(
    () =>
      heroImageCandidates.map((url, index) => ({
        key: `${id}:${index}:${url}`,
        url,
      })),
    [heroImageCandidates, id],
  );
  const heroImageEntry = heroImageEntries.find((e) => !failedHeroImages[e.key]);
  const heroImageUrl = heroImageEntry?.url ?? null;

  const close = useCallback(() => {
    const bg = (location.state as { backgroundLocation?: Location })
      ?.backgroundLocation;
    if (bg) {
      navigate(-1);
    } else {
      navigate("/");
    }
  }, [navigate, location.state]);

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  // Lock body scroll while modal open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Click outside panel to close
  function handleBackdropClick(e: React.MouseEvent) {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      close();
    }
  }

  if (isError) {
    return (
      <div className="detail-modal-backdrop" onClick={handleBackdropClick}>
        <div
          ref={panelRef}
          className="detail-modal-panel flex items-center justify-center p-8"
        >
          <div className="text-center max-w-sm">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-foreground font-semibold text-lg">
              Failed to load movie
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              Check your connection and try again.
            </p>
            <button onClick={close} className="btn-ghost mt-5">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const logoUrl = fanart ? bestFanartImage(fanart?.movielogo) : null;
  const posterUrl = movie ? tmdbImage(movie.poster_path, "w342") : null;
  const year = movie?.release_date?.slice(0, 4) ?? "";
  const added = movie ? isAdded(movie.id, "movie") : false;
  const hours = movie?.runtime ? Math.floor(movie.runtime / 60) : 0;
  const mins = movie?.runtime ? movie.runtime % 60 : 0;
  const runtimeStr = movie?.runtime ? `${hours}h ${mins}m` : "";

  const trailerSrc = trailer
    ? `https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${trailer.key}&controls=0&modestbranding=1&rel=0&enablejsapi=1`
    : null;

  return (
    <div
      className="detail-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div ref={panelRef} className="detail-modal-panel">
        {/* ── Media area (trailer or hero image) ──────────────────────── */}
        <div className="detail-modal-media">
          {movieLoading ? (
            <div className="w-full h-full bg-muted animate-pulse" />
          ) : trailerSrc ? (
            <>
              {/* Hero image shown until iframe is ready */}
              {!trailerReady && heroImageUrl && (
                <img
                  src={heroImageUrl}
                  alt={movie?.title ?? ""}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              <iframe
                key={trailerSrc}
                src={trailerSrc}
                title="Trailer"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                onLoad={() => setTrailerReady(true)}
                className={`absolute inset-0 w-full h-full transition-opacity duration-700 ${trailerReady ? "opacity-100" : "opacity-0"}`}
              />
              {/* Mute toggle */}
              <button
                onClick={() => setMuted((m) => !m)}
                className="detail-modal-mute-btn"
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
            </>
          ) : heroImageUrl ? (
            <img
              src={heroImageUrl}
              alt={movie?.title ?? ""}
              className="w-full h-full object-cover"
              onError={() => {
                if (!heroImageEntry) return;
                setFailedHeroImages((c) => ({
                  ...c,
                  [heroImageEntry.key]: true,
                }));
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-black via-neutral-900 to-black" />
          )}

          {/* Gradient overlay bottom of media */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-surface/95 to-transparent pointer-events-none" />

          {/* Close button */}
          <button
            onClick={close}
            className="detail-modal-close-btn"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Logo / title overlay at bottom-left of media */}
          {!movieLoading && (
            <div className="absolute bottom-4 left-5 right-14 pointer-events-none">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={movie?.title ?? ""}
                  className="max-h-16 max-w-[220px] object-contain"
                />
              ) : (
                <h2
                  className="text-white font-bold text-2xl drop-shadow-lg line-clamp-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {movie?.title}
                </h2>
              )}
            </div>
          )}
        </div>

        {/* ── Info panel ──────────────────────────────────────────────── */}
        <div className="detail-modal-body">
          {movieLoading ? (
            <div className="space-y-3 p-6">
              <div className="h-7 w-56 bg-muted animate-pulse rounded-lg" />
              <div className="h-4 w-full bg-muted animate-pulse rounded" />
              <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
            </div>
          ) : movie ? (
            <div className="p-5 sm:p-6">
              {/* Metadata chips */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {year && (
                  <span className="muted-chip">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {year}
                  </span>
                )}
                {runtimeStr && (
                  <span className="muted-chip">
                    <Clock3 className="w-3.5 h-3.5" />
                    {runtimeStr}
                  </span>
                )}
                <span className="gold-chip">
                  <Star className="w-3.5 h-3.5 fill-accent text-accent" />
                  {movie.vote_average.toFixed(1)}
                </span>
                {movie.status && (
                  <span className="muted-chip">{movie.status}</span>
                )}
              </div>

              {/* Genre chips */}
              {movie.genres && movie.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {movie.genres.map((g) => (
                    <span key={g.id} className="muted-chip">
                      {g.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Tagline */}
              {movie.tagline && (
                <p className="text-muted-foreground italic text-sm mb-3">
                  {movie.tagline}
                </p>
              )}

              {/* Overview */}
              <p className="text-foreground/90 text-sm leading-relaxed mb-5">
                {movie.overview || "No overview available."}
              </p>

              {/* Action buttons */}
              <div className="grid grid-cols-1 gap-3 pb-1 sm:flex sm:flex-wrap sm:items-center">
                <Link to={`/watch/movie/${movie.id}`} className="btn-primary w-full justify-center sm:w-auto">
                  <Play className="w-4 h-4 fill-black" />
                  Play Now
                </Link>
                <button
                  onClick={() =>
                    toggle({
                      id: movie.id,
                      title: movie.title,
                      poster_path: movie.poster_path,
                      media_type: "movie",
                      vote_average: movie.vote_average,
                      year,
                    })
                  }
                  className={`${added
                      ? "btn-secondary !border-accent/45 !text-accent"
                      : "btn-secondary"} w-full justify-center sm:w-auto`}
                >
                  {added ? (
                    <Bookmark className="w-4 h-4 fill-accent" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {added ? "In Watchlist" : "Add Watchlist"}
                </button>
              </div>

              {/* Poster + Cast row */}
              {credits && credits.cast.length > 0 && (
                <div className="mt-6 pt-5 border-t border-border/60">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="section-title-mini !text-base">Cast</h3>
                    <span className="muted-chip">
                      {credits.cast.length} people
                    </span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hidden">
                    {credits.cast.slice(0, 20).map((cast) => (
                      <CastCard key={cast.id} cast={cast} />
                    ))}
                  </div>
                </div>
              )}

              {/* Poster info row */}
              {posterUrl && (
                <div className="mt-5 flex flex-col gap-4 border-t border-border/60 pt-5 sm:flex-row sm:items-start sm:gap-5">
                  <img
                    src={posterUrl}
                    alt={movie.title}
                    className="w-24 rounded-xl border border-border/60 shadow-lg flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-semibold text-sm">
                      {movie.title}
                    </p>
                    {movie.production_companies &&
                      movie.production_companies.length > 0 && (
                        <p className="text-muted-foreground text-xs mt-1">
                          {movie.production_companies
                            .slice(0, 3)
                            .map((c: { name: string }) => c.name)
                            .join(" · ")}
                        </p>
                      )}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
