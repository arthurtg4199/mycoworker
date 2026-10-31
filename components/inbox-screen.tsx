"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import {
  ArrowIcon,
  ChannelIcon,
  ChevronLeftIcon,
  SlidersIcon,
  SparklesIcon,
} from "@/components/icons";
import { Mascot } from "@/components/mascot";
import { StatusPill } from "@/components/status-pill";
import {
  channelFilters,
  channelLabel,
  type Channel,
  type Chat,
} from "@/lib/demo-data";
import type { WorkspaceSource } from "@/lib/db/inbox";

type StatusFilter = "all" | "needs_you" | "answered" | "followed_up";

const statusFilters: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All chats" },
  { id: "needs_you", label: "Your turn" },
  { id: "answered", label: "Answered" },
  { id: "followed_up", label: "Followed up" },
];

export function InboxScreen({
  chats,
  summary,
  source,
  notice,
}: {
  chats: Chat[];
  summary: { chatsHandled: number; buyersReady: number };
  source: WorkspaceSource;
  notice: string | null;
}) {
  const [channel, setChannel] = useState<Channel | "all">("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, string[]>>({});
  const filterRef = useRef<HTMLDivElement>(null);
  const filterMenuId = useId();

  useEffect(() => {
    if (!filterOpen) return;
    function onPointer(event: PointerEvent) {
      if (!filterRef.current?.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [filterOpen]);

  const openChat = chats.find((chat) => chat.id === openId);
  if (openChat) {
    return (
      <Thread
        chat={openChat}
        replies={replies[openChat.id] ?? []}
        onBack={() => setOpenId(null)}
        onSend={(text) =>
          setReplies((current) => ({
            ...current,
            [openChat.id]: [...(current[openChat.id] ?? []), text],
          }))
        }
      />
    );
  }

  const visible = chats.filter((chat) => {
    if (channel !== "all" && !chat.channels.includes(channel)) return false;
    if (status === "needs_you") {
      return chat.status === "hot" || chat.status === "your_turn";
    }
    if (status === "answered") return chat.status === "answered";
    if (status === "followed_up") return chat.status === "followed_up";
    return true;
  });

  const activeFilter = statusFilters.find((item) => item.id === status);

  return (
    <div className="pb-2">
      <div className="flex gap-2 overflow-x-auto px-4 pt-1 pb-1 [scrollbar-width:none]">
        {channelFilters.map((item) => {
          const active = channel === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => setChannel(active ? "all" : item.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13.5px] font-semibold shadow-[0_1px_2px_rgba(20,16,40,0.04)] ${
                active
                  ? "border-mcw bg-mcw-soft text-mcw"
                  : "border-[#ECEDEF] bg-white text-[#2A2A2E]"
              }`}
            >
              <ChannelIcon channel={item.id} className="h-[18px] w-[18px]" />
              {item.label}
            </button>
          );
        })}
      </div>

      {notice ? (
        <p className="mx-4 mt-3 rounded-[22px] bg-mcw-soft px-3.5 py-3 text-sm leading-5 font-medium text-[#3C3458]">
          {notice}
        </p>
      ) : null}

      <Link
        href="/buyers"
        className="mx-4 mt-3 flex items-center gap-3 rounded-[22px] bg-mcw-soft px-3.5 py-3.5"
      >
        <SparklesIcon className="h-9 w-9 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] leading-5 font-bold text-[#241C3A]">
            I handled {summary.chatsHandled}{" "}
            {summary.chatsHandled === 1 ? "chat" : "chats"} today.
          </span>
          <span className="mt-0.5 block text-[14px] leading-5 font-medium text-[#4A4560]">
            {summary.buyersReady}{" "}
            {summary.buyersReady === 1 ? "buyer" : "buyers"} ready for you.
          </span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E4DCFF] text-mcw">
          <ArrowIcon className="h-4 w-4" />
        </span>
      </Link>

      <div className="relative mt-5 flex items-center justify-between px-4" ref={filterRef}>
        <h2 className="text-[1.35rem] font-extrabold tracking-[-0.03em] text-ink">
          Inbox
        </h2>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
            status === "all" ? "text-[#667085]" : "text-mcw"
          }`}
          aria-expanded={filterOpen}
          aria-controls={filterMenuId}
          onClick={() => setFilterOpen((open) => !open)}
        >
          <SlidersIcon className="h-4 w-4" />
          {status === "all" ? "Filter" : activeFilter?.label}
        </button>
        {filterOpen ? (
          <div
            id={filterMenuId}
            role="menu"
            className="absolute top-9 right-4 z-20 w-44 rounded-2xl bg-white p-1 shadow-[0_12px_40px_rgba(40,20,80,0.14)] ring-1 ring-[#EFEAF8]"
          >
            {statusFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitemradio"
                aria-checked={status === item.id}
                className={`block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold ${
                  status === item.id
                    ? "bg-mcw-soft text-mcw"
                    : "text-[#2C2A33] hover:bg-[#FAF8FF]"
                }`}
                onClick={() => {
                  setStatus(item.id);
                  setFilterOpen(false);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <EmptyInbox
          fresh={source === "live" && chats.length === 0 && !notice}
          failed={Boolean(notice) && chats.length === 0}
        />
      ) : (
        <ul className="mt-1 px-2">
          {visible.map((chat) => (
            <li key={chat.id}>
              <button
                type="button"
                onClick={() => {
                  setFilterOpen(false);
                  setOpenId(chat.id);
                  document.getElementById("app-main")?.scrollTo({ top: 0 });
                }}
                className="flex w-full gap-3 rounded-2xl px-2 py-3 text-left hover:bg-[#FAF8FF]"
              >
                <Avatar spec={chat.avatar} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[15px] font-semibold text-ink">
                      {chat.name}
                    </span>
                    <time className="shrink-0 text-[12px] text-[#A0A4AE]">
                      {chat.time}
                    </time>
                  </span>
                  <span className="mt-0.5 flex items-start justify-between gap-2">
                    <span className="truncate text-[13.5px] text-[#8E939C]">
                      {chat.preview}
                    </span>
                    <StatusPill status={chat.status} />
                  </span>
                  {chat.showTurnNote ? (
                    <span className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold text-mcw">
                      <span className="h-1.5 w-1.5 rounded-full bg-mcw" />
                      Your turn
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyInbox({ fresh, failed }: { fresh: boolean; failed: boolean }) {
  const title = failed
    ? "I will try again in a moment."
    : fresh
      ? "No chats yet."
      : "You're all caught up.";
  const body = failed
    ? "Your saved chats stay put."
    : fresh
      ? "When a customer messages you, the conversation will land here."
      : "Nothing in this filter. Try another channel.";

  return (
    <div className="px-6 py-14 text-center">
      <Mascot compact className="mx-auto h-20 w-20" />
      <p className="mt-3 text-base font-bold text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}

function Thread({
  chat,
  replies,
  onBack,
  onSend,
}: {
  chat: Chat;
  replies: string[];
  onBack: () => void;
  onSend: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const channel = chat.channels[0];

  return (
    <div className="px-4 pt-1">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-0.5 rounded-full py-2 pr-3 text-sm font-bold text-mcw"
      >
        <ChevronLeftIcon className="h-5 w-5" />
        Inbox
      </button>
      <div className="mt-2 flex items-center gap-3">
        <Avatar spec={chat.avatar} />
        <div className="min-w-0">
          <h2 className="truncate text-lg font-extrabold tracking-tight text-ink">
            {chat.name}
          </h2>
          <p className="text-sm text-muted">
            {channel ? channelLabel(channel) : "Chat"} · {chat.time}
          </p>
        </div>
      </div>
      <div className="mt-4 flex justify-start">
        <div className="max-w-[85%] rounded-3xl rounded-tl-md bg-[#F3F4F6] px-4 py-3 text-[15px] leading-6 text-ink">
          {chat.preview}
        </div>
      </div>
      <div className="mt-2">
        <StatusPill status={chat.status} />
      </div>
      {replies.map((reply) => (
        <div key={reply} className="mt-3 flex justify-end">
          <div className="max-w-[85%] rounded-3xl rounded-tr-md bg-mcw px-4 py-3 text-[15px] leading-6 text-white">
            {reply}
          </div>
        </div>
      ))}
      {replies.length === 0 ? (
        <div className="mt-4 flex gap-3 rounded-3xl bg-mcw-soft p-3">
          <Mascot compact className="h-12 w-12 shrink-0" />
          <p className="text-sm leading-5 text-[#3C3458]">
            I can draft this reply in a later step. A preview you type here
            stays on this screen.
          </p>
        </div>
      ) : null}
      <form
        className="mt-4 flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const text = draft.trim();
          if (!text) return;
          onSend(text);
          setDraft("");
        }}
      >
        <label className="sr-only" htmlFor="reply">
          Reply
        </label>
        <input
          id="reply"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a reply"
          className="h-12 min-w-0 flex-1 rounded-full border border-[#E7E7EC] px-4 text-sm outline-none focus:border-mcw"
        />
        <button
          type="submit"
          className="h-12 rounded-full bg-mcw px-4 text-sm font-semibold text-white disabled:opacity-40"
          disabled={draft.trim().length === 0}
        >
          Send
        </button>
      </form>
      <p className="mt-2 text-center text-xs text-muted">
        Preview only. Nothing is sent yet.
      </p>
    </div>
  );
}
