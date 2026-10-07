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
  hasAcceptedRequest,
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
  const canMessage = me
    ? me.role === "seeker"
      ? hasAcceptedRequest(id, me.id)
      : me.profileId
        ? hasAcceptedRequest(me.profileId, id) || hasAcceptedRequest(id, me.id)
        : false
    : false;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    if (!v || !canMessage) return;
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

        {!canMessage && me ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/40 p-3 text-center text-sm text-muted-foreground">
            Request this contact first and wait for the worker to accept it before messaging.
          </div>
        ) : null}

        <form onSubmit={send} className="flex gap-2">
          <TextInput
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!canMessage}
            placeholder={t("msg.placeholder")}
          />
          <PrimaryButton type="submit" aria-label={t("msg.send")} disabled={!canMessage}>
            <Send className="h-4 w-4" />
          </PrimaryButton>
        </form>
      </div>
    </div>
  );
}
