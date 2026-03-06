import { create } from "zustand";
import {
  persist,
  createJSONStorage,
  type StateStorage,
} from "zustand/middleware";
import { createUserStorage } from "@/lib/userStorage";

export interface WatchlistItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  media_type: "movie" | "tv";
  vote_average: number;
  year: string;
  genre_ids?: number[];
  original_language?: string;
}

interface WatchlistStore {
  items: WatchlistItem[];
  add: (item: WatchlistItem) => void;
  remove: (id: number, mediaType?: WatchlistItem["media_type"]) => void;
  isAdded: (id: number, mediaType?: WatchlistItem["media_type"]) => boolean;
  toggle: (item: WatchlistItem) => void;
  clear: () => void;
}

type WatchlistPersistedState = Pick<WatchlistStore, "items">;

const WATCHLIST_DEFAULTS: WatchlistPersistedState = {
  items: [],
};

function dedupeWatchlistItems(items: WatchlistItem[]): WatchlistItem[] {
  const deduped = new Map<string, WatchlistItem>();

  items.forEach((item) => {
    deduped.set(`${item.media_type}:${item.id}`, item);
  });

  return Array.from(deduped.values());
}

let userStorage: StateStorage | null = null;
function getStorage(): StateStorage {
  if (!userStorage) userStorage = createUserStorage();
  return userStorage;
}

export const useWatchlistStore = create<WatchlistStore>()(
  persist(
    (set, get) => ({
      ...WATCHLIST_DEFAULTS,
      add: (item) =>
        set((s) => ({
          items: dedupeWatchlistItems([...s.items, item]),
        })),
      remove: (id, mediaType) =>
        set((s) => ({
          items: s.items.filter(
            (i) =>
              !(i.id === id && (mediaType ? i.media_type === mediaType : true)),
          ),
        })),
      isAdded: (id, mediaType) =>
        get().items.some(
          (i) => i.id === id && (mediaType ? i.media_type === mediaType : true),
        ),
      toggle: (item) => {
        if (get().isAdded(item.id, item.media_type)) {
          get().remove(item.id, item.media_type);
        } else {
          get().add(item);
        }
      },
      clear: () => set({ items: [] }),
    }),
    {
      name: "iframe-watchlist",
      storage: createJSONStorage(() => getStorage()),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...WATCHLIST_DEFAULTS,
        items: dedupeWatchlistItems(
          (persistedState as Partial<WatchlistPersistedState> | undefined)
            ?.items ?? WATCHLIST_DEFAULTS.items,
        ),
      }),
    },
  ),
);
