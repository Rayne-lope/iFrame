import { CheckCircle2, Clock3, Sparkles } from "lucide-react";
import {
  countryCodeToFlagEmoji,
  formatF1Date,
  getTeamColor,
  nationalityToFlagEmoji,
} from "@/lib/sports";
import type { F1CalendarEntry } from "@/types/sports";

interface RaceItemProps {
  entry: F1CalendarEntry;
}

function statusChip(entry: F1CalendarEntry) {
  if (entry.status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Completed
      </span>
    );
  }

  if (entry.status === "next") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-accent">
        <Sparkles className="h-3.5 w-3.5" />
        Next Up
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
      <Clock3 className="h-3.5 w-3.5" />
      Upcoming
    </span>
  );
}

export default function RaceItem({ entry }: RaceItemProps) {
  const winner = entry.result?.Results?.[0];
  const winnerTeam = winner?.Constructor?.name ?? null;

  return (
    <div
      className={`rounded-3xl border p-4 transition-all ${
        entry.status === "next"
          ? "border-accent/35 bg-accent/5 shadow-[inset_3px_0_0_0_rgba(243,188,22,0.9)]"
          : "border-white/[0.08] bg-black/20"
      } ${entry.status === "completed" ? "opacity-70" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Round {entry.round}
          </div>
          <h3 className="mt-1 line-clamp-1 text-base font-semibold text-foreground">
            {countryCodeToFlagEmoji(entry.meeting.country_code)}{" "}
            {entry.meeting.meeting_name}
          </h3>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground sm:text-sm">
            {entry.meeting.circuit_short_name || entry.meeting.location} ·{" "}
            {entry.meeting.country_name}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="muted-chip">{formatF1Date(entry.meeting.date_start)}</span>
            {entry.raceSession && (
              <span className="muted-chip">{entry.raceSession.session_name}</span>
            )}
            {winner && (
              <span
                className="rounded-full px-2 py-1 text-[11px]"
                style={{
                  color: getTeamColor(winnerTeam),
                  backgroundColor: `${getTeamColor(winnerTeam)}22`,
                }}
              >
                {nationalityToFlagEmoji(winner.Driver.nationality)}{" "}
                {winner.Driver.familyName}
              </span>
            )}
          </div>
        </div>
        {statusChip(entry)}
      </div>
    </div>
  );
}
