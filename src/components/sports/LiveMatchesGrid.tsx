import MatchCard from "./MatchCard";
import type { LiveProviderStatus, StreamedMatch } from "@/types/sports";

interface LiveMatchesGridProps {
  matches: StreamedMatch[];
  loading?: boolean;
  providerStatus?: LiveProviderStatus;
  providerMessage?: string | null;
  videoAvailable?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onWatch: (match: StreamedMatch) => void;
  onToggleReminder: (match: StreamedMatch) => void;
  isReminderSaved: (matchId: string) => boolean;
}

export default function LiveMatchesGrid({
  matches,
  loading = false,
  providerStatus = "available",
  providerMessage,
  videoAvailable = false,
  error,
  onRetry,
  onWatch,
  onToggleReminder,
  isReminderSaved,
}: LiveMatchesGridProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-60 animate-pulse rounded-3xl border border-white/[0.08] bg-white/[0.04]"
          />
        ))}
      </div>
    );
  }

  const isProviderUnavailable =
    providerStatus === "blocked" ||
    providerStatus === "timeout" ||
    providerStatus === "unavailable" ||
    providerStatus === "cache";

  if ((error || providerMessage) && matches.length === 0 && isProviderUnavailable) {
    return (
      <div
        className={
          providerStatus === "cache"
            ? "rounded-3xl border border-amber-400/20 bg-amber-400/10 px-5 py-4 text-sm text-amber-100"
            : "rounded-3xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-200"
        }
      >
        <div className="font-medium">
          {providerMessage ?? error}
        </div>
        <div className="mt-2 text-sm opacity-80">
          Video live bersifat best-effort. Kalender, standings, dan telemetry tetap bisa dipakai.
        </div>
        {onRetry && (
          <button type="button" onClick={onRetry} className="btn-secondary mt-4">
            Coba Lagi
          </button>
        )}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] px-5 py-10 text-center text-sm text-muted-foreground">
        Belum ada event untuk filter ini sekarang.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {matches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          videoAvailable={videoAvailable}
          isReminderSaved={isReminderSaved(match.id)}
          onWatch={onWatch}
          onToggleReminder={onToggleReminder}
        />
      ))}
    </div>
  );
}
