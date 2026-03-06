import { useState } from "react";
import ConstructorStandings from "./ConstructorStandings";
import ControlCenterCard from "./ControlCenterCard";
import DriverStandings from "./DriverStandings";
import LiveTelemetry from "./LiveTelemetry";
import RaceCalendar from "./RaceCalendar";
import type {
  ErgastConstructorStanding,
  ErgastDriverStanding,
  F1CarData,
  F1Driver,
  F1Interval,
  F1Position,
  F1RaceControlMessage,
  F1SeasonData,
  F1Stint,
} from "@/types/sports";

interface F1SectionProps {
  seasonData?: F1SeasonData;
  driverStandings?: ErgastDriverStanding[];
  constructorStandings?: ErgastConstructorStanding[];
  selectedDriverNumber: number | null;
  onSelectDriver: (driverNumber: number) => void;
  carData: F1CarData | null;
  liveDrivers: F1Driver[];
  livePositions: F1Position[];
  liveIntervals: F1Interval[];
  liveStints: F1Stint[];
  liveRaceControl: F1RaceControlMessage[];
  loading?: boolean;
}

export default function F1Section({
  seasonData,
  driverStandings = [],
  constructorStandings = [],
  selectedDriverNumber,
  onSelectDriver,
  carData,
  liveDrivers,
  livePositions,
  liveIntervals,
  liveStints,
  liveRaceControl,
  loading = false,
}: F1SectionProps) {
  const [mobilePane, setMobilePane] = useState<
    "calendar" | "drivers" | "constructors" | "telemetry"
  >("calendar");

  if (loading && !seasonData) {
    return (
      <section className="page-block p-5 sm:p-6 lg:p-7">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="h-[520px] animate-pulse rounded-3xl bg-white/[0.05]" />
          <div className="space-y-4">
            <div className="h-64 animate-pulse rounded-3xl bg-white/[0.05]" />
            <div className="h-64 animate-pulse rounded-3xl bg-white/[0.05]" />
          </div>
        </div>
      </section>
    );
  }

  if (!seasonData) {
    return null;
  }

  const calendarPane = (
    <ControlCenterCard
      title="Race Calendar"
      subtitle="Full season weekend flow"
      badge={
        <div className="flex flex-wrap justify-end gap-2">
          <span className="muted-chip">{seasonData.calendar.length} rounds</span>
          <span className="muted-chip">5 visible</span>
        </div>
      }
      bodyClassName="max-h-[34rem] overflow-y-auto pr-1 scrollbar-hidden"
    >
      <RaceCalendar calendar={seasonData.calendar} />
    </ControlCenterCard>
  );

  const telemetryPane = seasonData.activeSession ? (
    <LiveTelemetry
      sessionName={seasonData.activeSession.session_name}
      drivers={liveDrivers}
      positions={livePositions}
      intervals={liveIntervals}
      stints={liveStints}
      raceControl={liveRaceControl}
      selectedDriverNumber={selectedDriverNumber}
      carData={carData}
      onSelectDriver={onSelectDriver}
      isLoading={loading}
    />
  ) : null;

  const mobilePanes = [
    { key: "calendar" as const, label: "Calendar", content: calendarPane },
    {
      key: "drivers" as const,
      label: "Drivers",
      content: <DriverStandings standings={driverStandings} />,
    },
    {
      key: "constructors" as const,
      label: "Constructors",
      content: <ConstructorStandings standings={constructorStandings} />,
    },
    ...(telemetryPane
      ? [{ key: "telemetry" as const, label: "Telemetry", content: telemetryPane }]
      : []),
  ];

  return (
    <section className="page-block p-5 sm:p-6 lg:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="page-title !text-3xl sm:!text-4xl">F1 Control Center</h2>
          <p className="page-subtitle mt-1">
            Calendar, standings, and live telemetry in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="gold-chip">{seasonData.year} season</span>
          {seasonData.activeSession && (
            <span className="muted-chip">{seasonData.activeSession.session_name}</span>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="hidden xl:block">{calendarPane}</div>

        <div className="hidden space-y-5 xl:block">
          <DriverStandings standings={driverStandings} />
          <ConstructorStandings standings={constructorStandings} />
        </div>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1 xl:hidden scrollbar-hidden">
        {mobilePanes.map((pane) => (
          <button
            key={pane.key}
            type="button"
            onClick={() => setMobilePane(pane.key)}
            className={
              mobilePane === pane.key
                ? "btn-primary !px-4"
                : "btn-secondary !px-4"
            }
          >
            {pane.label}
          </button>
        ))}
      </div>

      <div className="mt-5 xl:hidden">
        {mobilePanes.find((pane) => pane.key === mobilePane)?.content}
      </div>

      {telemetryPane && (
        <div className="mt-5 hidden xl:block">
          {telemetryPane}
        </div>
      )}
    </section>
  );
}
