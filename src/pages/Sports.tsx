import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { CalendarRange, Radio, Sparkles } from "lucide-react";
import F1Section from "@/components/sports/F1Section";
import LiveMatchesGrid from "@/components/sports/LiveMatchesGrid";
import SportsHero from "@/components/sports/SportsHero";
import SportsTabs from "@/components/sports/SportsTabs";
import StreamEmbed from "@/components/sports/StreamEmbed";
import UpcomingEventsRow from "@/components/sports/UpcomingEventsRow";
import { useF1LiveData } from "@/hooks/useF1LiveData";
import { useF1Season } from "@/hooks/useF1Season";
import { useF1Standings } from "@/hooks/useF1Standings";
import { useLiveMatches } from "@/hooks/useLiveMatches";
import {
  getCurrentSportsYear,
  getLiveCount,
  isF1FocusedSport,
  normalizeSportSlug,
} from "@/lib/sports";
import { useSportsRemindersStore } from "@/store/sportsRemindersStore";
import type {
  LiveProviderStatus,
  SportSlug,
  StreamedMatch,
} from "@/types/sports";

function liveCountMap(matches: StreamedMatch[]): Partial<Record<SportSlug, number>> {
  return {
    all: getLiveCount(matches),
    f1: getLiveCount(matches, "f1"),
    football: getLiveCount(matches, "football"),
    nba: getLiveCount(matches, "basketball"),
    ufc: getLiveCount(matches, "mma"),
  };
}

function createF1UpcomingCard(
  meetingKey: number,
  title: string,
  startTime: string,
  competition?: string,
): StreamedMatch {
  return {
    id: `f1-upcoming-${meetingKey}`,
    title,
    category: "f1",
    status: "upcoming",
    startTime: Date.parse(startTime),
    competition: competition ?? null,
  };
}

function providerStatusLabel(status: LiveProviderStatus | undefined): string {
  switch (status) {
    case undefined:
      return "Checking provider";
    case "available":
      return "Provider live";
    case "cache":
      return "Cached schedule";
    case "blocked":
      return "Provider blocked";
    case "timeout":
      return "Provider timeout";
    default:
      return "Provider unavailable";
  }
}

function providerStatusClass(status: LiveProviderStatus | undefined): string {
  switch (status) {
    case undefined:
      return "muted-chip";
    case "available":
      return "gold-chip";
    case "cache":
      return "inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-100";
    case "blocked":
    case "timeout":
    case "unavailable":
    default:
      return "inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200";
  }
}

export default function Sports() {
  const params = useParams<{ sport?: string }>();
  const activeSport = normalizeSportSlug(params.sport);
  const resolvedSport = activeSport ?? "all";
  const [selectedMatch, setSelectedMatch] = useState<StreamedMatch | null>(null);
  const [selectedDriverNumber, setSelectedDriverNumber] = useState<number | null>(
    null,
  );

  const reminderToggle = useSportsRemindersStore((state) => state.toggle);
  const reminderIsAdded = useSportsRemindersStore((state) => state.isAdded);

  const year = getCurrentSportsYear();
  const showF1Section = isF1FocusedSport(resolvedSport);

  const seasonQuery = useF1Season(year);
  const standings = useF1Standings(year, showF1Section);
  const allMatchesQuery = useLiveMatches("all");
  const sportMatchesQuery = useLiveMatches(
    resolvedSport,
    resolvedSport !== "all",
  );

  const liveSessionKey = showF1Section
    ? seasonQuery.data?.activeSession?.session_key ?? null
    : null;

  const liveData = useF1LiveData(
    liveSessionKey,
    selectedDriverNumber ?? undefined,
    showF1Section && Boolean(liveSessionKey),
  );

  useEffect(() => {
    if (!showF1Section) {
      setSelectedDriverNumber(null);
      return;
    }

    const nextDefault =
      liveData.leader?.driver_number ?? liveData.drivers[0]?.driver_number ?? null;

    setSelectedDriverNumber((current) => {
      if (
        current &&
        liveData.drivers.some((driver) => driver.driver_number === current)
      ) {
        return current;
      }
      return nextDefault;
    });
  }, [showF1Section, liveData.leader?.driver_number, liveData.drivers]);

  const allMatchesPayload = allMatchesQuery.data;
  const activeMatchesPayload =
    resolvedSport === "all" ? allMatchesPayload : sportMatchesQuery.data;
  const allMatchesFeed = allMatchesPayload?.matches ?? [];
  const matches = activeMatchesPayload?.matches ?? [];
  const providerStatus = activeMatchesPayload?.providerStatus;
  const providerMessage = activeMatchesPayload?.providerMessage ?? null;
  const videoAvailable = activeMatchesPayload?.isVideoAvailable ?? false;

  const heroFeaturedMatch = useMemo(() => {
    if (showF1Section) return null;
    return (
      matches.find((match) => match.status === "live") ??
      matches.find((match) => match.status === "upcoming") ??
      null
    );
  }, [matches, showF1Section]);

  const liveCounts = useMemo(() => liveCountMap(allMatchesFeed), [allMatchesFeed]);

  const upcomingEvents = useMemo(() => {
    const source = resolvedSport === "all" ? allMatchesFeed : matches;
    const upcoming = source.filter((match) => match.status === "upcoming");

    if (resolvedSport === "all" && seasonQuery.data?.nextRace) {
      const nextRace = seasonQuery.data.nextRace;
      const raceTitle = `${nextRace.meeting.meeting_name} ${nextRace.raceSession ? `- ${nextRace.raceSession.session_name}` : ""}`.trim();

      return [
        createF1UpcomingCard(
          nextRace.meeting.meeting_key,
          raceTitle,
          nextRace.raceSession?.date_start ?? nextRace.meeting.date_start,
          nextRace.meeting.circuit_short_name || nextRace.meeting.location,
        ),
        ...upcoming,
      ].slice(0, 10);
    }

    return upcoming.slice(0, 10);
  }, [resolvedSport, allMatchesFeed, matches, seasonQuery.data?.nextRace]);

  function handleWatch(match: StreamedMatch) {
    setSelectedMatch(match);
  }

  function handleToggleReminder(match: StreamedMatch) {
    reminderToggle({
      matchId: match.id,
      title: match.title,
      category: match.category,
      startTime: match.startTime,
    });
  }

  const liveMatchesError =
    (resolvedSport === "all" ? allMatchesQuery.error : sportMatchesQuery.error) &&
    matches.length === 0
      ? "Terjadi error tak terduga saat memuat feed sports."
      : null;
  const liveMatchesFetchedAt = activeMatchesPayload?.fetchedAt
    ? new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(activeMatchesPayload.fetchedAt)
    : null;

  if (!activeSport) {
    return <Navigate to="/sports" replace />;
  }

  return (
    <div className="page-shell space-y-6">
      <SportsHero
        sport={activeSport}
        nextRace={seasonQuery.data?.nextRace ?? null}
        featuredMatch={heroFeaturedMatch}
        videoAvailable={videoAvailable}
        providerMessage={providerMessage}
        onWatchMatch={handleWatch}
      />

      <section className="page-block p-5 sm:p-6 lg:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="page-title !text-3xl sm:!text-4xl">Sports Hub</h2>
            <p className="page-subtitle mt-1">
              Live streams, F1 data, and upcoming events in one glass control room.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="gold-chip">
              <Radio className="h-3.5 w-3.5" />
              {liveCounts.all ?? 0} live now
            </span>
            <span className="muted-chip">
              <CalendarRange className="h-3.5 w-3.5" />
              {year} season
            </span>
          </div>
        </div>

        <div className="mt-5">
          <SportsTabs activeSport={activeSport} liveCounts={liveCounts} />
        </div>
      </section>

      <section className="page-block p-5 sm:p-6 lg:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title-mini !text-2xl">Live and Upcoming</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Filtered by your selected sport tab.
            </p>
            {showF1Section && (
              <p className="mt-2 text-xs text-muted-foreground">
                Telemetry dan jadwal F1 tetap tersedia walau provider video live sedang
                down.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="muted-chip">
              <Sparkles className="h-3.5 w-3.5" />
              {matches.length} events loaded
            </span>
            <span className={providerStatusClass(providerStatus)}>
              <Sparkles className="h-3.5 w-3.5" />
              {providerStatusLabel(providerStatus)}
            </span>
          </div>
        </div>

        {providerMessage && matches.length > 0 && (
          <div
            className={
              providerStatus === "available" || providerStatus === "cache"
                ? "mb-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100"
                : "mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            }
          >
            {providerMessage}
            {liveMatchesFetchedAt ? ` · ${liveMatchesFetchedAt}` : ""}
          </div>
        )}

        <LiveMatchesGrid
          matches={matches}
          providerStatus={providerStatus}
          providerMessage={providerMessage}
          videoAvailable={videoAvailable}
          loading={
            resolvedSport === "all" ? allMatchesQuery.isLoading : sportMatchesQuery.isLoading
          }
          error={liveMatchesError}
          onRetry={() => {
            void allMatchesQuery.refetch();
            if (resolvedSport !== "all") {
              void sportMatchesQuery.refetch();
            }
          }}
          onWatch={handleWatch}
          onToggleReminder={handleToggleReminder}
          isReminderSaved={reminderIsAdded}
        />
      </section>

      {showF1Section && (
        <F1Section
          seasonData={seasonQuery.data}
          driverStandings={standings.driverStandings.data}
          constructorStandings={standings.constructorStandings.data}
          selectedDriverNumber={selectedDriverNumber}
          onSelectDriver={setSelectedDriverNumber}
          carData={liveData.selectedCarData}
          liveDrivers={liveData.drivers}
          livePositions={liveData.positions}
          liveIntervals={liveData.intervals}
          liveStints={liveData.stints}
          liveRaceControl={liveData.raceControl}
          loading={
            seasonQuery.isLoading ||
            standings.driverStandings.isLoading ||
            standings.constructorStandings.isLoading ||
            liveData.isLoading
          }
        />
      )}

      <section className="page-block p-5 sm:p-6 lg:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title-mini !text-2xl">Upcoming Events</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Save reminders or jump into streams when coverage starts.
            </p>
          </div>
          <span className="muted-chip">{upcomingEvents.length} queued</span>
        </div>

        <UpcomingEventsRow
          events={upcomingEvents}
          onWatch={handleWatch}
          onToggleReminder={handleToggleReminder}
          isReminderSaved={reminderIsAdded}
        />
      </section>

      {selectedMatch && (
        <StreamEmbed match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      )}
    </div>
  );
}
