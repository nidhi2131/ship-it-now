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
  fetchWorkerById,
  fetchSeekerById,
  makeThreadKey,
  parseThreadKey,
  getThreads,
  isValidUuid,
  useStore,
  addRequest,
  updateRequestStatus,
  getRequestBetween,
  syncMessagesForThread,
  syncCareRequests,
} from "@/lib/store";
import { TextInput, PrimaryButton } from "@/components/form-bits";
import {
  ArrowLeft,
  Send,
  CheckCheck,
  User,
  ShieldAlert,
  Clock,
  Check,
  UserPlus,
  Lock,
  MessageSquare,
} from "lucide-react";

export const Route = createFileRoute("/messages/$id")({
  head: () => ({ meta: [{ title: "Messages — CareConnect" }] }),
  component: MessageThread,
});

function MessageThread() {
  const { id } = useParams({ from: "/messages/$id" });
  const { t } = useI18n();
  const me = useStore(() => getMe());
  const threads = useStore(() => getThreads());

  // Determine other participant ID whether id is a thread UUID, pairKey, or user ID
  const threadRecord = threads.find((t) => t.id === id || t.pairKey === id);
  const otherParticipantId = threadRecord
    ? me?.id === threadRecord.seekerId
      ? threadRecord.workerId
      : threadRecord.seekerId
    : id.startsWith("thread:")
      ? parseThreadKey(id).find((x) => x !== me?.id) || id
      : id;

  const threadId = me ? makeThreadKey(me.id, otherParticipantId) : id;
  const msgs = useStore(() => getMessages(threadId));
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const otherWorker = useStore(() => getWorker(otherParticipantId));
  const otherSeeker = useStore(() => getSeeker(otherParticipantId));
  const other = otherWorker ?? otherSeeker;

  // Strict Connection Gate: get care request between me and other party
  const req = useStore(() =>
    me && otherParticipantId ? getRequestBetween(me.id, otherParticipantId) : undefined,
  );
  const isAccepted = Boolean(
    req && (req.status === "responded" || req.status === "hired" || req.status === "completed"),
  );
  const isIncoming = Boolean(
    req && (req.initiatorId ? req.initiatorId !== me?.id : me?.role === "worker"),
  );

  useEffect(() => {
    if (!other && otherParticipantId && isValidUuid(otherParticipantId)) {
      void fetchWorkerById(otherParticipantId).then((w) => {
        if (!w) void fetchSeekerById(otherParticipantId);
      });
    }
  }, [otherParticipantId, other]);

  // Real-time synchronization hook: pull Supabase messages and care request status
  useEffect(() => {
    if (!threadId) return;
    void syncMessagesForThread(threadId);
    void syncCareRequests();

    // High-frequency 2.5s fallback to guarantee instantaneous cross-client messaging
    const interval = setInterval(() => {
      void syncMessagesForThread(threadId);
      void syncCareRequests();
    }, 2500);

    return () => clearInterval(interval);
  }, [threadId, otherParticipantId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    if (!v || !me || !isAccepted) return;

    setText("");
    void addMessage(threadId, true, v);
  };

  const handleSendRequest = () => {
    if (!me) return;
    const isSeeker = me.role === "seeker";
    const workerProfileId = isSeeker ? otherParticipantId : me.profileId || me.id;
    const seekerProfileId = isSeeker ? me.profileId || me.id : otherParticipantId;

    if (isValidUuid(workerProfileId) && isValidUuid(seekerProfileId)) {
      void addRequest({
        workerId: workerProfileId,
        seekerId: seekerProfileId,
        initiatorId: me.id,
      });
    }
  };

  const handleAcceptRequest = () => {
    if (!req) return;
    void updateRequestStatus(req.workerId, req.seekerId, "responded");
  };

  const handleDeclineRequest = () => {
    if (!req) return;
    void updateRequestStatus(req.workerId, req.seekerId, "cancelled");
  };

  const mine = (message: (typeof msgs)[number]) =>
    message.fromMe || (me ? message.senderId === me.id : false);

  const otherInitials = other?.fullName
    ? other.fullName
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "C";

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

        {/* Conversation Header */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-base font-bold text-primary-foreground shadow-warm">
              {otherInitials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-bold text-foreground">
                  {other?.fullName ?? "Conversation"}
                </h2>
                {other && (
                  <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {otherWorker ? "Caregiver" : "Care Recipient"}
                  </span>
                )}
              </div>
              {other && (
                <p className="truncate text-xs text-muted-foreground">
                  {other.area}, {other.city}
                </p>
              )}
            </div>
          </div>

          {/* Connection Status Badge */}
          {!me ? (
            <div className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground shrink-0">
              <Lock className="h-3.5 w-3.5" />
              <span>Login Required</span>
            </div>
          ) : isAccepted ? (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 shrink-0">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Connected · Live</span>
            </div>
          ) : req && req.status === "pending" ? (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 shrink-0">
              <Clock className="h-3.5 w-3.5 animate-spin text-amber-600" />
              <span>Pending Acceptance</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground shrink-0">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Connection Required</span>
            </div>
          )}
        </div>

        {/* Messages Stream */}
        <div className="flex min-h-[50vh] flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-soft overflow-y-auto">
          {msgs.length === 0 && (
            <div className="m-auto flex flex-col items-center gap-2 text-center text-muted-foreground py-8">
              {isAccepted ? (
                <>
                  <MessageSquare className="h-10 w-10 text-primary/30" />
                  <p className="max-w-xs text-sm font-medium text-foreground">
                    You are connected!
                  </p>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    Say hello to start coordinating care details.
                  </p>
                </>
              ) : (
                <>
                  <User className="h-10 w-10 text-primary/30" />
                  <p className="max-w-xs text-sm">
                    No messages yet. Connect and accept request to start exchanging messages.
                  </p>
                </>
              )}
            </div>
          )}

          {msgs.map((m) => {
            const isMine = mine(m);
            const timeStr = m.createdAt
              ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "";

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
              >
                <span className="mb-0.5 px-1 text-[11px] font-medium text-muted-foreground">
                  {isMine ? "You" : other?.fullName || "Caregiver"}
                </span>
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-soft ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-xs"
                      : "bg-muted text-foreground rounded-bl-xs"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <div
                    className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                      isMine ? "text-primary-foreground/75" : "text-muted-foreground"
                    }`}
                  >
                    <span>{timeStr}</span>
                    {isMine && <CheckCheck className="h-3 w-3" />}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {/* Bottom Action Area: Connection Gate or Live Chat Input */}
        {!me ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
            <h3 className="text-base font-bold text-foreground">
              Sign in to message {other?.fullName || "this user"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create an account or log in to send requests and coordinate care.
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
        ) : !isAccepted ? (
          /* Strictly enforce connection gate */
          !req ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-center dark:border-amber-900/50 dark:bg-amber-950/20 shadow-soft">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-bold text-foreground">
                Connection Required Before Chatting
              </h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                To protect caregivers and families from unsolicited messages, direct chat requires an invitation request to be accepted first.
              </p>
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={handleSendRequest}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:brightness-110 active:scale-95"
                >
                  <UserPlus className="h-4 w-4" />
                  {me.role === "seeker"
                    ? "Send Care Request to Connect"
                    : "Send Care Offer to Connect"}
                </button>
              </div>
            </div>
          ) : req.status === "pending" ? (
            isIncoming ? (
              <div className="rounded-2xl border border-primary/30 bg-primary-soft/40 p-6 text-center shadow-soft">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <UserPlus className="h-6 w-6" />
                </div>
                <h3 className="mt-3 text-base font-bold text-foreground">
                  Incoming Connection Request
                </h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  <strong>{other?.fullName || "This user"}</strong> has invited you to connect. Accept the request below to unlock live real-time messaging!
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleAcceptRequest}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-soft transition-all hover:bg-emerald-700 active:scale-95"
                  >
                    <Check className="h-4 w-4" />
                    Accept Request & Unlock Chat
                  </button>
                  <button
                    type="button"
                    onClick={handleDeclineRequest}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-6 text-center dark:border-blue-900/50 dark:bg-blue-950/20 shadow-soft">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                  <Clock className="h-6 w-6 animate-pulse" />
                </div>
                <h3 className="mt-3 text-base font-bold text-foreground">
                  Connection Request Pending
                </h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Your invitation has been sent to{" "}
                  <strong>{other?.fullName || "this user"}</strong>. Once they accept, this chat will instantly unlock for both of you!
                </p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-100/70 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                  Waiting for recipient acceptance...
                </div>
              </div>
            )
          ) : (
            <div className="rounded-2xl border border-muted bg-muted/30 p-6 text-center shadow-soft">
              <h3 className="text-base font-bold text-foreground">
                Request Closed
              </h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                The connection request is inactive. You can send a new request to connect.
              </p>
              <button
                type="button"
                onClick={handleSendRequest}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:brightness-110 active:scale-95"
              >
                <UserPlus className="h-4 w-4" />
                Send New Connection Request
              </button>
            </div>
          )
        ) : (
          <form onSubmit={send} className="flex gap-2">
            <TextInput
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("msg.placeholder")}
              className="flex-1"
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
