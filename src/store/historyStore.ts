import { create } from "zustand";
import {
  persist,
  createJSONStorage,
  type StateStorage,
} from "zustand/middleware";
import { createUserStorage } from "@/lib/userStorage";
import type { WatchlistItem } from "./watchlistStore";

export interface WatchedItem extends WatchlistItem {
  season?: number;
  episode?: number;
  position_seconds?: number;
  duration_seconds?: number;
  progress_percent?: number;
  completed?: boolean;
  watchedAt: number;
}

interface HistoryStore {
  items: WatchedItem[];
  add: (item: WatchedItem) => void;
  remove: (id: number, mediaType?: WatchlistItem["media_type"]) => void;
  clear: () => void;
}

type HistoryPersistedState = Pick<HistoryStore, "items">;

const HISTORY_DEFAULTS: HistoryPersistedState = {
  items: [],
};

function historyKey(item: WatchedItem): string {
  return `${item.media_type}:${item.id}:${item.season ?? 0}:${item.episode ?? 0}`;
}

function dedupeHistoryItems(items: WatchedItem[]): WatchedItem[] {
  const seen = new Set<string>();
  const deduped: WatchedItem[] = [];

  items.forEach((item) => {
    const key = historyKey(item);
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(item);
  });

  return deduped.slice(0, 50);
}

let userStorage: StateStorage | null = null;
function getStorage(): StateStorage {
  if (!userStorage) userStorage = createUserStorage();
  return userStorage;
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set) => ({
      ...HISTORY_DEFAULTS,
      add: (item) =>
        set((s) => {
          const filtered = s.items.filter((i) => historyKey(i) !== historyKey(item));
          return { items: dedupeHistoryItems([item, ...filtered]) };
        }),
      remove: (id, mediaType) =>
        set((s) => ({
          items: s.items.filter(
            (i) =>
              !(i.id === id && (mediaType ? i.media_type === mediaType : true)),
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "iframe-history",
      storage: createJSONStorage(() => getStorage()),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...HISTORY_DEFAULTS,
        items: dedupeHistoryItems(
          (persistedState as Partial<HistoryPersistedState> | undefined)
            ?.items ?? HISTORY_DEFAULTS.items,
        ),
      }),
    },
  ),
);
