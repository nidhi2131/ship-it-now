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

export const makeThreadKey = (firstId: string, secondId: string) =>
  `thread:${[firstId, secondId].sort().join("::")}`;

const parseThreadKey = (threadKey: string) => {
  if (threadKey.startsWith("thread:")) {
    const raw = threadKey.slice("thread:".length);
    const parts = raw.split("::");
    if (parts.length === 2) return parts as [string, string];
  }
  return [threadKey, threadKey] as [string, string];
};

const K = {
  me: "cc.me",
  auth: "cc.auth",
  accounts: "cc.accounts",
  seekers: "cc.seekers",
  workers: "cc.workers",
  requests: "cc.requests",
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

export const uid = () => Math.random().toString(36).slice(2, 10);

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
  const stored = read<AuthAccount[]>(K.accounts, []);
  if (stored.length === 0) {
    write(K.accounts, SEED_AUTH_ACCOUNTS);
    return SEED_AUTH_ACCOUNTS;
  }
  return stored;
};

export const getCurrentAccount = () => {
  const session = getAuthSession();
  if (!session) return null;
  return getAuthAccounts().find((account) => account.id === session.accountId) ?? null;
};

export const login = async (email: string, password: string) => {
  const normalizedEmail = email.toLowerCase().trim();

  if (isSupabaseConfigured) {
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

  // Fallback to local accounts (matches seed accounts & local onboarding)
  const account = getAuthAccounts().find(
    (item) => item.email.toLowerCase() === normalizedEmail && item.password === password,
  );
  if (!account) return null;

  write(K.auth, { accountId: account.id, loggedInAt: Date.now() });
  setMe(account.me);
  return account;
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

  const isRateLimited = Date.now() < supabaseRateLimitedUntil;

  if (isSupabaseConfigured && !isRateLimited) {
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
        if (error.status === 429 || error.message?.toLowerCase().includes("rate limit")) {
          supabaseRateLimitedUntil = Date.now() + 10 * 60 * 1000;
        } else {
          throw error;
        }
      } else {
        if (data?.user?.id) {
          userId = data.user.id;
        }

        // If a session was returned directly, create the Supabase profile row
        if (data?.session) {
          await supabase.from("profiles").upsert({
            id: userId,
            full_name: meData.fullName,
            phone: meData.phone,
            city: meData.city,
            area: meData.area,
          });
        }
      }
    } catch (err: any) {
      if (err?.status === 429 || err?.message?.toLowerCase().includes("rate limit")) {
        supabaseRateLimitedUntil = Date.now() + 10 * 60 * 1000;
      } else if (err?.status && err.status >= 400 && err.code !== "over_email_send_rate_limit") {
        throw err;
      }
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
  if (isEvaluatingServerSnapshot) return SEED_SEEKERS;
  const stored = read<SeekerProfile[]>(K.seekers, []);
  if (stored.length === 0) {
    if (typeof window !== "undefined") {
      write(K.seekers, SEED_SEEKERS);
    }
    return SEED_SEEKERS;
  }
  return stored;
};
export const getWorkers = (): WorkerProfile[] => {
  if (isEvaluatingServerSnapshot) return SEED_WORKERS;
  const stored = read<WorkerProfile[]>(K.workers, []);
  if (stored.length === 0) {
    if (typeof window !== "undefined") {
      write(K.workers, SEED_WORKERS);
    }
    return SEED_WORKERS;
  }
  return stored;
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
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        await supabase.from("seeker_profiles").upsert({
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

        if (me) {
          await supabase
            .from("profiles")
            .update({ profile_id: s.id, role: "seeker" })
            .eq("id", me.id);
        }
      }
    } catch {
      // Supabase sync failure will fall back to local storage seamlessly
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
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        await supabase.from("worker_profiles").upsert({
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

        if (me) {
          await supabase
            .from("profiles")
            .update({ profile_id: w.id, role: "worker" })
            .eq("id", me.id);
        }
      }
    } catch {
      // Supabase sync failure will fall back to local storage seamlessly
    }
  }
};

export const getWorker = (id: string) => getWorkers().find((w) => w.id === id);
export const getSeeker = (id: string) => getSeekers().find((s) => s.id === id);

// --- Requests ---
export const getRequests = () => read<Request[]>(K.requests, []);
export const addRequest = async (
  r: Omit<Request, "id" | "createdAt" | "status"> & { initiatorId?: string },
) => {
  let createdReq: Request | null = null;
  if (isSupabaseConfigured) {
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
        createdReq = {
          id: data[0].id,
          workerId: r.workerId,
          seekerId: r.seekerId,
          initiatorId: r.initiatorId,
          status: (data[0].status as Request["status"]) ?? "pending",
          createdAt: data[0].created_at ? new Date(data[0].created_at).getTime() : Date.now(),
        };
      }
    } catch (err) {
      console.warn("Supabase addRequest notice, using local store:", err);
    }
  }

  const all = getRequests();
  const req: Request = createdReq ?? {
    ...r,
    id: uid(),
    status: "pending",
    createdAt: Date.now(),
  };

  const idx = all.findIndex(
    (item) => item.workerId === req.workerId && item.seekerId === req.seekerId,
  );
  if (idx >= 0) all[idx] = req;
  else all.unshift(req);
  write(K.requests, all);
  return req;
};

export const updateRequestStatus = async (
  workerId: string,
  seekerId: string,
  newStatus: Request["status"],
) => {
  if (isSupabaseConfigured) {
    try {
      await supabase
        .from("care_requests")
        .update({ status: newStatus })
        .eq("worker_id", workerId)
        .eq("seeker_id", seekerId);
    } catch (err) {
      console.warn("Supabase updateRequestStatus notice:", err);
    }
  }

  const all = getRequests();
  const req = all.find(
    (item) =>
      (item.workerId === workerId && item.seekerId === seekerId) ||
      (item.workerId === seekerId && item.seekerId === workerId),
  );
  if (req) {
    req.status = newStatus;
    write(K.requests, all);
  }
};

export const hasAcceptedRequest = (workerId: string, seekerId: string) => {
  const req = getRequests().find(
    (item) =>
      (item.workerId === workerId && item.seekerId === seekerId) ||
      (item.workerId === seekerId && item.seekerId === workerId),
  );
  return (
    req && (req.status === "responded" || req.status === "hired" || req.status === "completed")
  );
};

// --- Messages ---
export const getMessages = (threadId: string): Message[] => {
  if (isEvaluatingServerSnapshot) return [];
  if (messageThreadCache[threadId]) return messageThreadCache[threadId];
  const all = read<Message[]>(K.messages, []);
  const filtered = all.filter((m) => m.threadId === threadId);
  messageThreadCache[threadId] = filtered;
  return filtered;
};
export const addMessage = async (threadId: string, fromMe: boolean, content: string) => {
  const me = getMe();
  let messageId = uid();
  let createdAt = Date.now();

  if (isSupabaseConfigured && me) {
    try {
      const [firstId, secondId] = parseThreadKey(threadId);
      const otherId = me.id === firstId ? secondId : firstId;
      const seekerId = me.role === "seeker" ? me.id : otherId;
      const workerId = me.role === "worker" ? me.id : otherId;

      const { data: thread } = await supabase
        .from("message_threads")
        .upsert(
          {
            pair_key: threadId,
            seeker_id: seekerId,
            worker_id: workerId,
          },
          { onConflict: "pair_key" },
        )
        .select("id, pair_key")
        .single();

      if (thread?.id) {
        const { data } = await supabase
          .from("messages")
          .insert({
            thread_id: thread.id,
            sender_id: me.id,
            content,
          })
          .select("id, thread_id, content, created_at");

        if (data?.[0]) {
          messageId = data[0].id;
          createdAt = new Date(data[0].created_at).getTime();
        }
      }
    } catch (err) {
      console.warn("Supabase addMessage fallback to local:", err);
    }
  }

  const all = read<Message[]>(K.messages, []);
  all.push({
    id: messageId,
    threadId,
    fromMe,
    senderId: me?.id,
    content,
    createdAt,
  });
  write(K.messages, all);
};

// --- Reviews ---
export const addReview = async (
  workerId: string,
  rating: number,
  comment: string,
  seekerName: string,
) => {
  if (isSupabaseConfigured) {
    const me = getMe();
    if (!me) return;
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
    if (error) throw error;

    const all = getWorkers();
    const w = all.find((x) => x.id === workerId);
    if (w) {
      w.reviews.push({
        id: data?.[0]?.id ?? uid(),
        rating,
        comment,
        seekerName,
        createdAt: data?.[0]?.created_at ? new Date(data[0].created_at).getTime() : Date.now(),
      });
      w.rating = w.reviews.reduce((a, r) => a + r.rating, 0) / w.reviews.length;
      write(K.workers, all);
    }
    return;
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

  // Asynchronously fetch initial data from Supabase and populate the cache
  const fetchDb = async () => {
    try {
      const { data: workers } = await supabase
        .from("worker_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (workers && workers.length > 0) {
        const mappedWorkers = workers.map((w: any) => ({
          id: w.id,
          fullName: w.full_name,
          phone: w.phone,
          city: w.city,
          area: w.area,
          gender: w.gender,
          age: w.age,
          languages: w.languages,
          experience: w.experience,
          skills: w.skills,
          availabilityType: w.availability_type,
          hoursMin: w.hours_min,
          hoursMax: w.hours_max,
          rateMin: w.rate_min,
          rateMax: w.rate_max,
          paymentMethods: w.payment_methods,
          serviceAreas: w.service_areas,
          contactMethod: w.contact_method,
          bio: w.bio,
          days: w.days,
          rating: Number(w.rating || 0),
          reviews: w.reviews || [],
          createdAt: new Date(w.created_at).getTime(),
        }));

        // Merge with existing workers
        const existingWorkers = read<WorkerProfile[]>(K.workers, SEED_WORKERS);
        const workerMap = new Map<string, WorkerProfile>();
        existingWorkers.forEach((w) => workerMap.set(w.id, w));
        mappedWorkers.forEach((w: any) => workerMap.set(w.id, w));
        write(K.workers, Array.from(workerMap.values()));
      }

      const { data: seekers } = await supabase
        .from("seeker_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (seekers && seekers.length > 0) {
        const mappedSeekers = seekers.map((s: any) => ({
          id: s.id,
          fullName: s.full_name,
          phone: s.phone,
          city: s.city,
          area: s.area,
          careFor: s.care_for,
          persons: s.persons,
          timing: s.timing,
          days: s.days,
          notes: s.notes,
          createdAt: new Date(s.created_at).getTime(),
        }));

        // Merge with existing seekers
        const existingSeekers = read<SeekerProfile[]>(K.seekers, SEED_SEEKERS);
        const seekerMap = new Map<string, SeekerProfile>();
        existingSeekers.forEach((s) => seekerMap.set(s.id, s));
        mappedSeekers.forEach((s: any) => seekerMap.set(s.id, s));
        write(K.seekers, Array.from(seekerMap.values()));
      }

      const { data: requests } = await supabase
        .from("care_requests")
        .select("id, worker_id, seeker_id, status, created_at")
        .order("created_at", { ascending: false });
      if (requests && requests.length > 0) {
        const mappedRequests = requests.map((r: any) => ({
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

      const { data: threads } = await supabase
        .from("message_threads")
        .select("id, pair_key")
        .order("created_at", { ascending: false });
      const threadKeyById = new Map<string, string>();
      (threads ?? []).forEach((thread: any) => {
        threadKeyById.set(thread.id, thread.pair_key);
      });

      const { data: messages } = await supabase
        .from("messages")
        .select("id, thread_id, sender_id, content, created_at")
        .order("created_at", { ascending: true });
      if (messages && messages.length > 0) {
        const mappedMessages = messages.map((m: any) => ({
          id: m.id,
          threadId: threadKeyById.get(m.thread_id) ?? m.thread_id,
          fromMe: false,
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

      const { data: reviews } = await supabase
        .from("reviews")
        .select("id, worker_id, seeker_id, rating, comment, seeker_name, created_at")
        .order("created_at", { ascending: true });
      if (reviews && reviews.length > 0) {
        const reviewByWorker = new Map<string, WorkerProfile["reviews"]>();
        for (const review of reviews as any[]) {
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

        const currentWorkers = read<WorkerProfile[]>(K.workers, []);
        const mergedWorkers = currentWorkers.map((worker) => {
          const workerReviews = reviewByWorker.get(worker.id) ?? [];
          const rating = workerReviews.length
            ? workerReviews.reduce((sum, review) => sum + review.rating, 0) / workerReviews.length
            : worker.rating;
          return { ...worker, reviews: workerReviews, rating };
        });
        write(K.workers, mergedWorkers);
      }
    } catch (err) {
      console.warn("Initial data sync notice:", err);
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
          { event: "*", schema: "public", table: "care_requests" },
          (payload: any) => {
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
                  (r.workerId === mapped.workerId && r.seekerId === mapped.seekerId),
              );
              if (idx >= 0) all[idx] = mapped;
              else all.unshift(mapped);
              write(K.requests, all);
            }
          },
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload: any) => {
            const rec = payload.new;
            if (rec && rec.id) {
              const all = read<Message[]>(K.messages, []);
              if (!all.some((m) => m.id === rec.id)) {
                all.push({
                  id: rec.id,
                  threadId: rec.thread_id,
                  fromMe: false,
                  senderId: rec.sender_id,
                  content: rec.content,
                  createdAt: rec.created_at ? new Date(rec.created_at).getTime() : Date.now(),
                });
                write(K.messages, all);
              }
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

// --- Seed data: experienced caregivers so the app feels alive on day one ---
const SEED_WORKERS: WorkerProfile[] = [
  {
    id: "w-sunita",
    fullName: "Sunita Patel",
    phone: "9876543210",
    city: "Ahmedabad",
    area: "Bodakdev",
    gender: "female",
    age: 42,
    languages: ["English", "Hindi", "Gujarati"],
    experience: "5+",
    skills: ["skill.cooking", "skill.hygiene", "skill.meds", "skill.companion", "skill.doctor"],
    availabilityType: ["common.fullTime", "common.liveIn"],
    hoursMin: 8,
    hoursMax: 12,
    rateMin: 700,
    rateMax: 1100,
    paymentMethods: ["common.upi", "common.cash"],
    serviceAreas: ["Bodakdev", "Vastrapur", "Satellite"],
    contactMethod: "common.whatsapp",
    bio: "I have cared for elderly parents for 14 years. I cook simple home-style meals, manage medication on time, and treat every family like my own.",
    days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    rating: 4.9,
    reviews: [
      {
        id: "r1",
        rating: 5,
        comment:
          "Sunita took wonderful care of my father after his surgery. Always punctual and patient.",
        seekerName: "Mehul R.",
        createdAt: Date.now() - 86400000 * 12,
      },
      {
        id: "r2",
        rating: 5,
        comment: "Very kind. My mother looks forward to seeing her every morning.",
        seekerName: "Anita K.",
        createdAt: Date.now() - 86400000 * 40,
      },
    ],
    createdAt: Date.now() - 86400000 * 200,
  },
  {
    id: "w-ramesh",
    fullName: "Ramesh Kumar",
    phone: "9876543211",
    city: "Ahmedabad",
    area: "Maninagar",
    gender: "male",
    age: 38,
    languages: ["Hindi", "Gujarati"],
    experience: "3-5",
    skills: ["skill.lifting", "skill.night", "skill.physio", "skill.hygiene"],
    availabilityType: ["common.nightOnly", "common.liveIn"],
    hoursMin: 10,
    hoursMax: 12,
    rateMin: 800,
    rateMax: 1200,
    paymentMethods: ["common.cash", "common.bank"],
    serviceAreas: ["Maninagar", "Khokhra", "Isanpur"],
    contactMethod: "common.call",
    bio: "Trained in patient lifting and post-stroke physiotherapy. I can do night duty and help with mobility for bedridden patients.",
    days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    rating: 4.7,
    reviews: [
      {
        id: "r3",
        rating: 5,
        comment: "Strong, gentle, and professional. Helped move my father safely every day.",
        seekerName: "Priya S.",
        createdAt: Date.now() - 86400000 * 20,
      },
    ],
    createdAt: Date.now() - 86400000 * 150,
  },
  {
    id: "w-meena",
    fullName: "Meena Sharma",
    phone: "9876543212",
    city: "Ahmedabad",
    area: "Navrangpura",
    gender: "female",
    age: 50,
    languages: ["English", "Hindi"],
    experience: "5+",
    skills: ["skill.meds", "skill.companion", "skill.cooking", "skill.doctor"],
    availabilityType: ["common.partTime", "common.fullTime"],
    hoursMin: 4,
    hoursMax: 8,
    rateMin: 500,
    rateMax: 800,
    paymentMethods: ["common.upi"],
    serviceAreas: ["Navrangpura", "C.G. Road", "Ellis Bridge"],
    contactMethod: "common.whatsapp",
    bio: "I specialise in companionship and medication management for elderly women living alone. Calm and patient with memory issues.",
    days: ["mon", "tue", "wed", "thu", "fri"],
    rating: 4.8,
    reviews: [
      {
        id: "r4",
        rating: 5,
        comment: "Meena is like a daughter to my aunt. We are so lucky.",
        seekerName: "Rohit M.",
        createdAt: Date.now() - 86400000 * 8,
      },
      {
        id: "r5",
        rating: 4,
        comment: "Very reliable. Mum's blood pressure is finally under control.",
        seekerName: "Sneha P.",
        createdAt: Date.now() - 86400000 * 60,
      },
    ],
    createdAt: Date.now() - 86400000 * 300,
  },
  {
    id: "w-vijay",
    fullName: "Vijay Solanki",
    phone: "9876543213",
    city: "Ahmedabad",
    area: "Satellite",
    gender: "male",
    age: 29,
    languages: ["Hindi", "Gujarati", "English"],
    experience: "1-2",
    skills: ["skill.cleaning", "skill.cooking", "skill.companion", "skill.doctor"],
    availabilityType: ["common.fullTime"],
    hoursMin: 8,
    hoursMax: 10,
    rateMin: 450,
    rateMax: 700,
    paymentMethods: ["common.upi", "common.cash"],
    serviceAreas: ["Satellite", "Prahladnagar", "Jodhpur"],
    contactMethod: "common.whatsapp",
    bio: "Young, energetic and trained at a hospital. I am respectful with elders and great with daily errands and doctor visits.",
    days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    rating: 4.6,
    reviews: [
      {
        id: "r6",
        rating: 5,
        comment: "Vijay handled my father's hospital visits with patience.",
        seekerName: "Kunal D.",
        createdAt: Date.now() - 86400000 * 30,
      },
    ],
    createdAt: Date.now() - 86400000 * 90,
  },
  {
    id: "w-fatima",
    fullName: "Fatima Sheikh",
    phone: "9876543214",
    city: "Ahmedabad",
    area: "Paldi",
    gender: "female",
    age: 45,
    languages: ["Hindi", "Gujarati"],
    experience: "5+",
    skills: ["skill.cooking", "skill.hygiene", "skill.companion", "skill.meds", "skill.cleaning"],
    availabilityType: ["common.fullTime", "common.liveIn"],
    hoursMin: 10,
    hoursMax: 12,
    rateMin: 800,
    rateMax: 1000,
    paymentMethods: ["common.cash", "common.upi"],
    serviceAreas: ["Paldi", "Vasna", "Ambawadi"],
    contactMethod: "common.call",
    bio: "Live-in caregiver with experience supporting families through dementia and end-of-life care. I bring warmth and routine to the home.",
    days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    rating: 5.0,
    reviews: [
      {
        id: "r7",
        rating: 5,
        comment:
          "Fatima ji was a blessing during my mother's final months. Compassionate beyond words.",
        seekerName: "Anjali B.",
        createdAt: Date.now() - 86400000 * 100,
      },
      {
        id: "r8",
        rating: 5,
        comment: "Excellent cook and very loving with my grandmother.",
        seekerName: "Karan J.",
        createdAt: Date.now() - 86400000 * 180,
      },
    ],
    createdAt: Date.now() - 86400000 * 400,
  },
  {
    id: "w-anil",
    fullName: "Anil Joshi",
    phone: "9876543215",
    city: "Ahmedabad",
    area: "Vastrapur",
    gender: "male",
    age: 35,
    languages: ["English", "Hindi"],
    experience: "3-5",
    skills: ["skill.physio", "skill.lifting", "skill.meds", "skill.doctor"],
    availabilityType: ["common.partTime"],
    hoursMin: 4,
    hoursMax: 6,
    rateMin: 600,
    rateMax: 900,
    paymentMethods: ["common.upi", "common.bank"],
    serviceAreas: ["Vastrapur", "Bodakdev", "Thaltej"],
    contactMethod: "common.appMessage",
    bio: "Certified physiotherapist assistant. I help patients recover mobility after surgery or stroke and coordinate with doctors.",
    days: ["mon", "wed", "fri", "sat"],
    rating: 4.8,
    reviews: [
      {
        id: "r9",
        rating: 5,
        comment: "My father is walking again thanks to Anil's daily sessions.",
        seekerName: "Divya N.",
        createdAt: Date.now() - 86400000 * 15,
      },
    ],
    createdAt: Date.now() - 86400000 * 250,
  },
];

const SEED_SEEKERS: SeekerProfile[] = [
  {
    id: "s-asha",
    fullName: "Asha Mehta",
    phone: "9000000000",
    city: "Ahmedabad",
    area: "Bodakdev",
    careFor: "parent",
    persons: [
      {
        name: "Mrs. Mehta",
        gender: "female",
        ageRange: "71-80",
        disabilities: ["dis.memory", "dis.heart"],
        worksRequired: ["work.meds", "work.companion", "work.doctor"],
      },
    ],
    timing: ["common.morning", "common.evening"],
    days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    notes: "Prefers someone patient with memory care and medicine reminders.",
    createdAt: Date.now() - 86400000 * 120,
  },
  {
    id: "s-kavya",
    fullName: "Kavya Desai",
    phone: "9000000001",
    city: "Ahmedabad",
    area: "Navrangpura",
    careFor: "self",
    persons: [
      {
        name: "Kavya",
        gender: "female",
        ageRange: "60-70",
        disabilities: ["dis.postsurgery"],
        worksRequired: ["work.bathing", "work.physio", "work.companion"],
      },
    ],
    timing: ["common.afternoon", "common.evening"],
    days: ["mon", "tue", "wed", "thu", "fri"],
    notes: "Needs short-term post-surgery support.",
    createdAt: Date.now() - 86400000 * 90,
  },
];

const SEED_AUTH_ACCOUNTS: AuthAccount[] = [
  {
    id: "acct-worker",
    email: "worker@careconnect.local",
    password: "password123",
    me: {
      id: "u-worker-demo",
      fullName: "Ramesh Kumar",
      phone: "9876543211",
      city: "Ahmedabad",
      area: "Maninagar",
      role: "worker",
      profileId: "w-ramesh",
    },
  },
  {
    id: "acct-seeker",
    email: "seeker@careconnect.local",
    password: "password123",
    me: {
      id: "u-seeker-demo",
      fullName: "Asha Mehta",
      phone: "9000000000",
      city: "Ahmedabad",
      area: "Bodakdev",
      role: "seeker",
      profileId: "s-asha",
    },
  },
];
