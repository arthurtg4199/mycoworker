"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

const tabs = [
  { href: "/", label: "Inbox" },
  { href: "/buyers", label: "Buyers" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
] as const;

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { demoMode } = useSession();
  const [panel, setPanel] = useState<"bell" | "menu" | null>(null);
  const [panelPath, setPanelPath] = useState(pathname);
  const [bellSeen, setBellSeen] = useState(false);
  const openPanel = panelPath === pathname ? panel : null;

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
    if (next === "bell") setBellSeen(true);
    setPanelPath(pathname);
    setPanel((current) => (current === next ? null : next));
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
          aria-label="Notifications"
          aria-expanded={openPanel === "bell"}
          onClick={() => toggle("bell")}
        >
          <BellIcon className="h-6 w-6" />
          {bellSeen ? null : (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#FF3B30] ring-2 ring-white" />
          )}
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

      {demoMode ? (
        <p className="shrink-0 px-4 pb-2 text-center text-[11px] font-semibold text-mcw">
          Demo mode
        </p>
      ) : null}

      <main
        id="app-main"
        className={`mcw-scroll min-h-0 flex-1 overflow-y-auto ${showTalk ? "pb-24" : "pb-6"}`}
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
            className="absolute top-[4.5rem] right-3 left-3 z-50 rounded-3xl bg-white p-4 shadow-[0_18px_50px_rgba(40,20,80,0.16)] ring-1 ring-black/5"
          >
            {openPanel === "bell" ? <BellPanel /> : <MenuPanel />}
          </div>
        </>
      ) : null}
    </div>
  );
}

function BellPanel() {
  const notes = [
    "3 buyers are ready for you.",
    "James Carter asked about blue, size 10.",
    "Ryan Thompson wants to schedule a call.",
    "Priya Sharma was followed up.",
  ];
  return (
    <div>
      <p className="text-sm font-bold text-ink">Today</p>
      <ul className="mt-3 space-y-2.5">
        {notes.map((note) => (
          <li key={note} className="text-sm leading-5 text-[#3C3A46]">
            {note}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MenuPanel() {
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
      <p className="mt-2 text-xs font-medium tracking-wide text-muted uppercase">
        By OKEREX
      </p>
      <p className="mt-3 text-sm leading-5 text-[#5C5870]">
        This is a preview. Chats stay on this screen, and nothing is connected
        yet.
      </p>
    </div>
  );
}
