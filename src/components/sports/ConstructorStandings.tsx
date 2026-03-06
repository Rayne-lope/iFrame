import ControlCenterCard from "./ControlCenterCard";
import { getTeamColor } from "@/lib/sports";
import type { ErgastConstructorStanding } from "@/types/sports";

interface ConstructorStandingsProps {
  standings: ErgastConstructorStanding[];
}

export default function ConstructorStandings({
  standings,
}: ConstructorStandingsProps) {
  const leaderPoints = Number(standings[0]?.points ?? "1") || 1;

  return (
    <ControlCenterCard
      title="WCC Standings"
      subtitle="Constructor battle"
      badge={
        <div className="flex flex-wrap justify-end gap-2">
          <span className="muted-chip">{standings.length} teams</span>
          <span className="muted-chip">5 visible</span>
        </div>
      }
      bodyClassName="max-h-[26rem] overflow-y-auto pr-1 scrollbar-hidden"
    >
      <div className="space-y-2.5">
        {standings.map((standing) => {
          const points = Number(standing.points);
          const progress = Math.max(8, (points / leaderPoints) * 100);
          const color = getTeamColor(standing.Constructor.name);

          return (
            <div
              key={standing.Constructor.constructorId}
              className="rounded-2xl border border-white/[0.08] bg-black/20 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-sm font-bold text-foreground">
                    {standing.position}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground sm:text-base">
                      {standing.Constructor.name}
                    </div>
                    <div className="text-xs text-muted-foreground sm:text-sm">
                      {standing.Constructor.nationality}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-bold text-foreground [font-family:var(--font-mono)] sm:text-lg">
                    {standing.points}
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    pts
                  </div>
                </div>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${color}aa, ${color})`,
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
