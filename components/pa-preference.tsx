"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { PaAvatar, PaPortrait } from "@/components/pa-avatar";
import { useSession } from "@/components/session";
import {
  DEFAULT_PA_AVATAR_ID,
  PA_AVATAR_META_KEY,
  PA_AVATAR_STORAGE_KEY,
  PA_AVATARS,
  isPaAvatarId,
  paAvatarById,
  paAvatarIdFromMetadata,
  readStoredPaAvatar,
  subscribePaAvatar,
  writeStoredPaAvatar,
  type PaAvatarId,
} from "@/lib/pa-avatar";
import { createClient } from "@/lib/supabase/client";

const PaAvatarSelectContext = createContext<(id: PaAvatarId) => void>(
  (id) => {
    writeStoredPaAvatar(id);
  },
);

export function usePaAvatar() {
  const id = useSyncExternalStore(
    subscribePaAvatar,
    readStoredPaAvatar,
    () => DEFAULT_PA_AVATAR_ID,
  );
  const select = useContext(PaAvatarSelectContext);
  return { id, select };
}

export function PaAvatarProvider({ children }: { children: React.ReactNode }) {
  const { demoMode } = useSession();
  const generation = useRef(0);

  useEffect(() => {
    if (demoMode) return;
    const generationAtStart = generation.current;
    let cancelled = false;

    async function syncFromAccount() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();
        if (cancelled || error || generation.current !== generationAtStart) return;

        const remote = paAvatarIdFromMetadata(data.user?.user_metadata);
        if (remote) {
          if (remote !== readStoredPaAvatar()) writeStoredPaAvatar(remote);
          return;
        }

        let explicit: string | null = null;
        try {
          explicit = window.localStorage.getItem(PA_AVATAR_STORAGE_KEY);
        } catch {
          explicit = null;
        }
        if (!isPaAvatarId(explicit)) return;

        const { error: updateError } = await supabase.auth.updateUser({
          data: { [PA_AVATAR_META_KEY]: explicit },
        });
        if (updateError) return;
      } catch {
        // The portrait on this device still follows localStorage.
      }
    }

    void syncFromAccount();
    return () => {
      cancelled = true;
    };
  }, [demoMode]);

  const select = useCallback(
    (id: PaAvatarId) => {
      generation.current += 1;
      writeStoredPaAvatar(id);
      if (demoMode) return;
      try {
        const supabase = createClient();
        void supabase.auth
          .updateUser({ data: { [PA_AVATAR_META_KEY]: id } })
          .catch(() => {
            // Keep the device choice when the account update does not land.
          });
      } catch {
        // Demo-safe: a missing client must not block the portrait.
      }
    },
    [demoMode],
  );

  return (
    <PaAvatarSelectContext value={select}>{children}</PaAvatarSelectContext>
  );
}

export function ChooseAssistant() {
  const { id, select } = usePaAvatar();
  const avatar = paAvatarById(id);
  const [open, setOpen] = useState(false);
  const optionsId = useId();
  const buttonRefs = useRef<Partial<Record<PaAvatarId, HTMLButtonElement>>>({});

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) buttonRefs.current[id]?.focus();
    wasOpen.current = open;
  }, [open, id]);

  function choose(next: PaAvatarId, moveFocus: boolean) {
    select(next);
    if (moveFocus) buttonRefs.current[next]?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const current = PA_AVATARS.findIndex((avatar) => avatar.id === id);
    const last = PA_AVATARS.length - 1;
    let nextIndex = current;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = current === last ? 0 : current + 1;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = current <= 0 ? last : current - 1;
    } else {
      return;
    }
    event.preventDefault();
    const next = PA_AVATARS[nextIndex];
    if (next) choose(next.id, true);
  }

  return (
    <section className="mt-4 rounded-3xl bg-white p-4 ring-1 ring-[#F0EAF8]">
      <h3 className="text-sm font-bold text-ink">Your assistant</h3>
      <p className="mt-1 text-sm leading-5 text-muted">
        This picture shows up when you talk to MyCoWorker.
      </p>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={optionsId}
        onClick={() => setOpen((current) => !current)}
        className={`mt-3 flex w-full items-center gap-3 rounded-2xl p-1 text-left ${
          open ? "bg-mcw-soft" : ""
        }`}
      >
        <PaAvatar size="hero" />
        <span className="min-w-0">
          <span className="block font-semibold text-ink">{avatar.label}</span>
          <span className="mt-0.5 block text-sm font-semibold text-mcw">
            {open ? "Done" : "Change picture"}
          </span>
        </span>
      </button>
      {open ? (
        <div
          id={optionsId}
          role="radiogroup"
          aria-label="Choose your assistant"
          className="mt-3 grid grid-cols-4 gap-2"
          onKeyDown={onKeyDown}
        >
          {PA_AVATARS.map((option) => {
            const selected = option.id === id;
            return (
              <button
                key={option.id}
                ref={(node) => {
                  buttonRefs.current[option.id] = node ?? undefined;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={option.detail}
                tabIndex={selected ? 0 : -1}
                onClick={() => choose(option.id, false)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl p-1.5 text-center ${
                  selected
                    ? "bg-mcw-soft ring-2 ring-mcw"
                    : "bg-white ring-1 ring-[#E7E2F4]"
                }`}
              >
                <PaPortrait
                  avatar={option}
                  crop="picker"
                  className="aspect-square w-full rounded-xl"
                />
                <span
                  className={`text-[11px] leading-tight font-semibold ${
                    selected ? "text-mcw" : "text-[#3C3A46]"
                  }`}
                >
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
