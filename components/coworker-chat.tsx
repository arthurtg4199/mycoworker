"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { sendCoworkerMessage } from "@/app/assistant/actions";
import { DailyCheckInCard } from "@/components/daily-check-in";
import { PaAvatar } from "@/components/pa-avatar";
import { useSession } from "@/components/session";
import {
  demoProfileFields,
  readStoredBusinessProfile,
} from "@/lib/business-profile";
import {
  readStoredHandlingMode,
  type HandlingMode,
} from "@/lib/assistant-mode";
import {
  coworkerContent,
  emptyCoworkerChat,
  localCoworkerReply,
  readStoredCoworkerChat,
  subscribeCoworkerChat,
  writeStoredCoworkerChat,
  type CoworkerContext,
  type CoworkerTurn,
} from "@/lib/coworker-chat";
import type { PaPresence } from "@/lib/pa-motion";
import type { DailyCheckIn } from "@/lib/nudges";

function freshTurn(role: CoworkerTurn["role"], content: string): CoworkerTurn {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function demoContext(context: CoworkerContext): CoworkerContext {
  const fields = readStoredBusinessProfile() ?? demoProfileFields();
  const mode = readStoredHandlingMode() ?? context.handlingMode;
  return {
    ...context,
    handlingMode: mode,
    shop: {
      business_name: fields.business_name,
      what_they_sell: fields.what_they_sell.trim() || null,
      hours: fields.hours.trim() || null,
      location: fields.location.trim() || null,
      reply_tone: fields.reply_tone,
    },
  };
}

export function CoworkerChat({
  initialMessages,
  loadNotice,
  intro,
  prompts,
  context,
  checkIn,
  handlingMode,
}: {
  initialMessages: CoworkerTurn[];
  loadNotice: string | null;
  intro: string;
  prompts: { id: string; label: string }[];
  context: CoworkerContext;
  checkIn: DailyCheckIn;
  handlingMode: HandlingMode;
}) {
  const { demoMode } = useSession();
  const stored = useSyncExternalStore(
    subscribeCoworkerChat,
    readStoredCoworkerChat,
    emptyCoworkerChat,
  );
  const [override, setOverride] = useState<CoworkerTurn[] | null>(null);
  const messages = override ?? (demoMode ? stored : initialMessages);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState(loadNotice);
  const [presence, setPresence] = useState<PaPresence>("rest");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef("");
  const pendingRef = useRef(false);
  const stopTimer = useRef<number | null>(null);
  const noticeTimer = useRef<number | null>(null);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, pending]);

  useEffect(() => {
    return () => {
      if (stopTimer.current) window.clearTimeout(stopTimer.current);
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    };
  }, []);

  function clearSettleTimers() {
    if (stopTimer.current) window.clearTimeout(stopTimer.current);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    stopTimer.current = null;
    noticeTimer.current = null;
  }

  function settle() {
    if (pendingRef.current || stopTimer.current) return;
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    setPresence("notice");
    noticeTimer.current = window.setTimeout(() => {
      noticeTimer.current = null;
      if (!pendingRef.current && !stopTimer.current) setPresence("rest");
    }, 980);
  }

  function onDraft(value: string) {
    setDraft(value);
    draftRef.current = value;
    if (noticeTimer.current) {
      window.clearTimeout(noticeTimer.current);
      noticeTimer.current = null;
    }
    if (!value.trim()) {
      if (stopTimer.current) window.clearTimeout(stopTimer.current);
      stopTimer.current = null;
      settle();
      return;
    }
    setPresence("focus");
    if (stopTimer.current) window.clearTimeout(stopTimer.current);
    stopTimer.current = window.setTimeout(() => {
      stopTimer.current = null;
      settle();
    }, 1100);
  }

  async function send(raw: string) {
    const text = coworkerContent(raw);
    if (!text || pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    setDraft("");
    draftRef.current = "";
    clearSettleTimers();
    setPresence("focus");
    const history = messages;
    const optimistic = freshTurn("owner", text);
    const shown = [...history, optimistic];
    setOverride(shown);

    try {
      if (demoMode) {
        const reply = localCoworkerReply(text, history, demoContext(context));
        const assistant = freshTurn("assistant", reply);
        const next = [...shown, assistant];
        writeStoredCoworkerChat(next);
        setOverride(next);
        return;
      }

      const result = await sendCoworkerMessage(text);
      if (!result.ok || !result.owner || !result.assistant) {
        setOverride(history.length === 0 ? null : history);
        setDraft(text);
        draftRef.current = text;
        setError(result.message ?? "I could not answer that just now. Try again.");
        return;
      }
      const next = [...history, result.owner, result.assistant];
      setOverride(next);
      if (result.message) setNotice(result.message);
    } catch {
      setOverride(history.length === 0 ? null : history);
      setDraft(text);
      draftRef.current = text;
      setError("I could not answer that just now. Try again.");
    } finally {
      pendingRef.current = false;
      setPending(false);
      settle();
      inputRef.current?.focus();
    }
  }

  const status = pending
    ? "Thinking…"
    : presence === "focus"
      ? "Listening…"
      : presence === "notice"
        ? "With you"
        : "Here when you need me";
  const showChips = messages.length === 0 && !pending;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center gap-3 px-4 pt-1 pb-3">
        <PaAvatar
          size="hero"
          presence={presence}
          className="shadow-[0_8px_20px_rgba(108,76,224,0.16)]"
        />
        <div className="min-w-0">
          <h2 className="text-[1.35rem] leading-none font-extrabold tracking-[-0.04em] text-ink">
            MyCoWorker
          </h2>
          <p className="mt-1 text-sm font-semibold text-mcw">{status}</p>
        </div>
      </header>

      <div
        ref={scrollerRef}
        className="mcw-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-3"
        aria-live="polite"
      >
        <DailyCheckInCard
          checkIn={checkIn}
          mode={handlingMode}
          className="mx-0 mt-0"
        />
        <p className="mt-3 text-center text-xs leading-5 text-muted">
          This chat is just us. Customer threads stay in the inbox.
        </p>
        {notice ? (
          <p className="mt-3 rounded-2xl bg-mcw-soft px-3 py-2 text-sm leading-5 text-[#3C3458]">
            {notice}
          </p>
        ) : null}
        <div className="mt-4 space-y-3">
          {messages.length === 0 ? <AssistantBubble text={intro} /> : null}
          {messages.map((turn) =>
            turn.role === "assistant" ? (
              <AssistantBubble key={turn.id} text={turn.content} />
            ) : (
              <OwnerBubble key={turn.id} text={turn.content} />
            ),
          )}
          {pending ? (
            <div className="flex items-end gap-2">
              <PaAvatar size="inline" live={false} />
              <p className="mcw-pa-typing rounded-3xl rounded-bl-md bg-mcw-soft px-4 py-3 text-mcw">
                <span className="mx-0.5 inline-block h-1.5 w-1.5 rounded-full bg-current" />
                <span className="mx-0.5 inline-block h-1.5 w-1.5 rounded-full bg-current" />
                <span className="mx-0.5 inline-block h-1.5 w-1.5 rounded-full bg-current" />
                <span className="sr-only">MyCoWorker is replying</span>
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {showChips ? (
        <div className="flex shrink-0 flex-wrap gap-2 px-4 pb-2">
          {prompts.map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              onClick={() => void send(prompt.label)}
              className="shrink-0 rounded-full border border-[#E7E2F4] bg-white px-3 py-2 text-left text-[13px] font-semibold text-[#2C2840]"
            >
              {prompt.label}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className="shrink-0 border-t border-[#F1F1F3] px-4 pt-2 pb-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
      >
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="coworker-message">
            Message MyCoWorker
          </label>
          <input
            ref={inputRef}
            id="coworker-message"
            value={draft}
            maxLength={2000}
            autoComplete="off"
            placeholder="Message MyCoWorker"
            onChange={(event) => onDraft(event.target.value)}
            className="h-12 min-w-0 flex-1 rounded-full border border-[#E7E7EC] px-4 text-sm outline-none focus:border-mcw"
          />
          <button
            type="submit"
            className="h-12 rounded-full bg-mcw px-4 text-sm font-semibold text-white disabled:opacity-40"
            disabled={draft.trim().length === 0 || pending}
          >
            {pending ? "Sending…" : "Send"}
          </button>
        </div>
        {error ? (
          <p className="mt-2 text-center text-sm font-semibold text-[#9A3B4A]">
            {error}
          </p>
        ) : (
          <p className="mt-2 text-center text-[11px] leading-4 text-muted">
            Stays in this chat. Send customer replies from the inbox.
          </p>
        )}
      </form>
    </div>
  );
}

function AssistantBubble({ text }: { text: string }) {
  return (
    <div className="flex items-end gap-2">
      <PaAvatar size="inline" live={false} />
      <p className="max-w-[80%] rounded-3xl rounded-bl-md bg-mcw-soft px-4 py-3 text-[15px] leading-6 text-[#2E2844]">
        {text}
      </p>
    </div>
  );
}

function OwnerBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[80%] rounded-3xl rounded-br-md bg-mcw px-4 py-3 text-[15px] leading-6 text-white">
        {text}
      </p>
    </div>
  );
}
