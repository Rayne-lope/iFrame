/**
 * auth.ts — Core auth helpers
 *
 * User list is AES-encrypted in localStorage.
 * Passwords are bcrypt-hashed (one-way, never stored plaintext).
 * Session lives in sessionStorage (tab-scoped, expires on close).
 */
import CryptoJS from "crypto-js";
import bcrypt from "bcryptjs";

// ── Config ───────────────────────────────────────────────────────────────────
const USERS_KEY = "iframe-users";
const SESSION_KEY = "iframe-session";
const BCRYPT_ROUNDS = 10;

function getEncKey(): string {
  return (
    (import.meta.env.VITE_AUTH_SECRET as string | undefined) ??
    "iframe-default-secret-change-me"
  );
}

// ── Types ────────────────────────────────────────────────────────────────────
export type Role = "admin" | "user";

export interface StoredUser {
  username: string;
  passwordHash: string;
  role: Role;
  createdAt: number;
}

export interface SessionUser {
  username: string;
  role: Role;
}

export type LoginResult =
  | { ok: true; user: SessionUser }
  | {
      ok: false;
      reason: "invalid_credentials" | "rate_limited";
      retryAfter?: number;
    };

// ── User persistence ─────────────────────────────────────────────────────────
function encryptUsers(users: StoredUser[]): string {
  return CryptoJS.AES.encrypt(JSON.stringify(users), getEncKey()).toString();
}

function decryptUsers(cipher: string): StoredUser[] {
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, getEncKey());
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8)) as StoredUser[];
  } catch {
    return [];
  }
}

export function getUsers(): StoredUser[] {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) return [];
  return decryptUsers(raw);
}

export function saveUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_KEY, encryptUsers(users));
}

// ── Admin bootstrap ──────────────────────────────────────────────────────────
export async function bootstrapAdmin(): Promise<void> {
  const adminUser = import.meta.env.VITE_ADMIN_USER as string | undefined;
  const adminHash = import.meta.env.VITE_ADMIN_PASS_HASH as string | undefined;
  if (!adminUser || !adminHash) return;

  // Always upsert: ensures a fresh .env hash update is picked up immediately
  const users = getUsers().filter((u) => u.username !== adminUser);
  saveUsers([
    {
      username: adminUser,
      passwordHash: adminHash,
      role: "admin",
      createdAt: Date.now(),
    },
    ...users,
  ]);
}

// ── Password helpers ─────────────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ── Session ──────────────────────────────────────────────────────────────────
export function createSession(user: SessionUser): void {
  const payload = CryptoJS.AES.encrypt(
    JSON.stringify(user),
    getEncKey(),
  ).toString();
  sessionStorage.setItem(SESSION_KEY, payload);
}

export function getSession(): SessionUser | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(raw, getEncKey());
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8)) as SessionUser;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

// ── Login ────────────────────────────────────────────────────────────────────
export async function attemptLogin(
  username: string,
  password: string,
  checkRL: (u: string) => { blocked: boolean; retryAfter?: number },
  recordAtt: (u: string, success: boolean) => void,
): Promise<LoginResult> {
  const rl = checkRL(username);
  if (rl.blocked)
    return { ok: false, reason: "rate_limited", retryAfter: rl.retryAfter };

  const users = getUsers();
  const stored = users.find((u) => u.username === username);
  if (!stored) {
    recordAtt(username, false);
    return { ok: false, reason: "invalid_credentials" };
  }

  const valid = await verifyPassword(password, stored.passwordHash);
  recordAtt(username, valid);
  if (!valid) return { ok: false, reason: "invalid_credentials" };

  const sessionUser: SessionUser = {
    username: stored.username,
    role: stored.role,
  };
  createSession(sessionUser);
  return { ok: true, user: sessionUser };
}
