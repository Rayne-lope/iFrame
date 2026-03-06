import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  discoverMedia,
  getGenres,
  getMovieSimilar,
  getOnTheAirTV,
  getPopularMovies,
  getTopRatedMovies,
  getTrending,
  getTVSimilar,
  getUpcomingMovies,
  searchMulti,
  tmdbImage,
} from "@/api/tmdb";
import { useDebounce } from "@/hooks/useDebounce";
import { useHistoryStore } from "@/store/historyStore";
import { useWatchlistStore, type WatchlistItem } from "@/store/watchlistStore";
import {
  buildTVResumeMap,
  getContinueWatchingItems,
  getWatchUrlWithResume as getResumeWatchUrl,
  historyWatchUrl,
} from "@/lib/historyResume";
import type { Genre, MediaItem } from "@/types/tmdb";
import "./home-ui.css";
import { useAuthStore } from "@/store/authStore";

type HomeMedia = MediaItem & {
  media_type: "movie" | "tv";
  original_language?: string;
};

type ContinueCardData = {
  title: string;
  subtitle: string;
  image: string;
  imageKey: string;
  progress: number | null;
  watchUrl: string;
};

type NavItem = {
  label: string;
  to: string;
};

type SectionHeaderProps = {
  icon: ReactNode;
  title: string;
  count: string;
  to: string;
};

type PosterCardProps = {
  item: HomeMedia;
  rank?: string;
  genreLabel: string;
  showActions: boolean;
  addedToWatchlist: boolean;
  onOpen: () => void;
  onPlay: () => void;
  onToggleWatchlist: () => void;
};

type FeaturedCardProps = {
  item: HomeMedia;
  genreLabel: string;
  onOpen: () => void;
  onPlay: () => void;
};

const RECENT_SEARCH_KEY = "iframe-recent-searches";
const HERO_AUTOSLIDE_MS = 7000;

const navItems: NavItem[] = [
  { label: "Home", to: "/" },
  { label: "Movies", to: "/browse/movies" },
  { label: "Series", to: "/browse/series" },
  { label: "Anime", to: "/browse/anime" },
];

const genreChips = [
  "Semua",
  "Action",
  "Drama",
  "Comedy",
  "Horror",
  "Sci-Fi",
  "Thriller",
  "Romance",
  "Animation",
  "K-Drama",
  "Crime",
  "Fantasy",
  "Documentary",
];

const genreAliases: Record<string, string[]> = {
  "Sci-Fi": ["Sci-Fi", "Science Fiction", "Sci Fi", "Sci-Fi & Fantasy"],
  "K-Drama": ["K-Drama", "Korean Drama", "Drama"],
};

/** TMDB genre IDs per chip. movie/tv can differ (e.g. Sci-Fi vs Fantasy) */
const GENRE_IDS: Record<
  string,
  { movie?: string; tv?: string; language?: string }
> = {
  Action: { movie: "28", tv: "10759" },
  Drama: { movie: "18", tv: "18" },
  Comedy: { movie: "35", tv: "35" },
  Horror: { movie: "27", tv: "27" },
  "Sci-Fi": { movie: "878", tv: "10765" },
  Thriller: { movie: "53", tv: "53" },
  Romance: { movie: "10749", tv: "10749" },
  Animation: { movie: "16", tv: "16" },
  Crime: { movie: "80", tv: "80" },
  Fantasy: { movie: "14", tv: "10765" },
  Documentary: { movie: "99", tv: "99" },
  "K-Drama": { movie: undefined, tv: "18", language: "ko" },
};

function normalizeMedia(
  item: MediaItem,
  fallbackType: "movie" | "tv" = "movie",
): HomeMedia | null {
  if (item.media_type === "person") return null;

  const source = item as MediaItem & { original_language?: string };

  return {
    ...item,
    media_type:
      item.media_type === "tv"
        ? "tv"
        : item.media_type === "movie"
          ? "movie"
          : fallbackType,
    original_language: source.original_language,
  };
}

function normalizeList(
  items: MediaItem[],
  fallbackType: "movie" | "tv",
): HomeMedia[] {
  return items
    .map((item) => normalizeMedia(item, fallbackType))
    .filter((item): item is HomeMedia => item !== null);
}

function interleaveRows(first: HomeMedia[], second: HomeMedia[]): HomeMedia[] {
  const merged: HomeMedia[] = [];
  const maxLength = Math.max(first.length, second.length);

  for (let index = 0; index < maxLength; index += 1) {
    if (first[index]) merged.push(first[index]);
    if (second[index]) merged.push(second[index]);
  }

  return merged;
}

function mediaTitle(item: { title?: string; name?: string }): string {
  return item.title ?? item.name ?? "Untitled";
}

function mediaYear(item: {
  release_date?: string;
  first_air_date?: string;
}): string {
  return (item.release_date ?? item.first_air_date ?? "").slice(0, 4);
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeGenreToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[&/]/g, " and ")
    .replace(/-/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expandGenreTokens(value: string): string[] {
  const normalized = normalizeGenreToken(value);
  if (!normalized) return [];

  const splitTokens = value
    .replace(/[/|,]/g, "&")
    .split("&")
    .flatMap((part) => part.split(/\band\b/i))
    .map((part) => normalizeGenreToken(part))
    .filter(Boolean);

  return [...new Set([normalized, ...splitTokens])];
}

function acceptedGenreTokens(activeGenre: string): string[] {
  const candidates = [activeGenre, ...(genreAliases[activeGenre] ?? [])];
  return [...new Set(candidates.flatMap((value) => expandGenreTokens(value)))];
}

function genreLabelsFromIds(
  genreIds: number[] | undefined,
  mediaType: "movie" | "tv",
  movieGenreMap: Map<number, string>,
  tvGenreMap: Map<number, string>,
): string[] {
  const ids = genreIds ?? [];
  return ids
    .map((id) => {
      if (mediaType === "tv") {
        return tvGenreMap.get(id) ?? movieGenreMap.get(id);
      }
      return movieGenreMap.get(id) ?? tvGenreMap.get(id);
    })
    .filter((value): value is string => Boolean(value));
}

function matchesGenreChip(
  activeGenre: string,
  labels: string[],
  mediaType: "movie" | "tv",
  originalLanguage?: string,
): boolean {
  if (activeGenre === "Semua") return true;

  const labelTokens = new Set(
    labels.flatMap((label) => expandGenreTokens(label)),
  );
  if (activeGenre === "K-Drama") {
    return (
      mediaType === "tv" &&
      originalLanguage?.toLowerCase() === "ko" &&
      labelTokens.has("drama")
    );
  }

  const acceptedTokens = acceptedGenreTokens(activeGenre);
  return acceptedTokens.some((token) => labelTokens.has(token));
}

function detailUrl(item: { id: number; media_type?: "movie" | "tv" }): string {
  return item.media_type === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`;
}

function toWatchlistItem(item: HomeMedia): WatchlistItem {
  return {
    id: item.id,
    title: item.title,
    name: item.name,
    poster_path: item.poster_path,
    media_type: item.media_type,
    vote_average: item.vote_average,
    year: mediaYear(item),
    genre_ids: item.genre_ids,
    original_language: item.original_language,
  };
}

function buildGenreMap(genres: Genre[] | undefined): Map<number, string> {
  return new Map((genres ?? []).map((genre) => [genre.id, genre.name]));
}

function onCardKeyDown(
  event: KeyboardEvent<HTMLDivElement>,
  action: () => void,
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

function readRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCH_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((value): value is string => typeof value === "string")
      .slice(0, 6);
  } catch {
    return [];
  }
}

function writeRecentSearches(values: string[]) {
  localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(values.slice(0, 6)));
}

function SectionHeader({ icon, title, count, to }: SectionHeaderProps) {
  return (
    <div className="section-head">
      <div className="section-label">
        <div className="section-icon">{icon}</div>
        <div>
          <div className="section-title">{title}</div>
          <div className="section-count">{count}</div>
        </div>
      </div>
      <Link to={to} className="see-all">
        Lihat Semua
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          strokeWidth="2.5"
          stroke="currentColor"
          aria-hidden="true"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>
    </div>
  );
}

function PosterCard({
  item,
  rank,
  genreLabel,
  showActions,
  addedToWatchlist,
  onOpen,
  onPlay,
  onToggleWatchlist,
}: PosterCardProps) {
  const title = mediaTitle(item);
  const year = mediaYear(item);
  const image =
    tmdbImage(item.poster_path, "w342") ||
    tmdbImage(item.backdrop_path, "w500");

  return (
    <div
      className="poster-card"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => onCardKeyDown(event, onOpen)}
      aria-label={`Buka detail ${title}`}
    >
      <div className="poster-wrap">
        <img className="poster-img" src={image} alt={title} loading="lazy" />
        {rank && <span className="poster-rank">{rank}</span>}
        <div className="poster-badge">
          <svg
            width="9"
            height="9"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="none"
            aria-hidden="true"
          >
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
          {item.vote_average.toFixed(1)}
        </div>

        <div className="poster-overlay">
          <button
            type="button"
            className="overlay-play"
            onClick={(event) => {
              event.stopPropagation();
              onPlay();
            }}
            aria-label={`Putar ${title}`}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="black"
              stroke="none"
            >
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </button>

          {showActions && (
            <div className="overlay-actions">
              <button
                type="button"
                className="overlay-icon"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleWatchlist();
                }}
                aria-label={
                  addedToWatchlist
                    ? `Hapus ${title} dari watchlist`
                    : `Tambah ${title} ke watchlist`
                }
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  strokeWidth="1.8"
                  stroke="white"
                  fill={addedToWatchlist ? "white" : "none"}
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
              <button
                type="button"
                className="overlay-icon"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpen();
                }}
                aria-label={`Lihat info ${title}`}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  strokeWidth="1.8"
                  stroke="white"
                  fill="none"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="poster-info">
        <div className="poster-title">{title}</div>
        <div className="poster-meta">
          <span>{year || "-"}</span>
          <span className="meta-sep" />
          <span>{genreLabel}</span>
        </div>
      </div>
    </div>
  );
}

function FeaturedCard({ item, genreLabel, onOpen, onPlay }: FeaturedCardProps) {
  const title = mediaTitle(item);
  const year = mediaYear(item);
  const image =
    tmdbImage(item.backdrop_path, "w780") ||
    tmdbImage(item.poster_path, "w500");

  return (
    <div
      className="feat-card"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => onCardKeyDown(event, onOpen)}
      aria-label={`Buka detail ${title}`}
    >
      <img className="feat-img" src={image} alt={title} loading="lazy" />
      <button
        type="button"
        className="feat-play"
        onClick={(event) => {
          event.stopPropagation();
          onPlay();
        }}
        aria-label={`Putar ${title}`}
      >
        <span className="feat-play-btn">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="black"
            stroke="none"
          >
            <polygon points="5,3 19,12 5,21" />
          </svg>
        </span>
      </button>
      <div className="feat-overlay">
        <div className="feat-genre">{genreLabel}</div>
        <div className="feat-title">{title}</div>
        <div className="feat-meta">
          <span className="feat-rating">* {item.vote_average.toFixed(1)}</span>
          <span>{year || "-"}</span>
          <span>{item.media_type === "tv" ? "Series" : "Movie"}</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const openDetail = (item: { id: number; media_type?: "movie" | "tv" }) => {
    navigate(detailUrl(item), { state: { backgroundLocation: location } });
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() =>
    readRecentSearches(),
  );
  const [activeGenre, setActiveGenre] = useState("Semua");
  const [activeThumb, setActiveThumb] = useState(0);
  const [heroInteractionTick, setHeroInteractionTick] = useState(0);
  const [isNavScrolled, setIsNavScrolled] = useState(false);
  const [isNavHidden, setIsNavHidden] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [failedContinueImages, setFailedContinueImages] = useState<
    Record<string, true>
  >({});

  const debouncedSearch = useDebounce(searchQuery, 250);

  const historyItems = useHistoryStore((state) => state.items);
  const watchlistCount = useWatchlistStore((state) => state.items.length);
  const isAdded = useWatchlistStore((state) => state.isAdded);
  const toggleWatchlist = useWatchlistStore((state) => state.toggle);

  const lastWatched = historyItems[0];

  const { data: trendingData, isLoading: isTrendingLoading } = useQuery({
    queryKey: ["home", "trending", "all", "week"],
    queryFn: () => getTrending("all", "week"),
  });

  const { data: popularData, isLoading: isPopularLoading } = useQuery({
    queryKey: ["home", "popularMovies"],
    queryFn: () => getPopularMovies(),
  });

  const { data: topRatedData, isLoading: isTopRatedLoading } = useQuery({
    queryKey: ["home", "topRatedMovies"],
    queryFn: () => getTopRatedMovies(),
  });

  const { data: comingSoonData, isLoading: isComingSoonLoading } = useQuery({
    queryKey: ["home", "upcomingMovies"],
    queryFn: () => getUpcomingMovies(),
  });

  const { data: onAirData, isLoading: isSeriesLoading } = useQuery({
    queryKey: ["home", "onTheAirTV"],
    queryFn: () => getOnTheAirTV(),
  });

  const { data: animeTvData, isLoading: isAnimeTvLoading } = useQuery({
    queryKey: ["home", "anime", "tv"],
    queryFn: () =>
      discoverMedia("tv", {
        withGenres: "16",
        withOriginalLanguage: "ja",
        sortBy: "popularity.desc",
      }),
  });

  const { data: animeMovieData, isLoading: isAnimeMovieLoading } = useQuery({
    queryKey: ["home", "anime", "movie"],
    queryFn: () =>
      discoverMedia("movie", {
        withGenres: "16",
        withOriginalLanguage: "ja",
        sortBy: "popularity.desc",
      }),
  });

  const { data: becauseMovieData, isLoading: isBecauseMovieLoading } = useQuery(
    {
      queryKey: ["home", "because", "movie", lastWatched?.id],
      queryFn: () => getMovieSimilar(lastWatched!.id),
      enabled: !!lastWatched && lastWatched.media_type === "movie",
    },
  );

  const { data: becauseTVData, isLoading: isBecauseTVLoading } = useQuery({
    queryKey: ["home", "because", "tv", lastWatched?.id],
    queryFn: () => getTVSimilar(lastWatched!.id),
    enabled: !!lastWatched && lastWatched.media_type === "tv",
  });

  const { data: movieGenresData } = useQuery({
    queryKey: ["genres", "movie"],
    queryFn: () => getGenres("movie"),
  });

  const { data: tvGenresData } = useQuery({
    queryKey: ["genres", "tv"],
    queryFn: () => getGenres("tv"),
  });

  const { data: suggestionData, isLoading: isSuggestionLoading } = useQuery({
    queryKey: ["home", "searchSuggestions", debouncedSearch],
    queryFn: () => searchMulti(debouncedSearch.trim()),
    enabled: debouncedSearch.trim().length > 1,
  });

  const movieGenreMap = useMemo(
    () => buildGenreMap(movieGenresData?.genres),
    [movieGenresData],
  );
  const tvGenreMap = useMemo(
    () => buildGenreMap(tvGenresData?.genres),
    [tvGenresData],
  );

  // ── Genre-mode: server-side discover queries ─────────────────
  const activeGenreFilter =
    activeGenre !== "Semua" ? (GENRE_IDS[activeGenre] ?? null) : null;

  const { data: genreMovieData, isLoading: isGenreMovieLoading } = useQuery({
    queryKey: ["home", "genre", "movie", activeGenre],
    queryFn: () =>
      discoverMedia("movie", {
        withGenres: activeGenreFilter!.movie,
        withOriginalLanguage: activeGenreFilter!.language,
        sortBy: "popularity.desc",
      }),
    enabled: !!activeGenreFilter && !!activeGenreFilter.movie,
    staleTime: 5 * 60 * 1000,
  });

  const { data: genreTVData, isLoading: isGenreTVLoading } = useQuery({
    queryKey: ["home", "genre", "tv", activeGenre],
    queryFn: () =>
      discoverMedia("tv", {
        withGenres: activeGenreFilter!.tv,
        withOriginalLanguage: activeGenreFilter!.language,
        sortBy: "popularity.desc",
      }),
    enabled: !!activeGenreFilter && !!activeGenreFilter.tv,
    staleTime: 5 * 60 * 1000,
  });

  const { data: genreTopRatedData, isLoading: isGenreTopRatedLoading } =
    useQuery({
      queryKey: ["home", "genre", "toprated", activeGenre],
      queryFn: () =>
        discoverMedia("movie", {
          withGenres: activeGenreFilter!.movie,
          withOriginalLanguage: activeGenreFilter!.language,
          sortBy: "vote_average.desc",
          voteAverageGte: 7,
        }),
      enabled: !!activeGenreFilter && !!activeGenreFilter.movie,
      staleTime: 5 * 60 * 1000,
    });

  const trendingItems = useMemo(
    () => normalizeList((trendingData?.results ?? []) as MediaItem[], "movie"),
    [trendingData],
  );

  const popularItems = useMemo(
    () => normalizeList((popularData?.results ?? []) as MediaItem[], "movie"),
    [popularData],
  );

  const topRatedItems = useMemo(
    () => normalizeList((topRatedData?.results ?? []) as MediaItem[], "movie"),
    [topRatedData],
  );

  const comingSoonItems = useMemo(
    () =>
      normalizeList((comingSoonData?.results ?? []) as MediaItem[], "movie"),
    [comingSoonData],
  );

  const seriesItems = useMemo(
    () => normalizeList((onAirData?.results ?? []) as MediaItem[], "tv"),
    [onAirData],
  );

  const animeItems = useMemo(() => {
    const tvItems = normalizeList(
      (animeTvData?.results ?? []) as MediaItem[],
      "tv",
    );
    const movieItems = normalizeList(
      (animeMovieData?.results ?? []) as MediaItem[],
      "movie",
    );
    return interleaveRows(tvItems, movieItems);
  }, [animeTvData, animeMovieData]);

  const becauseItems = useMemo(() => {
    if (!lastWatched) return [] as HomeMedia[];
    if (lastWatched.media_type === "tv") {
      return normalizeList((becauseTVData?.results ?? []) as MediaItem[], "tv");
    }
    return normalizeList(
      (becauseMovieData?.results ?? []) as MediaItem[],
      "movie",
    );
  }, [lastWatched, becauseTVData, becauseMovieData]);

  const suggestionItems = useMemo(
    () =>
      normalizeList(
        (suggestionData?.results ?? []) as MediaItem[],
        "movie",
      ).slice(0, 6),
    [suggestionData],
  );

  const getGenreLabels = useCallback(
    (item: HomeMedia): string[] =>
      genreLabelsFromIds(
        item.genre_ids,
        item.media_type,
        movieGenreMap,
        tvGenreMap,
      ),
    [tvGenreMap, movieGenreMap],
  );

  const getPrimaryGenre = (item: HomeMedia): string => {
    const genres = getGenreLabels(item);
    if (genres.length > 0) return genres[0];
    return item.media_type === "tv" ? "Series" : "Movie";
  };

  const filterByGenre = useCallback(
    (items: HomeMedia[]): HomeMedia[] => {
      return items.filter((item) =>
        matchesGenreChip(
          activeGenre,
          getGenreLabels(item),
          item.media_type,
          item.original_language,
        ),
      );
    },
    [activeGenre, getGenreLabels],
  );

  const filteredTrending = useMemo(
    () => filterByGenre(trendingItems),
    [trendingItems, filterByGenre],
  );

  const filteredPopular = useMemo(
    () => filterByGenre(popularItems),
    [popularItems, filterByGenre],
  );

  const filteredTopRated = useMemo(
    () => filterByGenre(topRatedItems),
    [topRatedItems, filterByGenre],
  );

  const filteredComingSoon = useMemo(
    () => filterByGenre(comingSoonItems),
    [comingSoonItems, filterByGenre],
  );

  const filteredSeries = useMemo(
    () => filterByGenre(seriesItems),
    [seriesItems, filterByGenre],
  );

  const filteredAnime = useMemo(
    () => filterByGenre(animeItems),
    [animeItems, filterByGenre],
  );

  const filteredBecause = useMemo(
    () => filterByGenre(becauseItems),
    [becauseItems, filterByGenre],
  );

  const heroSource =
    filteredTrending.length > 0 ? filteredTrending : trendingItems;
  const heroThumbItems = heroSource.slice(0, 4);
  const safeActiveThumb =
    heroThumbItems.length > 0
      ? Math.min(activeThumb, heroThumbItems.length - 1)
      : 0;
  const heroItem = heroThumbItems[safeActiveThumb] ?? heroSource[0];

  const heroBackdrop =
    heroItem &&
    (tmdbImage(heroItem.backdrop_path, "original") ||
      tmdbImage(heroItem.poster_path, "original"));

  const heroVisualKey = heroItem
    ? `${heroItem.media_type}-${heroItem.id}-${safeActiveThumb}`
    : "hero-empty";

  const heroPosterFallback =
    heroItem &&
    (tmdbImage(heroItem.poster_path, "w300") ||
      tmdbImage(heroItem.backdrop_path, "w500"));

  const heroGenres = heroItem ? getGenreLabels(heroItem).slice(0, 2) : [];

  const historyMetaMap = useMemo(() => {
    const map = new Map<
      string,
      { genre_ids?: number[]; original_language?: string }
    >();
    const allCatalogItems = [
      ...trendingItems,
      ...popularItems,
      ...topRatedItems,
      ...comingSoonItems,
      ...seriesItems,
      ...animeItems,
      ...becauseItems,
    ];

    allCatalogItems.forEach((item) => {
      const key = `${item.media_type}:${item.id}`;
      if (map.has(key)) return;
      map.set(key, {
        genre_ids: item.genre_ids,
        original_language: item.original_language,
      });
    });

    return map;
  }, [
    trendingItems,
    popularItems,
    topRatedItems,
    comingSoonItems,
    seriesItems,
    animeItems,
    becauseItems,
  ]);

  const continueWatching = useMemo<ContinueCardData[]>(
    () =>
      getContinueWatchingItems(historyItems)
        .filter((item) => {
          const fallbackMeta = historyMetaMap.get(
            `${item.media_type}:${item.id}`,
          );
          const labels = genreLabelsFromIds(
            item.genre_ids ?? fallbackMeta?.genre_ids,
            item.media_type,
            movieGenreMap,
            tvGenreMap,
          );

          return matchesGenreChip(
            activeGenre,
            labels,
            item.media_type,
            item.original_language ?? fallbackMeta?.original_language,
          );
        })
        .slice(0, 8)
        .map((item) => {
          const positionSeconds = item.position_seconds ?? 0;
          const durationSeconds = item.duration_seconds;
          const progress =
            typeof item.progress_percent === "number"
              ? clampPercent(item.progress_percent)
              : durationSeconds && durationSeconds > 0
                ? clampPercent((positionSeconds / durationSeconds) * 100)
                : null;

          const progressLabel =
            progress != null
              ? `${progress}%`
              : `${Math.max(1, Math.round(positionSeconds / 60))}m watched`;

          const title = mediaTitle(item);
          const subtitle =
            item.media_type === "tv" &&
            item.season != null &&
            item.episode != null
              ? `S${item.season}E${item.episode} | ${progressLabel}`
              : `${item.year || "Movie"} | ${progressLabel}`;

          return {
            title,
            subtitle,
            image: tmdbImage(item.poster_path, "w500") || "",
            imageKey: `${item.media_type}:${item.id}:${item.season ?? 0}:${item.episode ?? 0}:${item.poster_path ?? ""}`,
            progress,
            watchUrl: historyWatchUrl(item),
          };
        }),
    [historyItems, historyMetaMap, movieGenreMap, tvGenreMap, activeGenre],
  );

  const tvResumeMap = useMemo(() => buildTVResumeMap(historyItems), [historyItems]);

  const isBecauseLoading =
    (lastWatched?.media_type === "movie" && isBecauseMovieLoading) ||
    (lastWatched?.media_type === "tv" && isBecauseTVLoading);

  const showSuggestionPanel =
    searchFocused &&
    ((searchQuery.trim().length > 0 &&
      (isSuggestionLoading || suggestionItems.length > 0)) ||
      (searchQuery.trim().length <= 1 && recentSearches.length > 0));

  useEffect(() => {
    const onScroll = () => setIsNavScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    updatePreference();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updatePreference);
      return () => mediaQuery.removeEventListener("change", updatePreference);
    }

    mediaQuery.addListener(updatePreference);
    return () => mediaQuery.removeListener(updatePreference);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || heroThumbItems.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveThumb((current) => (current + 1) % heroThumbItems.length);
    }, HERO_AUTOSLIDE_MS);

    return () => window.clearInterval(timer);
  }, [heroThumbItems.length, prefersReducedMotion, heroInteractionTick]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!searchWrapRef.current) return;
      if (!searchWrapRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    }

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, []);

  function updateRecentSearches(query: string) {
    const cleaned = query.trim();
    if (!cleaned) return;

    const next = [
      cleaned,
      ...recentSearches.filter(
        (item) => item.toLowerCase() !== cleaned.toLowerCase(),
      ),
    ].slice(0, 6);
    setRecentSearches(next);
    writeRecentSearches(next);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    updateRecentSearches(query);
    navigate(`/search?q=${encodeURIComponent(query)}`);
    setSearchFocused(false);
  }

  function handleSuggestionOpen(item: HomeMedia) {
    openDetail(item);
    setSearchQuery("");
    setSearchFocused(false);
  }

  function handleSuggestionSearch(query: string) {
    updateRecentSearches(query);
    navigate(`/search?q=${encodeURIComponent(query)}`);
    setSearchQuery("");
    setSearchFocused(false);
  }

  function handleToggleWatchlist(item: HomeMedia) {
    toggleWatchlist(toWatchlistItem(item));
  }

  function handleHeroThumbSelect(index: number) {
    setActiveThumb(index);
    setHeroInteractionTick((value) => value + 1);
  }

  function handleContinueImageError(imageKey: string) {
    setFailedContinueImages((current) => {
      if (current[imageKey]) return current;
      return {
        ...current,
        [imageKey]: true,
      };
    });
  }

  const watchlistBadge = watchlistCount > 99 ? "99+" : String(watchlistCount);

  // Scroll detection
  useEffect(() => {
    const onScroll = () => setIsNavScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-hide navbar after 5s of inactivity
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const showNav = () => {
      setIsNavHidden(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIsNavHidden(true), 5000);
    };
    const events = ["mousemove", "mousedown", "touchstart", "keydown"];
    events.forEach((ev) =>
      window.addEventListener(ev, showNav, { passive: true }),
    );
    showNav();
    return () => {
      clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, showNav));
    };
  }, []);

  const authUser = useAuthStore((s) => s.user);
  const authLogout = useAuthStore((s) => s.logout);

  function handleLogout() {
    authLogout();
    navigate("/login");
  }

  return (
    <div className="home-page">
      <nav
        className={[
          "home-nav",
          isNavScrolled ? "scrolled" : "",
          isNavHidden ? "nav-hidden" : "nav-visible",
        ]
          .filter(Boolean)
          .join(" ")}
        onMouseEnter={() => setIsNavHidden(false)}
      >
        <Link to="/" className="logo" aria-label="iFrame home">
          i<em>Frame</em>
        </Link>

        <div
          className="nav-center"
          role="navigation"
          aria-label="Main navigation"
        >
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={`nav-link${item.label === "Home" ? " active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="nav-right">
          <Link
            to="/search"
            className="nav-icon-btn nav-mobile-search-btn"
            aria-label="Open search"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </Link>

          <div className="search-shell" ref={searchWrapRef}>
            <form
              className="search-pill"
              onSubmit={handleSearchSubmit}
              aria-label="Search movies or series"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Cari film atau series..."
              />
            </form>

            {showSuggestionPanel && (
              <div
                className="search-dropdown"
                role="listbox"
                aria-label="Search suggestions"
              >
                {searchQuery.trim().length > 1 ? (
                  <>
                    <button
                      type="button"
                      className="search-dropdown-action"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSuggestionSearch(searchQuery.trim())}
                    >
                      Cari "{searchQuery.trim()}"
                    </button>

                    {isSuggestionLoading && (
                      <div className="search-dropdown-empty">
                        Memuat saran...
                      </div>
                    )}

                    {!isSuggestionLoading && suggestionItems.length === 0 && (
                      <div className="search-dropdown-empty">
                        Tidak ada hasil cepat.
                      </div>
                    )}

                    {!isSuggestionLoading &&
                      suggestionItems.map((item) => (
                        <button
                          key={`${item.media_type}-${item.id}`}
                          type="button"
                          className="search-suggestion-item"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleSuggestionOpen(item)}
                        >
                          <span className="search-suggestion-title">
                            {mediaTitle(item)}
                          </span>
                          <span className="search-suggestion-meta">
                            {item.media_type === "tv" ? "Series" : "Movie"} ·{" "}
                            {mediaYear(item) || "N/A"}
                          </span>
                        </button>
                      ))}
                  </>
                ) : (
                  <>
                    <div className="search-dropdown-label">
                      Pencarian Terakhir
                    </div>
                    {recentSearches.map((recent) => (
                      <button
                        key={recent}
                        type="button"
                        className="search-suggestion-item"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSuggestionSearch(recent)}
                      >
                        <span className="search-suggestion-title">
                          {recent}
                        </span>
                      </button>
                    ))}
                    {recentSearches.length > 0 && (
                      <button
                        type="button"
                        className="search-dropdown-clear"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setRecentSearches([]);
                          writeRecentSearches([]);
                        }}
                      >
                        Hapus Riwayat
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <Link to="/watchlist" className="nav-icon-btn" aria-label="Watchlist">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              strokeWidth="1.8"
              stroke="currentColor"
              fill="none"
              aria-hidden="true"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {watchlistCount > 0 && (
              <span className="nav-badge">{watchlistBadge}</span>
            )}
          </Link>

          {/* Admin link – only for admin role */}
          {authUser?.role === "admin" && (
            <Link
              to="/admin"
              className="nav-icon-btn nav-admin-link"
              aria-label="Admin dashboard"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                fill="none"
                aria-hidden="true"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Admin
            </Link>
          )}

          {/* User avatar */}
          <Link
            to="/history"
            className="avatar-btn"
            aria-label="Watch history"
            title={authUser?.username}
          >
            {authUser ? authUser.username[0].toUpperCase() : "U"}
          </Link>

          {/* Logout */}
          <button
            className="nav-logout-btn"
            onClick={handleLogout}
            aria-label="Logout"
            title="Keluar"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              fill="none"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </nav>

      <section className="hero">
        <div
          key={heroVisualKey}
          className="hero-bg hero-bg-fade"
          style={
            heroBackdrop
              ? { backgroundImage: `url('${heroBackdrop}')` }
              : undefined
          }
        />
        <div className="hero-vignette" />

        <div className="hero-content">
          <div className="hero-eyebrow">
            <span className="eyebrow-dot" />
            <span className="eyebrow-text">Trending #1 Minggu Ini</span>
          </div>

          {heroItem ? (
            <>
              <h1 className="hero-title">{mediaTitle(heroItem)}</h1>
              <div className="hero-tags">
                <span className="hero-tag gold">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    stroke="none"
                    aria-hidden="true"
                  >
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                  </svg>
                  {heroItem.vote_average.toFixed(1)}
                </span>
                {mediaYear(heroItem) && (
                  <span className="hero-tag">{mediaYear(heroItem)}</span>
                )}
                <span className="hero-tag">
                  {heroItem.media_type === "tv" ? "Series" : "Movie"}
                </span>
                {heroGenres.map((genre) => (
                  <span key={genre} className="hero-tag">
                    {genre}
                  </span>
                ))}
              </div>
              <p className="hero-desc">
                {heroItem.overview || "No overview available."}
              </p>
              <div className="hero-actions">
                <Link to={getResumeWatchUrl(heroItem, tvResumeMap)} className="btn-play">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    stroke="none"
                    aria-hidden="true"
                  >
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                  Tonton Sekarang
                </Link>
                <button
                  type="button"
                  onClick={() => openDetail(heroItem)}
                  className="btn-info"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Info Lebih Lanjut
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="hero-title">Loading...</h1>
              <p className="hero-desc">Menyiapkan konten terbaru untuk kamu.</p>
            </>
          )}
        </div>

        <div
          className="hero-thumbs"
          role="listbox"
          aria-label="Featured thumbnails"
        >
          {heroThumbItems.map((thumb, index) => (
            <button
              key={`${thumb.media_type}-${thumb.id}`}
              type="button"
              className={`hero-thumb${safeActiveThumb === index ? " active" : ""}`}
              onClick={() => handleHeroThumbSelect(index)}
              aria-label={`Pilih ${mediaTitle(thumb)}`}
              aria-selected={safeActiveThumb === index}
            >
              <img
                src={
                  tmdbImage(thumb.poster_path, "w300") ||
                  tmdbImage(thumb.backdrop_path, "w500") ||
                  heroPosterFallback ||
                  ""
                }
                alt={mediaTitle(thumb)}
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </section>

      <main>
        <div className="genre-wrap">
          {genreChips.map((genre) => (
            <button
              key={genre}
              type="button"
              className={`genre-chip${activeGenre === genre ? " active" : ""}`}
              onClick={() => setActiveGenre(genre)}
            >
              {genre}
            </button>
          ))}
        </div>

        <section className="section section-tight-top">
          <SectionHeader
            icon={
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                fill="none"
                aria-hidden="true"
              >
                <polygon points="5,3 19,12 5,21" />
              </svg>
            }
            title="Lanjut Nonton"
            count={
              continueWatching.length > 0
                ? `${continueWatching.length} belum selesai`
                : "Belum ada riwayat"
            }
            to="/history"
          />

          {continueWatching.length > 0 ? (
            <div className="cw-row">
              {continueWatching.map((item) => (
                <Link
                  key={item.watchUrl}
                  to={item.watchUrl}
                  className="cw-card"
                  aria-label={`Lanjutkan ${item.title}`}
                >
                  <div className="cw-img-wrap">
                    {item.image && !failedContinueImages[item.imageKey] ? (
                      <img
                        className="cw-img"
                        src={item.image}
                        alt={item.title}
                        loading="lazy"
                        onError={() => handleContinueImageError(item.imageKey)}
                      />
                    ) : (
                      <div className="cw-img cw-fallback">{item.title}</div>
                    )}
                    <div className="cw-play" aria-hidden="true">
                      <div className="cw-play-btn">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="black"
                          stroke="none"
                        >
                          <polygon points="5,3 19,12 5,21" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="cw-progress-bar">
                    {item.progress != null ? (
                      <div
                        className="cw-progress"
                        style={{ width: `${item.progress}%` }}
                      />
                    ) : (
                      <div className="cw-progress cw-progress-unknown" />
                    )}
                  </div>
                  <div className="cw-info">
                    <div className="cw-title">{item.title}</div>
                    <div className="cw-sub">{item.subtitle}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="row-empty">
              Belum ada konten di Continue Watching.
            </div>
          )}
        </section>

        <div className="divider" />

        {activeGenreFilter ? (
          /* ════════════════════════════════════════════════
             GENRE MODE — data fetched directly from TMDB
             ════════════════════════════════════════════════ */
          <>
            {/* Genre Movies row */}
            {activeGenreFilter.movie && (
              <>
                <section className="section">
                  <SectionHeader
                    icon={
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                        fill="none"
                        aria-hidden="true"
                      >
                        <rect x="2" y="2" width="20" height="20" rx="2.18" />
                        <line x1="7" y1="2" x2="7" y2="22" />
                        <line x1="17" y1="2" x2="17" y2="22" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <line x1="2" y1="7" x2="7" y2="7" />
                        <line x1="2" y1="17" x2="7" y2="17" />
                        <line x1="17" y1="17" x2="22" y2="17" />
                        <line x1="17" y1="7" x2="22" y2="7" />
                      </svg>
                    }
                    title={`${activeGenre} Movies`}
                    count="Paling populer di genre ini"
                    to="/browse/movies"
                  />
                  <div className="poster-row">
                    {isGenreMovieLoading
                      ? Array.from({ length: 7 }).map((_, i) => (
                          <div
                            key={i}
                            className="poster-card loading-card"
                            aria-hidden="true"
                          >
                            <div className="poster-wrap" />
                          </div>
                        ))
                      : normalizeList(
                          (genreMovieData?.results ?? []) as MediaItem[],
                          "movie",
                        )
                          .slice(0, 20)
                          .map((item) => (
                            <PosterCard
                              key={`${item.media_type}-${item.id}`}
                              item={item}
                              genreLabel={getPrimaryGenre(item)}
                              showActions
                              addedToWatchlist={isAdded(
                                item.id,
                                item.media_type,
                              )}
                              onOpen={() => openDetail(item)}
                              onPlay={() =>
                                navigate(getResumeWatchUrl(item, tvResumeMap))
                              }
                              onToggleWatchlist={() =>
                                handleToggleWatchlist(item)
                              }
                            />
                          ))}
                  </div>
                  {!isGenreMovieLoading &&
                    (genreMovieData?.results ?? []).length === 0 && (
                      <div className="row-empty">
                        Tidak ada movie {activeGenre} ditemukan.
                      </div>
                    )}
                </section>
                <div className="divider" />
              </>
            )}

            {/* Genre TV / Series row */}
            {activeGenreFilter.tv && (
              <>
                <section className="section">
                  <SectionHeader
                    icon={
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                        fill="none"
                        aria-hidden="true"
                      >
                        <rect x="2" y="7" width="20" height="15" rx="2" />
                        <polyline points="17 2 12 7 7 2" />
                      </svg>
                    }
                    title={`${activeGenre} Series`}
                    count="Serial paling populer"
                    to="/browse/series"
                  />
                  <div className="poster-row">
                    {isGenreTVLoading
                      ? Array.from({ length: 7 }).map((_, i) => (
                          <div
                            key={i}
                            className="poster-card loading-card"
                            aria-hidden="true"
                          >
                            <div className="poster-wrap" />
                          </div>
                        ))
                      : normalizeList(
                          (genreTVData?.results ?? []) as MediaItem[],
                          "tv",
                        )
                          .slice(0, 20)
                          .map((item) => (
                            <PosterCard
                              key={`${item.media_type}-${item.id}`}
                              item={item}
                              genreLabel={getPrimaryGenre(item)}
                              showActions
                              addedToWatchlist={isAdded(
                                item.id,
                                item.media_type,
                              )}
                              onOpen={() => openDetail(item)}
                              onPlay={() =>
                                navigate(getResumeWatchUrl(item, tvResumeMap))
                              }
                              onToggleWatchlist={() =>
                                handleToggleWatchlist(item)
                              }
                            />
                          ))}
                  </div>
                  {!isGenreTVLoading &&
                    (genreTVData?.results ?? []).length === 0 && (
                      <div className="row-empty">
                        Tidak ada series {activeGenre} ditemukan.
                      </div>
                    )}
                </section>
                <div className="divider" />
              </>
            )}

            {/* Genre Top Rated row (movies only) */}
            {activeGenreFilter.movie && (
              <section className="section">
                <SectionHeader
                  icon={
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                      fill="none"
                      aria-hidden="true"
                    >
                      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                    </svg>
                  }
                  title={`${activeGenre} — Top Rated`}
                  count="Rating tertinggi sepanjang masa"
                  to="/search?q=top+rated"
                />
                <div className="poster-row">
                  {isGenreTopRatedLoading
                    ? Array.from({ length: 7 }).map((_, i) => (
                        <div
                          key={i}
                          className="poster-card loading-card"
                          aria-hidden="true"
                        >
                          <div className="poster-wrap" />
                        </div>
                      ))
                    : normalizeList(
                        (genreTopRatedData?.results ?? []) as MediaItem[],
                        "movie",
                      )
                        .slice(0, 20)
                        .map((item) => (
                          <PosterCard
                            key={`${item.media_type}-${item.id}`}
                            item={item}
                            genreLabel={getPrimaryGenre(item)}
                            showActions={false}
                            addedToWatchlist={false}
                            onOpen={() => openDetail(item)}
                            onPlay={() => navigate(getResumeWatchUrl(item, tvResumeMap))}
                            onToggleWatchlist={() => {}}
                          />
                        ))}
                </div>
                {!isGenreTopRatedLoading &&
                  (genreTopRatedData?.results ?? []).length === 0 && (
                    <div className="row-empty">
                      Belum ada konten top rated untuk {activeGenre}.
                    </div>
                  )}
              </section>
            )}
          </>
        ) : (
          /* ════════════════════════════════════════════════
             DEFAULT MODE — Semua genre, original sections
             ════════════════════════════════════════════════ */
          <>
            <section className="section">
              <SectionHeader
                icon={
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    fill="none"
                    aria-hidden="true"
                  >
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                }
                title="Trending Minggu Ini"
                count="Paling banyak ditonton"
                to="/search?q=trending"
              />
              <div className="poster-row">
                {isTrendingLoading && filteredTrending.length === 0
                  ? Array.from({ length: 7 }).map((_, index) => (
                      <div
                        key={index}
                        className="poster-card loading-card"
                        aria-hidden="true"
                      >
                        <div className="poster-wrap" />
                      </div>
                    ))
                  : filteredTrending
                      .slice(0, 12)
                      .map((item, index) => (
                        <PosterCard
                          key={`${item.media_type}-${item.id}`}
                          item={item}
                          rank={`#${String(index + 1).padStart(2, "0")}`}
                          genreLabel={getPrimaryGenre(item)}
                          showActions
                          addedToWatchlist={isAdded(item.id, item.media_type)}
                          onOpen={() => openDetail(item)}
                          onPlay={() => navigate(getResumeWatchUrl(item, tvResumeMap))}
                          onToggleWatchlist={() => handleToggleWatchlist(item)}
                        />
                      ))}
              </div>
              {!isTrendingLoading && filteredTrending.length === 0 && (
                <div className="row-empty">
                  Tidak ada konten untuk genre ini.
                </div>
              )}
            </section>

            <div className="divider" />

            <section className="section">
              <SectionHeader
                icon={
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                }
                title="Populer Sekarang"
                count="Paling banyak di-watchlist"
                to="/browse/movies"
              />
              <div className="featured-grid">
                {isPopularLoading && filteredPopular.length === 0
                  ? Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="feat-card loading-card"
                        aria-hidden="true"
                      />
                    ))
                  : filteredPopular
                      .slice(0, 4)
                      .map((item) => (
                        <FeaturedCard
                          key={`${item.media_type}-${item.id}`}
                          item={item}
                          genreLabel={
                            getGenreLabels(item).slice(0, 2).join(" | ") ||
                            getPrimaryGenre(item)
                          }
                          onOpen={() => openDetail(item)}
                          onPlay={() => navigate(getResumeWatchUrl(item, tvResumeMap))}
                        />
                      ))}
              </div>
              {!isPopularLoading && filteredPopular.length === 0 && (
                <div className="row-empty">
                  Tidak ada konten populer untuk genre ini.
                </div>
              )}
            </section>

            <div className="divider" />

            <section className="section">
              <SectionHeader
                icon={
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path d="M12 20v-6" />
                    <path d="M6 20v-4" />
                    <path d="M18 20v-9" />
                    <path d="M4 11l4-4 4 3 6-6" />
                  </svg>
                }
                title="Trending Series"
                count="Serial yang lagi ramai"
                to="/browse/series"
              />
              <div className="poster-row">
                {isSeriesLoading && filteredSeries.length === 0
                  ? Array.from({ length: 7 }).map((_, index) => (
                      <div
                        key={index}
                        className="poster-card loading-card"
                        aria-hidden="true"
                      >
                        <div className="poster-wrap" />
                      </div>
                    ))
                  : filteredSeries
                      .slice(0, 12)
                      .map((item) => (
                        <PosterCard
                          key={`${item.media_type}-${item.id}`}
                          item={item}
                          genreLabel={getPrimaryGenre(item)}
                          showActions
                          addedToWatchlist={isAdded(item.id, item.media_type)}
                          onOpen={() => openDetail(item)}
                          onPlay={() => navigate(getResumeWatchUrl(item, tvResumeMap))}
                          onToggleWatchlist={() => handleToggleWatchlist(item)}
                        />
                      ))}
              </div>
              {!isSeriesLoading && filteredSeries.length === 0 && (
                <div className="row-empty">
                  Tidak ada serial untuk genre ini.
                </div>
              )}
            </section>

            <div className="divider" />

            <section className="section">
              <SectionHeader
                icon={
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path d="M4 6h16" />
                    <path d="M6 10h12" />
                    <path d="M8 14h8" />
                    <path d="M10 18h4" />
                  </svg>
                }
                title="Anime Picks"
                count="Kurasi anime movie dan series"
                to="/browse/anime"
              />
              <div className="poster-row">
                {(isAnimeTvLoading || isAnimeMovieLoading) &&
                filteredAnime.length === 0
                  ? Array.from({ length: 7 }).map((_, index) => (
                      <div
                        key={index}
                        className="poster-card loading-card"
                        aria-hidden="true"
                      >
                        <div className="poster-wrap" />
                      </div>
                    ))
                  : filteredAnime
                      .slice(0, 12)
                      .map((item) => (
                        <PosterCard
                          key={`${item.media_type}-${item.id}`}
                          item={item}
                          genreLabel={getPrimaryGenre(item)}
                          showActions
                          addedToWatchlist={isAdded(item.id, item.media_type)}
                          onOpen={() => openDetail(item)}
                          onPlay={() => navigate(getResumeWatchUrl(item, tvResumeMap))}
                          onToggleWatchlist={() => handleToggleWatchlist(item)}
                        />
                      ))}
              </div>
              {!isAnimeTvLoading &&
                !isAnimeMovieLoading &&
                filteredAnime.length === 0 && (
                  <div className="row-empty">
                    Tidak ada anime untuk genre ini.
                  </div>
                )}
            </section>

            <div className="divider" />

            {lastWatched && (
              <>
                <section className="section">
                  <SectionHeader
                    icon={
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path d="M3 12a9 9 0 0 1 15.5-6.3" />
                        <path d="M21 12a9 9 0 0 1-15.5 6.3" />
                        <polyline points="19 3 19 7 15 7" />
                        <polyline points="5 21 5 17 9 17" />
                      </svg>
                    }
                    title={`Because You Watched ${mediaTitle(lastWatched)}`}
                    count="Rekomendasi serupa untuk kamu"
                    to="/history"
                  />
                  <div className="poster-row">
                    {isBecauseLoading && filteredBecause.length === 0
                      ? Array.from({ length: 7 }).map((_, index) => (
                          <div
                            key={index}
                            className="poster-card loading-card"
                            aria-hidden="true"
                          >
                            <div className="poster-wrap" />
                          </div>
                        ))
                      : filteredBecause
                          .slice(0, 12)
                          .map((item) => (
                            <PosterCard
                              key={`${item.media_type}-${item.id}`}
                              item={item}
                              genreLabel={getPrimaryGenre(item)}
                              showActions
                              addedToWatchlist={isAdded(
                                item.id,
                                item.media_type,
                              )}
                              onOpen={() => openDetail(item)}
                              onPlay={() =>
                                navigate(getResumeWatchUrl(item, tvResumeMap))
                              }
                              onToggleWatchlist={() =>
                                handleToggleWatchlist(item)
                              }
                            />
                          ))}
                  </div>
                  {!isBecauseLoading && filteredBecause.length === 0 && (
                    <div className="row-empty">
                      Belum ada rekomendasi dari riwayat tontonan kamu.
                    </div>
                  )}
                </section>
                <div className="divider" />
              </>
            )}

            <section className="section">
              <SectionHeader
                icon={
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path d="M8 2v4" />
                    <path d="M16 2v4" />
                    <rect x="3" y="6" width="18" height="15" rx="2" />
                    <path d="M3 10h18" />
                  </svg>
                }
                title="Coming Soon"
                count="Film yang akan rilis"
                to="/search?q=upcoming"
              />
              <div className="poster-row">
                {isComingSoonLoading && filteredComingSoon.length === 0
                  ? Array.from({ length: 7 }).map((_, index) => (
                      <div
                        key={index}
                        className="poster-card loading-card"
                        aria-hidden="true"
                      >
                        <div className="poster-wrap" />
                      </div>
                    ))
                  : filteredComingSoon
                      .slice(0, 12)
                      .map((item) => (
                        <PosterCard
                          key={`${item.media_type}-${item.id}`}
                          item={item}
                          genreLabel={getPrimaryGenre(item)}
                          showActions={false}
                          addedToWatchlist={false}
                          onOpen={() => openDetail(item)}
                          onPlay={() => navigate(getResumeWatchUrl(item, tvResumeMap))}
                          onToggleWatchlist={() => {}}
                        />
                      ))}
              </div>
              {!isComingSoonLoading && filteredComingSoon.length === 0 && (
                <div className="row-empty">
                  Tidak ada film coming soon untuk genre ini.
                </div>
              )}
            </section>

            <div className="divider" />

            <section className="section">
              <SectionHeader
                icon={
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    fill="none"
                    aria-hidden="true"
                  >
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                  </svg>
                }
                title="Rating Tertinggi"
                count="Semua waktu terbaik"
                to="/search?q=top+rated"
              />
              <div className="poster-row">
                {isTopRatedLoading && filteredTopRated.length === 0
                  ? Array.from({ length: 7 }).map((_, index) => (
                      <div
                        key={index}
                        className="poster-card loading-card"
                        aria-hidden="true"
                      >
                        <div className="poster-wrap" />
                      </div>
                    ))
                  : filteredTopRated
                      .slice(0, 12)
                      .map((item) => (
                        <PosterCard
                          key={`${item.media_type}-${item.id}`}
                          item={item}
                          genreLabel={getPrimaryGenre(item)}
                          showActions={false}
                          addedToWatchlist={false}
                          onOpen={() => openDetail(item)}
                          onPlay={() => navigate(getResumeWatchUrl(item, tvResumeMap))}
                          onToggleWatchlist={() => {}}
                        />
                      ))}
              </div>
              {!isTopRatedLoading && filteredTopRated.length === 0 && (
                <div className="row-empty">
                  Tidak ada konten top rated untuk genre ini.
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer>
        <div className="footer-logo">
          i<em>Frame</em>
        </div>
        <div className="footer-text">
          Personal use only | Powered by TMDB | 2026
        </div>
      </footer>
    </div>
  );
}
