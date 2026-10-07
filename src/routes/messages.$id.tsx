import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/i18n";
import { SiteHeader } from "@/components/site-chrome";
import {
  addMessage,
  getMessages,
  getMe,
  getWorker,
  getSeeker,
  makeThreadKey,
  useStore,
  addRequest,
  getRequests,
} from "@/lib/store";
import { TextInput, PrimaryButton } from "@/components/form-bits";
import { ArrowLeft, Send } from "lucide-react";

export const Route = createFileRoute("/messages/$id")({
  head: () => ({ meta: [{ title: "Messages — CareConnect" }] }),
  component: MessageThread,
});

function MessageThread() {
  const { id } = useParams({ from: "/messages/$id" });
  const { t } = useI18n();
  const me = useStore(() => getMe());
  const threadId = me ? makeThreadKey(me.id, id) : id;
  const msgs = useStore(() => getMessages(threadId));
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const other = useStore(() => getWorker(id) ?? getSeeker(id));

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    if (!v || !me) return;

    if (me.role === "seeker") {
      const allReqs = getRequests();
      const existingReq = allReqs.find((r) => r.workerId === id && r.seekerId === me.id);
      if (!existingReq) {
        try {
          await addRequest({ workerId: id, seekerId: me.id });
        } catch (err) {
          console.warn("Could not auto-create care request:", err);
        }
      }
    }

    void addMessage(threadId, true, v);
    setText("");
  };

  const mine = (message: (typeof msgs)[number]) =>
    message.fromMe || (me ? message.senderId === me.id : false);

  return (
    <div className="min-h-screen bg-background" suppressHydrationWarning>
      <SiteHeader />
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6 sm:px-6">
        <Link
          to="/"
          className="inline-link inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t("onb.back")}
        </Link>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <h2 className="font-bold text-foreground">{other?.fullName ?? "Conversation"}</h2>
        </div>

        <div className="flex min-h-[50vh] flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-soft">
          {msgs.length === 0 && (
            <p className="m-auto max-w-xs text-center text-sm text-muted-foreground">
              {t("msg.empty")}
            </p>
          )}
          {msgs.map((m) => (
            <div key={m.id} className={`flex ${mine(m) ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  mine(m) ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {!me ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
            <h3 className="text-base font-bold text-foreground">
              Sign in to message {other?.fullName || "this caregiver"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create an account or log in to send direct messages and coordinate care.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/login"
                search={{ redirect: `/messages/${id}` }}
                className="inline-link rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:brightness-110"
              >
                Log in
              </Link>
              <Link
                to="/onboarding"
                className="inline-link rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                Get started
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={send} className="flex gap-2">
            <TextInput
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("msg.placeholder")}
            />
            <PrimaryButton type="submit" aria-label={t("msg.send")} className="shrink-0">
              <Send className="h-4 w-4" />
            </PrimaryButton>
          </form>
        )}
      </div>
    </div>
  );
}
