import { create } from "zustand";
import {
  attemptLogin,
  clearSession,
  getSession,
  type LoginResult,
  type SessionUser,
} from "@/lib/auth";
import { checkRateLimit, recordAttempt } from "@/lib/rateLimit";

interface AuthState {
  user: SessionUser | null;
  isLoading: boolean;
  initSession: () => void;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => void;
}

/** Rehydrate all user-scoped stores after login/logout */
async function rehydrateStores() {
  // Dynamic imports to avoid circular deps at module load time
  const [{ useWatchlistStore }, { useHistoryStore }, { usePlayerStore }] =
    await Promise.all([
      import("./watchlistStore"),
      import("./historyStore"),
      import("./playerStore"),
    ]);
  await Promise.all([
    useWatchlistStore.persist.rehydrate(),
    useHistoryStore.persist.rehydrate(),
    usePlayerStore.persist.rehydrate(),
  ]);
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isLoading: true,

  initSession: () => {
    const session = getSession();
    if (!session) {
      set({ user: null, isLoading: false });
      return;
    }

    set({ isLoading: true });
    rehydrateStores()
      .catch(console.error)
      .finally(() => {
        set({ user: session, isLoading: false });
      });
  },

  login: async (username: string, password: string) => {
    const result = await attemptLogin(
      username,
      password,
      checkRateLimit,
      recordAttempt,
    );
    if (result.ok) {
      set({ isLoading: true });
      await rehydrateStores().catch(console.error);
      set({ user: result.user, isLoading: false });
    }
    return result;
  },

  logout: () => {
    clearSession();
    set({ user: null, isLoading: true });
    rehydrateStores()
      .catch(console.error)
      .finally(() => {
        set({ isLoading: false });
      });
  },
}));
