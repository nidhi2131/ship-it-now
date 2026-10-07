import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n/i18n";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { getSeeker, useStore } from "@/lib/store";
import { MapPin, Phone } from "lucide-react";

export const Route = createFileRoute("/profile/seeker/$id")({
  head: () => ({ meta: [{ title: "Care request — CareConnect" }] }),
  component: SeekerProfilePage,
  notFoundComponent: () => (
    <div className="p-8 text-center text-muted-foreground" suppressHydrationWarning>
      Profile not found.
    </div>
  ),
});

function SeekerProfilePage() {
  const { id } = useParams({ from: "/profile/seeker/$id" });
  const { t } = useI18n();
  const seeker = useStore(() => getSeeker(id));
  if (!seeker) return <div className="p-8 text-center text-muted-foreground">Not found</div>;

  return (
    <div className="min-h-screen bg-background" suppressHydrationWarning>
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">
            {t("card.requestCare")}
          </span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {seeker.fullName}
          </h1>
          <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" /> {seeker.area}, {seeker.city}
          </p>

          <div className="mt-6 space-y-5">
            {seeker.persons.map((p, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-background p-4">
                <h3 className="font-bold text-foreground">
                  {p.name || `Person ${idx + 1}`} · {t(`common.${p.gender}`)} · {p.ageRange}
                </h3>
                {p.disabilities.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("seeker.disabilities")}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {p.disabilities.map((d) => (
                        <span
                          key={d}
                          className="rounded-full bg-secondary-soft px-2.5 py-1 text-xs font-medium text-secondary"
                        >
                          {t(d)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {p.worksRequired.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("seeker.work")}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {p.worksRequired.map((w) => (
                        <span
                          key={w}
                          className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary"
                        >
                          {t(w)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="grid gap-4 sm:grid-cols-2">
              <Info label={t("seeker.timing")} value={seeker.timing.map(t).join(", ") || "—"} />
              <Info
                label={t("seeker.days")}
                value={seeker.days.map((d) => t(`days.${d}`)).join(", ") || "—"}
              />
            </div>

            {seeker.notes && (
              <div className="rounded-xl bg-accent/60 p-4 text-sm text-foreground/90">
                {seeker.notes}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <span className="inline-flex items-center gap-2 text-sm text-foreground">
                <Phone className="h-4 w-4" /> +91 {seeker.phone}
              </span>
              <Link
                to="/messages/$id"
                params={{ id: seeker.id }}
                className="inline-link ml-auto rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:brightness-110"
              >
                {t("card.contact")}
              </Link>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm text-foreground">{value}</div>
    </div>
  );
}
