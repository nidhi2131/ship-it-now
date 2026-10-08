import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/i18n";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { getWorker, fetchWorkerById, getMe, addRequest, addReview, useStore, getRequests } from "@/lib/store";
import { Star, MapPin, IndianRupee, Phone, Share2, Check, Lock, Loader2 } from "lucide-react";
import { PrimaryButton, GhostButton, TextArea } from "@/components/form-bits";

export const Route = createFileRoute("/profile/worker/$id")({
  head: () => ({ meta: [{ title: "Caregiver profile — CareConnect" }] }),
  component: WorkerProfilePage,
  notFoundComponent: () => (
    <div className="p-8 text-center text-muted-foreground" suppressHydrationWarning>
      Caregiver not found.
    </div>
  ),
});

function WorkerProfilePage() {
  const { id } = useParams({ from: "/profile/worker/$id" });
  const { t } = useI18n();
  const nav = useNavigate();
  const worker = useStore(() => getWorker(id));
  const me = useStore(() => getMe());
  const requests = useStore(() => getRequests());
  const [copied, setCopied] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [loading, setLoading] = useState(!worker);

  useEffect(() => {
    if (!worker && id) {
      setLoading(true);
      void fetchWorkerById(id).finally(() => setLoading(false));
    } else if (worker) {
      setLoading(false);
    }
  }, [id, worker]);

  if (!worker) {
    return (
      <div className="min-h-screen bg-background" suppressHydrationWarning>
        <SiteHeader />
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-muted-foreground">Loading caregiver profile...</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
              <h2 className="text-xl font-bold text-foreground">Caregiver not found</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This caregiver profile might have been updated or does not exist.
              </p>
              <Link
                to="/search"
                search={{ tab: "caregivers" }}
                className="inline-link mt-4 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:brightness-110"
              >
                Browse caregivers
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }
  const requestRecord = me
    ? requests.find(
        (r) =>
          (r.workerId === worker.id || r.workerId === worker.phone) &&
          (r.seekerId === me.id || r.seekerId === me.profileId),
      )
    : null;
  const hasRequested = Boolean(requestRecord);
  const hasAcceptedRequest = me
    ? requestRecord?.status === "responded" ||
      requestRecord?.status === "hired" ||
      requestRecord?.status === "completed"
    : false;
  const requestSent = hasRequested || isRequesting;
  const contactEnabled = me ? true : false;
  const initials = worker.fullName
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const request = () => {
    if (!me) {
      nav({ to: "/onboarding" });
      return;
    }
    if (requestSent) return;
    setIsRequesting(true);
    void addRequest({ workerId: worker.id, seekerId: me.id, initiatorId: me.id });
  };

  const submitReview = () => {
    if (!me) return;
    addReview(worker.id, rating, comment.trim(), me.fullName);
    setReviewed(true);
    setComment("");
  };

  return (
    <div className="min-h-screen bg-background" suppressHydrationWarning>
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-2xl font-bold text-primary-foreground shadow-warm">
              {initials}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {worker.fullName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {worker.area}, {worker.city}
                </span>
                {worker.rating > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-primary">
                    <Star className="h-4 w-4 fill-current" /> {worker.rating.toFixed(1)} (
                    {worker.reviews.length})
                  </span>
                )}
                <span className="inline-flex items-center gap-0.5 font-semibold text-foreground">
                  <IndianRupee className="h-3.5 w-3.5" />
                  {worker.rateMin}–{worker.rateMax} / {t("card.perDay")}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {!me ? (
                <Link
                  to="/login"
                  search={{ redirect: `/profile/worker/${worker.id}` }}
                  className="inline-link inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:brightness-110"
                >
                  Log in to Connect
                </Link>
              ) : (
                <>
                  {me.role === "seeker" && (
                    <PrimaryButton onClick={request} disabled={requestSent}>
                      {requestSent ? (
                        <>
                          <Check className="h-4 w-4" /> {t("card.requestSent")}
                        </>
                      ) : (
                        t("card.requestCare")
                      )}
                    </PrimaryButton>
                  )}
                  {worker.contactMethod === "common.call" ? (
                    <a
                      href={`tel:+91${worker.phone}`}
                      className="inline-link inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground hover:bg-accent"
                    >
                      {t("common.call")}
                    </a>
                  ) : (
                    <Link
                      to="/messages/$id"
                      params={{ id: worker.id }}
                      className="inline-link inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground hover:bg-accent"
                    >
                      {t("card.message")}
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          {!me ? (
            <div className="mt-8 rounded-2xl border border-primary/20 bg-primary-soft/30 p-6 sm:p-8 text-center shadow-soft">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Lock className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-foreground">
                Log in to view full caregiver profile & contact details
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                To protect caregiver privacy and ensure verified connections, full experience details, phone number, and direct messaging are only accessible to registered members.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/login"
                  search={{ redirect: `/profile/worker/${worker.id}` }}
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
            <>
              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                <Section title={t("profile.about")}>
                  <p className="text-foreground/80">{worker.bio || "—"}</p>
                </Section>
                <Section title={t("profile.skills")}>
                  <div className="flex flex-wrap gap-1.5">
                    {worker.skills.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary"
                      >
                        {t(s)}
                      </span>
                    ))}
                  </div>
                </Section>
                <Section title={t("profile.languages")}>
                  <p className="text-foreground/80">{worker.languages.join(", ")}</p>
                </Section>
                <Section title={t("profile.availability")}>
                  <p className="text-foreground/80">
                    {worker.availabilityType.map(t).join(", ")} · {worker.hoursMin}–{worker.hoursMax}{" "}
                    hrs
                  </p>
                </Section>
                <Section title={t("profile.areas")}>
                  <p className="text-foreground/80">{worker.serviceAreas.join(", ")}</p>
                </Section>
                <Section title={t("card.contact")}>
                  <p className="inline-flex items-center gap-2 text-foreground/80">
                    <Phone className="h-4 w-4" /> +91 {worker.phone} · {t(worker.contactMethod)}
                  </p>
                </Section>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <GhostButton onClick={share}>
                  <Share2 className="h-4 w-4" /> {copied ? t("profile.copied") : t("profile.shareLink")}
                </GhostButton>
              </div>
            </>
          )}
        </div>

        {/* Reviews - only for registered users */}
        {me && (
          <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
            <h2 className="text-xl font-bold text-foreground">{t("profile.reviews")}</h2>
            <div className="mt-4 space-y-3">
              {worker.reviews.length === 0 && (
                <p className="text-muted-foreground">{t("profile.noReviews")}</p>
              )}
              {worker.reviews.map((r) => (
                <div key={r.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{r.seekerName}</span>
                    <span className="inline-flex text-primary">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-current" />
                      ))}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-foreground/80">{r.comment}</p>
                </div>
              ))}
            </div>

            {me.role === "seeker" && !reviewed && (
              <div className="mt-6 border-t border-border pt-6">
                <h3 className="font-bold text-foreground">{t("review.title")}</h3>
                <div className="mt-3 flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      className="inline-link"
                    >
                      <Star
                        className={`h-7 w-7 ${n <= rating ? "fill-primary text-primary" : "text-border"}`}
                      />
                    </button>
                  ))}
                </div>
                <TextArea
                  rows={3}
                  maxLength={200}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t("review.placeholder")}
                  className="mt-3"
                />
                <PrimaryButton onClick={submitReview} className="mt-3">
                  {t("review.submit")}
                </PrimaryButton>
              </div>
            )}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}
