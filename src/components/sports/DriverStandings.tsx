import { useMemo } from "react";
import ControlCenterCard from "./ControlCenterCard";
import { getTeamColor, nationalityToFlagEmoji } from "@/lib/sports";
import type { ErgastDriverStanding } from "@/types/sports";

interface DriverStandingsProps {
  standings: ErgastDriverStanding[];
}

function podiumClass(position: number): string {
  if (position === 1) return "bg-amber-400/15 text-amber-300 border-amber-300/30";
  if (position === 2) return "bg-slate-300/15 text-slate-200 border-slate-200/30";
  if (position === 3) return "bg-orange-400/15 text-orange-300 border-orange-300/30";
  return "bg-white/[0.05] text-muted-foreground border-white/[0.08]";
}

export default function DriverStandings({ standings }: DriverStandingsProps) {
  const leaderPoints = useMemo(() => {
    const points = Number(standings[0]?.points ?? "0");
    return Number.isFinite(points) && points > 0 ? points : 1;
  }, [standings]);

  return (
    <ControlCenterCard
      title="WDC Standings"
      subtitle="Top drivers this season"
      badge={
        <div className="flex flex-wrap justify-end gap-2">
          <span className="gold-chip">{standings.length} drivers</span>
          <span className="muted-chip">5 visible</span>
        </div>
      }
      bodyClassName="max-h-[27rem] overflow-y-auto pr-1 scrollbar-hidden"
    >
      <div className="space-y-2.5">
        {standings.map((standing) => {
          const position = Number(standing.position);
          const points = Number(standing.points);
          const teamName = standing.Constructors[0]?.name ?? "Team";
          const progress = Math.max(6, (points / leaderPoints) * 100);

          return (
            <div
              key={standing.Driver.driverId}
              className="rounded-2xl border border-white/[0.08] bg-black/20 p-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl border text-sm font-bold ${podiumClass(position)}`}
                >
                  {standing.position}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{nationalityToFlagEmoji(standing.Driver.nationality)}</span>
                    <span className="truncate text-sm font-semibold text-foreground sm:text-base">
                      {standing.Driver.givenName} {standing.Driver.familyName}
                    </span>
                    {standing.Driver.code && (
                      <span className="muted-chip !px-2 !py-0.5 !text-[11px]">
                        {standing.Driver.code}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground sm:text-sm">
                    {teamName}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-bold text-foreground [font-family:var(--font-mono)] sm:text-lg">
                    {standing.points}
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    points
                  </div>
                </div>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${getTeamColor(teamName)}aa, ${getTeamColor(teamName)})`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ControlCenterCard>
  );
}
