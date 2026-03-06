import type { LucideIcon } from "lucide-react";

export type SportSlug = "all" | "f1" | "football" | "nba" | "ufc";
export type StreamedApiSport =
  | "all"
  | "f1"
  | "football"
  | "basketball"
  | "mma";
export type StreamedMatchCategory =
  | "football"
  | "f1"
  | "basketball"
  | "mma"
  | "tennis"
  | "cricket"
  | "unknown";

export interface F1Meeting {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name: string;
  location: string;
  country_name: string;
  country_code: string;
  circuit_short_name: string;
  date_start: string;
  gmt_offset: string;
  year: number;
}

export type F1SessionType =
  | "Practice"
  | "Qualifying"
  | "Race"
  | "Sprint"
  | "Testing"
  | "Other";
export type F1SessionStatus = "upcoming" | "active" | "finished";

export interface F1Session {
  session_key: number;
  session_name: string;
  session_type: F1SessionType;
  status: F1SessionStatus;
  date_start: string;
  date_end: string;
  meeting_key: number;
}

export interface F1Driver {
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  country_code: string;
  headshot_url: string;
}

export interface F1Position {
  driver_number: number;
  position: number;
  date: string;
}

export interface F1Interval {
  driver_number: number;
  gap_to_leader: string | null;
  interval: string | null;
  date: string;
}

export interface F1CarData {
  driver_number: number;
  speed: number;
  rpm: number;
  gear: number;
  throttle: number;
  brake: number;
  drs: number;
  date: string;
}

export interface F1Stint {
  driver_number: number;
  compound: string | null;
  lap_start: number | null;
  lap_end: number | null;
  tyre_age_at_start: number | null;
  date_start: string | null;
}

export interface F1RaceControlMessage {
  category: string;
  flag: string | null;
  message: string | null;
  scope: string | null;
  date: string;
}

export interface ErgastDriver {
  driverId: string;
  permanentNumber?: string;
  code?: string;
  givenName: string;
  familyName: string;
  nationality: string;
}

export interface ErgastDriverStanding {
  position: string;
  points: string;
  wins: string;
  Driver: ErgastDriver;
  Constructors: Array<{ name: string; constructorId: string }>;
}

export interface ErgastConstructorStanding {
  position: string;
  points: string;
  wins: string;
  Constructor: {
    constructorId: string;
    name: string;
    nationality: string;
  };
}

export interface ErgastRaceResult {
  round: string;
  raceName: string;
  date: string;
  Circuit?: {
    circuitName?: string;
    Location?: {
      locality?: string;
      country?: string;
    };
  };
  Results?: Array<{
    position: string;
    points: string;
    status: string;
    Time?: { time?: string };
    Driver: ErgastDriver;
    Constructor: {
      constructorId: string;
      name: string;
    };
  }>;
}

export interface ErgastQualifyingRace {
  round: string;
  raceName: string;
  date: string;
  QualifyingResults?: Array<{
    position: string;
    Driver: ErgastDriver;
    Constructor: {
      constructorId: string;
      name: string;
    };
    Q1?: string;
    Q2?: string;
    Q3?: string;
  }>;
}

export interface StreamSource {
  id: string;
  streamNo: number;
  label?: string;
}

export interface StreamedMatch {
  id: string;
  title: string;
  category: StreamedMatchCategory;
  status: "live" | "upcoming" | "completed";
  startTime: number;
  sources?: StreamSource[];
  popular?: boolean;
  score?: string | null;
  competition?: string | null;
  thumbnail?: string | null;
  homeName?: string | null;
  awayName?: string | null;
}

export type LiveMatchesSource =
  | "network"
  | "cache"
  | "fallback-merge"
  | "filtered-cache"
  | "unavailable";

export type LiveProviderStatus =
  | "available"
  | "cache"
  | "timeout"
  | "blocked"
  | "unavailable";

export interface LiveMatchesPayload {
  matches: StreamedMatch[];
  source: LiveMatchesSource;
  fetchedAt: number;
  providerStatus: LiveProviderStatus;
  providerMessage?: string;
  isVideoAvailable: boolean;
}

export interface SportTab {
  key: SportSlug;
  label: string;
  icon: LucideIcon;
  liveCount?: number;
}

export interface SportsReminder {
  matchId: string;
  title: string;
  category: StreamedMatchCategory;
  startTime: number;
}

export interface F1CalendarEntry {
  round: number;
  meeting: F1Meeting;
  raceSession: F1Session | null;
  allSessions: F1Session[];
  status: "completed" | "next" | "upcoming";
  result: ErgastRaceResult | null;
  qualifying: ErgastQualifyingRace | null;
}

export interface F1SeasonData {
  year: number;
  meetings: F1Meeting[];
  sessions: F1Session[];
  calendar: F1CalendarEntry[];
  activeSession: F1Session | null;
  activeMeeting: F1Meeting | null;
  nextSession: F1Session | null;
  nextRace: F1CalendarEntry | null;
  raceResults: ErgastRaceResult[];
  qualifyingResults: ErgastQualifyingRace[];
}
