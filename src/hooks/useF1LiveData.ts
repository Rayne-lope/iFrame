import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { openF1 } from "@/api/openf1";
import type {
  F1CarData,
  F1Driver,
  F1Interval,
  F1Position,
  F1RaceControlMessage,
  F1Stint,
} from "@/types/sports";

const LIVE_REFETCH_MS = 5000;

function latestByDriver<T extends { driver_number: number; date: string }>(
  rows: T[] | undefined,
): T[] {
  const latest = new Map<number, T>();

  (rows ?? []).forEach((row) => {
    const previous = latest.get(row.driver_number);
    if (!previous || Date.parse(row.date) >= Date.parse(previous.date)) {
      latest.set(row.driver_number, row);
    }
  });

  return Array.from(latest.values());
}

function latestStints(rows: F1Stint[] | undefined): F1Stint[] {
  const latest = new Map<number, F1Stint>();

  (rows ?? []).forEach((row) => {
    const previous = latest.get(row.driver_number);
    const nextDate = row.date_start ? Date.parse(row.date_start) : 0;
    const prevDate = previous?.date_start ? Date.parse(previous.date_start) : 0;

    if (!previous || nextDate >= prevDate) {
      latest.set(row.driver_number, row);
    }
  });

  return Array.from(latest.values());
}

function latestRaceControl(
  rows: F1RaceControlMessage[] | undefined,
): F1RaceControlMessage[] {
  return [...(rows ?? [])]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 5);
}

export function useF1LiveData(
  sessionKey: number | null,
  selectedDriverNumber?: number,
  enabled: boolean = true,
) {
  const liveEnabled = Boolean(sessionKey && enabled);

  const driversQuery = useQuery({
    queryKey: ["sports", "f1", "drivers", sessionKey],
    queryFn: () => openF1.getDrivers(sessionKey!),
    enabled: liveEnabled,
    refetchInterval: LIVE_REFETCH_MS,
    refetchIntervalInBackground: false,
    staleTime: 4000,
  });

  const positionsQuery = useQuery({
    queryKey: ["sports", "f1", "positions", sessionKey],
    queryFn: () => openF1.getLivePositions(sessionKey!),
    enabled: liveEnabled,
    refetchInterval: LIVE_REFETCH_MS,
    refetchIntervalInBackground: false,
    staleTime: 4000,
  });

  const intervalsQuery = useQuery({
    queryKey: ["sports", "f1", "intervals", sessionKey],
    queryFn: () => openF1.getLiveIntervals(sessionKey!),
    enabled: liveEnabled,
    refetchInterval: LIVE_REFETCH_MS,
    refetchIntervalInBackground: false,
    staleTime: 4000,
  });

  const stintsQuery = useQuery({
    queryKey: ["sports", "f1", "stints", sessionKey],
    queryFn: () => openF1.getStints(sessionKey!),
    enabled: liveEnabled,
    refetchInterval: LIVE_REFETCH_MS,
    refetchIntervalInBackground: false,
    staleTime: 4000,
  });

  const raceControlQuery = useQuery({
    queryKey: ["sports", "f1", "race-control", sessionKey],
    queryFn: () => openF1.getRaceControl(sessionKey!),
    enabled: liveEnabled,
    refetchInterval: LIVE_REFETCH_MS,
    refetchIntervalInBackground: false,
    staleTime: 4000,
  });

  const carDataQuery = useQuery<F1CarData[] | null, Error, F1CarData | null>({
    queryKey: ["sports", "f1", "car-data", sessionKey, selectedDriverNumber],
    queryFn: () => openF1.getCarData(sessionKey!, selectedDriverNumber!),
    select: (rows) => rows?.at(-1) ?? null,
    enabled: liveEnabled && Boolean(selectedDriverNumber),
    refetchInterval: LIVE_REFETCH_MS,
    refetchIntervalInBackground: false,
    staleTime: 4000,
  });

  const positions = useMemo<F1Position[]>(
    () =>
      latestByDriver(positionsQuery.data).sort((a, b) => a.position - b.position),
    [positionsQuery.data],
  );

  const intervals = useMemo<F1Interval[]>(
    () =>
      latestByDriver(intervalsQuery.data).sort((a, b) => a.driver_number - b.driver_number),
    [intervalsQuery.data],
  );

  const stints = useMemo(() => latestStints(stintsQuery.data), [stintsQuery.data]);
  const raceControl = useMemo(
    () => latestRaceControl(raceControlQuery.data),
    [raceControlQuery.data],
  );

  const selectedDriver = useMemo<F1Driver | null>(
    () =>
      driversQuery.data?.find(
        (driver) => driver.driver_number === selectedDriverNumber,
      ) ?? null,
    [driversQuery.data, selectedDriverNumber],
  );

  const leader = useMemo<F1Driver | null>(() => {
    const leaderPosition = positions[0];
    if (!leaderPosition) return null;
    return (
      driversQuery.data?.find(
        (driver) => driver.driver_number === leaderPosition.driver_number,
      ) ?? null
    );
  }, [driversQuery.data, positions]);

  return {
    drivers: driversQuery.data ?? [],
    positions,
    intervals,
    stints,
    raceControl,
    selectedCarData: carDataQuery.data ?? null,
    selectedDriver,
    leader,
    isLoading:
      driversQuery.isLoading ||
      positionsQuery.isLoading ||
      intervalsQuery.isLoading,
    isError:
      driversQuery.isError ||
      positionsQuery.isError ||
      intervalsQuery.isError ||
      stintsQuery.isError ||
      raceControlQuery.isError ||
      carDataQuery.isError,
  };
}
