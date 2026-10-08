import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/i18n";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { getSeeker, fetchSeekerById, getMe, useStore, addRequest, getRequests } from "@/lib/store";
import { MapPin, Phone, Lock, Check, Loader2 } from "lucide-react";
import { PrimaryButton } from "@/components/form-bits";

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
  const me = useStore(() => getMe());
  const requests = useStore(() => getRequests());
  const [isSendingOffer, setIsSendingOffer] = useState(false);
  const [loading, setLoading] = useState(!seeker);

  useEffect(() => {
    if (!seeker && id) {
      setLoading(true);
      void fetchSeekerById(id).finally(() => setLoading(false));
    } else if (seeker) {
      setLoading(false);
    }
  }, [id, seeker]);

  if (!seeker) {
    return (
      <div className="min-h-screen bg-background" suppressHydrationWarning>
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-muted-foreground">Loading care request...</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
              <h2 className="text-xl font-bold text-foreground">Care request not found</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This care request might have been fulfilled or does not exist.
              </p>
              <Link
                to="/search"
                search={{ tab: "requests" }}
                className="inline-link mt-4 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:brightness-110"
              >
                Browse care requests
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  const workerProfileId = me?.profileId || me?.id || "";
  const existingReq = me
    ? requests.find(
        (r) =>
          r.seekerId === seeker.id &&
          (r.workerId === workerProfileId || r.workerId === me.id),
      )
    : null;
  const offerSent = Boolean(existingReq) || isSendingOffer;

  const sendOffer = () => {
    if (!me) return;
    setIsSendingOffer(true);
    void addRequest({
      workerId: workerProfileId,
      seekerId: seeker.id,
      initiatorId: me.id,
    });
  };

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

          {!me ? (
            <div className="mt-8 rounded-2xl border border-primary/20 bg-primary-soft/30 p-6 sm:p-8 text-center shadow-soft">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Lock className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-foreground">
                Log in to view care requirements & contact details
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                To protect family privacy and ensure verified connections, care recipient details, phone number, and direct messaging are reserved for registered users.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/login"
                  search={{ redirect: `/profile/seeker/${seeker.id}` }}
                  className="inline-link rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:brightness-110"
                >
                  Log in to CareConnect
                </Link>
                <Link
                  to="/onboarding"
                  className="inline-link rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-accent"
                >
                  Create an account
                </Link>
              </div>
            </div>
          ) : (
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
                <div className="ml-auto flex items-center gap-2">
                  {me.role === "worker" && (
                    <PrimaryButton onClick={sendOffer} disabled={offerSent}>
                      {offerSent ? (
                        <>
                          <Check className="h-4 w-4" /> Offer Sent
                        </>
                      ) : (
                        "Send Care Offer"
                      )}
                    </PrimaryButton>
                  )}
                  <Link
                    to="/messages/$id"
                    params={{ id: seeker.id }}
                    className="inline-link rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
                  >
                    {t("card.message")}
                  </Link>
                </div>
              </div>
            </div>
          )}
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
