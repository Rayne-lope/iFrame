import type {
  ErgastQualifyingRace,
  ErgastRaceResult,
  F1CalendarEntry,
  F1Meeting,
  F1SeasonData,
  F1Session,
  F1SessionStatus,
  F1SessionType,
  SportSlug,
  StreamedApiSport,
  StreamedMatch,
  StreamedMatchCategory,
} from "@/types/sports";

const NATIONALITY_FLAG_MAP: Record<string, string> = {
  argentine: "AR",
  australian: "AU",
  austrian: "AT",
  belgian: "BE",
  brazilian: "BR",
  british: "GB",
  canadian: "CA",
  chinese: "CN",
  danish: "DK",
  dutch: "NL",
  finnish: "FI",
  french: "FR",
  german: "DE",
  italian: "IT",
  japanese: "JP",
  mexican: "MX",
  monegasque: "MC",
  "new zealander": "NZ",
  spanish: "ES",
  swiss: "CH",
  thai: "TH",
  american: "US",
  "united states": "US",
};

const TEAM_COLOR_MAP: Record<string, string> = {
  "red bull": "#3671C6",
  "red bull racing": "#3671C6",
  ferrari: "#E8002D",
  mercedes: "#27F4D2",
  mclaren: "#FF8000",
  alpine: "#FF87BC",
  williams: "#64C4FF",
  haas: "#B6BABD",
  sauber: "#52E252",
  "kick sauber": "#52E252",
  "aston martin": "#229971",
  "racing bulls": "#6692FF",
  rb: "#6692FF",
  toro: "#6692FF",
};

export function getCurrentSportsYear(): number {
  return new Date().getFullYear();
}

export function normalizeSportSlug(value: string | undefined): SportSlug | null {
  if (!value) return "all";
  if (
    value === "all" ||
    value === "f1" ||
    value === "football" ||
    value === "nba" ||
    value === "ufc"
  ) {
    return value;
  }
  return null;
}

export function sportHref(slug: SportSlug): string {
  return slug === "all" ? "/sports" : `/sports/${slug}`;
}

export function mapSportSlugToApiSport(slug: SportSlug): StreamedApiSport {
  switch (slug) {
    case "nba":
      return "basketball";
    case "ufc":
      return "mma";
    default:
      return slug;
  }
}

export function isF1FocusedSport(slug: SportSlug): boolean {
  return slug === "all" || slug === "f1";
}

export function normalizeUnixMs(value: unknown): number {
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return normalizeUnixMs(parsed);
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return Date.now();
  }

  return value < 10_000_000_000 ? value * 1000 : value;
}

export function normalizeMatchCategory(value: unknown): StreamedMatchCategory {
  if (typeof value !== "string") return "unknown";
  const normalized = value.trim().toLowerCase();

  if (
    normalized === "football" ||
    normalized === "f1" ||
    normalized === "basketball" ||
    normalized === "mma" ||
    normalized === "tennis" ||
    normalized === "cricket"
  ) {
    return normalized;
  }

  return "unknown";
}

export function normalizeSessionType(
  sessionName: string,
  sessionType?: string | null,
): F1SessionType {
  const base = `${sessionType ?? ""} ${sessionName}`.toLowerCase();

  if (base.includes("practice")) return "Practice";
  if (base.includes("qual")) return "Qualifying";
  if (base.includes("sprint")) return "Sprint";
  if (base.includes("race")) return "Race";
  if (base.includes("test")) return "Testing";
  return "Other";
}

export function computeSessionStatus(
  dateStart: string,
  dateEnd: string,
  now: number = Date.now(),
): F1SessionStatus {
  const start = Date.parse(dateStart);
  const end = Date.parse(dateEnd);

  if (Number.isFinite(start) && now < start) return "upcoming";
  if (Number.isFinite(start) && Number.isFinite(end) && now >= start && now <= end) {
    return "active";
  }
  return "finished";
}

function compareIso(a: string, b: string): number {
  return Date.parse(a) - Date.parse(b);
}

export function countryCodeToFlagEmoji(countryCode?: string | null): string {
  if (!countryCode || countryCode.length !== 2) return "🌍";

  return countryCode
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

export function nationalityToFlagEmoji(nationality?: string | null): string {
  if (!nationality) return "🌍";
  const code = NATIONALITY_FLAG_MAP[nationality.trim().toLowerCase()];
  return countryCodeToFlagEmoji(code);
}

export function getTeamColor(name?: string | null): string {
  if (!name) return "#F3BC16";
  const normalized = name.trim().toLowerCase();
  return TEAM_COLOR_MAP[normalized] ?? "#F3BC16";
}

export function parseMatchTeams(title: string): {
  homeName: string | null;
  awayName: string | null;
} {
  const separators = [" vs ", " VS ", " v ", " @ ", " - "];

  for (const separator of separators) {
    if (title.includes(separator)) {
      const [homeName, awayName] = title.split(separator).map((part) => part.trim());
      if (homeName && awayName) {
        return { homeName, awayName };
      }
    }
  }

  return { homeName: null, awayName: null };
}

export function sortMatches(matches: StreamedMatch[]): StreamedMatch[] {
  const statusRank: Record<StreamedMatch["status"], number> = {
    live: 0,
    upcoming: 1,
    completed: 2,
  };

  return [...matches].sort((a, b) => {
    if (statusRank[a.status] !== statusRank[b.status]) {
      return statusRank[a.status] - statusRank[b.status];
    }

    if (a.status === "upcoming") return a.startTime - b.startTime;
    if (a.status === "completed") return b.startTime - a.startTime;
    return a.title.localeCompare(b.title);
  });
}

export function formatMatchDateTime(
  value: string | number,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = new Date(typeof value === "string" ? value : value);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  }).format(date);
}

export function formatF1Date(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function getLiveCount(matches: StreamedMatch[], category?: StreamedMatchCategory): number {
  return matches.filter(
    (match) => match.status === "live" && (!category || match.category === category),
  ).length;
}

export function deriveF1SeasonData({
  year,
  meetings,
  sessions,
  raceResults,
  qualifyingResults,
}: {
  year: number;
  meetings: F1Meeting[];
  sessions: F1Session[];
  raceResults: ErgastRaceResult[];
  qualifyingResults: ErgastQualifyingRace[];
}): F1SeasonData {
  const sortedMeetings = [...meetings].sort((a, b) => compareIso(a.date_start, b.date_start));
  const sortedSessions = [...sessions].sort((a, b) => compareIso(a.date_start, b.date_start));
  const now = Date.now();

  const activeSession =
    sortedSessions.find((session) => session.status === "active") ?? null;
  const nextSession =
    sortedSessions.find((session) => session.status === "upcoming") ?? null;
  const activeMeeting =
    sortedMeetings.find((meeting) => meeting.meeting_key === activeSession?.meeting_key) ??
    null;

  let nextMarked = false;
  const calendar: F1CalendarEntry[] = sortedMeetings.map((meeting, index) => {
    const allSessions = sortedSessions.filter(
      (session) => session.meeting_key === meeting.meeting_key,
    );
    const raceSession =
      allSessions.find((session) => session.session_type === "Race") ?? null;
    const hasActiveSession = allSessions.some((session) => session.status === "active");
    const comparisonStart = raceSession?.date_start ?? allSessions[0]?.date_start ?? meeting.date_start;
    const comparisonEnd =
      raceSession?.date_end ??
      allSessions[allSessions.length - 1]?.date_end ??
      meeting.date_start;
    const result = raceResults.find((race) => Number(race.round) === index + 1) ?? null;
    const qualifying =
      qualifyingResults.find((race) => Number(race.round) === index + 1) ?? null;

    let status: F1CalendarEntry["status"] = "upcoming";
    const endMs = Date.parse(comparisonEnd);
    const startMs = Date.parse(comparisonStart);

    if (hasActiveSession) {
      status = "next";
      nextMarked = true;
    } else if ((Number.isFinite(endMs) && endMs < now) || result) {
      status = "completed";
    } else if (!nextMarked && Number.isFinite(startMs) && startMs >= now) {
      status = "next";
      nextMarked = true;
    }

    return {
      round: index + 1,
      meeting,
      raceSession,
      allSessions,
      status,
      result,
      qualifying,
    };
  });

  const nextRace =
    calendar.find((entry) => entry.status === "next") ??
    calendar.find((entry) => entry.status === "upcoming") ??
    null;

  return {
    year,
    meetings: sortedMeetings,
    sessions: sortedSessions,
    calendar,
    activeSession,
    activeMeeting,
    nextSession,
    nextRace,
    raceResults,
    qualifyingResults,
  };
}
