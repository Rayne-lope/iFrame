import { Link } from "react-router-dom";
import { CalendarClock, Flag, Play, Radio } from "lucide-react";
import CountdownTimer from "./CountdownTimer";
import {
  countryCodeToFlagEmoji,
  formatF1Date,
  formatMatchDateTime,
  isF1FocusedSport,
} from "@/lib/sports";
import type { F1CalendarEntry, SportSlug, StreamedMatch } from "@/types/sports";

interface SportsHeroProps {
  sport: SportSlug;
  nextRace: F1CalendarEntry | null;
  featuredMatch: StreamedMatch | null;
  videoAvailable: boolean;
  providerMessage?: string | null;
  onWatchMatch: (match: StreamedMatch) => void;
}

export default function SportsHero({
  sport,
  nextRace,
  featuredMatch,
  videoAvailable,
  providerMessage,
  onWatchMatch,
}: SportsHeroProps) {
  const showF1Hero = isF1FocusedSport(sport) || !featuredMatch;

  if (showF1Hero && nextRace) {
    const targetDate = nextRace.raceSession?.date_start ?? nextRace.meeting.date_start;

    return (
      <section className="page-block relative overflow-hidden px-5 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(243,188,22,0.18),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(243,188,22,0.08),transparent_42%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.05fr_0.95fr] xl:items-end">
          <div>
            <div className="gold-chip">
              <Flag className="h-3.5 w-3.5" />
              Next F1 weekend
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl [font-family:var(--font-display)]">
              {countryCodeToFlagEmoji(nextRace.meeting.country_code)}{" "}
              {nextRace.meeting.meeting_name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {nextRace.meeting.circuit_short_name || nextRace.meeting.location} in{" "}
              {nextRace.meeting.country_name}. Countdown is pinned to the next race
              session start, so you can jump in before lights out.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="muted-chip">
                <CalendarClock className="h-3.5 w-3.5" />
                {formatF1Date(nextRace.meeting.date_start)}
              </span>
              {nextRace.raceSession && (
                <span className="muted-chip">{nextRace.raceSession.session_name}</span>
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/[0.08] bg-black/30 p-4 sm:p-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Countdown
            </div>
            <div className="mt-4">
              <CountdownTimer targetDate={targetDate} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/sports/f1" className="btn-primary">
                <Flag className="h-4 w-4" />
                Open F1 Hub
              </Link>
              <Link to="/sports" className="btn-secondary">
                All Sports
              </Link>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              F1 live video bergantung pada provider stream eksternal. Countdown,
              standings, dan telemetry tetap bisa dipakai walau video sedang
              unavailable.
            </p>
            {!videoAvailable && providerMessage && (
              <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                {providerMessage}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (!featuredMatch) {
    return null;
  }

  return (
    <section className="page-block relative overflow-hidden px-5 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,59,48,0.14),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(243,188,22,0.08),transparent_42%)]" />
      <div className="relative grid gap-6 xl:grid-cols-[1.05fr_0.95fr] xl:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm font-semibold text-foreground">
            <Radio className="h-4 w-4 text-red-400" />
            {featuredMatch.status === "live" ? "Live spotlight" : "Upcoming spotlight"}
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl [font-family:var(--font-display)]">
            {featuredMatch.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {featuredMatch.competition ?? "Selected sport"} ·{" "}
            {formatMatchDateTime(featuredMatch.startTime)}
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-white/[0.08] bg-black/30 p-4 sm:p-5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Starts in
          </div>
          <div className="mt-4">
            <CountdownTimer targetDate={featuredMatch.startTime} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {featuredMatch.status !== "upcoming" && videoAvailable ? (
              <button
                type="button"
                onClick={() => onWatchMatch(featuredMatch)}
                className="btn-primary"
              >
                <Play className="h-4 w-4 fill-black" />
                Watch Stream
              </button>
            ) : featuredMatch.status !== "upcoming" ? (
              <span className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-muted-foreground">
                Stream unavailable
              </span>
            ) : null}
            <Link to="/sports" className="btn-secondary">
              All Sports
            </Link>
          </div>
          {!videoAvailable && providerMessage && (
            <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
              {providerMessage}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
