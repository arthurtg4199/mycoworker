"use client";

import { useActionState, useEffect, useId, useSyncExternalStore } from "react";
import { saveCustomerDetails, type CustomerFormState } from "@/app/customers/actions";
import {
  CRM_NOTES_MAX,
  readStoredCrmEdits,
  stageOptions,
  subscribeCrmEdits,
  writeStoredCrmEdit,
  type CrmEdits,
  type CrmMode,
} from "@/lib/crm";
import type { CustomerStage } from "@/lib/db/types";

const emptyEdits: CrmEdits = {};
const initialState: CustomerFormState = {};

const fieldClass =
  "mt-1.5 w-full rounded-2xl bg-[#F6F4FB] px-4 py-3 text-base font-semibold text-ink ring-1 ring-transparent outline-none placeholder:font-medium placeholder:text-[#B0ABBE] focus:ring-mcw";

export function CustomerEditor({
  mode,
  stageReady,
  id,
  stage,
  notes,
}: {
  mode: CrmMode;
  stageReady: boolean;
  id: string;
  stage: CustomerStage;
  notes: string;
}) {
  const formId = useId();
  const edits = useSyncExternalStore(
    subscribeCrmEdits,
    readStoredCrmEdits,
    () => emptyEdits,
  );
  const [state, formAction, pending] = useActionState(saveCustomerDetails, initialState);
  const stored = mode === "demo" ? edits[id] : undefined;
  const currentStage = stored?.stage ?? stage;
  const currentNotes = stored?.notes ?? notes;

  useEffect(() => {
    if (mode !== "demo" || !state.ok || !state.demo || !state.stage) return;
    writeStoredCrmEdit(id, { stage: state.stage, notes: state.notes ?? "" });
  }, [id, mode, state]);

  const hint = !stageReady
    ? "Stage needs the latest database migration. Notes still save."
    : mode === "demo"
      ? "Saving keeps this on this device."
      : "Only you can see this.";

  return (
    <section className="mt-4 rounded-3xl bg-white p-4 ring-1 ring-[#F0EAF8]">
      <h3 className="text-sm font-bold text-ink">Stage and notes</h3>
      <p className="mt-1 text-sm leading-5 text-muted">
        {mode === "sample"
          ? "Sample notes stay as they are. Your own customers can be edited."
          : hint}
      </p>
      {mode === "sample" ? (
        <>
          <p className="mt-3 text-sm font-semibold text-ink">Stage</p>
          <p className="mt-1.5 text-base font-semibold text-[#3C3458]">
            {stageOptions.find((option) => option.id === currentStage)?.label}
          </p>
          <p className="mt-4 text-sm font-semibold text-ink">Notes</p>
          <p className="mt-1.5 text-sm leading-5 break-words whitespace-pre-wrap text-[#3C3458]">
            {currentNotes || "No notes yet."}
          </p>
        </>
      ) : (
        <>
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
          <form key={`${currentStage}\n${currentNotes}`} action={formAction} className="mt-4">
            <input type="hidden" name="id" value={id} />
            <label className="block text-sm font-semibold text-ink" htmlFor={`${formId}-stage`}>
              Stage
            </label>
            <select
              id={`${formId}-stage`}
              name="stage"
              defaultValue={currentStage}
              className={fieldClass}
            >
              {stageOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <label
              className="mt-4 block text-sm font-semibold text-ink"
              htmlFor={`${formId}-notes`}
            >
              Notes
            </label>
            <textarea
              id={`${formId}-notes`}
              name="notes"
              rows={4}
              maxLength={CRM_NOTES_MAX}
              defaultValue={currentNotes}
              placeholder="Anything you want to remember"
              className={`${fieldClass} resize-none leading-6`}
            />
            <button
              type="submit"
              disabled={pending}
              className="mt-5 w-full rounded-full bg-mcw py-3 text-base font-semibold text-white shadow-[0_10px_24px_rgba(108,76,224,0.35)] disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
