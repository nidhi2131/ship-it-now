import { Link, useNavigate } from "@tanstack/react-router";
import { Globe, Heart, Bell, Menu, X, LogOut, LayoutDashboard, Search as SearchIcon, User } from "lucide-react";
import { useI18n, type Locale } from "@/lib/i18n/i18n";
import { useState } from "react";
import { getMe, getRequests, getUnreadMessagesCount, useStore, logout } from "@/lib/store";

const langs: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "gu", label: "ગુજરાતી" },
];

export function SiteHeader() {
  const { t, locale, setLocale } = useI18n();
  const [langOpen, setLangOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const me = useStore(() => getMe());
  const requests = useStore(() => getRequests());
  const unreadChatCount = useStore(() => getUnreadMessagesCount());
  const nav = useNavigate();
  const current = langs.find((l) => l.code === locale)!;

  const pendingRequestsCount = me
    ? requests.filter((r) => {
        if (r.status !== "pending") return false;
        if (me.role === "worker") {
          return (
            (r.workerId === me.id || r.workerId === me.profileId) &&
            r.initiatorId !== me.id
          );
        }
        if (me.role === "seeker") {
          return (
            (r.seekerId === me.id || r.seekerId === me.profileId) &&
            r.initiatorId !== me.id
          );
        }
        return false;
      }).length
    : 0;

  const totalNotifications = pendingRequestsCount + unreadChatCount;

  const handleLogout = async () => {
    try {
      setMobileMenuOpen(false);
      await logout();
      nav({ to: "/" });
    } catch (err) {
      console.error("Logout error:", err);
      nav({ to: "/" });
    }
  };

  const dashboardPath = me?.role === "worker" ? "/worker/dashboard" : "/seeker/dashboard";
  const searchTab = me?.role === "worker" ? "requests" : "caregivers";
  const searchLabel = me?.role === "worker" ? "Care Requests" : t("nav.search");

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3">
        {/* Brand Logo */}
        <Link
          to="/"
          onClick={() => setMobileMenuOpen(false)}
          className="inline-link flex items-center gap-2 font-bold text-foreground shrink-0 min-w-0"
        >
          <span className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-warm shrink-0">
            <Heart className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" />
          </span>
          <span className="text-base sm:text-lg tracking-tight font-bold truncate">{t("app.name")}</span>
        </Link>

        {/* Desktop Navigation (md and above) */}
        <div className="hidden md:flex items-center gap-2 lg:gap-3">
          {me && (
            <Link
              to={dashboardPath}
              className="inline-link rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-accent transition-colors"
            >
              {t("nav.dashboard")}
            </Link>
          )}

          {me && (
            <Link
              to="/search"
              search={{ tab: searchTab }}
              className="inline-link inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold text-foreground/85 transition-colors hover:bg-accent hover:text-foreground shrink-0"
            >
              {searchLabel}
            </Link>
          )}

          {/* Pending Notification Bell */}
          {me && (
            <Link
              to={dashboardPath}
              className="relative inline-flex items-center justify-center rounded-lg border border-border bg-card p-2 text-foreground/80 hover:bg-accent hover:text-foreground shadow-soft"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {totalNotifications > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground animate-pulse">
                  {totalNotifications}
                </span>
              )}
            </Link>
          )}

          {/* Desktop Language Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangOpen((o) => !o)}
              className="inline-link flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-soft hover:bg-accent shrink-0 transition-colors"
              aria-haspopup="menu"
              aria-expanded={langOpen}
            >
              <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{current.label}</span>
            </button>
            {langOpen && (
              <div
                role="menu"
                className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-xl border border-border bg-popover shadow-warm"
                onMouseLeave={() => setLangOpen(false)}
              >
                {langs.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLocale(l.code);
                      setLangOpen(false);
                    }}
                    className={`block w-full px-4 py-2.5 text-left text-sm hover:bg-accent ${
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

          {/* Desktop Login / Logout */}
          {me ? (
            <button
              type="button"
              onClick={handleLogout}
              className="inline-link inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50/80 px-3.5 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 hover:text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/60 shrink-0 transition-colors"
            >
              Logout
            </button>
          ) : (
            <Link
              to="/login"
              className="inline-link inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90 shrink-0 transition-colors"
            >
              Log in
            </Link>
          )}
        </div>

        {/* Mobile Header Controls (< md) */}
        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          {/* Mobile Bell Icon */}
          {me && (
            <Link
              to={dashboardPath}
              onClick={() => setMobileMenuOpen(false)}
              className="relative inline-flex items-center justify-center rounded-lg border border-border bg-card p-2 text-foreground shadow-soft"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {totalNotifications > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground animate-pulse">
                  {totalNotifications}
                </span>
              )}
            </Link>
          )}

          {/* Mobile Hamburger Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-card p-2 text-foreground shadow-soft hover:bg-accent"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/70 bg-card px-4 py-4 shadow-warm animate-in slide-in-from-top-2 duration-200">
          {me ? (
            <div className="mb-4 rounded-xl border border-border bg-background p-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
                  {me.fullName
                    .split(" ")
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-foreground text-sm">
                    {me.fullName}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {me.role === "worker" ? "Caregiver" : "Care Seeker"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {me.area}, {me.city}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Navigation Links */}
          <div className="space-y-1.5">
            {me && (
              <Link
                to={dashboardPath}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-accent transition-colors"
              >
                <LayoutDashboard className="h-4 w-4 text-primary" />
                {t("nav.dashboard")}
              </Link>
            )}

            {me && (
              <Link
                to="/search"
                search={{ tab: searchTab }}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-accent transition-colors"
              >
                <SearchIcon className="h-4 w-4 text-secondary" />
                {searchLabel}
              </Link>
            )}
          </div>

          {/* Language Selector in Mobile Menu */}
          <div className="my-3 pt-3 border-t border-border">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> Language
            </div>
            <div className="grid grid-cols-3 gap-1.5 bg-muted p-1 rounded-xl">
              {langs.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLocale(l.code)}
                  className={`py-1.5 text-center text-xs font-semibold rounded-lg transition-colors ${
                    l.code === locale
                      ? "bg-card text-primary shadow-soft"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons in Mobile Menu */}
          <div className="pt-2 border-t border-border">
            {me ? (
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/80 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/onboarding"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-card py-2.5 text-sm font-semibold text-foreground hover:bg-accent transition-colors"
                >
                  Create an Account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
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
