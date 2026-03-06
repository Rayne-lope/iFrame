import { useQuery } from "@tanstack/react-query";
import { ergast } from "@/api/ergast";
import { getCurrentSportsYear } from "@/lib/sports";

export function useF1DriverStandings(
  year: number = getCurrentSportsYear(),
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: ["sports", "f1", "driver-standings", year],
    queryFn: () => ergast.getDriverStandings(year),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useF1ConstructorStandings(
  year: number = getCurrentSportsYear(),
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: ["sports", "f1", "constructor-standings", year],
    queryFn: () => ergast.getConstructorStandings(year),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useF1Standings(
  year: number = getCurrentSportsYear(),
  enabled: boolean = true,
) {
  const driverStandings = useF1DriverStandings(year, enabled);
  const constructorStandings = useF1ConstructorStandings(year, enabled);

  return {
    driverStandings,
    constructorStandings,
  };
}
