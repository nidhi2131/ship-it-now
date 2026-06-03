// Lightweight client-side data store using localStorage. No backend needed.
import { useEffect, useState } from "react";

export type Role = "seeker" | "worker";

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
  status: "pending" | "responded" | "hired" | "completed";
  createdAt: number;
};

export type Message = {
  id: string;
  threadId: string;
  fromMe: boolean;
  content: string;
  createdAt: number;
};

const K = {
  me: "cc.me",
  seekers: "cc.seekers",
  workers: "cc.workers",
  requests: "cc.requests",
  messages: "cc.messages",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, val: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(val));
  window.dispatchEvent(new Event("cc.store"));
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

// --- Profiles ---
export const getSeekers = () => read<SeekerProfile[]>(K.seekers, []);
export const getWorkers = (): WorkerProfile[] => {
  const stored = read<WorkerProfile[]>(K.workers, []);
  if (stored.length === 0) {
    write(K.workers, SEED_WORKERS);
    return SEED_WORKERS;
  }
  return stored;
};

export const upsertSeeker = (s: SeekerProfile) => {
  const all = getSeekers();
  const i = all.findIndex((x) => x.id === s.id);
  if (i >= 0) all[i] = s;
  else all.push(s);
  write(K.seekers, all);
};
export const upsertWorker = (w: WorkerProfile) => {
  const all = getWorkers();
  const i = all.findIndex((x) => x.id === w.id);
  if (i >= 0) all[i] = w;
  else all.push(w);
  write(K.workers, all);
};

export const getWorker = (id: string) => getWorkers().find((w) => w.id === id);
export const getSeeker = (id: string) => getSeekers().find((s) => s.id === id);

// --- Requests ---
export const getRequests = () => read<Request[]>(K.requests, []);
export const addRequest = (r: Omit<Request, "id" | "createdAt" | "status">) => {
  const all = getRequests();
  const req: Request = { ...r, id: uid(), status: "pending", createdAt: Date.now() };
  all.push(req);
  write(K.requests, all);
  return req;
};

// --- Messages ---
export const getMessages = (threadId: string) =>
  read<Message[]>(K.messages, []).filter((m) => m.threadId === threadId);
export const addMessage = (threadId: string, fromMe: boolean, content: string) => {
  const all = read<Message[]>(K.messages, []);
  all.push({ id: uid(), threadId, fromMe, content, createdAt: Date.now() });
  write(K.messages, all);
};

// --- Reviews ---
export const addReview = (workerId: string, rating: number, comment: string, seekerName: string) => {
  const all = getWorkers();
  const w = all.find((x) => x.id === workerId);
  if (!w) return;
  w.reviews.push({ id: uid(), rating, comment, seekerName, createdAt: Date.now() });
  w.rating = w.reviews.reduce((a, r) => a + r.rating, 0) / w.reviews.length;
  write(K.workers, all);
};

// Hook to subscribe to changes
export function useStore<T>(read: () => T): T {
  const [val, setVal] = useState<T>(read);
  useEffect(() => {
    const update = () => setVal(read());
    window.addEventListener("cc.store", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("cc.store", update);
      window.removeEventListener("storage", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return val;
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
    hoursMin: 8, hoursMax: 12,
    rateMin: 700, rateMax: 1100,
    paymentMethods: ["common.upi", "common.cash"],
    serviceAreas: ["Bodakdev", "Vastrapur", "Satellite"],
    contactMethod: "common.whatsapp",
    bio: "I have cared for elderly parents for 14 years. I cook simple home-style meals, manage medication on time, and treat every family like my own.",
    days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    rating: 4.9,
    reviews: [
      { id: "r1", rating: 5, comment: "Sunita took wonderful care of my father after his surgery. Always punctual and patient.", seekerName: "Mehul R.", createdAt: Date.now() - 86400000 * 12 },
      { id: "r2", rating: 5, comment: "Very kind. My mother looks forward to seeing her every morning.", seekerName: "Anita K.", createdAt: Date.now() - 86400000 * 40 },
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
    hoursMin: 10, hoursMax: 12,
    rateMin: 800, rateMax: 1200,
    paymentMethods: ["common.cash", "common.bank"],
    serviceAreas: ["Maninagar", "Khokhra", "Isanpur"],
    contactMethod: "common.call",
    bio: "Trained in patient lifting and post-stroke physiotherapy. I can do night duty and help with mobility for bedridden patients.",
    days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    rating: 4.7,
    reviews: [
      { id: "r3", rating: 5, comment: "Strong, gentle, and professional. Helped move my father safely every day.", seekerName: "Priya S.", createdAt: Date.now() - 86400000 * 20 },
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
    hoursMin: 4, hoursMax: 8,
    rateMin: 500, rateMax: 800,
    paymentMethods: ["common.upi"],
    serviceAreas: ["Navrangpura", "C.G. Road", "Ellis Bridge"],
    contactMethod: "common.whatsapp",
    bio: "I specialise in companionship and medication management for elderly women living alone. Calm and patient with memory issues.",
    days: ["mon", "tue", "wed", "thu", "fri"],
    rating: 4.8,
    reviews: [
      { id: "r4", rating: 5, comment: "Meena is like a daughter to my aunt. We are so lucky.", seekerName: "Rohit M.", createdAt: Date.now() - 86400000 * 8 },
      { id: "r5", rating: 4, comment: "Very reliable. Mum's blood pressure is finally under control.", seekerName: "Sneha P.", createdAt: Date.now() - 86400000 * 60 },
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
    hoursMin: 8, hoursMax: 10,
    rateMin: 450, rateMax: 700,
    paymentMethods: ["common.upi", "common.cash"],
    serviceAreas: ["Satellite", "Prahladnagar", "Jodhpur"],
    contactMethod: "common.whatsapp",
    bio: "Young, energetic and trained at a hospital. I am respectful with elders and great with daily errands and doctor visits.",
    days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    rating: 4.6,
    reviews: [
      { id: "r6", rating: 5, comment: "Vijay handled my father's hospital visits with patience.", seekerName: "Kunal D.", createdAt: Date.now() - 86400000 * 30 },
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
    hoursMin: 10, hoursMax: 12,
    rateMin: 800, rateMax: 1000,
    paymentMethods: ["common.cash", "common.upi"],
    serviceAreas: ["Paldi", "Vasna", "Ambawadi"],
    contactMethod: "common.call",
    bio: "Live-in caregiver with experience supporting families through dementia and end-of-life care. I bring warmth and routine to the home.",
    days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    rating: 5.0,
    reviews: [
      { id: "r7", rating: 5, comment: "Fatima ji was a blessing during my mother's final months. Compassionate beyond words.", seekerName: "Anjali B.", createdAt: Date.now() - 86400000 * 100 },
      { id: "r8", rating: 5, comment: "Excellent cook and very loving with my grandmother.", seekerName: "Karan J.", createdAt: Date.now() - 86400000 * 180 },
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
    hoursMin: 4, hoursMax: 6,
    rateMin: 600, rateMax: 900,
    paymentMethods: ["common.upi", "common.bank"],
    serviceAreas: ["Vastrapur", "Bodakdev", "Thaltej"],
    contactMethod: "common.appMessage",
    bio: "Certified physiotherapist assistant. I help patients recover mobility after surgery or stroke and coordinate with doctors.",
    days: ["mon", "wed", "fri", "sat"],
    rating: 4.8,
    reviews: [
      { id: "r9", rating: 5, comment: "My father is walking again thanks to Anil's daily sessions.", seekerName: "Divya N.", createdAt: Date.now() - 86400000 * 15 },
    ],
    createdAt: Date.now() - 86400000 * 250,
  },
];
