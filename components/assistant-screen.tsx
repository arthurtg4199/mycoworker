"use client";

import { useState } from "react";
import { PaAvatar } from "@/components/pa-avatar";
import { assistantPrompts } from "@/lib/demo-data";

export function AssistantScreen() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = assistantPrompts.find((prompt) => prompt.id === activeId);

  return (
    <div className="px-5 pt-2 pb-8">
      <PaAvatar size="hero" idle className="mx-auto" />
      <h2 className="mt-2 text-center text-[1.65rem] font-extrabold tracking-[-0.04em] text-ink">
        Hi, I am MyCoWorker
      </h2>
      <p className="mt-2 text-center text-[15px] leading-6 font-medium text-[#4A4560]">
        I handle the chats. You close the deals.
      </p>
      <p className="mt-3 text-center text-sm leading-5 text-muted">
        Ask about today. I only know the demo inbox for now.
      </p>
      <div className="mt-6 flex flex-col gap-2">
        {assistantPrompts.map((prompt) => {
          const selected = prompt.id === activeId;
          return (
            <button
              key={prompt.id}
              type="button"
              aria-pressed={selected}
              onClick={() =>
                setActiveId((current) =>
                  current === prompt.id ? null : prompt.id,
                )
              }
              className={`rounded-full border px-4 py-3 text-left text-sm font-semibold ${
                selected
                  ? "border-mcw bg-mcw text-white"
                  : "border-[#E7E2F4] bg-white text-[#2C2840]"
              }`}
            >
              {prompt.label}
            </button>
          );
        })}
      </div>
      {active ? (
        <div className="mt-4 flex gap-3 rounded-3xl bg-mcw-soft p-4">
          <PaAvatar size="inline" className="shrink-0" />
          <p className="text-sm leading-6 text-[#2E2844]">{active.reply}</p>
        </div>
      ) : null}
    </div>
  );
}
