import { Link } from "@tanstack/react-router";
import { Globe, Heart } from "lucide-react";
import { useI18n, type Locale } from "@/lib/i18n/i18n";
import { useState } from "react";
import { getMe, useStore } from "@/lib/store";

const langs: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "gu", label: "ગુજરાતી" },
];

export function SiteHeader() {
  const { t, locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const me = useStore(() => getMe());
  const current = langs.find((l) => l.code === locale)!;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="inline-link flex items-center gap-2 font-bold text-foreground">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-warm">
            <Heart className="h-5 w-5" fill="currentColor" />
          </span>
          <span className="text-lg tracking-tight">{t("app.name")}</span>
        </Link>

        <div className="flex items-center gap-2">
          {me?.role === "seeker" && (
            <Link
              to="/seeker/dashboard"
              className="inline-link hidden rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground sm:inline-flex"
            >
              {t("nav.dashboard")}
            </Link>
          )}
          {me?.role === "worker" && (
            <Link
              to="/worker/dashboard"
              className="inline-link hidden rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground sm:inline-flex"
            >
              {t("nav.dashboard")}
            </Link>
          )}
          <Link
            to="/search"
            className="inline-link hidden rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground sm:inline-flex"
          >
            {t("nav.search")}
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="inline-link flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-soft hover:bg-accent"
              aria-haspopup="menu"
              aria-expanded={open}
            >
              <Globe className="h-4 w-4" />
              <span>{current.label}</span>
            </button>
            {open && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-popover shadow-warm"
                onMouseLeave={() => setOpen(false)}
              >
                {langs.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => { setLocale(l.code); setOpen(false); }}
                    className={`block w-full px-4 py-2.5 text-left text-sm hover:bg-accent ${
                      l.code === locale ? "bg-primary-soft font-semibold text-primary" : "text-foreground"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="mt-20 border-t border-border/60 bg-card/50">
      <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-muted-foreground">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" fill="currentColor" />
            <span className="font-semibold text-foreground">{t("app.name")}</span>
          </div>
          <p>{t("footer.tag")}</p>
        </div>
      </div>
    </footer>
  );
}
