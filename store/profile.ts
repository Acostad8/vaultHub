// Cache en memoria del ProfileRow del usuario. Reduce el numero de GETs
// a /profiles: el middleware, el layout server, el VaultGate y la pagina
// de unlock lo consumen. Se invalida en logout, setup y touchLastUnlock.
//
// No persistir: profile no es secreto pero mantener consistencia con la
// regla de "todo en memoria volatil".

import { create } from "zustand";

import { fetchMyProfile, type ProfileRow } from "@/repositories/profile";

interface ProfileCacheStore {
  profile: ProfileRow | null;
  inflight: Promise<ProfileRow> | null;
  setProfile: (p: ProfileRow) => void;
  invalidate: () => void;
  load: (force?: boolean) => Promise<ProfileRow>;
}

export const useProfileCache = create<ProfileCacheStore>((set, get) => ({
  profile: null,
  inflight: null,

  setProfile(p) {
    set({ profile: p, inflight: null });
  },

  invalidate() {
    set({ profile: null, inflight: null });
  },

  load(force = false) {
    const s = get();
    if (!force && s.profile) return Promise.resolve(s.profile);
    if (s.inflight) return s.inflight;
    const promise = fetchMyProfile()
      .then((p) => {
        set({ profile: p, inflight: null });
        return p;
      })
      .catch((err) => {
        set({ inflight: null });
        throw err;
      });
    set({ inflight: promise });
    return promise;
  },
}));

export function invalidateProfileCache(): void {
  useProfileCache.getState().invalidate();
}

export function getCachedProfile(): Promise<ProfileRow> {
  return useProfileCache.getState().load();
}
