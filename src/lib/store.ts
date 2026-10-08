import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";

export type Role = "seeker" | "worker";

export type AuthAccount = {
  id: string;
  email: string;
  password: string;
  me: Me;
};

type AuthSession = {
  accountId: string;
  loggedInAt: number;
};

export type CarePerson = {
  name?: string;
  gender: "male" | "female" | "other";
  ageRange: "60-70" | "71-80" | "81-90" | "90+";
  disabilities: string[];
  worksRequired: string[];
};

export type SeekerProfile = {
  id: string;
  fullName: string;
  phone: string;
  city: string;
  area: string;
  careFor: "self" | "parent" | "spouse" | "relative" | "other";
  persons: CarePerson[];
  timing: string[];
  days: string[];
  notes: string;
  createdAt: number;
};

export type WorkerProfile = {
  id: string;
  fullName: string;
  phone: string;
  city: string;
  area: string;
  gender: "male" | "female" | "other";
  age: number;
  languages: string[];
  experience: "fresher" | "1-2" | "3-5" | "5+";
  skills: string[];
  availabilityType: string[];
  hoursMin: number;
  hoursMax: number;
  rateMin: number;
  rateMax: number;
  paymentMethods: string[];
  serviceAreas: string[];
  contactMethod: string;
  bio: string;
  days: string[];
  rating: number;
  reviews: { id: string; rating: number; comment: string; seekerName: string; createdAt: number }[];
  createdAt: number;
};

export type Request = {
  id: string;
  workerId: string;
  seekerId: string;
  initiatorId?: string;
  status: "pending" | "responded" | "hired" | "completed";
  createdAt: number;
};

export type Message = {
  id: string;
  threadId: string;
  fromMe: boolean;
  senderId?: string;
  content: string;
  createdAt: number;
};

export type Thread = {
  id: string;
  pairKey: string;
  seekerId: string;
  workerId: string;
};

export const parseThreadKey = (threadKey: string): [string, string] => {
  if (threadKey.startsWith("thread:")) {
    const raw = threadKey.slice("thread:".length);
    const parts = raw.split("::");
    if (parts.length === 2) return [parts[0], parts[1]];
  }
  return [threadKey, threadKey];
};

export const makeThreadKey = (firstId: string, secondId: string) => {
  const cleanA = firstId.startsWith("thread:") ? parseThreadKey(firstId)[0] : firstId;
  const cleanB = secondId.startsWith("thread:") ? parseThreadKey(secondId)[1] : secondId;
  return `thread:${[cleanA, cleanB].sort().join("::")}`;
};

export const getConversationKeys = (inputKey: string, meId?: string | null): Set<string> => {
  const keys = new Set<string>();
  if (!inputKey) return keys;
  keys.add(inputKey);

  const allThreads = getThreads();

  // If inputKey is a thread UUID
  const threadByUuid = allThreads.find((t) => t.id === inputKey);
  if (threadByUuid) {
    keys.add(threadByUuid.id);
    keys.add(threadByUuid.pairKey);
    const [p1, p2] = parseThreadKey(threadByUuid.pairKey);
    if (p1 && p2) {
      keys.add(`thread:${p1}::${p2}`);
      keys.add(`thread:${p2}::${p1}`);
    }
  }

  // If inputKey is a pair key
  if (inputKey.startsWith("thread:")) {
    const [p1, p2] = parseThreadKey(inputKey);
    if (p1 && p2) {
      keys.add(`thread:${p1}::${p2}`);
      keys.add(`thread:${p2}::${p1}`);
      allThreads.forEach((t) => {
        if (
          t.pairKey === `thread:${p1}::${p2}` ||
          t.pairKey === `thread:${p2}::${p1}` ||
          (t.seekerId === p1 && t.workerId === p2) ||
          (t.seekerId === p2 && t.workerId === p1)
        ) {
          keys.add(t.id);
          keys.add(t.pairKey);
        }
      });
    }
  } else if (meId && inputKey !== meId) {
    const sorted = `thread:${[meId, inputKey].sort().join("::")}`;
    const reverse = `thread:${inputKey}::${meId}`;
    const direct = `thread:${meId}::${inputKey}`;
    keys.add(sorted);
    keys.add(reverse);
    keys.add(direct);
    allThreads.forEach((t) => {
      if (
        t.pairKey === sorted ||
        t.pairKey === reverse ||
        t.pairKey === direct ||
        (t.seekerId === meId && t.workerId === inputKey) ||
        (t.seekerId === inputKey && t.workerId === meId)
      ) {
        keys.add(t.id);
        keys.add(t.pairKey);
      }
    });
  }

  return keys;
};

const K = {
  me: "cc.me",
  auth: "cc.auth",
  accounts: "cc.accounts",
  seekers: "cc.seekers",
  workers: "cc.workers",
  requests: "cc.requests",
  threads: "cc.threads",
  messages: "cc.messages",
};

let storeVersion = 0;
let isEvaluatingServerSnapshot = false;
let messageThreadCache: Record<string, Message[]> = {};
const storeCache: Record<string, any> = {};

let broadcastBus: BroadcastChannel | null = null;
if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
  try {
    broadcastBus = new BroadcastChannel("cc_realtime_bus");
    broadcastBus.onmessage = (e) => {
      const { key, val } = e.data || {};
      if (key) {
        storeCache[key] = val;
        storeVersion++;
        if (key === K.messages) {
          messageThreadCache = {};
        }
        notifyStoreListeners();
      }
    };
  } catch {}
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    storeVersion++;
    messageThreadCache = {};
    if (e.key) {
      delete storeCache[e.key];
    } else {
      Object.keys(storeCache).forEach((k) => delete storeCache[k]);
    }
    notifyStoreListeners();
  });
}

const storeListeners = new Set<() => void>();
function notifyStoreListeners() {
  storeListeners.forEach((fn) => fn());
}

export function subscribeToStore(callback: () => void) {
  storeListeners.add(callback);
  return () => {
    storeListeners.delete(callback);
  };
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined" || isEvaluatingServerSnapshot) return fallback;
  if (key in storeCache) return storeCache[key] as T;
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as T) : fallback;
    storeCache[key] = parsed;
    return parsed;
  } catch {
    storeCache[key] = fallback;
    return fallback;
  }
}

function write<T>(key: string, val: T) {
  storeCache[key] = val;
  storeVersion++;
  if (key === K.messages) {
    messageThreadCache = {};
  }
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
  try {
    broadcastBus?.postMessage({ key, val });
  } catch {}
  window.dispatchEvent(new Event("cc.store"));
  notifyStoreListeners();
}

export const uid = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const isValidUuid = (id?: string | null): boolean =>
  Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));

// --- Me (current user) ---
export type Me = {
  id: string;
  fullName: string;
  phone: string;
  city: string;
  area: string;
  role?: Role;
  profileId?: string;
};
export const getMe = (): Me | null => read<Me | null>(K.me, null);
export const setMe = (m: Me | null) => write(K.me, m);

export const getAuthSession = () => read<AuthSession | null>(K.auth, null);
export const isAuthenticated = () => getAuthSession() !== null;

export const getAuthAccounts = () => {
  return read<AuthAccount[]>(K.accounts, []);
};

export const getCurrentAccount = () => {
  const session = getAuthSession();
  if (!session) return null;
  return getAuthAccounts().find((account) => account.id === session.accountId) ?? null;
};

export const login = async (email: string, password: string) => {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check local accounts first (instant login for demo accounts or registered local accounts)
  const localAccount = getAuthAccounts().find(
    (item) => item.email.toLowerCase() === normalizedEmail && item.password === password,
  );
  if (localAccount) {
    write(K.auth, { accountId: localAccount.id, loggedInAt: Date.now() });
    setMe(localAccount.me);
    return localAccount;
  }

  // 2. Try Supabase Auth if not a local domain account (.local)
  if (isSupabaseConfigured && !normalizedEmail.endsWith(".local")) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (!error && data?.user) {
        // Fetch the profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();

        const me: Me = profile
          ? {
              id: data.user.id,
              fullName: profile.full_name || data.user.user_metadata?.full_name || "",
              phone: profile.phone || data.user.user_metadata?.phone || "",
              city: profile.city || data.user.user_metadata?.city || "",
              area: profile.area || data.user.user_metadata?.area || "",
              role: profile.role || undefined,
              profileId: profile.profile_id || undefined,
            }
          : {
              id: data.user.id,
              fullName: data.user.user_metadata?.full_name || "",
              phone: data.user.user_metadata?.phone || "",
              city: data.user.user_metadata?.city || "",
              area: data.user.user_metadata?.area || "",
            };

        write(K.auth, { accountId: data.user.id, loggedInAt: Date.now() });
        setMe(me);
        return { id: data.user.id, email: normalizedEmail, password, me };
      }
    } catch {
      // Local fallback takes over below
    }
  }

  return null;
};

export const logout = async () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(K.auth);
    localStorage.removeItem(K.me);
  }
  delete storeCache[K.auth];
  delete storeCache[K.me];
  setMe(null);

  if (isSupabaseConfigured) {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore signout cleanup warnings
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cc.store"));
  }
  notifyStoreListeners();
};

let supabaseRateLimitedUntil = 0;

export const register = async (email: string, password: string, meData: Omit<Me, "id">) => {
  const normalizedEmail = email.toLowerCase().trim();
  let userId = uid();

  const isLocalDomain = normalizedEmail.endsWith(".local");
  const isRateLimited = Date.now() < supabaseRateLimitedUntil;

  if (isSupabaseConfigured && !isRateLimited && !isLocalDomain) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: meData.fullName,
            phone: meData.phone,
            city: meData.city,
            area: meData.area,
          },
        },
      });

      if (error) {
        if (
          error.status === 429 ||
          error.message?.toLowerCase().includes("rate limit") ||
          (error as any).code === "over_email_send_rate_limit"
        ) {
          supabaseRateLimitedUntil = Date.now() + 15 * 60 * 1000;
        }
        console.warn("Supabase signup notice, proceeding with local fallback:", error.message);
      } else {
        if (data?.user?.id) {
          userId = data.user.id;
        }

        // If a session was returned directly, create the Supabase profile row
        if (data?.session) {
          try {
            await supabase.from("profiles").upsert({
              id: userId,
              full_name: meData.fullName,
              phone: meData.phone,
              city: meData.city,
              area: meData.area,
            });
          } catch {}
        }
      }
    } catch (err: any) {
      if (err?.status === 429 || err?.message?.toLowerCase().includes("rate limit")) {
        supabaseRateLimitedUntil = Date.now() + 15 * 60 * 1000;
      }
      console.warn("Supabase signup notice, proceeding with local registration:", err?.message || err);
    }
  }

  const me: Me = {
    id: userId,
    fullName: meData.fullName,
    phone: meData.phone,
    city: meData.city,
    area: meData.area,
  };

  const newAccount: AuthAccount = {
    id: userId,
    email: normalizedEmail,
    password,
    me,
  };

  const all = getAuthAccounts();
  const existingIdx = all.findIndex((a) => a.email.toLowerCase() === normalizedEmail);
  if (existingIdx >= 0) {
    all[existingIdx] = newAccount;
  } else {
    all.push(newAccount);
  }

  write(K.accounts, all);
  write(K.auth, { accountId: userId, loggedInAt: Date.now() });
  setMe(me);

  return newAccount;
};

export const getSeekers = (): SeekerProfile[] => {
  if (isEvaluatingServerSnapshot) return [];
  return read<SeekerProfile[]>(K.seekers, []);
};
export const getWorkers = (): WorkerProfile[] => {
  if (isEvaluatingServerSnapshot) return [];
  return read<WorkerProfile[]>(K.workers, []);
};

export const upsertSeeker = async (s: SeekerProfile) => {
  // Always update local storage first so the UI is immediately updated
  const all = getSeekers();
  const i = all.findIndex((x) => x.id === s.id);
  if (i >= 0) all[i] = s;
  else all.push(s);
  write(K.seekers, all);

  const me = getMe();
  if (me) {
    const updatedMe: Me = { ...me, profileId: s.id, role: "seeker" as Role };
    setMe(updatedMe);

    const accounts = getAuthAccounts();
    const acct = accounts.find((a) => a.id === me.id);
    if (acct) {
      acct.me = updatedMe;
      write(K.accounts, accounts);
    }
  }

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from("seeker_profiles").upsert({
        id: s.id,
        full_name: s.fullName,
        phone: s.phone,
        city: s.city,
        area: s.area,
        care_for: s.careFor,
        persons: s.persons,
        timing: s.timing,
        days: s.days,
        notes: s.notes,
        created_at: new Date(s.createdAt).toISOString(),
      });
      if (error) console.warn("Supabase upsertSeeker notice:", error.message);

      if (me) {
        await supabase
          .from("profiles")
          .upsert({
            id: me.id,
            profile_id: s.id,
            role: "seeker",
            full_name: me.fullName,
            phone: me.phone,
            city: me.city,
            area: me.area,
          });
      }
    } catch (err) {
      console.warn("Supabase upsertSeeker error:", err);
    }
  }
};

export const upsertWorker = async (w: WorkerProfile) => {
  // Always update local storage first so the UI is immediately updated
  const all = getWorkers();
  const i = all.findIndex((x) => x.id === w.id);
  if (i >= 0) all[i] = w;
  else all.push(w);
  write(K.workers, all);

  const me = getMe();
  if (me) {
    const updatedMe: Me = { ...me, profileId: w.id, role: "worker" as Role };
    setMe(updatedMe);

    const accounts = getAuthAccounts();
    const acct = accounts.find((a) => a.id === me.id);
    if (acct) {
      acct.me = updatedMe;
      write(K.accounts, accounts);
    }
  }

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from("worker_profiles").upsert({
        id: w.id,
        full_name: w.fullName,
        phone: w.phone,
        city: w.city,
        area: w.area,
        gender: w.gender,
        age: w.age,
        languages: w.languages,
        experience: w.experience,
        skills: w.skills,
        availability_type: w.availabilityType,
        hours_min: w.hoursMin,
        hours_max: w.hoursMax,
        rate_min: w.rateMin,
        rate_max: w.rateMax,
        payment_methods: w.paymentMethods,
        service_areas: w.serviceAreas,
        contact_method: w.contactMethod,
        bio: w.bio,
        days: w.days,
        rating: w.rating,
        reviews: w.reviews,
        created_at: new Date(w.createdAt).toISOString(),
      });
      if (error) console.warn("Supabase upsertWorker notice:", error.message);

      if (me) {
        await supabase
          .from("profiles")
          .upsert({
            id: me.id,
            profile_id: w.id,
            role: "worker",
            full_name: me.fullName,
            phone: me.phone,
            city: me.city,
            area: me.area,
          });
      }
    } catch (err) {
      console.warn("Supabase upsertWorker error:", err);
    }
  }
};

export const getWorker = (id: string) => {
  const all = getWorkers();
  return all.find((w) => w.id === id || w.phone === id);
};

export const fetchWorkerById = async (id: string): Promise<WorkerProfile | null> => {
  const existing = getWorker(id);
  if (existing) return existing;
  if (!isSupabaseConfigured || !isValidUuid(id)) return null;
  try {
    const { data: w } = await supabase
      .from("worker_profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (w) {
      const mapped: WorkerProfile = {
        id: w.id,
        fullName: w.full_name,
        phone: w.phone,
        city: w.city,
        area: w.area,
        gender: w.gender,
        age: w.age,
        languages: w.languages || [],
        experience: w.experience,
        skills: w.skills || [],
        availabilityType: w.availability_type || [],
        hoursMin: w.hours_min,
        hoursMax: w.hours_max,
        rateMin: w.rate_min,
        rateMax: w.rate_max,
        paymentMethods: w.payment_methods || [],
        serviceAreas: w.service_areas || [],
        contactMethod: w.contact_method,
        bio: w.bio || "",
        days: w.days || [],
        rating: Number(w.rating || 0),
        reviews: w.reviews || [],
        createdAt: new Date(w.created_at).getTime(),
      };
      const all = getWorkers();
      const idx = all.findIndex((x) => x.id === mapped.id);
      if (idx >= 0) all[idx] = mapped;
      else all.push(mapped);
      write(K.workers, all);
      return mapped;
    }
  } catch {}
  return null;
};

export const getSeeker = (id: string) => {
  const all = getSeekers();
  return all.find((s) => s.id === id || s.phone === id);
};

export const fetchSeekerById = async (id: string): Promise<SeekerProfile | null> => {
  const existing = getSeeker(id);
  if (existing) return existing;
  if (!isSupabaseConfigured || !isValidUuid(id)) return null;
  try {
    const { data: s } = await supabase
      .from("seeker_profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (s) {
      const mapped: SeekerProfile = {
        id: s.id,
        fullName: s.full_name,
        phone: s.phone,
        city: s.city,
        area: s.area,
        careFor: s.care_for,
        persons: s.persons || [],
        timing: s.timing || [],
        days: s.days || [],
        notes: s.notes || "",
        createdAt: new Date(s.created_at).getTime(),
      };
      const all = getSeekers();
      const idx = all.findIndex((x) => x.id === mapped.id);
      if (idx >= 0) all[idx] = mapped;
      else all.push(mapped);
      write(K.seekers, all);
      return mapped;
    }
  } catch {}
  return null;
};

export const getThreads = (): Thread[] => {
  if (isEvaluatingServerSnapshot) return [];
  return read<Thread[]>(K.threads, []);
};

// --- Requests ---
export const getRequests = () => read<Request[]>(K.requests, []);

export const addRequest = async (
  r: Omit<Request, "id" | "createdAt" | "status"> & { initiatorId?: string },
) => {
  const all = getRequests();
  const existing = all.find(
    (item) =>
      (item.workerId === r.workerId && item.seekerId === r.seekerId) ||
      (item.workerId === r.seekerId && item.seekerId === r.workerId),
  );

  // If request exists and has already been responded/accepted/hired, preserve status!
  if (existing && existing.status !== "pending") {
    return existing;
  }

  const req: Request = {
    ...r,
    id: existing?.id || uid(),
    status: "pending",
    createdAt: existing?.createdAt || Date.now(),
  };

  const idx = all.findIndex(
    (item) =>
      (item.workerId === req.workerId && item.seekerId === req.seekerId) ||
      (item.workerId === req.seekerId && item.seekerId === req.workerId),
  );
  if (idx >= 0) all[idx] = req;
  else all.unshift(req);
  write(K.requests, [...all]);

  // Background sync to Supabase (non-blocking)
  if (isSupabaseConfigured && isValidUuid(r.workerId) && isValidUuid(r.seekerId)) {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("care_requests")
          .upsert(
            {
              worker_id: r.workerId,
              seeker_id: r.seekerId,
              status: "pending",
            },
            { onConflict: "worker_id,seeker_id" },
          )
          .select("id, worker_id, seeker_id, status, created_at");

        if (!error && data?.[0]) {
          const current = getRequests();
          const target = current.find(
            (item) =>
              (item.workerId === r.workerId && item.seekerId === r.seekerId) ||
              (item.workerId === r.seekerId && item.seekerId === r.workerId),
          );
          if (target) {
            target.id = data[0].id;
            target.createdAt = data[0].created_at
              ? new Date(data[0].created_at).getTime()
              : target.createdAt;
            write(K.requests, [...current]);
          }
        }
      } catch (err) {
        console.warn("Supabase addRequest notice:", err);
      }
    })();
  }

  return req;
};

export const updateRequestStatus = async (
  workerId: string,
  seekerId: string,
  newStatus: Request["status"],
) => {
  // 1. Instant Optimistic local update (0ms UI feedback)
  const all = getRequests();
  const req = all.find(
    (item) =>
      (item.workerId === workerId && item.seekerId === seekerId) ||
      (item.workerId === seekerId && item.seekerId === workerId),
  );
  if (req) {
    req.status = newStatus;
    write(K.requests, [...all]);
  }

  // 2. Background sync to Supabase (non-blocking)
  if (isSupabaseConfigured) {
    (async () => {
      try {
        if (req?.id && isValidUuid(req.id)) {
          await supabase
            .from("care_requests")
            .update({ status: newStatus })
            .eq("id", req.id);
        } else if (isValidUuid(workerId) && isValidUuid(seekerId)) {
          await supabase
            .from("care_requests")
            .update({ status: newStatus })
            .or(`and(worker_id.eq.${workerId},seeker_id.eq.${seekerId}),and(worker_id.eq.${seekerId},seeker_id.eq.${workerId})`);
        }
      } catch (err) {
        console.warn("Supabase updateRequestStatus notice:", err);
      }
    })();
  }
};

export const getRequestBetween = (idA: string, idB: string): Request | undefined => {
  if (!idA || !idB) return undefined;
  const me = getMe();
  const setA = new Set<string>([idA]);
  const setB = new Set<string>([idB]);

  if (me) {
    if (setA.has(me.id) || (me.profileId && setA.has(me.profileId))) {
      setA.add(me.id);
      if (me.profileId) setA.add(me.profileId);
    }
    if (setB.has(me.id) || (me.profileId && setB.has(me.profileId))) {
      setB.add(me.id);
      if (me.profileId) setB.add(me.profileId);
    }
  }

  const allWorkers = getWorkers();
  const allSeekers = getSeekers();
  const wA = allWorkers.find((w) => setA.has(w.id));
  if (wA) setA.add(wA.id);
  const sA = allSeekers.find((s) => setA.has(s.id));
  if (sA) setA.add(sA.id);

  const wB = allWorkers.find((w) => setB.has(w.id));
  if (wB) setB.add(wB.id);
  const sB = allSeekers.find((s) => setB.has(s.id));
  if (sB) setB.add(sB.id);

  const reqs = getRequests();
  return reqs.find(
    (r) =>
      (setA.has(r.workerId) && setB.has(r.seekerId)) ||
      (setA.has(r.seekerId) && setB.has(r.workerId)) ||
      (r.workerId === idA && r.seekerId === idB) ||
      (r.workerId === idB && r.seekerId === idA)
  );
};

export const hasAcceptedRequest = (workerId: string, seekerId: string) => {
  const req = getRequestBetween(workerId, seekerId);
  return Boolean(
    req && (req.status === "responded" || req.status === "hired" || req.status === "completed")
  );
};

// --- Messages ---
export const getMessages = (threadId: string): Message[] => {
  if (isEvaluatingServerSnapshot) return [];
  const me = getMe();
  const keys = getConversationKeys(threadId, me?.id);

  const all = read<Message[]>(K.messages, []);
  return all.filter((m) => keys.has(m.threadId));
};

export const addMessage = async (conversationKey: string, fromMe: boolean, content: string) => {
  const me = getMe();
  const messageId = uid();
  const createdAt = Date.now();

  let p1 = "";
  let p2 = "";

  if (conversationKey.startsWith("thread:")) {
    const [a, b] = parseThreadKey(conversationKey);
    p1 = a;
    p2 = b;
  } else {
    // If conversationKey is a thread UUID
    const tByUuid = getThreads().find((t) => t.id === conversationKey);
    if (tByUuid) {
      p1 = tByUuid.seekerId;
      p2 = tByUuid.workerId;
    } else if (me) {
      p1 = me.id;
      p2 = conversationKey;
    }
  }

  // Ensure two distinct participants
  const otherId = me ? (me.id === p1 ? p2 : p1) : p2;
  const isMeSeeker = me?.role === "seeker" || Boolean(getSeeker(me?.id || ""));
  const seekerId = isMeSeeker ? me?.id || otherId : otherId;
  const workerId = isMeSeeker ? otherId : me?.id || otherId;

  const canonicalPairKey = makeThreadKey(seekerId, workerId);

  // 1. Instant Optimistic local push (0ms latency)
  const all = read<Message[]>(K.messages, []);
  all.push({
    id: messageId,
    threadId: canonicalPairKey,
    fromMe: true,
    senderId: me?.id,
    content,
    createdAt,
  });
  write(K.messages, [...all]);

  // 2. Background sync to Supabase
  if (isSupabaseConfigured && me && isValidUuid(me.id) && isValidUuid(seekerId) && isValidUuid(workerId)) {
    (async () => {
      try {
        let threads = getThreads();
        let existingThread = threads.find(
          (t) =>
            t.pairKey === canonicalPairKey ||
            (t.seekerId === seekerId && t.workerId === workerId) ||
            (t.seekerId === workerId && t.workerId === seekerId)
        );

        let threadIdToUse = existingThread?.id;

        if (!threadIdToUse) {
          const { data: tData } = await supabase
            .from("message_threads")
            .upsert(
              {
                pair_key: canonicalPairKey,
                seeker_id: seekerId,
                worker_id: workerId,
              },
              { onConflict: "pair_key" },
            )
            .select("id, pair_key");

          if (tData?.[0]?.id) {
            threadIdToUse = tData[0].id;
            threads = getThreads();
            const tObj: Thread = {
              id: threadIdToUse,
              pairKey: canonicalPairKey,
              seekerId,
              workerId,
            };
            const idx = threads.findIndex((t) => t.id === threadIdToUse || t.pairKey === canonicalPairKey);
            if (idx >= 0) threads[idx] = tObj;
            else threads.push(tObj);
            write(K.threads, [...threads]);
          }
        }

        if (threadIdToUse) {
          const { data: mData } = await supabase
            .from("messages")
            .insert({
              thread_id: threadIdToUse,
              sender_id: me.id,
              content,
            })
            .select("id, thread_id, content, created_at");

          if (mData?.[0]?.id) {
            const currentMsgs = read<Message[]>(K.messages, []);
            const mIdx = currentMsgs.findIndex((m) => m.id === messageId);
            if (mIdx >= 0) {
              currentMsgs[mIdx] = {
                ...currentMsgs[mIdx],
                id: mData[0].id,
                threadId: canonicalPairKey,
                createdAt: new Date(mData[0].created_at).getTime(),
              };
              write(K.messages, [...currentMsgs]);
            }
          }
        }
      } catch (err) {
        console.warn("Supabase addMessage sync notice:", err);
      }
    })();
  }
};

export const syncMessagesForThread = async (threadKeyOrId: string) => {
  if (!isSupabaseConfigured || typeof window === "undefined") return;
  try {
    const me = getMe();
    const keys = getConversationKeys(threadKeyOrId, me?.id);
    let threads = getThreads();
    const threadUuids: string[] = [];

    keys.forEach((k) => {
      if (isValidUuid(k)) threadUuids.push(k);
    });

    threads.forEach((t) => {
      if (keys.has(t.pairKey) || keys.has(t.id)) {
        threadUuids.push(t.id);
      }
    });

    // Query Supabase message_threads directly for pairKeys if not found yet
    const pairKeysToQuery = Array.from(keys).filter((k) => k.startsWith("thread:"));
    if (pairKeysToQuery.length > 0) {
      const { data: dbThreads } = await supabase
        .from("message_threads")
        .select("id, pair_key, seeker_id, worker_id")
        .in("pair_key", pairKeysToQuery);

      if (dbThreads && dbThreads.length > 0) {
        threads = getThreads();
        dbThreads.forEach((dt: any) => {
          threadUuids.push(dt.id);
          const idx = threads.findIndex((t) => t.id === dt.id || t.pairKey === dt.pair_key);
          const tObj: Thread = {
            id: dt.id,
            pairKey: dt.pair_key,
            seekerId: dt.seeker_id,
            workerId: dt.worker_id,
          };
          if (idx >= 0) threads[idx] = tObj;
          else threads.push(tObj);
        });
        write(K.threads, [...threads]);
      }
    }

    const uniqueUuids = Array.from(new Set(threadUuids));
    if (uniqueUuids.length === 0) return;

    const { data: dbMsgs } = await supabase
      .from("messages")
      .select("id, thread_id, sender_id, content, created_at")
      .in("thread_id", uniqueUuids)
      .order("created_at", { ascending: true });

    if (dbMsgs && dbMsgs.length > 0) {
      const currentMsgs = read<Message[]>(K.messages, []);
      let changed = false;

      for (const dm of dbMsgs) {
        const matchingThread = threads.find((t) => t.id === dm.thread_id);
        const resolvedThreadId = matchingThread?.pairKey || dm.thread_id;

        const mapped: Message = {
          id: dm.id,
          threadId: resolvedThreadId,
          fromMe: me ? dm.sender_id === me.id : false,
          senderId: dm.sender_id,
          content: dm.content,
          createdAt: new Date(dm.created_at).getTime(),
        };

        const idx = currentMsgs.findIndex((m) => m.id === dm.id);
        if (idx < 0) {
          currentMsgs.push(mapped);
          changed = true;
        } else if (currentMsgs[idx].threadId !== resolvedThreadId) {
          currentMsgs[idx].threadId = resolvedThreadId;
          changed = true;
        }
      }

      if (changed) {
        write(K.messages, [...currentMsgs]);
      }
    }
  } catch (err) {
    console.warn("syncMessagesForThread notice:", err);
  }
};

export const syncCareRequests = async () => {
  if (!isSupabaseConfigured || typeof window === "undefined") return;
  try {
    const { data: dbReqs } = await supabase
      .from("care_requests")
      .select("id, worker_id, seeker_id, status, created_at")
      .order("created_at", { ascending: false });

    if (dbReqs && dbReqs.length > 0) {
      const mappedRequests: Request[] = dbReqs.map((r: any) => ({
        id: r.id,
        workerId: r.worker_id,
        seekerId: r.seeker_id,
        status: r.status,
        createdAt: new Date(r.created_at).getTime(),
      }));
      const existingRequests = read<Request[]>(K.requests, []);
      const reqMap = new Map<string, Request>();
      existingRequests.forEach((r) => reqMap.set(r.id, r));
      mappedRequests.forEach((r: any) => reqMap.set(r.id, r));
      write(K.requests, Array.from(reqMap.values()));
    }
  } catch (err) {
    console.warn("syncCareRequests notice:", err);
  }
};

// --- Reviews ---
export const addReview = async (
  workerId: string,
  rating: number,
  comment: string,
  seekerName: string,
) => {
  const me = getMe();
  if (isSupabaseConfigured && me && isValidUuid(workerId) && isValidUuid(me.id)) {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .insert({
          worker_id: workerId,
          seeker_id: me.id,
          rating,
          comment,
          seeker_name: seekerName,
        })
        .select("id, worker_id, seeker_id, rating, comment, seeker_name, created_at");

      if (!error && data?.[0]) {
        const all = getWorkers();
        const w = all.find((x) => x.id === workerId);
        if (w) {
          w.reviews.push({
            id: data[0].id,
            rating,
            comment,
            seekerName,
            createdAt: data[0].created_at ? new Date(data[0].created_at).getTime() : Date.now(),
          });
          w.rating = w.reviews.reduce((a, r) => a + r.rating, 0) / w.reviews.length;
          write(K.workers, all);
        }
        return;
      }
    } catch (err) {
      console.warn("Supabase addReview fallback to local:", err);
    }
  }

  const all = getWorkers();
  const w = all.find((x) => x.id === workerId);
  if (!w) return;
  w.reviews.push({ id: uid(), rating, comment, seekerName, createdAt: Date.now() });
  w.rating = w.reviews.reduce((a, r) => a + r.rating, 0) / w.reviews.length;
  write(K.workers, all);
};

// --- Supabase Synchronization & Auth Listener ---
if (isSupabaseConfigured) {
  // Listen to auth changes and sync 'me'
  supabase.auth.onAuthStateChange(async (event: any, session: any) => {
    if (session?.user) {
      // Fetch profile
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        const currentMe = getMe();
        const me: Me = {
          id: session.user.id,
          fullName:
            profile?.full_name ||
            session.user.user_metadata?.full_name ||
            currentMe?.fullName ||
            "",
          phone: profile?.phone || session.user.user_metadata?.phone || currentMe?.phone || "",
          city: profile?.city || session.user.user_metadata?.city || currentMe?.city || "",
          area: profile?.area || session.user.user_metadata?.area || currentMe?.area || "",
          role: profile?.role || currentMe?.role,
          profileId: profile?.profile_id || currentMe?.profileId,
        };
        setMe(me);
      } catch (err) {
        console.warn("Error syncing user profile:", err);
      }
    } else if (event === "SIGNED_OUT") {
      setMe(null);
    }
  });

  // Asynchronously fetch initial data from Supabase in parallel (<1.5s) and populate the cache
  const fetchDb = async () => {
    if (typeof window === "undefined") return;
    try {
      const [
        workersRes,
        seekersRes,
        requestsRes,
        threadsRes,
        messagesRes,
        reviewsRes,
      ] = await Promise.all([
        supabase.from("worker_profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("seeker_profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("care_requests").select("id, worker_id, seeker_id, status, created_at").order("created_at", { ascending: false }),
        supabase.from("message_threads").select("id, pair_key, seeker_id, worker_id").order("created_at", { ascending: false }),
        supabase.from("messages").select("id, thread_id, sender_id, content, created_at").order("created_at", { ascending: true }),
        supabase.from("reviews").select("id, worker_id, seeker_id, rating, comment, seeker_name, created_at").order("created_at", { ascending: true }),
      ]);

      // 1. Threads
      const threadKeyById = new Map<string, string>();
      const mappedThreads: Thread[] = (threadsRes.data ?? []).map((t: any) => {
        threadKeyById.set(t.id, t.pair_key);
        return {
          id: t.id,
          pairKey: t.pair_key,
          seekerId: t.seeker_id,
          workerId: t.worker_id,
        };
      });
      const localThreads = read<Thread[]>(K.threads, []);
      const threadMap = new Map<string, Thread>();
      mappedThreads.forEach((t) => threadMap.set(t.id, t));
      localThreads.forEach((t) => {
        if (!threadMap.has(t.id)) threadMap.set(t.id, t);
      });
      write(K.threads, Array.from(threadMap.values()));

      // 2. Reviews
      const reviewByWorker = new Map<string, WorkerProfile["reviews"]>();
      if (reviewsRes.data && reviewsRes.data.length > 0) {
        for (const review of reviewsRes.data as any[]) {
          const list = reviewByWorker.get(review.worker_id) ?? [];
          list.push({
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            seekerName: review.seeker_name,
            createdAt: new Date(review.created_at).getTime(),
          });
          reviewByWorker.set(review.worker_id, list);
        }
      }

      // 3. Workers
      const mappedWorkers: WorkerProfile[] = (workersRes.data ?? []).map((w: any) => {
        const workerReviews = reviewByWorker.get(w.id) ?? w.reviews ?? [];
        const rating = workerReviews.length
          ? workerReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / workerReviews.length
          : Number(w.rating || 0);
        return {
          id: w.id,
          fullName: w.full_name,
          phone: w.phone,
          city: w.city,
          area: w.area,
          gender: w.gender,
          age: w.age,
          languages: w.languages || [],
          experience: w.experience,
          skills: w.skills || [],
          availabilityType: w.availability_type || [],
          hoursMin: w.hours_min,
          hoursMax: w.hours_max,
          rateMin: w.rate_min,
          rateMax: w.rate_max,
          paymentMethods: w.payment_methods || [],
          serviceAreas: w.service_areas || [],
          contactMethod: w.contact_method,
          bio: w.bio || "",
          days: w.days || [],
          rating,
          reviews: workerReviews,
          createdAt: new Date(w.created_at).getTime(),
        };
      });

      const localWorkers = read<WorkerProfile[]>(K.workers, []);
      const workerMap = new Map<string, WorkerProfile>();
      mappedWorkers.forEach((w: WorkerProfile) => workerMap.set(w.id, w));
      localWorkers.forEach((w: WorkerProfile) => {
        if (!workerMap.has(w.id)) workerMap.set(w.id, w);
      });
      write(K.workers, Array.from(workerMap.values()));

      // 4. Seekers
      const mappedSeekers: SeekerProfile[] = (seekersRes.data ?? []).map((s: any) => ({
        id: s.id,
        fullName: s.full_name,
        phone: s.phone,
        city: s.city,
        area: s.area,
        careFor: s.care_for,
        persons: s.persons || [],
        timing: s.timing || [],
        days: s.days || [],
        notes: s.notes || "",
        createdAt: new Date(s.created_at).getTime(),
      }));

      const localSeekers = read<SeekerProfile[]>(K.seekers, []);
      const seekerMap = new Map<string, SeekerProfile>();
      mappedSeekers.forEach((s: SeekerProfile) => seekerMap.set(s.id, s));
      localSeekers.forEach((s: SeekerProfile) => {
        if (!seekerMap.has(s.id)) seekerMap.set(s.id, s);
      });
      write(K.seekers, Array.from(seekerMap.values()));

      // 5. Care Requests
      if (requestsRes.data && requestsRes.data.length > 0) {
        const mappedRequests = requestsRes.data.map((r: any) => ({
          id: r.id,
          workerId: r.worker_id,
          seekerId: r.seeker_id,
          status: r.status,
          createdAt: new Date(r.created_at).getTime(),
        }));
        const existingRequests = read<Request[]>(K.requests, []);
        const reqMap = new Map<string, Request>();
        existingRequests.forEach((r) => reqMap.set(r.id, r));
        mappedRequests.forEach((r: any) => reqMap.set(r.id, r));
        write(K.requests, Array.from(reqMap.values()));
      }

      // 6. Messages
      if (messagesRes.data && messagesRes.data.length > 0) {
        const me = getMe();
        const mappedMessages = messagesRes.data.map((m: any) => ({
          id: m.id,
          threadId: threadKeyById.get(m.thread_id) ?? m.thread_id,
          fromMe: me ? m.sender_id === me.id : false,
          senderId: m.sender_id,
          content: m.content,
          createdAt: new Date(m.created_at).getTime(),
        }));
        const existingMessages = read<Message[]>(K.messages, []);
        const msgMap = new Map<string, Message>();
        existingMessages.forEach((m) => msgMap.set(m.id, m));
        mappedMessages.forEach((m: any) => msgMap.set(m.id, m));
        write(K.messages, Array.from(msgMap.values()));
      }
    } catch (err) {
      console.warn("Parallel data sync notice:", err);
    }
  };

  fetchDb();

  // Subscribe to Supabase Realtime changes for real-time client & server updates
  if (typeof window !== "undefined") {
    try {
      supabase
        .channel("careconnect_live_sync")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "worker_profiles" },
          (payload: any) => {
            if (payload.eventType === "DELETE") {
              const deletedId = payload.old?.id;
              if (deletedId) {
                const all = getWorkers().filter((w) => w.id !== deletedId);
                write(K.workers, all);
              }
              return;
            }
            const rec = payload.new;
            if (rec && rec.id) {
              const all = getWorkers();
              const mapped: WorkerProfile = {
                id: rec.id,
                fullName: rec.full_name,
                phone: rec.phone,
                city: rec.city,
                area: rec.area,
                gender: rec.gender,
                age: rec.age,
                languages: rec.languages || [],
                experience: rec.experience,
                skills: rec.skills || [],
                availabilityType: rec.availability_type || [],
                hoursMin: rec.hours_min,
                hoursMax: rec.hours_max,
                rateMin: rec.rate_min,
                rateMax: rec.rate_max,
                paymentMethods: rec.payment_methods || [],
                serviceAreas: rec.service_areas || [],
                contactMethod: rec.contact_method,
                bio: rec.bio || "",
                days: rec.days || [],
                rating: Number(rec.rating || 0),
                reviews: rec.reviews || [],
                createdAt: rec.created_at ? new Date(rec.created_at).getTime() : Date.now(),
              };
              const idx = all.findIndex((w) => w.id === mapped.id);
              if (idx >= 0) all[idx] = mapped;
              else all.unshift(mapped);
              write(K.workers, all);
            }
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "seeker_profiles" },
          (payload: any) => {
            if (payload.eventType === "DELETE") {
              const deletedId = payload.old?.id;
              if (deletedId) {
                const all = getSeekers().filter((s) => s.id !== deletedId);
                write(K.seekers, all);
              }
              return;
            }
            const rec = payload.new;
            if (rec && rec.id) {
              const all = getSeekers();
              const mapped: SeekerProfile = {
                id: rec.id,
                fullName: rec.full_name,
                phone: rec.phone,
                city: rec.city,
                area: rec.area,
                careFor: rec.care_for,
                persons: rec.persons || [],
                timing: rec.timing || [],
                days: rec.days || [],
                notes: rec.notes || "",
                createdAt: rec.created_at ? new Date(rec.created_at).getTime() : Date.now(),
              };
              const idx = all.findIndex((s) => s.id === mapped.id);
              if (idx >= 0) all[idx] = mapped;
              else all.unshift(mapped);
              write(K.seekers, all);
            }
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "care_requests" },
          (payload: any) => {
            if (payload.eventType === "DELETE") {
              const deletedId = payload.old?.id;
              if (deletedId) {
                const all = getRequests().filter((r) => r.id !== deletedId);
                write(K.requests, [...all]);
              }
              return;
            }
            const rec = payload.new;
            if (rec && rec.id) {
              const all = getRequests();
              const mapped: Request = {
                id: rec.id,
                workerId: rec.worker_id,
                seekerId: rec.seeker_id,
                status: rec.status,
                createdAt: rec.created_at ? new Date(rec.created_at).getTime() : Date.now(),
              };
              const idx = all.findIndex(
                (r) =>
                  r.id === mapped.id ||
                  (r.workerId === mapped.workerId && r.seekerId === mapped.seekerId) ||
                  (r.workerId === mapped.seekerId && r.seekerId === mapped.workerId),
              );
              if (idx >= 0) all[idx] = mapped;
              else all.unshift(mapped);
              write(K.requests, [...all]);
            }
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "message_threads" },
          (payload: any) => {
            const rec = payload.new;
            if (rec && rec.id) {
              const threads = getThreads();
              const idx = threads.findIndex((t) => t.id === rec.id || t.pairKey === rec.pair_key);
              const threadObj: Thread = {
                id: rec.id,
                pairKey: rec.pair_key,
                seekerId: rec.seeker_id,
                workerId: rec.worker_id,
              };
              if (idx >= 0) threads[idx] = threadObj;
              else threads.push(threadObj);
              write(K.threads, [...threads]);
            }
          },
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload: any) => {
            const rec = payload.new;
            if (!rec || !rec.id) return;
            const me = getMe();
            const all = read<Message[]>(K.messages, []);

            const threads = getThreads();
            const thread = threads.find((t) => t.id === rec.thread_id);
            const resolvedThreadId = thread?.pairKey || rec.thread_id;

            const existingIdx = all.findIndex(
              (m) =>
                m.id === rec.id ||
                (m.senderId === rec.sender_id &&
                  m.content === rec.content &&
                  Math.abs(m.createdAt - new Date(rec.created_at).getTime()) < 10000),
            );

            const mappedMsg: Message = {
              id: rec.id,
              threadId: resolvedThreadId,
              fromMe: me ? rec.sender_id === me.id : false,
              senderId: rec.sender_id,
              content: rec.content,
              createdAt: rec.created_at ? new Date(rec.created_at).getTime() : Date.now(),
            };

            if (existingIdx >= 0) {
              all[existingIdx] = mappedMsg;
            } else {
              all.push(mappedMsg);
            }
            // Instant synchronous write: 0ms latency for receiving participant!
            write(K.messages, [...all]);

            // Async background metadata fetch if thread is missing from local threads
            if (!thread && isSupabaseConfigured) {
              supabase
                .from("message_threads")
                .select("id, pair_key, seeker_id, worker_id")
                .eq("id", rec.thread_id)
                .maybeSingle()
                .then(({ data: tData }) => {
                  if (tData) {
                    const currentThreads = getThreads();
                    if (!currentThreads.some((t) => t.id === tData.id)) {
                      currentThreads.push({
                        id: tData.id,
                        pairKey: tData.pair_key,
                        seekerId: tData.seeker_id,
                        workerId: tData.worker_id,
                      });
                      write(K.threads, [...currentThreads]);
                    }
                  }
                })
                .catch(() => {});
            }
          },
        )
        .subscribe();
    } catch (err) {
      console.warn("Realtime subscription notice:", err);
    }
  }
}

function isShallowOrDeepEqual(a: any, b: any): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) {
    return false;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isShallowOrDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!Object.is(a[key], b[key])) return false;
  }
  return true;
}

// Hook to subscribe to store changes without re-render cascades or hydration mismatch
export function useStore<T>(readFn: () => T): T {
  const lastSnapshotRef = useRef<{
    version: number;
    value: T;
    initialized: boolean;
  }>({
    version: -1,
    value: undefined as any,
    initialized: false,
  });

  const readFnRef = useRef(readFn);
  readFnRef.current = readFn;

  const getSnapshot = () => {
    if (lastSnapshotRef.current.initialized && lastSnapshotRef.current.version === storeVersion) {
      return lastSnapshotRef.current.value;
    }

    const nextVal = readFnRef.current();

    if (!lastSnapshotRef.current.initialized) {
      lastSnapshotRef.current = {
        version: storeVersion,
        value: nextVal,
        initialized: true,
      };
      return nextVal;
    }

    if (isShallowOrDeepEqual(lastSnapshotRef.current.value, nextVal)) {
      lastSnapshotRef.current.version = storeVersion;
      return lastSnapshotRef.current.value;
    }

    lastSnapshotRef.current = {
      version: storeVersion,
      value: nextVal,
      initialized: true,
    };
    return nextVal;
  };

  const getServerSnapshot = () => {
    isEvaluatingServerSnapshot = true;
    try {
      return readFnRef.current();
    } finally {
      isEvaluatingServerSnapshot = false;
    }
  };

  return useSyncExternalStore(subscribeToStore, getSnapshot, getServerSnapshot);
}

// Cleaned database: 0 initial dummy workers
const SEED_WORKERS: WorkerProfile[] = [];

const SEED_SEEKERS: SeekerProfile[] = [];

const SEED_AUTH_ACCOUNTS: AuthAccount[] = [];

export const clearDatabase = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(K.workers);
    localStorage.removeItem(K.seekers);
    localStorage.removeItem(K.requests);
    localStorage.removeItem(K.threads);
    localStorage.removeItem(K.messages);
    localStorage.removeItem(K.accounts);
    localStorage.removeItem(K.auth);
    localStorage.removeItem(K.me);
  }
  storeCache[K.workers] = [];
  storeCache[K.seekers] = [];
  storeCache[K.requests] = [];
  storeCache[K.threads] = [];
  storeCache[K.messages] = [];
  storeCache[K.accounts] = [];
  storeCache[K.auth] = null;
  storeCache[K.me] = null;
  messageThreadCache = {};
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cc.store"));
  }
  notifyStoreListeners();
};

// Automatic one-time cleanup to clear any existing mock data from browser localStorage
const STORE_RESET_KEY = "cc.db_cleaned_v4";
if (typeof window !== "undefined") {
  try {
    if (!localStorage.getItem(STORE_RESET_KEY)) {
      clearDatabase();
      localStorage.setItem(STORE_RESET_KEY, "true");
    }
  } catch {}
}
