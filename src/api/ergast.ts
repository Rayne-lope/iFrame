import { getCurrentSportsYear } from "@/lib/sports";
import type {
  ErgastConstructorStanding,
  ErgastDriverStanding,
  ErgastQualifyingRace,
  ErgastRaceResult,
} from "@/types/sports";

const BASE = "/api/sports/ergast";

async function ergastFetch(path: string): Promise<unknown> {
  const response = await fetch(`${BASE}${path}`);

  if (!response.ok) {
    throw new Error(`Ergast error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function getStandingsList<T>(
  payload: unknown,
  key: "DriverStandings" | "ConstructorStandings",
): T[] {
  if (!payload || typeof payload !== "object") return [];

  const list =
    (payload as {
      MRData?: {
        StandingsTable?: {
          StandingsLists?: Array<Record<string, unknown>>;
        };
      };
    }).MRData?.StandingsTable?.StandingsLists?.[0]?.[key];

  return Array.isArray(list) ? (list as T[]) : [];
}

function getRaceTable<T>(
  payload: unknown,
  key: "Results" | "QualifyingResults",
): T[] {
  if (!payload || typeof payload !== "object") return [];

  const races =
    (payload as {
      MRData?: {
        RaceTable?: {
          Races?: Array<Record<string, unknown>>;
        };
      };
    }).MRData?.RaceTable?.Races;

  if (!Array.isArray(races)) return [];

  return races.filter(
    (race) => race && typeof race === "object" && Array.isArray(race[key]),
  ) as T[];
}

export const ergast = {
  async getDriverStandings(
    year: number = getCurrentSportsYear(),
  ): Promise<ErgastDriverStanding[]> {
    const data = await ergastFetch(`/${year}/driverStandings.json`);
    return getStandingsList<ErgastDriverStanding>(data, "DriverStandings");
  },

  async getConstructorStandings(
    year: number = getCurrentSportsYear(),
  ): Promise<ErgastConstructorStanding[]> {
    const data = await ergastFetch(`/${year}/constructorStandings.json`);
    return getStandingsList<ErgastConstructorStanding>(data, "ConstructorStandings");
  },

  async getRaceResults(
    year: number = getCurrentSportsYear(),
  ): Promise<ErgastRaceResult[]> {
    const data = await ergastFetch(`/${year}/results.json?limit=100`);
    return getRaceTable<ErgastRaceResult>(data, "Results");
  },

  async getRaceResult(
    round: number,
    year: number = getCurrentSportsYear(),
  ): Promise<ErgastRaceResult | null> {
    const data = await ergastFetch(`/${year}/${round}/results.json`);
    return getRaceTable<ErgastRaceResult>(data, "Results")[0] ?? null;
  },

  async getQualifyingResults(
    year: number = getCurrentSportsYear(),
  ): Promise<ErgastQualifyingRace[]> {
    const data = await ergastFetch(`/${year}/qualifying.json?limit=100`);
    return getRaceTable<ErgastQualifyingRace>(data, "QualifyingResults");
  },

  async getDriverProfile(driverId: string) {
    const data = await ergastFetch(`/drivers/${driverId}.json`);
    const drivers =
      (data as {
        MRData?: {
          DriverTable?: {
            Drivers?: unknown[];
          };
        };
      }).MRData?.DriverTable?.Drivers;

    return Array.isArray(drivers) ? drivers[0] ?? null : null;
  },
};
