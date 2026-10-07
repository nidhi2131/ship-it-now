import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/i18n";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { WorkerCard } from "@/components/worker-card";
import { getMe, getWorkers, getRequests, getWorker, useStore, updateRequestStatus } from "@/lib/store";
import { Heart, Check, Bell } from "lucide-react";

export const Route = createFileRoute("/seeker/dashboard")({
  head: () => ({ meta: [{ title: "Your dashboard — CareConnect" }] }),
  component: SeekerDash,
});

const TABS = ["dash.matched", "dash.requests", "dash.profile"] as const;

function SeekerDash() {
  const { t } = useI18n();
  const me = useStore(() => getMe());
  const workers = useStore(() => getWorkers());
  const requests = useStore(() => getRequests());
  const [tab, setTab] = useState<(typeof TABS)[number]>("dash.matched");

  if (!me) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-2xl p-8 text-center">
          <p className="text-muted-foreground">Please complete onboarding first.</p>
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

  const myRequests = requests.filter(
    (r) => r.seekerId === me.id || (me.profileId && r.seekerId === me.profileId),
  );
  const incomingOffers = myRequests.filter((r) => r.initiatorId !== me.id);
  const outgoingRequests = myRequests.filter((r) => r.initiatorId === me.id);

  return (
    <div className="min-h-screen bg-background" suppressHydrationWarning>
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-primary">{t("dash.seeker.title")}</span>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            <span className="text-foreground">Hello, </span>
            {me.fullName.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground">
            {me.area}, {me.city}
          </p>
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
          {tab === "dash.matched" &&
            (workers.length === 0 ? (
              <Empty msg={t("dash.noMatches")} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {workers.map((w) => (
                  <WorkerCard key={w.id} w={w} />
                ))}
              </div>
            ))}

          {tab === "dash.requests" &&
            (myRequests.length === 0 ? (
              <Empty msg={t("dash.noRequests")} />
            ) : (
              <div className="space-y-6">
                {incomingOffers.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-primary">
                      Care Offers from Caregivers ({incomingOffers.length})
                    </h3>
                    {incomingOffers.map((r) => {
                      const w = getWorker(r.workerId);
                      const isAccepted =
                        r.status === "responded" || r.status === "hired" || r.status === "completed";

                      return (
                        <div
                          key={r.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft"
                        >
                          <div>
                            <h4 className="font-semibold text-foreground">
                              {w?.fullName || "Caregiver"}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {w ? `${w.area}, ${w.city}` : "Caregiver"}
                            </p>
                            <span className="mt-1 inline-block text-xs uppercase tracking-wide text-muted-foreground">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {!isAccepted ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  await updateRequestStatus(
                                    r.workerId,
                                    r.seekerId,
                                    "responded",
                                  );
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-110"
                              >
                                <Check className="h-4 w-4" /> Accept Offer
                              </button>
                            ) : (
                              <span className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary">
                                Accepted
                              </span>
                            )}
                            <Link
                              to="/messages/$id"
                              params={{ id: r.workerId }}
                              className="inline-link rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent"
                            >
                              {t("card.message")}
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {outgoingRequests.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                      Care Requests Sent by You ({outgoingRequests.length})
                    </h3>
                    {outgoingRequests.map((r) => {
                      const w = getWorker(r.workerId);
                      const canContact =
                        r.status === "responded" || r.status === "hired" || r.status === "completed";

                      return (
                        <div
                          key={r.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft"
                        >
                          <div>
                            <h4 className="font-semibold text-foreground">
                              {w?.fullName || "Caregiver"}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <StatusBadge status={r.status} />
                            {canContact ? (
                              <Link
                                to="/messages/$id"
                                params={{ id: r.workerId }}
                                className="inline-link rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent"
                              >
                                {t("card.message")}
                              </Link>
                            ) : (
                              <span className="rounded-lg border border-dashed border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Waiting for Caregiver
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

          {tab === "dash.profile" && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h3 className="text-lg font-bold text-foreground">{me.fullName}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {me.phone} · {me.area}, {me.city}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/onboarding"
                  className="inline-link rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent"
                >
                  {t("dash.editProfile")}
                </Link>
                <Link
                  to="/profile/seeker/$id"
                  params={{ id: me.profileId ?? me.id }}
                  className="inline-link rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:brightness-110"
                >
                  {t("profile.shareLink")}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
      <Heart className="mx-auto h-10 w-10 text-primary/40" />
      <p className="mt-4 text-muted-foreground">{msg}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-accent text-accent-foreground",
    responded: "bg-secondary-soft text-secondary",
    hired: "bg-primary-soft text-primary",
    completed: "bg-success/15 text-success",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${map[status] ?? "bg-muted"}`}
    >
      {status}
    </span>
  );
}
