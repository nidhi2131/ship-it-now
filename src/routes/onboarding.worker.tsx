import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type KeyboardEvent } from "react";
import { useI18n } from "@/lib/i18n/i18n";
import { SiteHeader } from "@/components/site-chrome";
import {
  StepIndicator,
  FormCard,
  FieldLabel,
  TextInput,
  TextArea,
  Chip,
  PrimaryButton,
} from "@/components/form-bits";
import { getMe, setMe, upsertWorker, type WorkerProfile } from "@/lib/store";
import { ArrowLeft, X } from "lucide-react";

const LANGS = ["English", "Hindi", "Gujarati", "Marathi", "Tamil", "Other"];
const EXP: WorkerProfile["experience"][] = ["fresher", "1-2", "3-5", "5+"];
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
  "skill.childcare",
];
const AVAIL = ["common.partTime", "common.fullTime", "common.liveIn", "common.nightOnly"];
const PAY = ["common.cash", "common.upi", "common.bank"];
const CONTACT = ["common.call", "common.whatsapp", "common.appMessage"];
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const Route = createFileRoute("/onboarding/worker")({
  head: () => ({ meta: [{ title: "Caregiver profile — CareConnect" }] }),
  component: WorkerForm,
});

function WorkerForm() {
  const { t } = useI18n();
  const nav = useNavigate();
  const me = typeof window !== "undefined" ? getMe() : null;

  const [gender, setGender] = useState<WorkerProfile["gender"]>("female");
  const [age, setAge] = useState(35);
  const [languages, setLanguages] = useState<string[]>(["Hindi"]);
  const [experience, setExperience] = useState<WorkerProfile["experience"]>("3-5");
  const [skills, setSkills] = useState<string[]>([]);
  const [availabilityType, setAvail] = useState<string[]>(["common.fullTime"]);
  const [hoursMin, setHoursMin] = useState(8);
  const [hoursMax, setHoursMax] = useState(12);
  const [rateMin, setRateMin] = useState(500);
  const [rateMax, setRateMax] = useState(900);
  const [payment, setPayment] = useState<string[]>(["common.upi", "common.cash"]);
  const [areas, setAreas] = useState<string[]>([]);
  const [areaInput, setAreaInput] = useState("");
  const [contactMethod, setContactMethod] = useState("common.whatsapp");
  const [days, setDays] = useState<string[]>(["mon", "tue", "wed", "thu", "fri"]);
  const [bio, setBio] = useState("");

  const toggle = (arr: string[], set: (a: string[]) => void, v: string) => {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };

  const addArea = (e?: KeyboardEvent<HTMLInputElement>) => {
    if (e && e.key !== "Enter") return;
    e?.preventDefault();
    const v = areaInput.trim();
    if (!v) return;
    if (!areas.includes(v)) setAreas([...areas, v]);
    setAreaInput("");
  };

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me) return nav({ to: "/onboarding" });
    setLoading(true);
    setErr("");
    try {
      const profile: WorkerProfile = {
        id: me.id,
        fullName: me.fullName,
        phone: me.phone,
        city: me.city,
        area: me.area,
        gender,
        age,
        languages,
        experience,
        skills,
        availabilityType,
        hoursMin,
        hoursMax,
        rateMin,
        rateMax,
        paymentMethods: payment,
        serviceAreas: areas.length ? areas : [me.area],
        contactMethod,
        bio,
        days,
        rating: 0,
        reviews: [],
        createdAt: Date.now(),
      };
      await upsertWorker(profile);
      nav({ to: "/worker/dashboard" });
    } catch (e: any) {
      setErr(e.message || "Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const bioCount = bio.length;
  const bioOk = bioCount >= 50 && bioCount <= 300;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <FormCard>
        <StepIndicator step={3} />
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t("worker.title")}
        </h1>

        <form onSubmit={submit} className="mt-8 space-y-8">
          {/* About */}
          <section className="space-y-4">
            <h3 className="text-base font-bold text-foreground">{t("worker.about")}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>{t("worker.gender")}</FieldLabel>
                <div className="flex gap-2">
                  {(["male", "female", "other"] as const).map((g) => (
                    <Chip key={g} active={gender === g} onClick={() => setGender(g)}>
                      {t(`common.${g}`)}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel>{t("worker.age")}</FieldLabel>
                <TextInput
                  type="number"
                  min={18}
                  max={80}
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <FieldLabel>{t("worker.languages")}</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {LANGS.map((l) => (
                  <Chip
                    key={l}
                    active={languages.includes(l)}
                    onClick={() => toggle(languages, setLanguages, l)}
                  >
                    {l}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>{t("worker.experience")}</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {EXP.map((e) => (
                  <Chip key={e} active={experience === e} onClick={() => setExperience(e)}>
                    {e === "fresher" ? t("common.fresher") : `${e} yrs`}
                  </Chip>
                ))}
              </div>
            </div>
          </section>

          {/* Skills */}
          <section>
            <FieldLabel>{t("worker.skills")}</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {SKILLS.map((s) => (
                <Chip
                  key={s}
                  active={skills.includes(s)}
                  onClick={() => toggle(skills, setSkills, s)}
                >
                  {t(s)}
                </Chip>
              ))}
            </div>
          </section>

          {/* Availability & rates */}
          <section className="space-y-4">
            <h3 className="text-base font-bold text-foreground">{t("worker.availability")}</h3>
            <div>
              <FieldLabel>{t("worker.availType")}</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {AVAIL.map((a) => (
                  <Chip
                    key={a}
                    active={availabilityType.includes(a)}
                    onClick={() => toggle(availabilityType, setAvail, a)}
                  >
                    {t(a)}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>{t("seeker.days")}</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d) => (
                  <Chip key={d} active={days.includes(d)} onClick={() => toggle(days, setDays, d)}>
                    {t(`days.${d}`)}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>{t("worker.hours")}</FieldLabel>
                <div className="flex items-center gap-2">
                  <TextInput
                    type="number"
                    min={1}
                    max={24}
                    value={hoursMin}
                    onChange={(e) => setHoursMin(Number(e.target.value))}
                  />
                  <span className="text-muted-foreground">–</span>
                  <TextInput
                    type="number"
                    min={1}
                    max={24}
                    value={hoursMax}
                    onChange={(e) => setHoursMax(Number(e.target.value))}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>{t("worker.rate")}</FieldLabel>
                <div className="flex items-center gap-2">
                  <TextInput
                    type="number"
                    min={0}
                    value={rateMin}
                    onChange={(e) => setRateMin(Number(e.target.value))}
                  />
                  <span className="text-muted-foreground">–</span>
                  <TextInput
                    type="number"
                    min={0}
                    value={rateMax}
                    onChange={(e) => setRateMax(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
            <div>
              <FieldLabel>{t("worker.payment")}</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {PAY.map((p) => (
                  <Chip
                    key={p}
                    active={payment.includes(p)}
                    onClick={() => toggle(payment, setPayment, p)}
                  >
                    {t(p)}
                  </Chip>
                ))}
              </div>
            </div>
          </section>

          {/* Location & contact */}
          <section className="space-y-4">
            <FieldLabel>{t("worker.areas")}</FieldLabel>
            <div className="space-y-2">
              <TextInput
                value={areaInput}
                onChange={(e) => setAreaInput(e.target.value)}
                onKeyDown={addArea}
                placeholder={t("worker.areas.ph")}
              />
              {areas.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {areas.map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-primary"
                    >
                      {a}
                      <button
                        type="button"
                        onClick={() => setAreas(areas.filter((x) => x !== a))}
                        className="inline-link"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <FieldLabel>{t("worker.contact")}</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {CONTACT.map((c) => (
                  <Chip key={c} active={contactMethod === c} onClick={() => setContactMethod(c)}>
                    {t(c)}
                  </Chip>
                ))}
              </div>
            </div>
          </section>

          {/* Bio */}
          <section>
            <FieldLabel>{t("worker.bio")}</FieldLabel>
            <TextArea
              rows={4}
              maxLength={300}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t("worker.bio.ph")}
            />
            <div
              className={`mt-1 text-right text-xs font-medium ${bioOk ? "text-success" : "text-muted-foreground"}`}
            >
              {bioCount} / 300
            </div>
          </section>

          {err && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {err}
            </p>
          )}

          <div className="flex items-center justify-between pt-2">
            <Link
              to="/onboarding/role"
              className="inline-link inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> {t("onb.back")}
            </Link>
            <PrimaryButton type="submit" disabled={skills.length === 0 || loading}>
              {loading ? "Saving..." : t("worker.finish")}
            </PrimaryButton>
          </div>
        </form>
      </FormCard>
    </div>
  );
}
