"use client";

import { useActionState, useEffect, useSyncExternalStore } from "react";
import { saveHandlingMode, type HandlingModeState } from "@/app/settings/actions";
import {
  handlingModes,
  readStoredHandlingMode,
  subscribeHandlingMode,
  writeStoredHandlingMode,
  type HandlingMode,
} from "@/lib/assistant-mode";
import { useSession } from "@/components/session";

const initialState: HandlingModeState = {};

export function HandlingModeControl({ mode }: { mode: HandlingMode }) {
  const { demoMode } = useSession();
  const stored = useSyncExternalStore(
    subscribeHandlingMode,
    readStoredHandlingMode,
    () => null,
  );
  const [state, action, pending] = useActionState(saveHandlingMode, initialState);
  const current = demoMode
    ? (state.mode ?? stored ?? mode)
    : (state.mode ?? mode);

  useEffect(() => {
    if (!demoMode || !state.ok || !state.demo || !state.mode) return;
    writeStoredHandlingMode(state.mode);
  }, [demoMode, state]);

  return (
    <section className="mt-4 rounded-3xl bg-white p-4 ring-1 ring-[#F0EAF8]">
      <h3 className="text-sm font-bold text-ink">How I handle chats</h3>
      <p className="mt-1 text-sm leading-5 text-muted">
        Ask me first is the safest. I nudge you in the app, and I wait before a
        customer hears from me.
      </p>
      <form action={action} className="mt-3 grid gap-2">
        <div role="radiogroup" aria-label="How I handle chats" className="grid gap-2">
          {handlingModes.map((item) => {
            const selected = current === item.id;
            return (
              <button
                key={item.id}
                type="submit"
                name="mode"
                value={item.id}
                role="radio"
                aria-checked={selected}
                disabled={pending}
                onClick={() => {
                  if (demoMode) writeStoredHandlingMode(item.id);
                }}
                className={`rounded-2xl px-3.5 py-3 text-left ring-1 disabled:opacity-60 ${
                  selected
                    ? "bg-mcw-soft ring-mcw"
                    : "bg-[#F6F4FB] ring-transparent"
                }`}
              >
                <span className="block text-sm font-bold text-ink">{item.label}</span>
                <span className="mt-0.5 block text-xs leading-5 font-medium text-muted">
                  {item.hint}
                </span>
              </button>
            );
          })}
        </div>
      </form>
      <p className="mt-3 text-xs leading-5 text-muted">
        This does not send a message by itself. Channel sending stays where it
        already is.
      </p>
      {state.message ? (
        <p
          role="status"
          aria-live="polite"
          className={`mt-3 rounded-2xl px-3.5 py-3 text-sm leading-5 font-semibold ${
            state.ok ? "bg-mcw-soft text-[#3C3458]" : "bg-[#FFF5F6] text-[#9B3A4A]"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
