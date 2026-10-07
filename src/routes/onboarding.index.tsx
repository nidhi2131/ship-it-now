import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/i18n";
import { SiteHeader } from "@/components/site-chrome";
import {
  StepIndicator,
  FormCard,
  FieldLabel,
  TextInput,
  PrimaryButton,
  GhostButton,
} from "@/components/form-bits";
import { getMe, register, uid } from "@/lib/store";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/onboarding/")({
  head: () => ({ meta: [{ title: "Get started — CareConnect" }] }),
  component: OnboardingStep1,
});

function OnboardingStep1() {
  const { t } = useI18n();
  const nav = useNavigate();
  const existing = typeof window !== "undefined" ? getMe() : null;
  const [fullName, setFullName] = useState(existing?.fullName ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [city, setCity] = useState(existing?.city ?? "");
  const [area, setArea] = useState(existing?.area ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return setErr(t("onb.fullName"));
    if (!/^\d{10}$/.test(phone)) return setErr(t("onb.phone"));
    if (!city.trim() || !area.trim()) return setErr(t("onb.city"));
    if (!existing) {
      if (!email.trim() || !email.includes("@"))
        return setErr("Please enter a valid email address.");
      if (password.length < 6) return setErr("Password must be at least 6 characters.");
    }

    setLoading(true);
    setErr("");
    try {
      if (!existing) {
        await register(email.trim(), password, {
          fullName: fullName.trim(),
          phone,
          city: city.trim(),
          area: area.trim(),
        });
      }
      nav({ to: "/onboarding/role" });
    } catch (e: any) {
      setErr(e.message || "Failed to register account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <FormCard>
        <StepIndicator step={1} />
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t("onb.basic.title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("onb.basic.sub")}</p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <div>
            <FieldLabel required>{t("onb.fullName")}</FieldLabel>
            <TextInput
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t("onb.fullName.ph")}
            />
          </div>
          <div>
            <FieldLabel required>{t("onb.phone")}</FieldLabel>
            <div className="flex gap-2">
              <span className="grid place-items-center rounded-lg border border-input bg-muted px-3 text-sm font-semibold text-foreground">
                +91
              </span>
              <TextInput
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder={t("onb.phone.ph")}
                inputMode="numeric"
              />
            </div>
          </div>

          {!existing && (
            <>
              <div>
                <FieldLabel required>Email</FieldLabel>
                <TextInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <FieldLabel required>Password</FieldLabel>
                <TextInput
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <FieldLabel required>{t("onb.city")}</FieldLabel>
              <TextInput
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t("onb.city.ph")}
              />
            </div>
            <div>
              <FieldLabel required>{t("onb.area")}</FieldLabel>
              <TextInput
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder={t("onb.area.ph")}
              />
            </div>
          </div>

          {err && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {err}
            </p>
          )}

          <div className="flex items-center justify-between pt-2">
            <Link
              to="/"
              className="inline-link inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> {t("onb.back")}
            </Link>
            <PrimaryButton type="submit" disabled={loading}>
              {loading ? (
                "Registering..."
              ) : (
                <>
                  {t("onb.continue")} <ArrowRight className="h-4 w-4" />
                </>
              )}
            </PrimaryButton>
          </div>
        </form>
      </FormCard>
    </div>
  );
}

// silence unused
void GhostButton;
