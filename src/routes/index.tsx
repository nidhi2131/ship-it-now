import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n/i18n";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Heart, Search, MessageCircle, ShieldCheck, MapPin, Languages, Award, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CareConnect — Trusted elder care, close to home" },
      { name: "description", content: "Find someone you can trust to be there every day. Browse experienced, local caregivers in your language." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="gradient-hero">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:py-24 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
              <Heart className="h-3.5 w-3.5" fill="currentColor" /> {t("app.name")}
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {t("app.tagline")}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">{t("app.subtitle")}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/onboarding"
                className="inline-link inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-warm transition-all hover:brightness-110"
              >
                {t("cta.getStarted")} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/search"
                className="inline-link inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3.5 text-base font-semibold text-foreground shadow-soft hover:bg-accent"
              >
                {t("cta.browse")}
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { i: Award, k: "trust.experienced" },
                { i: ShieldCheck, k: "trust.verified" },
                { i: MapPin, k: "trust.local" },
                { i: Languages, k: "trust.languages" },
              ].map(({ i: Icon, k }) => (
                <div key={k} className="flex items-start gap-2">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-card text-primary shadow-soft">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-foreground">{t(k)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hero card art */}
          <div className="relative">
            <div className="absolute -left-6 -top-6 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
            <div className="absolute -bottom-10 -right-4 h-64 w-64 rounded-full bg-secondary/15 blur-3xl" />
            <div className="relative grid gap-4">
              <FeatureCard
                accent="primary"
                name="Sunita Patel"
                area="Bodakdev, Ahmedabad"
                tag="Live-in · 14 yrs"
                quote="I have cared for elderly parents for 14 years. I treat every family like my own."
                rating={4.9}
              />
              <FeatureCard
                accent="secondary"
                name="Fatima Sheikh"
                area="Paldi, Ahmedabad"
                tag="Dementia care · 20 yrs"
                quote="I bring warmth and routine to the home."
                rating={5.0}
                offset
              />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t("how.title")}</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { i: Search, k: "how.s1" },
            { i: Heart, k: "how.s2" },
            { i: MessageCircle, k: "how.s3" },
          ].map(({ i: Icon, k }, idx) => (
            <div key={k} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-muted-foreground">0{idx + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-bold text-foreground">{t(`${k}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`${k}.body`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="overflow-hidden rounded-3xl bg-foreground p-8 text-background sm:p-12">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-2xl font-bold sm:text-3xl">{t("cta.getStarted")}</h3>
              <p className="mt-2 max-w-xl text-background/70">{t("app.subtitle")}</p>
            </div>
            <Link
              to="/onboarding"
              className="inline-link inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-warm hover:brightness-110"
            >
              {t("cta.getStarted")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function FeatureCard({
  name, area, tag, quote, rating, accent, offset,
}: {
  name: string; area: string; tag: string; quote: string; rating: number;
  accent: "primary" | "secondary"; offset?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 shadow-warm ${offset ? "sm:ml-12" : ""}`}>
      <div className="flex items-center gap-3">
        <div className={`grid h-12 w-12 place-items-center rounded-xl font-bold text-primary-foreground ${
          accent === "primary" ? "bg-primary" : "bg-secondary"
        }`}>
          {name.split(" ").map((p) => p[0]).join("")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <h4 className="truncate font-bold text-foreground">{name}</h4>
            <span className="text-sm font-semibold text-primary">★ {rating.toFixed(1)}</span>
          </div>
          <p className="text-xs text-muted-foreground">{area} · {tag}</p>
        </div>
      </div>
      <p className="mt-3 text-sm italic text-foreground/80">"{quote}"</p>
    </div>
  );
}
