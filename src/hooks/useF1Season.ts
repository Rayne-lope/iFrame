import { useQuery } from "@tanstack/react-query";
import { ergast } from "@/api/ergast";
import { openF1 } from "@/api/openf1";
import { deriveF1SeasonData, getCurrentSportsYear } from "@/lib/sports";
import type { F1SeasonData } from "@/types/sports";

export function useF1Season(
  year: number = getCurrentSportsYear(),
  enabled: boolean = true,
) {
  return useQuery<F1SeasonData>({
    queryKey: ["sports", "f1", "season", year],
    queryFn: async () => {
      const [meetings, sessions, raceResults, qualifyingResults] =
        await Promise.all([
          openF1.getMeetings(year),
          openF1.getSessions(year),
          ergast.getRaceResults(year),
          ergast.getQualifyingResults(year),
        ]);

      return deriveF1SeasonData({
        year,
        meetings,
        sessions,
        raceResults,
        qualifyingResults,
      });
    },
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}
