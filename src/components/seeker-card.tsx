import { Link } from "@tanstack/react-router";
import { MapPin, Clock, Calendar, Heart, MessageSquare } from "lucide-react";
import { useI18n } from "@/lib/i18n/i18n";
import { type SeekerProfile, getMe, useStore } from "@/lib/store";

export function SeekerCard({ s }: { s: SeekerProfile }) {
  const { t } = useI18n();
  const me = useStore(() => getMe());

  const initials = s.fullName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const primaryPerson = s.persons[0];
  const works = primaryPerson?.worksRequired || [];
  const conditions = primaryPerson?.disabilities || [];

  return (
    <article className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-warm">
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-secondary to-secondary/70 text-lg font-bold text-secondary-foreground shadow-sm">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-bold text-foreground">{s.fullName}</h3>
            <span className="rounded-full bg-secondary-soft px-2 py-0.5 text-xs font-semibold text-secondary shrink-0">
              {t(`common.${s.careFor}`) || "Care Request"}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{s.area}, {s.city}</span>
          </div>
        </div>
      </div>

      {primaryPerson && (
        <div className="rounded-xl bg-accent/40 px-3 py-2 text-xs font-medium text-foreground/90">
          <span className="font-semibold">{primaryPerson.name || "Recipient"}:</span>{" "}
          {t(`common.${primaryPerson.gender}`)} · {primaryPerson.ageRange} yrs
        </div>
      )}

      {/* Help required tags */}
      {works.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {works.slice(0, 3).map((w) => (
            <span
              key={w}
              className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary"
            >
              {t(w)}
            </span>
          ))}
          {works.length > 3 && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              +{works.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Conditions tags */}
      {conditions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {conditions.slice(0, 2).map((c) => (
            <span
              key={c}
              className="rounded-full bg-secondary-soft px-2.5 py-0.5 text-xs font-medium text-secondary"
            >
              {t(c)}
            </span>
          ))}
        </div>
      )}

      {/* Timing and days */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {s.timing && s.timing.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {s.timing.map((tm) => t(tm)).join(", ")}
          </span>
        )}
        {s.days && s.days.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            {s.days.map((d) => t(`days.${d}`)).join(", ")}
          </span>
        )}
      </div>

      {/* Action buttons with auth gate */}
      <div className="flex gap-2 pt-1 mt-auto">
        {me ? (
          <>
            <Link
              to="/profile/seeker/$id"
              params={{ id: s.id }}
              className="inline-link flex-1 rounded-lg border border-border bg-background px-3 sm:px-4 py-2.5 text-center text-xs sm:text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              View Details
            </Link>
            <Link
              to="/messages/$id"
              params={{ id: s.id }}
              className="inline-link flex-1 rounded-lg bg-primary px-3 sm:px-4 py-2.5 text-center text-xs sm:text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:brightness-110 flex items-center justify-center gap-1"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {me.role === "worker" ? "Offer Care" : t("card.message")}
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/login"
              search={{ redirect: `/profile/seeker/${s.id}` }}
              className="inline-link flex-1 rounded-lg border border-border bg-background px-3 sm:px-4 py-2.5 text-center text-xs sm:text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              View Details
            </Link>
            <Link
              to="/login"
              search={{ redirect: `/messages/${s.id}` }}
              className="inline-link flex-1 rounded-lg bg-primary px-3 sm:px-4 py-2.5 text-center text-xs sm:text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:brightness-110 flex items-center justify-center gap-1"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Offer Care
            </Link>
          </>
        )}
      </div>
    </article>
  );
}
