import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/i18n";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { WorkerCard } from "@/components/worker-card";
import { getWorkers, useStore } from "@/lib/store";
import { FieldLabel, Chip, TextInput } from "@/components/form-bits";
import { Filter, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "Browse caregivers — CareConnect" }] }),
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

function SearchPage() {
  const router = useRouter();
  const { t } = useI18n();
  const workers = useStore(() => getWorkers());
  const [skills, setSkills] = useState<string[]>([]);
  const [langs, setLangs] = useState<string[]>([]);
  const [rateMax, setRateMax] = useState<number>(2000);
  const [avails, setAvails] = useState<string[]>([]);
  const [openFilters, setOpenFilters] = useState(false);

  const filtered = useMemo(
    () =>
      workers.filter(
        (w) =>
          (skills.length === 0 || skills.every((s) => w.skills.includes(s))) &&
          (langs.length === 0 || langs.some((l) => w.languages.includes(l))) &&
          w.rateMin <= rateMax &&
          (avails.length === 0 || avails.some((a) => w.availabilityType.includes(a))),
      ),
    [workers, skills, langs, rateMax, avails],
  );

  const clear = () => {
    setSkills([]);
    setLangs([]);
    setRateMax(2000);
    setAvails([]);
  };

  const FiltersPanel = (
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

  return (
    <div className="min-h-screen bg-background" suppressHydrationWarning>
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <button
              onClick={() => router.history.back()}
              className="mb-6 w-fit inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {t("search.title")}
            </h1>
            <p className="mt-1 text-muted-foreground" suppressHydrationWarning>
              {t("search.results").replace("{n}", String(filtered.length))}
            </p>
          </div>
          <button
            onClick={() => setOpenFilters((o) => !o)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-soft lg:hidden"
          >
            <Filter className="h-4 w-4" /> {t("search.filters")}
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside
            className={`${openFilters ? "block" : "hidden"} rounded-2xl border border-border bg-card p-5 shadow-soft lg:sticky lg:top-20 lg:block lg:h-fit`}
          >
            <h3 className="mb-4 text-base font-bold text-foreground">{t("search.filters")}</h3>
            {FiltersPanel}
          </aside>

          <div>
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-muted-foreground">
                {t("dash.noMatches")}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filtered.map((w) => (
                  <WorkerCard key={w.id} w={w} />
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
