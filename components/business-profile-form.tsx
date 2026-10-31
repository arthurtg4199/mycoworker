"use client";

import { useActionState, useEffect, useId, useState, useSyncExternalStore } from "react";
import { saveBusinessProfile } from "@/app/settings/actions";
import {
  currencyChoices,
  profileLimits,
  readStoredBusinessProfile,
  replyToneHint,
  replyToneLabel,
  replyTones,
  subscribeBusinessProfile,
  writeStoredBusinessProfile,
  type BusinessProfileFields,
  type ProfileFormState,
  type ReplyTone,
} from "@/lib/business-profile";

const initialState: ProfileFormState = {};

const fieldClass =
  "mt-1.5 w-full rounded-2xl bg-[#F6F4FB] px-4 py-3 text-base font-semibold text-ink ring-1 ring-transparent outline-none placeholder:font-medium placeholder:text-[#B0ABBE] focus:ring-mcw";

export function BusinessProfileForm({
  mode,
  initial,
  notice,
}: {
  mode: "demo" | "live" | "unavailable";
  initial: BusinessProfileFields;
  notice: string | null;
}) {
  const stored = useSyncExternalStore(
    subscribeBusinessProfile,
    readStoredBusinessProfile,
    () => null,
  );
  const base = mode === "demo" && stored ? stored : initial;
  const [state, formAction, pending] = useActionState(
    saveBusinessProfile,
    initialState,
  );

  useEffect(() => {
    if (mode !== "demo" || !state.ok || !state.demo || !state.fields) return;
    writeStoredBusinessProfile(state.fields);
  }, [mode, state]);

  const intro =
    mode === "demo"
      ? stored
        ? "This copy stays on this device until you sign in."
        : "This is a sample shop so you can try the form. Saving keeps it on this device."
      : base.business_name
        ? "I use this when I talk to your customers."
        : "Tell me about the shop so I can sound like you.";

  const tone = replyToneLabel(base.reply_tone);
  const details = [base.location, base.hours, `${tone} replies`, base.currency]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="mt-4 rounded-3xl bg-white p-4 ring-1 ring-[#F0EAF8]">
      <h3 className="text-sm font-bold text-ink">Your shop</h3>
      <p className="mt-1 text-sm leading-5 text-muted">{intro}</p>
      {base.business_name ? (
        <div className="mt-3 rounded-2xl bg-mcw-soft px-3.5 py-3">
          <p className="text-base font-bold break-words text-ink">{base.business_name}</p>
          {base.what_they_sell ? (
            <p className="mt-0.5 text-sm leading-5 break-words text-[#3C3458]">
              {base.what_they_sell}
            </p>
          ) : null}
          {details ? (
            <p className="mt-1 text-sm font-medium text-[#5C5870]">{details}</p>
          ) : null}
        </div>
      ) : null}
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
      ) : notice ? (
        <p
          role="status"
          className="mt-3 rounded-2xl bg-[#FFF5F6] px-3.5 py-3 text-sm leading-5 font-semibold text-[#9B3A4A]"
        >
          {notice}
        </p>
      ) : null}
      <ShopFields
        key={JSON.stringify(base)}
        base={base}
        action={formAction}
        pending={pending}
      />
    </section>
  );
}

function ShopFields({
  base,
  action,
  pending,
}: {
  base: BusinessProfileFields;
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  const formId = useId();
  const [tone, setTone] = useState<ReplyTone>(base.reply_tone);
  const knownCurrency = currencyChoices.some((item) => item.code === base.currency);

  return (
    <form action={action} className="mt-4">
      <label
        className="block text-sm font-semibold text-ink"
        htmlFor={`${formId}-name`}
      >
        Business name
      </label>
      <input
        id={`${formId}-name`}
        name="business_name"
        required
        maxLength={profileLimits.business_name}
        autoComplete="organization"
        defaultValue={base.business_name}
        placeholder="Ada's Cakes"
        className={fieldClass}
      />

      <label
        className="mt-4 block text-sm font-semibold text-ink"
        htmlFor={`${formId}-sell`}
      >
        What you sell
      </label>
      <textarea
        id={`${formId}-sell`}
        name="what_they_sell"
        rows={3}
        maxLength={profileLimits.what_they_sell}
        defaultValue={base.what_they_sell}
        placeholder="Birthday cakes and custom orders"
        className={`${fieldClass} resize-none leading-6`}
      />

      <label
        className="mt-4 block text-sm font-semibold text-ink"
        htmlFor={`${formId}-hours`}
      >
        Hours
      </label>
      <textarea
        id={`${formId}-hours`}
        name="hours"
        rows={2}
        maxLength={profileLimits.hours}
        defaultValue={base.hours}
        placeholder="Mon–Sat, 9am–6pm. Closed Sunday."
        className={`${fieldClass} resize-none leading-6`}
      />

      <label
        className="mt-4 block text-sm font-semibold text-ink"
        htmlFor={`${formId}-city`}
      >
        City
      </label>
      <input
        id={`${formId}-city`}
        name="location"
        maxLength={profileLimits.location}
        autoComplete="address-level2"
        defaultValue={base.location}
        placeholder="Lagos"
        className={fieldClass}
      />

      <fieldset className="mt-4">
        <legend className="text-sm font-semibold text-ink">How I should reply</legend>
        <div
          role="radiogroup"
          aria-label="How I should reply"
          className="mt-2 flex flex-wrap gap-2"
        >
          {replyTones.map((option) => {
            const selected = tone === option.id;
            return (
              <label key={option.id} className="cursor-pointer">
                <input
                  type="radio"
                  name="reply_tone"
                  value={option.id}
                  checked={selected}
                  onChange={() => setTone(option.id)}
                  className="peer sr-only"
                />
                <span
                  className={`inline-flex rounded-full border px-3 py-1.5 text-[13.5px] font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-mcw ${
                    selected
                      ? "border-mcw bg-mcw-soft text-mcw"
                      : "border-[#ECEDEF] bg-white text-[#2A2A2E]"
                  }`}
                >
                  {option.label}
                </span>
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-sm text-muted">{replyToneHint(tone)}</p>
      </fieldset>

      <label
        className="mt-4 block text-sm font-semibold text-ink"
        htmlFor={`${formId}-currency`}
      >
        Currency
      </label>
      <select
        id={`${formId}-currency`}
        name="currency"
        defaultValue={base.currency}
        className={fieldClass}
      >
        <option value="">No currency yet</option>
        {base.currency && !knownCurrency ? (
          <option value={base.currency}>{base.currency}</option>
        ) : null}
        {currencyChoices.map((item) => (
          <option key={item.code} value={item.code}>
            {item.label}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-xs leading-5 text-muted">
        For how I talk about prices. Nothing is charged here.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full rounded-full bg-mcw py-3 text-base font-semibold text-white shadow-[0_10px_24px_rgba(108,76,224,0.35)] disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save shop"}
      </button>
    </form>
  );
}
