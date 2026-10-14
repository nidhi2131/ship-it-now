import { Link } from "@tanstack/react-router";
import { Star, MapPin, IndianRupee, Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n/i18n";
import { type WorkerProfile, getMe, useStore, hasAcceptedRequest } from "@/lib/store";

export function WorkerCard({ w }: { w: WorkerProfile }) {
  const { t } = useI18n();
  const initials = w.fullName
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const expLabel =
    w.experience === "fresher"
      ? t("common.fresher")
      : t("card.yearsExp").replace("{n}", w.experience);
  const me = useStore(() => getMe());
  const isConnected = useStore(() => (me ? hasAcceptedRequest(w.id, me.id) : false));

  return (
    <article className="group flex flex-col gap-3.5 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-soft transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/40">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="grid h-12 w-12 sm:h-14 sm:w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-base sm:text-lg font-bold text-primary-foreground shadow-sm">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base sm:text-lg font-bold text-foreground">{w.fullName}</h3>
          <div className="mt-0.5 flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{w.area}, {w.city}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-primary-soft px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold text-primary shrink-0">
          <Star className="h-3.5 w-3.5 fill-current" />
          {w.rating.toFixed(1)}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {w.skills.slice(0, 3).map((s) => (
          <span
            key={s}
            className="rounded-full bg-accent px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-medium text-accent-foreground"
          >
            {t(s)}
          </span>
        ))}
        {w.skills.length > 3 && (
          <span className="rounded-full bg-muted px-2 py-0.5 sm:py-1 text-[11px] sm:text-xs font-medium text-muted-foreground">
            +{w.skills.length - 3}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Languages className="h-3.5 w-3.5 shrink-0" /> {w.languages.slice(0, 2).join(", ")}
        </span>
        <span>{expLabel}</span>
        <span className="inline-flex items-center gap-0.5 font-semibold text-foreground">
          <IndianRupee className="h-3.5 w-3.5 shrink-0" />
          {w.rateMin}–{w.rateMax}
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            / {t("card.perDay")}
          </span>
        </span>
      </div>

      {/* Action buttons: Stack on mobile, side-by-side on tablet/desktop */}
      <div className="flex flex-col sm:flex-row gap-2 pt-1 mt-auto">
        <Link
          to="/profile/worker/$id"
          params={{ id: w.id }}
          className="inline-link w-full sm:flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-center text-xs sm:text-sm font-semibold text-foreground transition-colors hover:bg-accent"
        >
          {t("card.viewProfile")}
        </Link>
        {me ? (
          w.contactMethod === "common.call" ? (
            <a
              href={`tel:+91${w.phone}`}
              className="inline-link w-full sm:flex-1 rounded-xl bg-primary px-3 py-2.5 text-center text-xs sm:text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
            >
              {t("common.call")}
            </a>
          ) : (
            <Link
              to="/messages/$id"
              params={{ id: w.id }}
              className="inline-link w-full sm:flex-1 rounded-xl bg-primary px-3 py-2.5 text-center text-xs sm:text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 flex items-center justify-center gap-1.5"
            >
              <span>{isConnected ? t("card.message") : "Connect"}</span>
            </Link>
          )
        ) : (
          <Link
            to="/login"
            search={{ redirect: `/messages/${w.id}` }}
            className="inline-link w-full sm:flex-1 rounded-xl bg-primary px-3 py-2.5 text-center text-xs sm:text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 flex items-center justify-center gap-1.5"
          >
            <span>Connect</span>
          </Link>
        )}
      </div>
    </article>
  );
}
