import {
  computeSessionStatus,
  getCurrentSportsYear,
  normalizeSessionType,
} from "@/lib/sports";
import type {
  F1CarData,
  F1Driver,
  F1Interval,
  F1Meeting,
  F1Position,
  F1RaceControlMessage,
  F1Session,
  F1Stint,
} from "@/types/sports";

const BASE = "/api/sports/openf1";

async function openF1Fetch<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE}${path}`);

  if (!response.ok) {
    throw new Error(`OpenF1 error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toMeeting(raw: Record<string, unknown>): F1Meeting | null {
  const meetingKey = asNumber(raw.meeting_key);
  const meetingName = asString(raw.meeting_name);

  if (!meetingKey || !meetingName) return null;

  return {
    meeting_key: meetingKey,
    meeting_name: meetingName,
    meeting_official_name:
      asString(raw.meeting_official_name) || meetingName,
    location: asString(raw.location),
    country_name: asString(raw.country_name),
    country_code: asString(raw.country_code).toUpperCase(),
    circuit_short_name: asString(raw.circuit_short_name),
    date_start: asString(raw.date_start),
    gmt_offset: asString(raw.gmt_offset),
    year: asNumber(raw.year),
  };
}

function toSession(raw: Record<string, unknown>): F1Session | null {
  const sessionKey = asNumber(raw.session_key);
  const sessionName = asString(raw.session_name);
  const dateStart = asString(raw.date_start);
  const dateEnd = asString(raw.date_end);
  const meetingKey = asNumber(raw.meeting_key);

  if (!sessionKey || !sessionName || !dateStart || !dateEnd || !meetingKey) {
    return null;
  }

  return {
    session_key: sessionKey,
    session_name: sessionName,
    session_type: normalizeSessionType(
      sessionName,
      typeof raw.session_type === "string" ? raw.session_type : null,
    ),
    status: computeSessionStatus(dateStart, dateEnd),
    date_start: dateStart,
    date_end: dateEnd,
    meeting_key: meetingKey,
  };
}

function toDriver(raw: Record<string, unknown>): F1Driver | null {
  const driverNumber = asNumber(raw.driver_number);
  const fullName = asString(raw.full_name);

  if (!driverNumber || !fullName) return null;

  return {
    driver_number: driverNumber,
    broadcast_name: asString(raw.broadcast_name) || fullName,
    full_name: fullName,
    name_acronym: asString(raw.name_acronym),
    team_name: asString(raw.team_name),
    team_colour: asString(raw.team_colour),
    country_code: asString(raw.country_code).toUpperCase(),
    headshot_url: asString(raw.headshot_url),
  };
}

function toPosition(raw: Record<string, unknown>): F1Position | null {
  const driverNumber = asNumber(raw.driver_number);
  const position = asNumber(raw.position);
  const date = asString(raw.date);

  if (!driverNumber || !position || !date) return null;

  return {
    driver_number: driverNumber,
    position,
    date,
  };
}

function toInterval(raw: Record<string, unknown>): F1Interval | null {
  const driverNumber = asNumber(raw.driver_number);
  const date = asString(raw.date);

  if (!driverNumber || !date) return null;

  return {
    driver_number: driverNumber,
    gap_to_leader:
      typeof raw.gap_to_leader === "string" ? raw.gap_to_leader : null,
    interval: typeof raw.interval === "string" ? raw.interval : null,
    date,
  };
}

function toCarData(raw: Record<string, unknown>): F1CarData | null {
  const driverNumber = asNumber(raw.driver_number);
  const date = asString(raw.date);

  if (!driverNumber || !date) return null;

  return {
    driver_number: driverNumber,
    speed: asNumber(raw.speed),
    rpm: asNumber(raw.rpm),
    gear: asNumber(raw.n_gear ?? raw.gear),
    throttle: asNumber(raw.throttle),
    brake: asNumber(raw.brake),
    drs: asNumber(raw.drs),
    date,
  };
}

function toStint(raw: Record<string, unknown>): F1Stint | null {
  const driverNumber = asNumber(raw.driver_number);
  if (!driverNumber) return null;

  return {
    driver_number: driverNumber,
    compound:
      typeof raw.compound === "string"
        ? raw.compound
        : typeof raw.tyre_compound === "string"
          ? raw.tyre_compound
          : null,
    lap_start:
      typeof raw.lap_start === "number" ? raw.lap_start : null,
    lap_end: typeof raw.lap_end === "number" ? raw.lap_end : null,
    tyre_age_at_start:
      typeof raw.tyre_age_at_start === "number" ? raw.tyre_age_at_start : null,
    date_start: typeof raw.date_start === "string" ? raw.date_start : null,
  };
}

function toRaceControl(raw: Record<string, unknown>): F1RaceControlMessage | null {
  const date = asString(raw.date);
  if (!date) return null;

  return {
    category: asString(raw.category),
    flag: typeof raw.flag === "string" ? raw.flag : null,
    message: typeof raw.message === "string" ? raw.message : null,
    scope: typeof raw.scope === "string" ? raw.scope : null,
    date,
  };
}

function mapArray<T>(
  input: unknown,
  mapper: (raw: Record<string, unknown>) => T | null,
): T[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) =>
      item && typeof item === "object"
        ? mapper(item as Record<string, unknown>)
        : null,
    )
    .filter((item): item is T => item !== null);
}

export const openF1 = {
  async getMeetings(year: number = getCurrentSportsYear()): Promise<F1Meeting[]> {
    const data = await openF1Fetch<unknown>(`/meetings?year=${year}`);
    return mapArray(data, toMeeting);
  },

  async getSessions(year: number = getCurrentSportsYear()): Promise<F1Session[]> {
    const data = await openF1Fetch<unknown>(`/sessions?year=${year}`);
    return mapArray(data, toSession);
  },

  async getDrivers(sessionKey: number | "latest"): Promise<F1Driver[]> {
    const data = await openF1Fetch<unknown>(`/drivers?session_key=${sessionKey}`);
    return mapArray(data, toDriver);
  },

  async getLivePositions(sessionKey: number | "latest"): Promise<F1Position[]> {
    const data = await openF1Fetch<unknown>(`/position?session_key=${sessionKey}`);
    return mapArray(data, toPosition);
  },

  async getLiveIntervals(sessionKey: number | "latest"): Promise<F1Interval[]> {
    const data = await openF1Fetch<unknown>(`/intervals?session_key=${sessionKey}`);
    return mapArray(data, toInterval);
  },

  async getCarData(
    sessionKey: number | "latest",
    driverNumber: number,
  ): Promise<F1CarData[]> {
    const data = await openF1Fetch<unknown>(
      `/car_data?session_key=${sessionKey}&driver_number=${driverNumber}`,
    );
    return mapArray(data, toCarData);
  },

  async getStints(sessionKey: number | "latest"): Promise<F1Stint[]> {
    const data = await openF1Fetch<unknown>(`/stints?session_key=${sessionKey}`);
    return mapArray(data, toStint);
  },

  async getRaceControl(
    sessionKey: number | "latest",
  ): Promise<F1RaceControlMessage[]> {
    const data = await openF1Fetch<unknown>(
      `/race_control?session_key=${sessionKey}`,
    );
    return mapArray(data, toRaceControl);
  },
};
