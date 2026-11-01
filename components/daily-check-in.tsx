"use client";

import { useSyncExternalStore } from "react";
import { PaAvatar } from "@/components/pa-avatar";
import { useSession } from "@/components/session";
import {
  readStoredHandlingMode,
  subscribeHandlingMode,
  type HandlingMode,
} from "@/lib/assistant-mode";
import { handlingStance, nudgeTypeLabel, type DailyCheckIn } from "@/lib/nudges";

export function DailyCheckInCard({
  checkIn,
  mode,
  className = "mx-4 mt-3",
}: {
  checkIn: DailyCheckIn;
  mode: HandlingMode;
  className?: string;
}) {
  const { demoMode } = useSession();
  const stored = useSyncExternalStore(
    subscribeHandlingMode,
    readStoredHandlingMode,
    () => null,
  );
  const active = demoMode ? (stored ?? mode) : mode;

  return (
    <section
      className={`${className} rounded-[22px] bg-white px-3.5 py-3.5 ring-1 ring-[#F0EAF8]`}
    >
      <div className="flex items-center gap-3">
        <PaAvatar size="inline" />
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-wide text-mcw uppercase">
            Morning check-in
          </p>
          <h3 className="text-[15px] leading-5 font-bold text-ink">{checkIn.title}</h3>
        </div>
      </div>
      {checkIn.lines.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {checkIn.lines.map((line) => (
            <li key={line.id} className="flex gap-2 text-sm leading-5 text-[#3C3458]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-mcw" />
              <span>
                <span className="font-semibold text-ink">{line.text}</span>
                <span className="mt-0.5 block text-xs font-semibold text-muted">
                  {nudgeTypeLabel(line.type)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-5 text-[#4A4560]">{checkIn.quiet}</p>
      )}
      <p className="mt-3 text-sm leading-5 text-[#5C5870]">{handlingStance(active)}</p>
    </section>
  );
}
