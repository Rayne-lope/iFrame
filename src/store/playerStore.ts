import { create } from "zustand";
import {
  persist,
  createJSONStorage,
  type StateStorage,
} from "zustand/middleware";
import { createUserStorage } from "@/lib/userStorage";

interface SourceHealth {
  failures: number;
  lastFailureAt: number;
}

interface PlayerStore {
  autoNext: boolean;
  shortcutsEnabled: boolean;
  preferredSources: Record<string, string>;
  sourceHealth: Record<string, SourceHealth>;
  setAutoNext: (value: boolean) => void;
  toggleAutoNext: () => void;
  setShortcutsEnabled: (value: boolean) => void;
  toggleShortcuts: () => void;
  setPreferredSource: (contentKey: string, sourceLabel: string) => void;
  clearPreferredSource: (contentKey: string) => void;
  markSourceFailure: (contentKey: string, sourceLabel: string) => void;
  markSourceSuccess: (contentKey: string, sourceLabel: string) => void;
  clearSourceHealth: (contentKey?: string) => void;
}

type PlayerPersistedState = Pick<
  PlayerStore,
  "autoNext" | "shortcutsEnabled" | "preferredSources" | "sourceHealth"
>;

const PLAYER_DEFAULTS: PlayerPersistedState = {
  autoNext: true,
  shortcutsEnabled: true,
  preferredSources: {},
  sourceHealth: {},
};

function healthKey(contentKey: string, sourceLabel: string): string {
  return `${contentKey}::${sourceLabel}`;
}

export function getFailureCount(
  sourceHealth: Record<string, SourceHealth>,
  contentKey: string,
  sourceLabel: string,
): number {
  return sourceHealth[healthKey(contentKey, sourceLabel)]?.failures ?? 0;
}

let userStorage: StateStorage | null = null;
function getStorage(): StateStorage {
  if (!userStorage) userStorage = createUserStorage();
  return userStorage;
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set) => ({
      ...PLAYER_DEFAULTS,

      setAutoNext: (value) => set({ autoNext: value }),
      toggleAutoNext: () => set((state) => ({ autoNext: !state.autoNext })),

      setShortcutsEnabled: (value) => set({ shortcutsEnabled: value }),
      toggleShortcuts: () =>
        set((state) => ({ shortcutsEnabled: !state.shortcutsEnabled })),

      setPreferredSource: (contentKey, sourceLabel) =>
        set((state) => ({
          preferredSources: {
            ...state.preferredSources,
            [contentKey]: sourceLabel,
          },
        })),

      clearPreferredSource: (contentKey) =>
        set((state) => {
          const next = { ...state.preferredSources };
          delete next[contentKey];
          return { preferredSources: next };
        }),

      markSourceFailure: (contentKey, sourceLabel) =>
        set((state) => {
          const key = healthKey(contentKey, sourceLabel);
          const previous = state.sourceHealth[key];

          return {
            sourceHealth: {
              ...state.sourceHealth,
              [key]: {
                failures: (previous?.failures ?? 0) + 1,
                lastFailureAt: Date.now(),
              },
            },
          };
        }),

      markSourceSuccess: (contentKey, sourceLabel) =>
        set((state) => {
          const key = healthKey(contentKey, sourceLabel);
          if (!state.sourceHealth[key]) return state;

          const next = { ...state.sourceHealth };
          delete next[key];
          return { sourceHealth: next };
        }),

      clearSourceHealth: (contentKey) =>
        set((state) => {
          if (!contentKey) return { sourceHealth: {} };

          const next: Record<string, SourceHealth> = {};
          Object.entries(state.sourceHealth).forEach(([key, value]) => {
            if (!key.startsWith(`${contentKey}::`)) {
              next[key] = value;
            }
          });

          return { sourceHealth: next };
        }),
    }),
    {
      name: "iframe-player",
      storage: createJSONStorage(() => getStorage()),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...PLAYER_DEFAULTS,
        ...(persistedState as Partial<PlayerPersistedState> | undefined),
      }),
    },
  ),
);
