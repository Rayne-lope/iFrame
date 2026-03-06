/**
 * userStorage.ts — Dynamic per-user Zustand persist storage
 *
 * Reads the current username from sessionStorage at READ/WRITE time,
 * so the key changes automatically when a different user logs in.
 *
 * Usage:
 *   persist(storeDefinition, {
 *     name: 'iframe-watchlist',
 *     storage: createUserStorage(),
 *   })
 */
import type { StateStorage } from "zustand/middleware";
import { getSession } from "@/lib/auth";

export function createUserStorage(): StateStorage {
  function userKey(base: string): string {
    const session = getSession();
    return session ? `${base}__${session.username}` : `${base}__guest`;
  }

  return {
    getItem: (name) => {
      return localStorage.getItem(userKey(name));
    },
    setItem: (name, value) => {
      localStorage.setItem(userKey(name), value);
    },
    removeItem: (name) => {
      localStorage.removeItem(userKey(name));
    },
  };
}
