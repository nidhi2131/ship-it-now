import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/i18n";
import { SiteHeader } from "@/components/site-chrome";
import { StepIndicator, FormCard, FieldLabel, TextInput, TextArea, Chip, PrimaryButton } from "@/components/form-bits";
import { getMe, setMe, upsertSeeker, uid, type CarePerson, type SeekerProfile } from "@/lib/store";
import { ArrowLeft } from "lucide-react";

const DISABILITIES = ["dis.walk", "dis.wheelchair", "dis.hearing", "dis.vision", "dis.memory", "dis.bedridden", "dis.postsurgery", "dis.diabetes", "dis.heart"];
const WORKS = ["work.cooking", "work.cleaning", "work.bathing", "work.meds", "work.physio", "work.errands", "work.companion", "work.night", "work.doctor"];
const TIMINGS = ["common.morning", "common.afternoon", "common.evening", "common.fullDay", "common.liveIn"];
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const AGE_RANGES: CarePerson["ageRange"][] = ["60-70", "71-80", "81-90", "90+"];

export const Route = createFileRoute("/onboarding/seeker")({
  head: () => ({ meta: [{ title: "Seeker profile — CareConnect" }] }),
  component: SeekerForm,
});

function SeekerForm() {
  const { t } = useI18n();
  const nav = useNavigate();
  const me = typeof window !== "undefined" ? getMe() : null;

  const [careFor, setCareFor] = useState<SeekerProfile["careFor"]>("parent");
  const [numPeople, setNumPeople] = useState(1);
  const [persons, setPersons] = useState<CarePerson[]>([
    { name: "", gender: "female", ageRange: "71-80", disabilities: [], worksRequired: [] },
  ]);
  const [timing, setTiming] = useState<string[]>(["common.fullDay"]);
  const [days, setDays] = useState<string[]>(["mon", "tue", "wed", "thu", "fri"]);
  const [notes, setNotes] = useState("");

  const setN = (n: number) => {
    const clamped = Math.max(1, Math.min(5, n));
    setNumPeople(clamped);
    setPersons((p) => {
      const next = [...p];
      while (next.length < clamped) next.push({ name: "", gender: "female", ageRange: "71-80", disabilities: [], worksRequired: [] });
      return next.slice(0, clamped);
    });
  };

  const togglePersonField = (idx: number, field: "disabilities" | "worksRequired", v: string) => {
    setPersons((arr) => arr.map((p, i) =>
      i === idx
        ? { ...p, [field]: p[field].includes(v) ? p[field].filter((x) => x !== v) : [...p[field], v] }
        : p,
    ));
  };

  const toggle = (arr: string[], set: (a: string[]) => void, v: string) => {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!me) return nav({ to: "/onboarding" });
    const profile: SeekerProfile = {
      id: me.profileId ?? uid(),
      fullName: me.fullName,
      phone: me.phone,
      city: me.city,
      area: me.area,
      careFor,
      persons,
      timing,
      days,
      notes,
      createdAt: Date.now(),
    };
    upsertSeeker(profile);
    setMe({ ...me, profileId: profile.id, role: "seeker" });
    nav({ to: "/seeker/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <FormCard>
        <StepIndicator step={3} />
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t("seeker.title")}</h1>

        <form onSubmit={submit} className="mt-8 space-y-8">
          {/* Who needs care */}
          <section className="space-y-4">
            <div>
              <FieldLabel>{t("seeker.careFor")}</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {(["self", "parent", "spouse", "relative", "other"] as const).map((v) => (
                  <Chip key={v} active={careFor === v} onClick={() => setCareFor(v)}>{t(`common.${v}`)}</Chip>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>{t("seeker.numPeople")}</FieldLabel>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setN(numPeople - 1)} className="grid h-11 w-11 place-items-center rounded-lg border border-border bg-card text-xl font-bold text-foreground hover:bg-accent">−</button>
                <span className="w-12 text-center text-xl font-bold text-foreground">{numPeople}</span>
                <button type="button" onClick={() => setN(numPeople + 1)} className="grid h-11 w-11 place-items-center rounded-lg border border-border bg-card text-xl font-bold text-foreground hover:bg-accent">+</button>
              </div>
            </div>
          </section>

          {/* Per person */}
          {persons.map((p, idx) => (
            <section key={idx} className="space-y-4 rounded-xl border border-border bg-muted/40 p-5">
              <h3 className="text-base font-bold text-foreground">{t("seeker.personDetails")} {persons.length > 1 ? `#${idx + 1}` : ""}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>{t("seeker.name")}</FieldLabel>
                  <TextInput
                    value={p.name ?? ""}
                    onChange={(e) => setPersons((arr) => arr.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                  />
                </div>
                <div>
                  <FieldLabel>{t("seeker.gender")}</FieldLabel>
                  <div className="flex gap-2">
                    {(["male", "female", "other"] as const).map((g) => (
                      <Chip key={g} active={p.gender === g} onClick={() => setPersons((arr) => arr.map((x, i) => i === idx ? { ...x, gender: g } : x))}>
                        {t(`common.${g}`)}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <FieldLabel>{t("seeker.ageRange")}</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {AGE_RANGES.map((a) => (
                    <Chip key={a} active={p.ageRange === a} onClick={() => setPersons((arr) => arr.map((x, i) => i === idx ? { ...x, ageRange: a } : x))}>
                      {a}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel>{t("seeker.disabilities")}</FieldLabel>
                <p className="mb-2 text-xs text-muted-foreground">{t("seeker.disabilities.sub")}</p>
                <div className="flex flex-wrap gap-2">
                  {DISABILITIES.map((d) => (
                    <Chip key={d} active={p.disabilities.includes(d)} onClick={() => togglePersonField(idx, "disabilities", d)}>{t(d)}</Chip>
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel>{t("seeker.work")}</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {WORKS.map((w) => (
                    <Chip key={w} active={p.worksRequired.includes(w)} onClick={() => togglePersonField(idx, "worksRequired", w)}>{t(w)}</Chip>
                  ))}
                </div>
              </div>
            </section>
          ))}

          {/* Schedule */}
          <section className="space-y-4">
            <h3 className="text-base font-bold text-foreground">{t("seeker.schedule")}</h3>
            <div>
              <FieldLabel>{t("seeker.timing")}</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {TIMINGS.map((tm) => (
                  <Chip key={tm} active={timing.includes(tm)} onClick={() => toggle(timing, setTiming, tm)}>{t(tm)}</Chip>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>{t("seeker.days")}</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d) => (
                  <Chip key={d} active={days.includes(d)} onClick={() => toggle(days, setDays, d)}>{t(`days.${d}`)}</Chip>
                ))}
              </div>
            </div>
          </section>

          {/* Notes */}
          <section>
            <FieldLabel>{t("seeker.notes")}</FieldLabel>
            <TextArea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("seeker.notes.ph")} />
          </section>

          <div className="flex items-center justify-between pt-2">
            <Link to="/onboarding/role" className="inline-link inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> {t("onb.back")}
            </Link>
            <PrimaryButton type="submit">{t("seeker.finish")}</PrimaryButton>
          </div>
        </form>
      </FormCard>
    </div>
  );
}
