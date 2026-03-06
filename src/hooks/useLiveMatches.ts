import { useQuery } from "@tanstack/react-query";
import { streamed } from "@/api/streamed";
import { sortMatches } from "@/lib/sports";
import type { LiveMatchesPayload, SportSlug } from "@/types/sports";

export function useLiveMatches(
  sport: SportSlug = "all",
  enabled: boolean = true,
) {
  return useQuery<LiveMatchesPayload>({
    queryKey: ["sports", "matches", sport],
    queryFn: () =>
      sport === "all"
        ? streamed.getAllMatches()
        : streamed.getMatchesBySport(sport),
    select: (payload) => ({
      ...payload,
      matches: sortMatches(payload.matches),
    }),
    retry: false,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
    enabled,
  });
}
