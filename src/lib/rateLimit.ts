const RL_PREFIX = "iframe-rl-";
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

interface RLRecord {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

function rlKey(username: string): string {
  return RL_PREFIX + username.toLowerCase();
}

function loadRL(username: string): RLRecord {
  const raw = localStorage.getItem(rlKey(username));
  if (!raw) return { attempts: 0, firstAttemptAt: Date.now() };
  try {
    return JSON.parse(raw) as RLRecord;
  } catch {
    return { attempts: 0, firstAttemptAt: Date.now() };
  }
}

function saveRL(username: string, record: RLRecord): void {
  localStorage.setItem(rlKey(username), JSON.stringify(record));
}

export function checkRateLimit(username: string): {
  blocked: boolean;
  retryAfter?: number;
} {
  const now = Date.now();
  const r = loadRL(username);
  if (r.lockedUntil && now < r.lockedUntil) {
    return {
      blocked: true,
      retryAfter: Math.ceil((r.lockedUntil - now) / 1000),
    };
  }
  if (now - r.firstAttemptAt > WINDOW_MS) {
    saveRL(username, { attempts: 0, firstAttemptAt: now });
    return { blocked: false };
  }
  if (r.attempts >= MAX_ATTEMPTS) {
    const lockedUntil = now + LOCK_MS;
    saveRL(username, { ...r, lockedUntil });
    return { blocked: true, retryAfter: Math.ceil(LOCK_MS / 1000) };
  }
  return { blocked: false };
}

export function recordAttempt(username: string, success: boolean): void {
  if (success) {
    localStorage.removeItem(rlKey(username));
    return;
  }
  const now = Date.now();
  const r = loadRL(username);
  if (now - r.firstAttemptAt > WINDOW_MS) {
    saveRL(username, { attempts: 1, firstAttemptAt: now });
    return;
  }
  saveRL(username, { ...r, attempts: r.attempts + 1 });
}

export function getRemainingAttempts(username: string): number {
  const r = loadRL(username);
  if (Date.now() - r.firstAttemptAt > WINDOW_MS) return MAX_ATTEMPTS;
  return Math.max(0, MAX_ATTEMPTS - r.attempts);
}
