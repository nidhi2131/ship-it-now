import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/i18n";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { FormCard, FieldLabel, TextInput, PrimaryButton } from "@/components/form-bits";
import { login } from "@/lib/store";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — CareConnect" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return setErr("Please enter email and password.");

    setLoading(true);
    setErr("");
    try {
      const account = await login(email, password);
      if (!account) {
        setErr("Invalid email or password.");
        setLoading(false);
        return;
      }

      // Success - go to dashboard based on role
      if (account.me.role === "worker") nav({ to: "/worker/dashboard" });
      else if (account.me.role === "seeker") nav({ to: "/seeker/dashboard" });
      else nav({ to: "/onboarding/role" });
    } catch (e: any) {
      setErr(e.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <FormCard>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Log in</h1>
        <p className="mt-2 text-muted-foreground">Welcome back to CareConnect.</p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <div>
            <FieldLabel required>Email</FieldLabel>
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <FieldLabel required>Password</FieldLabel>
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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
