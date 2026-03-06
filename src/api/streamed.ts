import {
  mapSportSlugToApiSport,
  normalizeMatchCategory,
  normalizeUnixMs,
  parseMatchTeams,
} from "@/lib/sports";
import type {
  LiveMatchesPayload,
  LiveProviderStatus,
  SportSlug,
  StreamSource,
  StreamedApiSport,
  StreamedMatch,
} from "@/types/sports";

const BASE = "/api/sports/streamed";
const CACHE_TTL_MS = 45_000;
const REQUEST_TIMEOUT_MS = 8_000;

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown stream provider error";
}

function classifyProviderStatus(error: unknown): {
  providerStatus: LiveProviderStatus;
  providerMessage: string;
} {
  const message = extractErrorMessage(error).toLowerCase();

  if (
    message.includes("forbidden by its access permissions") ||
    message.includes("rpz") ||
    message.includes("biznet") ||
    message.includes("451") ||
    message.includes("blocked")
  ) {
    return {
      providerStatus: "blocked",
      providerMessage:
        "Provider stream terlihat diblokir oleh jaringan ini. Data F1 tetap bisa tampil, tapi video live tidak tersedia.",
    };
  }

  if (
    (error instanceof DOMException && error.name === "AbortError") ||
    message.includes("abort") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("etimedout")
  ) {
    return {
      providerStatus: "timeout",
      providerMessage:
        "Provider stream timeout atau tidak terjangkau. Ini sering berarti provider sedang down atau diblokir di jaringan ini.",
    };
  }

  return {
    providerStatus: "unavailable",
    providerMessage:
      "Provider stream sedang tidak tersedia. Data F1 tetap aktif, tetapi video live belum bisa dibuka.",
  };
}

function createUnavailablePayload(error: unknown): LiveMatchesPayload {
  const classification = classifyProviderStatus(error);

  return {
    matches: [],
    source: "unavailable",
    fetchedAt: Date.now(),
    providerStatus: classification.providerStatus,
    providerMessage: classification.providerMessage,
    isVideoAvailable: false,
  };
}

function cacheKey(scope: string): string {
  return `iframe-streamed-cache:${scope}`;
}

function readCacheEntry<T>(
  scope: string,
): { data: T; expiresAt: number; cachedAt: number } | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(cacheKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      expiresAt?: number;
      cachedAt?: number;
      data?: T;
    };
    if (!parsed.expiresAt || !parsed.data) return null;
    return {
      data: parsed.data,
      expiresAt: parsed.expiresAt,
      cachedAt: parsed.cachedAt ?? Date.now(),
    };
  } catch {
    return null;
  }
}

function writeCache<T>(scope: string, data: T) {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(
      cacheKey(scope),
      JSON.stringify({
        cachedAt: Date.now(),
        expiresAt: Date.now() + CACHE_TTL_MS,
        data,
      }),
    );
  } catch {
    // Ignore quota issues for best-effort session cache.
  }
}

function extractArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];

  const candidates = ["data", "matches", "results", "sources"];
  for (const key of candidates) {
    const nested = (value as Record<string, unknown>)[key];
    if (Array.isArray(nested)) return nested;
  }

  return [];
}

function normalizeStatus(value: unknown): StreamedMatch["status"] {
  if (typeof value !== "string") return "upcoming";
  const normalized = value.trim().toLowerCase();

  if (normalized === "live" || normalized === "inplay" || normalized === "in_play") {
    return "live";
  }
  if (normalized === "completed" || normalized === "ended" || normalized === "finished") {
    return "completed";
  }
  return "upcoming";
}

function normalizeSources(value: unknown): StreamSource[] {
  const normalized: Array<StreamSource | null> = extractArray(value).map(
    (item) => {
      if (!item || typeof item !== "object") return null;

      const raw = item as Record<string, unknown>;
      const id =
        typeof raw.id === "string"
          ? raw.id
          : typeof raw.sourceId === "string"
            ? raw.sourceId
            : "";
      const streamNo =
        typeof raw.streamNo === "number"
          ? raw.streamNo
          : typeof raw.stream_no === "number"
            ? raw.stream_no
            : 1;

      if (!id) return null;

      return {
        id,
        streamNo,
        label:
          typeof raw.label === "string"
            ? raw.label
            : typeof raw.name === "string"
              ? raw.name
              : undefined,
      };
    },
  );

  return normalized.filter(
    (item): item is StreamSource => item !== null,
  );
}

function normalizeScore(raw: Record<string, unknown>): string | null {
  if (typeof raw.score === "string") return raw.score;
  const home = raw.homeScore;
  const away = raw.awayScore;
  if (typeof home === "number" && typeof away === "number") {
    return `${home}-${away}`;
  }
  return null;
}

function normalizeMatch(raw: Record<string, unknown>): StreamedMatch | null {
  const id =
    typeof raw.id === "string"
      ? raw.id
      : typeof raw.matchId === "string"
        ? raw.matchId
        : "";
  const title =
    typeof raw.title === "string"
      ? raw.title
      : typeof raw.name === "string"
        ? raw.name
        : "";

  if (!id || !title) return null;

  const { homeName, awayName } = parseMatchTeams(title);

  return {
    id,
    title,
    category: normalizeMatchCategory(raw.category ?? raw.sport),
    status: normalizeStatus(raw.status),
    startTime: normalizeUnixMs(
      raw.startTime ?? raw.start_time ?? raw.startsAt ?? raw.date_start ?? Date.now(),
    ),
    sources: normalizeSources(raw.sources),
    popular: Boolean(raw.popular),
    score: normalizeScore(raw),
    competition:
      typeof raw.competition === "string"
        ? raw.competition
        : typeof raw.league === "string"
          ? raw.league
          : null,
    thumbnail:
      typeof raw.thumbnail === "string"
        ? raw.thumbnail
        : typeof raw.image === "string"
          ? raw.image
          : null,
    homeName,
    awayName,
  };
}

async function streamedFetch(
  scope: string,
  path: string,
): Promise<{
  data: unknown;
  source: "network" | "cache";
  fetchedAt: number;
  providerStatus: "available" | "cache";
  providerMessage?: string;
  isVideoAvailable: boolean;
}> {
  const cached = readCacheEntry<unknown>(scope);
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE}${path}`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `StreamedSU error: ${response.status} ${response.statusText}${detail ? ` ${detail}` : ""}`,
      );
    }

    const data = await response.json();
    writeCache(scope, data);
    return {
      data,
      source: "network" as const,
      fetchedAt: Date.now(),
      providerStatus: "available" as const,
      providerMessage: undefined,
      isVideoAvailable: true,
    };
  } catch (error) {
    if (cached !== null) {
      return {
        data: cached.data,
        source: "cache" as const,
        fetchedAt: cached.cachedAt,
        providerStatus: "cache" as const,
        providerMessage:
          "Menampilkan cache terakhir. Video live dimatikan sampai provider stream bisa dihubungi lagi.",
        isVideoAvailable: false,
      };
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function dedupeMatches(matches: StreamedMatch[]): StreamedMatch[] {
  const deduped = new Map<string, StreamedMatch>();

  matches.forEach((match) => {
    deduped.set(match.id, match);
  });

  return Array.from(deduped.values());
}

function normalizeMatchesPayload(data: unknown): StreamedMatch[] {
  return dedupeMatches(
    extractArray(data)
      .map((item) =>
        item && typeof item === "object"
          ? normalizeMatch(item as Record<string, unknown>)
          : null,
      )
      .filter((item): item is StreamedMatch => item !== null),
  );
}

async function fetchMatchesEndpoint(
  scope: string,
  path: string,
): Promise<LiveMatchesPayload> {
  const response = await streamedFetch(scope, path);

  return {
    matches: normalizeMatchesPayload(response.data),
    source: response.source,
    fetchedAt: response.fetchedAt,
    providerStatus: response.providerStatus,
    providerMessage: response.providerMessage,
    isVideoAvailable: response.isVideoAvailable,
  };
}

async function getAllMatchesWithFallback(): Promise<LiveMatchesPayload> {
  try {
    return await fetchMatchesEndpoint("matches:all", "/matches/all");
  } catch (error) {
    const settled = await Promise.allSettled([
      fetchMatchesEndpoint("matches:f1", "/matches/f1"),
      fetchMatchesEndpoint("matches:football", "/matches/football"),
      fetchMatchesEndpoint("matches:basketball", "/matches/basketball"),
      fetchMatchesEndpoint("matches:mma", "/matches/mma"),
    ]);

    const fulfilled = settled
      .filter(
        (result): result is PromiseFulfilledResult<LiveMatchesPayload> =>
          result.status === "fulfilled",
      )
      .map((result) => result.value);

    if (fulfilled.length === 0) {
      return createUnavailablePayload(error);
    }

    const matches = fulfilled.flatMap((result) => result.matches);
    const hasReachableProvider = fulfilled.some(
      (result) => result.providerStatus === "available",
    );

    return {
      matches: dedupeMatches(matches),
      source: "fallback-merge",
      fetchedAt: Date.now(),
      providerStatus: hasReachableProvider ? "available" : "cache",
      providerMessage: hasReachableProvider
        ? "Menampilkan feed gabungan dari beberapa endpoint olahraga."
        : "Menampilkan cache gabungan terakhir. Video live dimatikan sampai provider stream kembali tersedia.",
      isVideoAvailable: hasReachableProvider,
    };
  }
}

async function getMatchesForSport(
  apiSport: StreamedApiSport,
): Promise<LiveMatchesPayload> {
  if (apiSport === "all") {
    return getAllMatchesWithFallback();
  }

  try {
    return await fetchMatchesEndpoint(`matches:${apiSport}`, `/matches/${apiSport}`);
  } catch (error) {
    const allCache = readCacheEntry<unknown>("matches:all");
    if (!allCache) {
      return createUnavailablePayload(error);
    }

    return {
      matches: normalizeMatchesPayload(allCache.data).filter(
        (match) => match.category === normalizeMatchCategory(apiSport),
      ),
      source: "filtered-cache",
      fetchedAt: allCache.cachedAt,
      providerStatus: "cache",
      providerMessage:
        "Menampilkan cache hasil filter terakhir. Video live dimatikan sampai provider stream kembali tersedia.",
      isVideoAvailable: false,
    };
  }
}

export const streamed = {
  getAllMatches: () => getMatchesForSport("all"),

  getMatchesBySport: (sport: SportSlug | StreamedApiSport) =>
    getMatchesForSport(
      sport === "all" ||
        sport === "f1" ||
        sport === "football" ||
        sport === "basketball" ||
        sport === "mma"
        ? sport
        : mapSportSlugToApiSport(sport),
    ),

  async getStreamSources(matchId: string): Promise<StreamSource[]> {
    const response = await streamedFetch(
      `sources:${matchId}`,
      `/stream/source/${matchId}`,
    );
    return normalizeSources(response.data);
  },

  getEmbedUrl: (matchId: string, sourceId?: string, streamNo: number = 1) =>
    sourceId
      ? `https://streamed.su/watch/${matchId}/${sourceId}/${streamNo}`
      : `https://streamed.su/watch/${matchId}`,
};
