import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Play,
  Plus,
  Bookmark,
  Star,
  CalendarDays,
  AlertCircle,
  X,
  Volume2,
  VolumeX,
  Layers,
} from "lucide-react";
import {
  getTVDetail,
  getTVVideos,
  getTVSeason,
  getTVExternalIds,
  tmdbImage,
} from "@/api/tmdb";
import { getFanartTV, bestFanartImage } from "@/api/fanart";
import { getTVResumeItem } from "@/lib/historyResume";
import type { Episode } from "@/types/tmdb";
import { useWatchlistStore } from "@/store/watchlistStore";
import { useHistoryStore } from "@/store/historyStore";

interface TVDetailModalProps {
  id: string;
}

export default function TVDetailModal({ id }: TVDetailModalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdded, toggle } = useWatchlistStore();
  const historyItems = useHistoryStore((state) => state.items);
  const [muted, setMuted] = useState(true);
  const [trailerReady, setTrailerReady] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const panelRef = useRef<HTMLDivElement>(null);

  const {
    data: show,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["tv", id],
    queryFn: () => getTVDetail(id!),
    enabled: !!id,
  });

  const { data: videos } = useQuery({
    queryKey: ["tv", id, "videos"],
    queryFn: () => getTVVideos(id!),
    enabled: !!id,
  });

  const { data: season, isLoading: seasonLoading } = useQuery({
    queryKey: ["tv", id, "season", selectedSeason],
    queryFn: () => getTVSeason(id!, selectedSeason),
    enabled: !!id && !!show,
  });

  const { data: externalIds } = useQuery({
    queryKey: ["tv", id, "external_ids"],
    queryFn: () => getTVExternalIds(id!),
    enabled: !!id,
  });

  const { data: fanart } = useQuery({
    queryKey: ["fanart", "tv", externalIds?.tvdb_id],
    queryFn: () => getFanartTV(externalIds!.tvdb_id!),
    enabled: !!externalIds?.tvdb_id,
    retry: false,
    staleTime: 60 * 60 * 1000,
  });

  const trailer = videos?.results.find(
    (v) => v.type === "Trailer" && v.site === "YouTube",
  );

  const heroImageCandidates = useMemo(() => {
    const candidates = [
      bestFanartImage(fanart?.showbackground),
      tmdbImage(show?.backdrop_path ?? null, "original"),
      tmdbImage(show?.poster_path ?? null, "original"),
    ].filter((src): src is string => Boolean(src));
    return [...new Set(candidates)];
  }, [fanart?.showbackground, show?.backdrop_path, show?.poster_path]);

  const [failedHeroImages, setFailedHeroImages] = useState<
    Record<string, true>
  >({});
  const heroImageEntries = useMemo(
    () =>
      heroImageCandidates.map((url, index) => ({
        key: `tv:${id}:${index}:${url}`,
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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
              Failed to load show
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

  const logoUrl = fanart
    ? (bestFanartImage(fanart?.hdtvlogo) ?? bestFanartImage(fanart?.clearlogo))
    : null;
  const posterUrl = show ? tmdbImage(show.poster_path, "w342") : null;
  const year = show?.first_air_date?.slice(0, 4) ?? "";
  const numSeasons = show?.number_of_seasons ?? 1;
  const added = show ? isAdded(show.id, "tv") : false;

  const resumeItem = show ? getTVResumeItem(historyItems, show.id) : undefined;
  const resumeSeason = resumeItem?.season ?? 1;
  const resumeEpisode = resumeItem?.episode ?? 1;
  const resumeLabel = resumeItem
    ? `Continue S${resumeSeason}E${resumeEpisode}`
    : "Play Now";

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
        {/* ── Media area ─────────────────────────────────────────────── */}
        <div className="detail-modal-media">
          {isLoading ? (
            <div className="w-full h-full bg-muted animate-pulse" />
          ) : trailerSrc ? (
            <>
              {!trailerReady && heroImageUrl && (
                <img
                  src={heroImageUrl}
                  alt={show?.name ?? ""}
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
              alt={show?.name ?? ""}
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

          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-surface/95 to-transparent pointer-events-none" />

          <button
            onClick={close}
            className="detail-modal-close-btn"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {!isLoading && (
            <div className="absolute bottom-4 left-5 right-14 pointer-events-none">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={show?.name ?? ""}
                  className="max-h-16 max-w-[220px] object-contain"
                />
              ) : (
                <h2
                  className="text-white font-bold text-2xl drop-shadow-lg line-clamp-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {show?.name}
                </h2>
              )}
            </div>
          )}
        </div>

        {/* ── Info panel ─────────────────────────────────────────────── */}
        <div className="detail-modal-body">
          {isLoading ? (
            <div className="space-y-3 p-6">
              <div className="h-7 w-56 bg-muted animate-pulse rounded-lg" />
              <div className="h-4 w-full bg-muted animate-pulse rounded" />
              <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
            </div>
          ) : show ? (
            <div className="p-5 sm:p-6">
              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {year && (
                  <span className="muted-chip">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {year}
                  </span>
                )}
                <span className="muted-chip">
                  <Layers className="w-3.5 h-3.5" />
                  {numSeasons} Season{numSeasons !== 1 ? "s" : ""}
                </span>
                <span className="gold-chip">
                  <Star className="w-3.5 h-3.5 fill-accent text-accent" />
                  {show.vote_average.toFixed(1)}
                </span>
                {show.status && (
                  <span className="muted-chip">{show.status}</span>
                )}
              </div>

              {/* Genres */}
              {show.genres && show.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {show.genres.map((g) => (
                    <span key={g.id} className="muted-chip">
                      {g.name}
                    </span>
                  ))}
                </div>
              )}

              {show.tagline && (
                <p className="text-muted-foreground italic text-sm mb-3">
                  {show.tagline}
                </p>
              )}

              <p className="text-foreground/90 text-sm leading-relaxed mb-5">
                {show.overview || "No overview available."}
              </p>

              {/* Action buttons */}
              <div className="grid grid-cols-1 gap-3 pb-1 sm:flex sm:flex-wrap sm:items-center">
                <Link
                  to={`/watch/tv/${show.id}/${resumeSeason}/${resumeEpisode}`}
                  className="btn-primary w-full justify-center sm:w-auto"
                >
                  <Play className="w-4 h-4 fill-black" />
                  {resumeLabel}
                </Link>
                <button
                  onClick={() =>
                    toggle({
                      id: show.id,
                      name: show.name,
                      poster_path: show.poster_path,
                      media_type: "tv",
                      vote_average: show.vote_average,
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

              {/* ── Episodes ──────────────────────────────────────────── */}
              <div className="mt-6 pt-5 border-t border-border/60">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="section-title-mini !text-base">Episodes</h3>
                  <span className="muted-chip">Season {selectedSeason}</span>
                </div>

                {/* Season tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hidden">
                  {Array.from({ length: numSeasons }, (_, i) => i + 1).map(
                    (s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedSeason(s)}
                        className={
                          selectedSeason === s
                            ? "gold-chip !text-sm flex-shrink-0"
                            : "muted-chip !text-sm flex-shrink-0 hover:text-foreground hover:border-accent/35 transition-colors"
                        }
                      >
                        S{s}
                      </button>
                    ),
                  )}
                </div>

                {/* Episode list */}
                {seasonLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-20 bg-muted animate-pulse rounded-xl"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hidden">
                    {season?.episodes?.map((ep) => (
                      <EpisodeRow
                        key={ep.id}
                        episode={ep}
                        tvId={id}
                        seasonNum={selectedSeason}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Poster info row */}
              {posterUrl && (
                <div className="mt-5 flex flex-col gap-4 border-t border-border/60 pt-5 sm:flex-row sm:items-start sm:gap-5">
                  <img
                    src={posterUrl}
                    alt={show.name}
                    className="w-24 rounded-xl border border-border/60 shadow-lg flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-semibold text-sm">
                      {show.name}
                    </p>
                    {show.networks && show.networks.length > 0 && (
                      <p className="text-muted-foreground text-xs mt-1">
                        {show.networks
                          .slice(0, 3)
                          .map((n: { name: string }) => n.name)
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

function EpisodeRow({
  episode,
  tvId,
  seasonNum,
}: {
  episode: Episode;
  tvId: string;
  seasonNum: number;
}) {
  const thumbUrl = tmdbImage(episode.still_path, "w300");
  return (
    <Link
      to={`/watch/tv/${tvId}/${seasonNum}/${episode.episode_number}`}
      className="flex gap-3 items-center glass-card p-3 hover:border-accent/30 transition-all group"
    >
      <div className="flex-shrink-0 w-24 aspect-video rounded-lg overflow-hidden bg-muted border border-border/60">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={episode.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            Ep {episode.episode_number}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-foreground text-sm font-semibold line-clamp-1">
          {episode.episode_number}. {episode.name}
        </p>
        {episode.air_date && (
          <p className="text-muted-foreground text-xs mt-0.5">
            {episode.air_date}
          </p>
        )}
        <p className="text-muted-foreground text-xs mt-1 line-clamp-1">
          {episode.overview || "No description."}
        </p>
      </div>
      <Play className="w-4 h-4 text-accent flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
