import { Bell, BellRing, Play } from "lucide-react";
import { formatMatchDateTime } from "@/lib/sports";
import type { StreamedMatch } from "@/types/sports";

interface UpcomingEventsRowProps {
  events: StreamedMatch[];
  onWatch: (match: StreamedMatch) => void;
  onToggleReminder: (match: StreamedMatch) => void;
  isReminderSaved: (matchId: string) => boolean;
}

export default function UpcomingEventsRow({
  events,
  onWatch,
  onToggleReminder,
  isReminderSaved,
}: UpcomingEventsRowProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] px-5 py-6 text-sm text-muted-foreground">
        Tidak ada event mendatang untuk saat ini.
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hidden">
      {events.map((event) => {
        const reminderSaved = isReminderSaved(event.id);
        return (
          <article
            key={event.id}
            className="min-w-[260px] max-w-[260px] flex-shrink-0 rounded-3xl border border-white/[0.08] bg-[rgba(18,18,18,0.65)] p-4 backdrop-blur-2xl"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-accent" />
              <span>{event.category.toUpperCase()}</span>
            </div>
            <h3 className="mt-3 line-clamp-2 text-base font-semibold text-foreground">
              {event.title}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatMatchDateTime(event.startTime)}
            </p>

            <div className="mt-4 flex gap-2">
              {event.status !== "upcoming" ? (
                <button
                  type="button"
                  onClick={() => onWatch(event)}
                  className="btn-primary !h-10 !px-4"
                >
                  <Play className="h-4 w-4 fill-black" />
                  Tonton
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onToggleReminder(event)}
                  className={reminderSaved ? "btn-secondary !border-accent/45 !text-accent !h-10 !px-4" : "btn-secondary !h-10 !px-4"}
                >
                  {reminderSaved ? (
                    <BellRing className="h-4 w-4" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                  {reminderSaved ? "Tersimpan" : "Ingatkan"}
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
