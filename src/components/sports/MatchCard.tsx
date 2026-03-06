import { Bell, BellRing, CalendarClock, Play, Radio } from "lucide-react";
import { formatMatchDateTime } from "@/lib/sports";
import type { StreamedMatch } from "@/types/sports";

interface MatchCardProps {
  match: StreamedMatch;
  videoAvailable: boolean;
  isReminderSaved: boolean;
  onWatch: (match: StreamedMatch) => void;
  onToggleReminder: (match: StreamedMatch) => void;
}

function statusCopy(match: StreamedMatch): string {
  if (match.status === "live") return "LIVE";
  if (match.status === "completed") return "Replay";
  return formatMatchDateTime(match.startTime);
}

export default function MatchCard({
  match,
  videoAvailable,
  isReminderSaved,
  onWatch,
  onToggleReminder,
}: MatchCardProps) {
  const canWatch = match.status !== "upcoming" && videoAvailable;
  const homeName = match.homeName ?? match.title;
  const awayName = match.awayName;

  return (
    <article className="card-hover flex h-full flex-col rounded-3xl border border-white/[0.08] bg-[rgba(18,18,18,0.65)] p-5 backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                match.status === "live"
                  ? "inline-flex items-center gap-2 rounded-full border border-red-500/35 bg-red-500/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-red-200"
                  : "inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-accent"
              }
            >
              <span
                className={
                  match.status === "live"
                    ? "h-2 w-2 rounded-full bg-red-500 animate-pulse"
                    : "h-2 w-2 rounded-full bg-accent"
                }
              />
              {statusCopy(match)}
            </span>

            <span className="muted-chip !text-[11px] !px-2.5 !py-1">
              {match.category.toUpperCase()}
            </span>
          </div>

          <h3 className="mt-4 text-lg font-semibold text-foreground sm:text-xl">
            {homeName}
            {awayName ? (
              <span className="block text-sm font-medium text-muted-foreground sm:text-base">
                vs {awayName}
              </span>
            ) : (
              <span className="block text-sm font-medium text-muted-foreground sm:text-base">
                {match.competition ?? "Live event"}
              </span>
            )}
          </h3>
        </div>

        {match.score && (
          <div className="rounded-2xl border border-white/[0.08] bg-black/30 px-3 py-2 text-right">
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Skor
            </div>
            <div className="text-lg font-bold text-foreground [font-family:var(--font-mono)]">
              {match.score}
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 space-y-2 text-sm text-muted-foreground">
        {match.competition && (
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-accent" />
            <span>{match.competition}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-accent" />
          <span>{formatMatchDateTime(match.startTime)}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {match.status === "upcoming" ? (
          <button
            type="button"
            onClick={() => onToggleReminder(match)}
            className={isReminderSaved ? "btn-secondary !border-accent/45 !text-accent" : "btn-secondary"}
          >
            {isReminderSaved ? (
              <BellRing className="h-4 w-4" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            {isReminderSaved ? "Diingatkan" : "Ingatkan"}
          </button>
        ) : canWatch ? (
          <button
            type="button"
            onClick={() => onWatch(match)}
            className={
              match.status === "live"
                ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-red-500 bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110"
                : "btn-primary"
            }
          >
            <Play className="h-4 w-4 fill-current" />
            Tonton
          </button>
        ) : (
          <span className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-muted-foreground">
            Stream unavailable
          </span>
        )}
      </div>
    </article>
  );
}
