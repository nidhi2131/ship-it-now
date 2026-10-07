import { Link, useNavigate } from "@tanstack/react-router";
import { Globe, Heart } from "lucide-react";
import { useI18n, type Locale } from "@/lib/i18n/i18n";
import { useState } from "react";
import { getMe, useStore, logout } from "@/lib/store";

const langs: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "gu", label: "ગુજરાતી" },
];

export function SiteHeader() {
  const { t, locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const me = useStore(() => getMe());
  const nav = useNavigate();
  const current = langs.find((l) => l.code === locale)!;

  const handleLogout = async () => {
    try {
      await logout();
      nav({ to: "/" });
    } catch (err) {
      console.error("Logout error:", err);
      nav({ to: "/" });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3">
        <Link to="/" className="inline-link flex items-center gap-2 font-bold text-foreground shrink-0">
          <span className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-warm shrink-0">
            <Heart className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" />
          </span>
          <span className="text-base sm:text-lg tracking-tight font-bold">{t("app.name")}</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {me?.role === "seeker" && (
            <Link
              to="/seeker/dashboard"
              className="inline-link hidden rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground md:inline-flex"
            >
              {t("nav.dashboard")}
            </Link>
          )}
          {me?.role === "worker" && (
            <Link
              to="/worker/dashboard"
              className="inline-link hidden rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground md:inline-flex"
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

          {/* Language selector button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="inline-link flex items-center gap-1.5 sm:gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-foreground shadow-soft hover:bg-accent shrink-0 transition-colors"
              aria-haspopup="menu"
              aria-expanded={open}
            >
              <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-muted-foreground" />
              <span>{current.label}</span>
            </button>
            {open && (
              <div
                role="menu"
                className="absolute right-0 z-50 mt-2 w-40 sm:w-44 overflow-hidden rounded-xl border border-border bg-popover shadow-warm"
                onMouseLeave={() => setOpen(false)}
              >
                {langs.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLocale(l.code);
                      setOpen(false);
                    }}
                    className={`block w-full px-4 py-2.5 text-left text-xs sm:text-sm hover:bg-accent ${
                      l.code === locale
                        ? "bg-primary-soft font-semibold text-primary"
                        : "text-foreground"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Login / Logout button - DISPLAYED AFTER LANGUAGE BUTTON AND NEVER HIDDEN ON MOBILE */}
          {me ? (
            <button
              type="button"
              onClick={handleLogout}
              className="inline-link inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50/80 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold text-red-600 hover:bg-red-100 hover:text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/60 shrink-0 transition-colors"
            >
              Logout
            </button>
          ) : (
            <Link
              to="/login"
              className="inline-link inline-flex items-center justify-center rounded-lg bg-primary px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90 shrink-0 transition-colors"
            >
              Log in
            </Link>
          )}
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
