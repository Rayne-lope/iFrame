import { Gauge, Radio, ShieldAlert } from "lucide-react";
import ControlCenterCard from "./ControlCenterCard";
import { getTeamColor } from "@/lib/sports";
import { cn } from "@/lib/utils";
import type {
  F1CarData,
  F1Driver,
  F1Interval,
  F1Position,
  F1RaceControlMessage,
  F1Stint,
} from "@/types/sports";

interface LiveTelemetryProps {
  sessionName: string;
  drivers: F1Driver[];
  positions: F1Position[];
  intervals: F1Interval[];
  stints: F1Stint[];
  raceControl: F1RaceControlMessage[];
  selectedDriverNumber: number | null;
  carData: F1CarData | null;
  onSelectDriver: (driverNumber: number) => void;
  isLoading?: boolean;
}

function statValue(value: number | string | null | undefined, suffix = "") {
  if (value === null || value === undefined || value === "") return "--";
  return `${value}${suffix}`;
}

export default function LiveTelemetry({
  sessionName,
  drivers,
  positions,
  intervals,
  stints,
  raceControl,
  selectedDriverNumber,
  carData,
  onSelectDriver,
  isLoading = false,
}: LiveTelemetryProps) {
  if (!isLoading && drivers.length === 0) {
    return (
      <ControlCenterCard
        title="Live Telemetry"
        subtitle="No active F1 session right now"
      >
        <p className="text-sm text-muted-foreground">
          Tidak ada sesi F1 live saat ini.
        </p>
      </ControlCenterCard>
    );
  }

  const positionMap = new Map(positions.map((item) => [item.driver_number, item]));
  const intervalMap = new Map(intervals.map((item) => [item.driver_number, item]));
  const stintMap = new Map(stints.map((item) => [item.driver_number, item]));

  const orderedDrivers = [...drivers].sort((a, b) => {
    const aPos = positionMap.get(a.driver_number)?.position ?? 999;
    const bPos = positionMap.get(b.driver_number)?.position ?? 999;
    return aPos - bPos;
  });

  const selectedDriver =
    orderedDrivers.find((driver) => driver.driver_number === selectedDriverNumber) ??
    orderedDrivers[0] ??
    null;
  const selectedInterval = selectedDriver
    ? intervalMap.get(selectedDriver.driver_number)
    : null;
  const selectedStint = selectedDriver
    ? stintMap.get(selectedDriver.driver_number)
    : null;
  const latestRaceControl = raceControl[0] ?? null;

  const stats = [
    { label: "Speed", value: statValue(carData?.speed, " km/h") },
    { label: "Gear", value: statValue(carData?.gear) },
    { label: "RPM", value: statValue(carData?.rpm) },
    { label: "Throttle", value: statValue(carData?.throttle, "%") },
    { label: "Brake", value: statValue(carData?.brake, "%") },
    {
      label: "DRS",
      value:
        carData?.drs && carData.drs >= 10
          ? "ON"
          : carData?.drs === 8
            ? "ARMED"
            : "OFF",
    },
  ];

  return (
    <ControlCenterCard
      title="Live Telemetry"
      subtitle={sessionName}
      badge={
        <span className="gold-chip">
          <Radio className="h-3.5 w-3.5" />
          Live
        </span>
      }
    >

      {latestRaceControl && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">
              {latestRaceControl.category || "Race Control"}
            </div>
            <div className="text-amber-50/80">
              {latestRaceControl.message ?? "No latest message"}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hidden">
        {orderedDrivers.map((driver) => {
          const active = driver.driver_number === selectedDriver?.driver_number;
          return (
            <button
              key={driver.driver_number}
              type="button"
              onClick={() => onSelectDriver(driver.driver_number)}
              className={cn(
                "min-w-fit rounded-full border px-3 py-2 text-sm font-semibold transition-all",
                active
                  ? "border-transparent text-black"
                  : "border-white/[0.08] bg-white/[0.04] text-muted-foreground hover:text-foreground",
              )}
              style={
                active
                  ? {
                      backgroundColor: driver.team_colour
                        ? `#${driver.team_colour}`
                        : getTeamColor(driver.team_name),
                    }
                  : undefined
              }
            >
              {driver.name_acronym || driver.broadcast_name}
            </button>
          );
        })}
      </div>

      {selectedDriver && (
        <div className="mt-5 rounded-3xl border border-white/[0.08] bg-black/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Selected driver
              </div>
              <h4 className="mt-1 text-xl font-semibold text-foreground">
                {selectedDriver.full_name}
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedDriver.team_name}
              </p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div>Gap: {selectedInterval?.gap_to_leader ?? "--"}</div>
              <div>Interval: {selectedInterval?.interval ?? "--"}</div>
              <div>Compound: {selectedStint?.compound ?? "--"}</div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3"
              >
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  <Gauge className="h-3.5 w-3.5" />
                  {stat.label}
                </div>
                <div className="mt-2 text-2xl font-bold text-foreground [font-family:var(--font-mono)]">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 rounded-3xl border border-white/[0.08] bg-black/20 p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Leaderboard
          </div>
          <div className="text-xs text-muted-foreground">5 visible rows</div>
        </div>

        <div className="max-h-[18.75rem] space-y-2 overflow-y-auto pr-1 scrollbar-hidden">
          {orderedDrivers.map((driver) => {
          const livePosition = positionMap.get(driver.driver_number);
          const liveInterval = intervalMap.get(driver.driver_number);

          return (
            <div
              key={`row-${driver.driver_number}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-sm font-bold text-foreground">
                  {livePosition?.position ?? "--"}
                </div>
                <div>
                  <div className="font-medium text-foreground">
                    {driver.broadcast_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {driver.team_name}
                  </div>
                </div>
              </div>

              <div className="text-right text-sm text-muted-foreground [font-family:var(--font-mono)]">
                {liveInterval?.gap_to_leader ?? liveInterval?.interval ?? "--"}
              </div>
            </div>
          );
          })}
        </div>
      </div>
    </ControlCenterCard>
  );
}
