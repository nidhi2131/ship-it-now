import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/i18n";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import {
  getMe,
  getWorker,
  getSeekers,
  getRequests,
  useStore,
  updateRequestStatus,
} from "@/lib/store";
import { Star, MapPin, Bell, User, Check } from "lucide-react";

export const Route = createFileRoute("/worker/dashboard")({
  head: () => ({ meta: [{ title: "Your dashboard — CareConnect" }] }),
  component: WorkerDash,
});

const TABS = ["dash.matched.worker", "dash.notifications", "dash.profile", "dash.reviews"] as const;

function WorkerDash() {
  const { t } = useI18n();
  const me = useStore(() => getMe());
  const seekers = useStore(() => getSeekers());
  const requests = useStore(() => getRequests());
  const [tab, setTab] = useState<(typeof TABS)[number]>("dash.matched.worker");

  if (!me?.profileId) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-2xl p-8 text-center">
          <p className="text-muted-foreground">Please complete your caregiver profile first.</p>
          <Link
            to="/onboarding"
            className="inline-link mt-4 inline-block rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
          >
            Start
          </Link>
        </div>
      </div>
    );
  }

  const worker = getWorker(me.profileId);

  return (
    <div className="min-h-screen bg-background" suppressHydrationWarning>
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-primary">{t("dash.worker.title")}</span>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Hello, {me.fullName.split(" ")[0]}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {me.area}, {me.city}
            </span>
            {worker && worker.rating > 0 && (
              <span className="inline-flex items-center gap-1 font-semibold text-primary">
                <Star className="h-3.5 w-3.5 fill-current" /> {worker.rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
          {TABS.map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                tab === tb
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(tb)}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "dash.matched.worker" &&
            (seekers.length === 0 ? (
              <Empty
                icon={<User className="mx-auto h-10 w-10 text-primary/40" />}
                msg={t("dash.noMatches")}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {seekers.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-border bg-card p-5 shadow-soft"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-foreground">{s.fullName}</h3>
                      <span className="text-xs text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {s.area}, {s.city}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {s.persons[0]?.worksRequired.slice(0, 3).map((w) => (
                        <span
                          key={w}
                          className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium"
                        >
                          {t(w)}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Link
                        to="/profile/seeker/$id"
                        params={{ id: s.id }}
                        className="inline-link flex-1 rounded-lg border border-border bg-background px-3 py-2 text-center text-sm font-semibold text-foreground hover:bg-accent"
                      >
                        {t("card.viewProfile")}
                      </Link>
                      <Link
                        to="/messages/$id"
                        params={{ id: s.id }}
                        className="inline-link flex-1 rounded-lg bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground shadow-soft hover:brightness-110"
                      >
                        {t("card.contact")}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {tab === "dash.notifications" &&
            (() => {
              const workerKey = me?.profileId || me?.id;
              if (!workerKey)
                return (
                  <Empty
                    icon={<Bell className="mx-auto h-10 w-10 text-primary/40" />}
                    msg={t("dash.noNotif")}
                  />
                );

              const myReqs = requests.filter(
                (request) =>
                  request.workerId === workerKey ||
                  request.workerId === me.id ||
                  (me.profileId && request.workerId === me.profileId),
              );

              const incoming = myReqs.filter((r) => (r.initiatorId ? r.initiatorId !== me.id : true));
              const outgoing = myReqs.filter((r) => (r.initiatorId ? r.initiatorId === me.id : false));

              if (incoming.length === 0 && outgoing.length === 0) {
                return (
                  <Empty
                    icon={<Bell className="mx-auto h-10 w-10 text-primary/40" />}
                    msg={t("dash.noNotif")}
                  />
                );
              }

              return (
                <div className="space-y-6">
                  {incoming.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold uppercase tracking-wide text-primary">
                        Incoming Care Requests ({incoming.length})
                      </h3>
                      {incoming.map((request) => {
                        const seeker = getSeekers().find(
                          (item) => item.id === request.seekerId || item.phone === request.seekerId,
                        );
                        const isAccepted =
                          request.status === "responded" ||
                          request.status === "hired" ||
                          request.status === "completed";

                        return (
                          <div
                            key={request.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft"
                          >
                            <div>
                              <h4 className="font-semibold text-foreground">
                                {seeker?.fullName || "Family Care Request"}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {seeker ? `${seeker.area}, ${seeker.city}` : "Care recipient"}
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                                  {new Date(request.createdAt).toLocaleDateString()}
                                </span>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  isAccepted
                                    ? "bg-primary-soft text-primary"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                                }`}>
                                  {isAccepted ? "Accepted" : "Needs Response"}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {!isAccepted ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    void updateRequestStatus(
                                      request.workerId,
                                      request.seekerId,
                                      "responded",
                                    );
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-110 active:scale-95 transition-all"
                                >
                                  <Check className="h-4 w-4" /> Accept Request
                                </button>
                              ) : (
                                <span className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary">
                                  Accepted
                                </span>
                              )}
                              <Link
                                to="/messages/$id"
                                params={{ id: request.seekerId }}
                                className="inline-link rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent"
                              >
                                Message
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {outgoing.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                        Offers Sent by You ({outgoing.length})
                      </h3>
                      {outgoing.map((request) => {
                        const seeker = getSeekers().find(
                          (item) => item.id === request.seekerId,
                        );
                        const isAccepted =
                          request.status === "responded" ||
                          request.status === "hired" ||
                          request.status === "completed";

                        return (
                          <div
                            key={request.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft"
                          >
                            <div>
                              <h4 className="font-semibold text-foreground">
                                {seeker?.fullName || "Family Care Request"}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {seeker ? `${seeker.area}, ${seeker.city}` : "Care recipient"}
                              </p>
                              <span className="mt-1 inline-block text-xs uppercase tracking-wide text-muted-foreground">
                                Status: {isAccepted ? "Accepted by family" : "Pending family response"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                isAccepted ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"
                              }`}>
                                {isAccepted ? "Accepted" : "Waiting"}
                              </span>
                              <Link
                                to="/messages/$id"
                                params={{ id: request.seekerId }}
                                className="inline-link rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent"
                              >
                                Message
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

          {tab === "dash.profile" &&
            (worker ? (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <h3 className="text-lg font-bold text-foreground">{worker.fullName}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{worker.bio || "—"}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Info label={t("profile.skills")} value={worker.skills.map(t).join(", ")} />
                  <Info
                    label={t("profile.rates")}
                    value={`₹${worker.rateMin}–${worker.rateMax} / ${t("card.perDay")}`}
                  />
                  <Info label={t("profile.areas")} value={worker.serviceAreas.join(", ")} />
                  <Info label={t("profile.languages")} value={worker.languages.join(", ")} />
                </div>
                <div className="mt-5 flex gap-2">
                  <Link
                    to="/onboarding/worker"
                    className="inline-link rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent"
                  >
                    {t("dash.editProfile")}
                  </Link>
                  <Link
                    to="/profile/worker/$id"
                    params={{ id: worker.id }}
                    className="inline-link rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:brightness-110"
                  >
                    {t("profile.shareLink")}
                  </Link>
                </div>
              </div>
            ) : (
              <Empty
                icon={<User className="mx-auto h-10 w-10 text-primary/40" />}
                msg="Profile data could not be loaded. Please refresh the page."
              />
            ))}

          {tab === "dash.reviews" &&
            worker &&
            (worker.reviews.length === 0 ? (
              <Empty
                icon={<Star className="mx-auto h-10 w-10 text-primary/40" />}
                msg={t("profile.noReviews")}
              />
            ) : (
              <div className="space-y-3">
                {worker.reviews.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-border bg-card p-4 shadow-soft"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{r.seekerName}</span>
                      <span className="inline-flex items-center gap-0.5 text-primary">
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-current" />
                        ))}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-foreground/80">{r.comment}</p>
                  </div>
                ))}
              </div>
            ))}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function Empty({ icon, msg }: { icon: React.ReactNode; msg: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
      {icon}
      <p className="mt-4 text-muted-foreground">{msg}</p>
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
