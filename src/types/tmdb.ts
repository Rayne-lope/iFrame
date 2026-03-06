export interface Genre {
  id: number;
  name: string;
}

export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  genres?: Genre[];
  imdb_id?: string;
  runtime?: number;
  tagline?: string;
  status?: string;
  media_type?: "movie";
  production_companies?: {
    id: number;
    name: string;
    logo_path: string | null;
  }[];
}

export interface TVShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  genres?: Genre[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  tagline?: string;
  media_type?: "tv";
  networks?: { id: number; name: string; logo_path: string | null }[];
}

export interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  media_type?: "movie" | "tv" | "person";
}

export interface Cast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface Episode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  air_date: string;
  still_path: string | null;
  vote_average: number;
  runtime: number | null;
}

export interface Season {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string;
  episode_count: number;
  episodes?: Episode[];
}

export interface PaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface CreditsResponse {
  id: number;
  cast: Cast[];
  crew: Cast[];
}

export interface VideosResponse {
  id: number;
  results: Video[];
}

export interface ExternalIds {
  id: number;
  imdb_id: string | null;
  tvdb_id: number | null;
  tvrage_id: number | null;
  wikidata_id: string | null;
  facebook_id: string | null;
  instagram_id: string | null;
  twitter_id: string | null;
}

export type DiscoverMediaType = "movie" | "tv";

export type DiscoverSortBy =
  | "popularity.desc"
  | "popularity.asc"
  | "vote_average.desc"
  | "vote_average.asc"
  | "release_date.desc"
  | "release_date.asc"
  | "first_air_date.desc"
  | "first_air_date.asc";

export interface DiscoverParams {
  page?: number;
  withGenres?: string;
  sortBy?: DiscoverSortBy;
  voteAverageGte?: number;
  year?: number;
  includeAdult?: boolean;
  withOriginalLanguage?: string;
}
