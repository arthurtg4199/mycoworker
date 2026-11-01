"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  markAllNudgesReadAction,
  markNudgeReadAction,
} from "@/app/nudges/actions";
import {
  AnalyticsNavIcon,
  BellIcon,
  BuyersNavIcon,
  InboxNavIcon,
  MenuIcon,
  SettingsNavIcon,
} from "@/components/icons";
import { PaAvatar } from "@/components/pa-avatar";
import { useSession } from "@/components/session";
import {
  handlingModeCopy,
  readStoredHandlingMode,
  subscribeHandlingMode,
  type HandlingMode,
} from "@/lib/assistant-mode";
import {
  readStoredBusinessProfile,
  subscribeBusinessProfile,
} from "@/lib/business-profile";
import {
  nudgeTimeLabel,
  nudgeTypeLabel,
  readStoredNudgeReads,
  subscribeNudgeReads,
  writeStoredNudgeRead,
  writeStoredNudgeReads,
  type NudgeView,
} from "@/lib/nudges";

const tabs = [
  { href: "/", label: "Inbox" },
  { href: "/buyers", label: "Buyers" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
] as const;

const emptyReads: string[] = [];

export function AppChrome({
  children,
  sampleChats = false,
  whatsappConnected = false,
  shop = null,
  handlingMode = "ask_first",
  nudges = [],
  nudgeEmpty = "Nudges show up when a customer needs you.",
}: {
  children: React.ReactNode;
  sampleChats?: boolean;
  whatsappConnected?: boolean;
  shop?: { name: string; location: string | null } | null;
  handlingMode?: HandlingMode;
  nudges?: NudgeView[];
  nudgeEmpty?: string;
}) {
  const pathname = usePathname();
  const { demoMode } = useSession();
  const storedShop = useSyncExternalStore(
    subscribeBusinessProfile,
    readStoredBusinessProfile,
    () => null,
  );
  const storedMode = useSyncExternalStore(
    subscribeHandlingMode,
    readStoredHandlingMode,
    () => null,
  );
  const storedReads = useSyncExternalStore(
    subscribeNudgeReads,
    readStoredNudgeReads,
    () => emptyReads,
  );
  const menuShop = demoMode
    ? storedShop
      ? { name: storedShop.business_name, location: storedShop.location || null }
      : null
    : shop;
  const activeMode = demoMode ? (storedMode ?? handlingMode) : handlingMode;
  const modeCopy = handlingModeCopy(activeMode);
  const [panel, setPanel] = useState<"bell" | "menu" | null>(null);
  const [panelPath, setPanelPath] = useState(pathname);
  const [localReads, setLocalReads] = useState<string[]>([]);
  const [allRead, setAllRead] = useState(false);
  const openPanel = panelPath === pathname ? panel : null;
  const visible = nudges.map((nudge) => ({
    ...nudge,
    read:
      nudge.read ||
      (demoMode
        ? storedReads.includes(nudge.id)
        : allRead || localReads.includes(nudge.id)),
  }));
  const unread = visible.filter((nudge) => !nudge.read).length;

  useEffect(() => {
    document.getElementById("app-main")?.scrollTo({ top: 0 });
  }, [pathname]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPanel(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggle(next: "bell" | "menu") {
    setPanelPath(pathname);
    setPanel((current) => (current === next ? null : next));
  }

  async function markOne(id: string) {
    if (demoMode) {
      writeStoredNudgeRead(id);
      return;
    }
    setLocalReads((current) => (current.includes(id) ? current : [...current, id]));
    const result = await markNudgeReadAction(id);
    if (!result.ok) {
      setLocalReads((current) => current.filter((item) => item !== id));
    }
  }

  async function markAll() {
    if (demoMode) {
      writeStoredNudgeReads(visible.map((nudge) => nudge.id));
      return;
    }
    setAllRead(true);
    const result = await markAllNudgesReadAction();
    if (!result.ok) setAllRead(false);
  }

  const showTalk = pathname !== "/assistant";

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-white sm:shadow-[0_0_0_1px_rgba(80,60,120,0.06),0_24px_60px_rgba(70,50,30,0.08)]">
      <header className="z-30 flex shrink-0 items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <Link
          href="/"
          className="min-w-0 flex-1 text-[1.65rem] leading-none font-extrabold tracking-[-0.04em] text-ink"
        >
          MyCoWorker
        </Link>
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-[#F6F4FB]"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
          aria-expanded={openPanel === "bell"}
          onClick={() => toggle("bell")}
        >
          <BellIcon className="h-6 w-6" />
          {unread > 0 ? (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF3B30] px-1 text-[10px] leading-none font-bold text-white ring-2 ring-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-[#F6F4FB]"
          aria-label="Menu"
          aria-expanded={openPanel === "menu"}
          onClick={() => toggle("menu")}
        >
          <MenuIcon className="h-6 w-6" />
        </button>
      </header>

      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2">
        <Link
          href="/settings"
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
            activeMode === "paused"
              ? "bg-[#F4F2F8] text-[#7A7688]"
              : "bg-mcw-soft text-mcw"
          }`}
        >
          {modeCopy.label}
        </Link>
        <p className="min-w-0 truncate text-right text-[11px] font-medium text-muted">
          {modeCopy.short}
        </p>
      </div>

      {demoMode ? (
        <p className="shrink-0 px-4 pb-2 text-center text-[11px] font-semibold text-mcw">
          Demo mode
        </p>
      ) : sampleChats ? (
        <p className="shrink-0 px-4 pb-2 text-center text-[11px] font-semibold text-mcw">
          Sample chats ·{" "}
          <Link href="/settings" className="underline">
            Connect WhatsApp
          </Link>
        </p>
      ) : null}

      <main
        id="app-main"
        className={`mcw-scroll flex min-h-0 flex-1 flex-col overflow-y-auto ${showTalk ? "pb-24" : "pb-6"}`}
      >
        {children}
      </main>

      {showTalk ? (
        <Link
          href="/assistant"
          className="absolute right-4 z-20 inline-flex items-center gap-2 rounded-full bg-mcw py-1.5 pr-4 pl-1.5 text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(108,76,224,0.35)] bottom-[calc(4rem+0.85rem+env(safe-area-inset-bottom))]"
        >
          <PaAvatar size="fab" className="shadow-[0_0_0_2px_rgba(255,255,255,0.9)]" />
          Talk to MyCoWorker
        </Link>
      ) : null}

      <nav
        aria-label="Primary"
        className="z-30 shrink-0 border-t border-[#F1F1F3] bg-white pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="grid h-16 grid-cols-4">
          {tabs.map((tab) => {
            const active =
              tab.href === "/"
                ? pathname === "/"
                : pathname.startsWith(tab.href);
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                    active ? "text-mcw" : "text-[#9AA1AB]"
                  }`}
                >
                  {tab.href === "/" ? <InboxNavIcon active={active} /> : null}
                  {tab.href === "/buyers" ? <BuyersNavIcon /> : null}
                  {tab.href === "/analytics" ? <AnalyticsNavIcon /> : null}
                  {tab.href === "/settings" ? <SettingsNavIcon /> : null}
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {openPanel ? (
        <>
          <button
            type="button"
            className="absolute inset-0 z-40 bg-[#1c1430]/20"
            aria-label="Dismiss"
            onClick={() => setPanel(null)}
          />
          <div
            role="dialog"
            aria-label={openPanel === "bell" ? "Notifications" : "About MyCoWorker"}
            className="absolute top-[6.5rem] right-3 left-3 z-50 max-h-[min(28rem,70dvh)] overflow-y-auto rounded-3xl bg-white p-4 shadow-[0_18px_50px_rgba(40,20,80,0.16)] ring-1 ring-black/5"
          >
            {openPanel === "bell" ? (
              <BellPanel
                nudges={visible}
                emptyCopy={nudgeEmpty}
                onMark={(id) => void markOne(id)}
                onMarkAll={() => void markAll()}
              />
            ) : (
              <MenuPanel
                demoMode={demoMode}
                sampleChats={sampleChats}
                whatsappConnected={whatsappConnected}
                shop={menuShop}
                handlingLabel={modeCopy.label}
              />
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function BellPanel({
  nudges,
  emptyCopy,
  onMark,
  onMarkAll,
}: {
  nudges: NudgeView[];
  emptyCopy: string;
  onMark: (id: string) => void;
  onMarkAll: () => void;
}) {
  const unread = nudges.filter((nudge) => !nudge.read).length;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-ink">Nudges</p>
        {unread > 0 ? (
          <button
            type="button"
            className="text-xs font-semibold text-mcw"
            onClick={onMarkAll}
          >
            Mark all read
          </button>
        ) : null}
      </div>
      {nudges.length === 0 ? (
        <p className="mt-3 text-sm leading-5 text-[#3C3A46]">{emptyCopy}</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {nudges.map((nudge) => (
            <li
              key={nudge.id}
              className={`rounded-2xl px-3 py-2.5 ${
                nudge.read ? "bg-[#F8F7FB]" : "bg-mcw-soft"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[11px] font-bold tracking-wide text-mcw uppercase">
                  {nudgeTypeLabel(nudge.type)}
                </p>
                <p className="text-[11px] font-medium text-muted">
                  {nudgeTimeLabel(nudge.createdAt)}
                </p>
              </div>
              <p className="mt-1 text-sm font-bold text-ink">{nudge.title}</p>
              <p className="mt-0.5 text-sm leading-5 text-[#3C3A46]">{nudge.body}</p>
              {nudge.read ? (
                <p className="mt-1.5 text-[11px] font-semibold text-muted">Read</p>
              ) : (
                <button
                  type="button"
                  className="mt-1.5 text-xs font-semibold text-mcw"
                  onClick={() => onMark(nudge.id)}
                >
                  Mark read
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MenuPanel({
  demoMode,
  sampleChats,
  whatsappConnected,
  shop,
  handlingLabel,
}: {
  demoMode: boolean;
  sampleChats: boolean;
  whatsappConnected: boolean;
  shop: { name: string; location: string | null } | null;
  handlingLabel: string;
}) {
  const note = demoMode
    ? "This is a preview. Chats stay on this screen, and nothing is connected yet."
    : whatsappConnected
      ? "WhatsApp is connected. A reply you send from the inbox goes out on WhatsApp. I still ask you first unless auto-reply is on in Settings."
      : sampleChats
        ? "These are sample chats. Connect WhatsApp in Settings to use your own number."
        : "WhatsApp is not connected. Saved chats stay here. Connect the number in Settings to receive new ones.";
  return (
    <div className="text-center">
      <Image
        src="/logo_final.png"
        alt="MyCoWorker. Your friendly assistant for small business."
        width={880}
        height={620}
        className="mx-auto h-28 w-auto"
      />
      <p className="mt-1 text-sm leading-5 font-semibold text-ink">
        I handle the chats. You close the deals.
      </p>
      {shop ? (
        <p className="mt-2 text-sm font-bold break-words text-ink">
          {shop.name}
          {shop.location ? (
            <span className="font-semibold text-muted"> · {shop.location}</span>
          ) : null}
        </p>
      ) : null}
      <p className="mt-2 text-sm font-semibold text-mcw">Handling: {handlingLabel}</p>
      <p className="mt-2 text-xs font-medium tracking-wide text-muted uppercase">
        By OKEREX
      </p>
      <p className="mt-3 text-sm leading-5 text-[#5C5870]">{note}</p>
    </div>
  );
}
