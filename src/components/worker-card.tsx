import { Link } from "@tanstack/react-router";
import { Star, MapPin, IndianRupee, Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n/i18n";
import type { WorkerProfile } from "@/lib/store";

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
  return (
    <article className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-warm">
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-lg font-bold text-primary-foreground">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold text-foreground">{w.fullName}</h3>
          <div className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {w.area}, {w.city}
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-sm font-semibold text-primary">
          <Star className="h-3.5 w-3.5 fill-current" />
          {w.rating.toFixed(1)}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {w.skills.slice(0, 3).map((s) => (
          <span
            key={s}
            className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground"
          >
            {t(s)}
          </span>
        ))}
        {w.skills.length > 3 && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            +{w.skills.length - 3}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Languages className="h-3.5 w-3.5" /> {w.languages.slice(0, 2).join(", ")}
        </span>
        <span>{expLabel}</span>
        <span className="inline-flex items-center gap-0.5 font-semibold text-foreground">
          <IndianRupee className="h-3.5 w-3.5" />
          {w.rateMin}–{w.rateMax}
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            / {t("card.perDay")}
          </span>
        </span>
      </div>

      <div className="flex gap-2 pt-1">
        <Link
          to="/profile/worker/$id"
          params={{ id: w.id }}
          className="inline-link flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-center text-sm font-semibold text-foreground transition-colors hover:bg-accent"
        >
          {t("card.viewProfile")}
        </Link>
        {w.contactMethod === "common.call" ? (
          <a
            href={`tel:+91${w.phone}`}
            className="inline-link flex-1 rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:brightness-110"
          >
            {t("common.call")}
          </a>
        ) : (
          <Link
            to="/messages/$id"
            params={{ id: w.id }}
            className="inline-link flex-1 rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:brightness-110"
          >
            {t("card.message")}
          </Link>
        )}
      </div>
    </article>
  );
}
