import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/i18n";
import { SiteHeader } from "@/components/site-chrome";
import { FormCard, FieldLabel, TextInput, PrimaryButton } from "@/components/form-bits";
import { login, useStore, getWorkers, getSeekers } from "@/lib/store";
import { UserCheck, ShieldCheck, Phone, Mail } from "lucide-react";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({ meta: [{ title: "Login — CareConnect" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { redirect } = Route.useSearch();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const workers = useStore(() => getWorkers());
  const seekers = useStore(() => getSeekers());

  // Collect available profiles from database for easy switching/recovery
  const knownProfiles = [
    ...seekers.map((s) => ({
      id: s.id,
      name: s.fullName,
      phone: s.phone,
      role: "Seeker",
      badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    })),
    ...workers.map((w) => ({
      id: w.id,
      name: w.fullName,
      phone: w.phone,
      role: "Caregiver",
      badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    })),
  ];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      return setErr("Please enter your email or mobile number and password.");
    }

    setLoading(true);
    setErr("");
    try {
      const account = await login(identifier, password);
      if (!account) {
        setErr("Could not find an account with that email or mobile number. Please check your credentials.");
        setLoading(false);
        return;
      }

      // If redirect query is present, navigate back to target page
      if (redirect && redirect.startsWith("/")) {
        nav({ to: redirect as any });
      } else if (account.me.role === "worker") {
        nav({ to: "/worker/dashboard" });
      } else if (account.me.role === "seeker") {
        nav({ to: "/seeker/dashboard" });
      } else {
        nav({ to: "/onboarding/role" });
      }
    } catch (e: any) {
      setErr(e.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (phone: string) => {
    setIdentifier(phone);
    setPassword("password123");
    setErr("");
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <FormCard>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Log in</h1>
        <p className="mt-2 text-muted-foreground">
          Welcome back to CareConnect. Sign in with your registered email or 10-digit mobile number.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <div>
            <FieldLabel required>Email or Mobile Number</FieldLabel>
            <TextInput
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. 7874498257 or you@example.com"
              autoComplete="username"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              You can log in using either your email address or your 10-digit mobile number.
            </p>
          </div>
          <div>
            <FieldLabel required>Password</FieldLabel>
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {err && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {err}
            </p>
          )}

          <div className="flex items-center justify-between pt-2">
            <Link
              to="/"
              className="inline-link text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Link>
            <PrimaryButton type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Log in"}
            </PrimaryButton>
          </div>
        </form>

        {/* Quick Fill / Known Profiles from Database */}
        {knownProfiles.length > 0 && (
          <div className="mt-8 rounded-2xl border border-border bg-card/60 p-4 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <UserCheck className="h-3.5 w-3.5 text-primary" />
              <span>Registered Database Profiles</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Click any profile below to quickly fill in your login credentials:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {knownProfiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleQuickLogin(p.phone)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-all hover:border-primary/50 hover:bg-accent active:scale-95"
                >
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${p.badgeColor}`}>
                    {p.role}
                  </span>
                  <span>{p.name}</span>
                  <span className="text-muted-foreground">({p.phone})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/onboarding" className="font-semibold text-primary hover:underline">
            Get started
          </Link>
        </div>
      </FormCard>
    </div>
  );
}
