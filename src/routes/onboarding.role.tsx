import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n/i18n";
import { SiteHeader } from "@/components/site-chrome";
import { StepIndicator } from "@/components/form-bits";
import { getMe, setMe } from "@/lib/store";
import { ArrowLeft, Heart, Briefcase } from "lucide-react";

export const Route = createFileRoute("/onboarding/role")({
  head: () => ({ meta: [{ title: "Choose your role — CareConnect" }] }),
  component: RolePick,
});

function RolePick() {
  const { t } = useI18n();
  const nav = useNavigate();

  const pick = (role: "seeker" | "worker") => {
    const me = getMe();
    if (!me) return nav({ to: "/onboarding" });
    setMe({ ...me, role });
    nav({ to: role === "seeker" ? "/onboarding/seeker" : "/onboarding/worker" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <StepIndicator step={2} />
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t("role.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("role.sub")}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <RoleCard
            tone="primary"
            icon={<Heart className="h-7 w-7" fill="currentColor" />}
            title={t("role.seeker.title")}
            body={t("role.seeker.body")}
            onClick={() => pick("seeker")}
          />
          <RoleCard
            tone="secondary"
            icon={<Briefcase className="h-7 w-7" />}
            title={t("role.worker.title")}
            body={t("role.worker.body")}
            onClick={() => pick("worker")}
          />
        </div>

        <div className="mt-8">
          <Link to="/onboarding" className="inline-link inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {t("onb.back")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function RoleCard({
  tone, icon, title, body, onClick,
}: {
  tone: "primary" | "secondary"; icon: React.ReactNode; title: string; body: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border-2 border-border bg-card p-6 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-warm ${
        tone === "primary" ? "hover:border-primary" : "hover:border-secondary"
      }`}
    >
      <div className={`mb-4 inline-grid h-14 w-14 place-items-center rounded-2xl shadow-warm ${
        tone === "primary" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
      }`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </button>
  );
}
