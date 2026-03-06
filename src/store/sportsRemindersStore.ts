import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import { createUserStorage } from "@/lib/userStorage";
import type { SportsReminder } from "@/types/sports";

interface SportsRemindersStore {
  items: SportsReminder[];
  add: (item: SportsReminder) => void;
  remove: (matchId: string) => void;
  toggle: (item: SportsReminder) => void;
  isAdded: (matchId: string) => boolean;
  clear: () => void;
}

type SportsRemindersPersistedState = Pick<SportsRemindersStore, "items">;

const REMINDER_DEFAULTS: SportsRemindersPersistedState = {
  items: [],
};

function dedupe(items: SportsReminder[]): SportsReminder[] {
  const next = new Map<string, SportsReminder>();

  items.forEach((item) => {
    next.set(item.matchId, item);
  });

  return Array.from(next.values()).sort((a, b) => a.startTime - b.startTime);
}

let userStorage: StateStorage | null = null;
function getStorage(): StateStorage {
  if (!userStorage) userStorage = createUserStorage();
  return userStorage;
}

export const useSportsRemindersStore = create<SportsRemindersStore>()(
  persist(
    (set, get) => ({
      ...REMINDER_DEFAULTS,
      add: (item) =>
        set((state) => ({
          items: dedupe([...state.items, item]),
        })),
      remove: (matchId) =>
        set((state) => ({
          items: state.items.filter((item) => item.matchId !== matchId),
        })),
      toggle: (item) => {
        if (get().isAdded(item.matchId)) {
          get().remove(item.matchId);
        } else {
          get().add(item);
        }
      },
      isAdded: (matchId) => get().items.some((item) => item.matchId === matchId),
      clear: () => set({ items: [] }),
    }),
    {
      name: "iframe-sports-reminders",
      storage: createJSONStorage(() => getStorage()),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...REMINDER_DEFAULTS,
        items: dedupe(
          (persistedState as Partial<SportsRemindersPersistedState> | undefined)
            ?.items ?? REMINDER_DEFAULTS.items,
        ),
      }),
    },
  ),
);
