import { createFileRoute, useRouter, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/i18n";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { WorkerCard } from "@/components/worker-card";
import { SeekerCard } from "@/components/seeker-card";
import { getWorkers, getSeekers, getMe, useStore, syncPublicDirectory } from "@/lib/store";
import { FieldLabel, Chip, TextInput } from "@/components/form-bits";
import { Filter, ArrowLeft, Users, HeartHandshake, Lock } from "lucide-react";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
  head: () => ({ meta: [{ title: "Browse Caregivers — CareConnect" }] }),
  component: SearchPage,
});

const SKILLS = [
  "skill.cooking",
  "skill.cleaning",
  "skill.hygiene",
  "skill.meds",
  "skill.lifting",
  "skill.companion",
  "skill.night",
  "skill.doctor",
  "skill.physio",
];
const LANGS = ["English", "Hindi", "Gujarati"];
const AVAIL = ["common.partTime", "common.fullTime", "common.liveIn", "common.nightOnly"];
const TIMINGS = ["common.morning", "common.afternoon", "common.evening", "common.nightOnly"];

function SearchPage() {
  const router = useRouter();
  const { tab } = Route.useSearch();
  const { t } = useI18n();
  const me = useStore(() => getMe());
  const workers = useStore(() => getWorkers());
  const seekers = useStore(() => getSeekers());

  useEffect(() => {
    void syncPublicDirectory();
  }, []);

  // Role-strict tab logic:
  // - Caregivers (workers) search and browse "Care Requests" (seekers)
  // - Care recipients (seekers) search and browse "Caregivers" (workers)
  const initialTab: "workers" | "seekers" =
    me?.role === "worker"
      ? "seekers"
      : me?.role === "seeker"
        ? "workers"
        : tab === "requests" || tab === "seekers"
          ? "seekers"
          : "workers";

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"workers" | "seekers">(initialTab);

  useEffect(() => {
    if (me?.role === "worker") {
      setActiveTab("seekers");
    } else if (me?.role === "seeker") {
      setActiveTab("workers");
    } else if (tab === "requests" || tab === "seekers") {
      setActiveTab("seekers");
    } else if (tab === "caregivers" || tab === "workers") {
      setActiveTab("workers");
    }
  }, [tab, me?.role]);

  const handleTabChange = (target: "workers" | "seekers") => {
    setActiveTab(target);
    navigate({
      to: "/search",
      search: { tab: target === "workers" ? "caregivers" : "requests" },
      replace: true,
    });
  };

  // Worker filters
  const [skills, setSkills] = useState<string[]>([]);
  const [langs, setLangs] = useState<string[]>([]);
  const [rateMax, setRateMax] = useState<number>(2000);
  const [avails, setAvails] = useState<string[]>([]);

  // Seeker filters
  const [seekerSkills, setSeekerSkills] = useState<string[]>([]);
  const [seekerTimings, setSeekerTimings] = useState<string[]>([]);
  const [seekerArea, setSeekerArea] = useState<string>("");

  const [openFilters, setOpenFilters] = useState(false);

  const filteredWorkers = useMemo(
    () =>
      workers.filter(
        (w) =>
          (skills.length === 0 || skills.every((s) => w.skills.includes(s))) &&
          (langs.length === 0 || langs.some((l) => w.languages.includes(l))) &&
          (rateMax >= 2000 || w.rateMin <= rateMax) &&
          (avails.length === 0 || avails.some((a) => w.availabilityType.includes(a))),
      ),
    [workers, skills, langs, rateMax, avails],
  );

  const filteredSeekers = useMemo(
    () =>
      seekers.filter((s) => {
        const works = s.persons.flatMap((p) => p.worksRequired);
        const matchesSkills =
          seekerSkills.length === 0 ||
          seekerSkills.some(
            (sk) =>
              works.includes(sk) ||
              works.includes(sk.replace("skill.", "work.")) ||
              works.some((w) => w.includes(sk.replace("skill.", ""))),
          );
        const matchesTiming =
          seekerTimings.length === 0 || seekerTimings.some((tm) => s.timing.includes(tm));
        const matchesArea =
          !seekerArea.trim() ||
          s.area.toLowerCase().includes(seekerArea.toLowerCase()) ||
          s.city.toLowerCase().includes(seekerArea.toLowerCase());
        return matchesSkills && matchesTiming && matchesArea;
      }),
    [seekers, seekerSkills, seekerTimings, seekerArea],
  );

  const clear = () => {
    if (activeTab === "workers") {
      setSkills([]);
      setLangs([]);
      setRateMax(2000);
      setAvails([]);
    } else {
      setSeekerSkills([]);
      setSeekerTimings([]);
      setSeekerArea("");
    }
  };

  const WorkerFilters = (
    <div className="space-y-5">
      <div>
        <FieldLabel>{t("search.skill")}</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {SKILLS.map((s) => (
            <Chip
              key={s}
              active={skills.includes(s)}
              onClick={() =>
                setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
              }
            >
              {t(s)}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>{t("search.lang")}</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {LANGS.map((l) => (
            <Chip
              key={l}
              active={langs.includes(l)}
              onClick={() =>
                setLangs((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]))
              }
            >
              {l}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>{t("search.availability")}</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {AVAIL.map((a) => (
            <Chip
              key={a}
              active={avails.includes(a)}
              onClick={() =>
                setAvails((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]))
              }
            >
              {t(a)}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>
          {t("search.rateMax")}: ₹{rateMax}
        </FieldLabel>
        <TextInput
          type="range"
          min={300}
          max={2000}
          step={50}
          value={rateMax}
          onChange={(e) => setRateMax(Number(e.target.value))}
        />
      </div>
      <button onClick={clear} className="text-sm font-semibold text-primary hover:underline">
        {t("search.clear")}
      </button>
    </div>
  );

  const SeekerFilters = (
    <div className="space-y-5">
      <div>
        <FieldLabel>Filter by Area / City</FieldLabel>
        <TextInput
          placeholder="e.g. Bodakdev, Maninagar..."
          value={seekerArea}
          onChange={(e) => setSeekerArea(e.target.value)}
        />
      </div>
      <div>
        <FieldLabel>Help Needed</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {SKILLS.map((s) => (
            <Chip
              key={s}
              active={seekerSkills.includes(s)}
              onClick={() =>
                setSeekerSkills((prev) =>
                  prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
                )
              }
            >
              {t(s)}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Preferred Timing</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {TIMINGS.map((tm) => (
            <Chip
              key={tm}
              active={seekerTimings.includes(tm)}
              onClick={() =>
                setSeekerTimings((prev) =>
                  prev.includes(tm) ? prev.filter((x) => x !== tm) : [...prev, tm],
                )
              }
            >
              {t(tm)}
            </Chip>
          ))}
        </div>
      </div>
      <button onClick={clear} className="text-sm font-semibold text-primary hover:underline">
        {t("search.clear")}
      </button>
    </div>
  );

  if (!me) {
    return (
      <div className="min-h-screen bg-background" suppressHydrationWarning>
        <SiteHeader />
        <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
          <div className="rounded-3xl border border-primary/20 bg-card p-8 text-center shadow-soft">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
              Log in to Browse Caregivers & Care Requests
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              For the privacy and safety of families and caregivers, browsing profiles and care requests is exclusively available to logged-in members.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/login"
                search={{ redirect: "/search" }}
                className="inline-link rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
              >
                Log in to Continue
              </Link>
              <Link
                to="/onboarding"
                className="inline-link rounded-xl border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                Create an Account
              </Link>
            </div>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" suppressHydrationWarning>
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <button
                onClick={() => router.history.back()}
                className="mb-4 w-fit inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-[transform,background-color] active:scale-95"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {activeTab === "workers" ? "Available Caregivers" : "Families Needing Care"}
              </h1>
              <p className="mt-1 text-muted-foreground" suppressHydrationWarning>
                {activeTab === "workers"
                  ? `${filteredWorkers.length} caregivers found`
                  : `${filteredSeekers.length} care requests found`}
              </p>
            </div>
            <button
              onClick={() => setOpenFilters((o) => !o)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-soft lg:hidden"
            >
              <Filter className="h-4 w-4" /> {t("search.filters")}
            </button>
          </div>

          {/* Mode Selector Tabs: only show toggle if user does not have a strict single role */}
          {!me?.role && (
            <div className="flex w-full max-w-md rounded-2xl border border-border bg-card/80 p-1.5 shadow-soft">
              <button
                type="button"
                onClick={() => handleTabChange("workers")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors ${
                  activeTab === "workers"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <HeartHandshake className="h-4 w-4" />
                Find Caregivers
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("seekers")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors ${
                  activeTab === "seekers"
                    ? "bg-secondary text-secondary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="h-4 w-4" />
                Care Requests
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside
            className={`${openFilters ? "block" : "hidden"} rounded-2xl border border-border bg-card p-5 shadow-soft lg:sticky lg:top-20 lg:block lg:h-fit`}
          >
            <h3 className="mb-4 text-base font-bold text-foreground">{t("search.filters")}</h3>
            {activeTab === "workers" ? WorkerFilters : SeekerFilters}
          </aside>

          <div>
            {activeTab === "workers" ? (
              filteredWorkers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-muted-foreground">
                  {t("dash.noMatches")}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredWorkers.map((w) => (
                    <WorkerCard key={w.id} w={w} />
                  ))}
                </div>
              )
            ) : filteredSeekers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-muted-foreground">
                No care requests found matching your filter criteria.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredSeekers.map((s) => (
                  <SeekerCard key={s.id} s={s} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
