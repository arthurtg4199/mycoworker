"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useState, useSyncExternalStore } from "react";
import { saveAppointmentAction } from "@/app/appointments/actions";
import { PaAvatar } from "@/components/pa-avatar";
import {
  applyAppointmentChange,
  appointmentSummary,
  emptyStoredAppointments,
  formatAppointmentWhen,
  groupAppointments,
  isoFromDateTimeLocal,
  readStoredAppointments,
  statusLabel,
  subscribeAppointments,
  uniqueNames,
  writeStoredAppointments,
  type AppointmentActionState,
  type AppointmentItem,
} from "@/lib/appointments";

const initialState: AppointmentActionState = {};

const fieldClass =
  "mt-1.5 w-full rounded-2xl bg-[#F6F4FB] px-4 py-3 text-base font-semibold text-ink ring-1 ring-transparent outline-none placeholder:font-medium placeholder:text-[#B0ABBE] focus:ring-mcw";

const statusTone = {
  scheduled: "bg-mcw-soft text-mcw",
  completed: "bg-[#E5F6EC] text-[#1F7A4D]",
  cancelled: "bg-[#F4F2F8] text-[#5C5870]",
} as const;

function useOnClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function AppointmentsScreen({
  mode,
  notice,
  items,
  customerNames,
}: {
  mode: "demo" | "live" | "unavailable";
  notice: string | null;
  items: AppointmentItem[];
  customerNames: string[];
}) {
  const stored = useSyncExternalStore(
    subscribeAppointments,
    readStoredAppointments,
    emptyStoredAppointments,
  );
  const ready = useOnClient();
  const [state, action, pending] = useActionState(
    saveAppointmentAction,
    initialState,
  );
  const [openedOn, setOpenedOn] = useState<AppointmentActionState | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const showForm =
    openedOn !== null && (openedOn === state || state.ok === false);
  const visible = mode === "demo" ? (stored ?? items) : items;
  const groups = ready ? groupAppointments(visible, new Date()) : null;
  const names = uniqueNames([
    ...customerNames,
    ...visible.map((item) => item.customerName),
  ]);

  useEffect(() => {
    if (mode !== "demo" || !state.ok || !state.demo || !state.change) return;
    const base = readStoredAppointments() ?? items;
    writeStoredAppointments(applyAppointmentChange(base, state.change));
  }, [mode, state, items]);

  const intro =
    mode === "demo"
      ? "Sample bookings you can edit. They stay on this device."
      : mode === "unavailable"
        ? notice
        : "Times you set with customers.";

  const summary = groups ? appointmentSummary(groups) : null;
  const locked = mode === "unavailable";

  return (
    <div className="px-4 pt-2 pb-8">
      <h2 className="text-[1.35rem] font-extrabold tracking-[-0.03em] text-ink">
        Appointments
      </h2>
      {intro ? (
        <p className="mt-1 text-sm leading-5 text-muted">{intro}</p>
      ) : null}
      {summary ? (
        <p className="mt-1 text-sm font-semibold text-[#3C3458]">{summary}</p>
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
      ) : null}

      {locked ? null : showForm ? (
        <BookingForm
          action={action}
          pending={pending}
          names={names}
          showCustomerHint={mode === "live" && customerNames.length === 0}
          onClose={() => setOpenedOn(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setConfirmId(null);
            setOpenedOn(state);
          }}
          className="mt-4 w-full rounded-full bg-mcw py-3 text-base font-semibold text-white shadow-[0_10px_24px_rgba(108,76,224,0.35)]"
        >
          Add a booking
        </button>
      )}

      {visible.length === 0 ? (
        <div className="px-2 py-10 text-center">
          <PaAvatar size="empty" className="mx-auto" />
          <p className="mt-4 text-sm leading-5 text-muted">
            No bookings yet. Add one when a customer picks a time.
          </p>
        </div>
      ) : groups ? (
        <div className="mt-5 space-y-5">
          <AppointmentGroup
            title="Today"
            items={groups.today}
            action={action}
            pending={pending || locked}
            confirmId={confirmId}
            onConfirm={setConfirmId}
          />
          <AppointmentGroup
            title="Upcoming"
            items={groups.upcoming}
            action={action}
            pending={pending || locked}
            confirmId={confirmId}
            onConfirm={setConfirmId}
          />
          <AppointmentGroup
            title="Past"
            items={groups.past}
            action={action}
            pending={pending || locked}
            confirmId={confirmId}
            onConfirm={setConfirmId}
          />
        </div>
      ) : null}

      <Link href="/" className="mt-6 inline-flex text-sm font-semibold text-mcw">
        Back to Inbox
      </Link>
    </div>
  );
}

function BookingForm({
  action,
  pending,
  names,
  showCustomerHint,
  onClose,
}: {
  action: (formData: FormData) => void;
  pending: boolean;
  names: string[];
  showCustomerHint: boolean;
  onClose: () => void;
}) {
  const formId = useId();
  const listId = `${formId}-customers`;
  const [when, setWhen] = useState("");
  const scheduledAt = isoFromDateTimeLocal(when);

  return (
    <form action={action} className="mt-4 rounded-3xl bg-white p-4 ring-1 ring-[#F0EAF8]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-ink">New booking</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-semibold text-mcw"
        >
          Close
        </button>
      </div>
      <input type="hidden" name="intent" value="create" />
      <input type="hidden" name="scheduled_at" value={scheduledAt} />

      <label className="mt-3 block text-sm font-semibold text-ink" htmlFor={`${formId}-customer`}>
        Customer
      </label>
      <input
        id={`${formId}-customer`}
        name="customer"
        required
        maxLength={120}
        autoComplete="name"
        list={names.length > 0 ? listId : undefined}
        placeholder="Customer name"
        className={fieldClass}
      />
      {names.length > 0 ? (
        <datalist id={listId}>
          {names.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      ) : null}
      {showCustomerHint ? (
        <p className="mt-1.5 text-xs leading-5 text-muted">
          This also saves the customer on your account.
        </p>
      ) : null}

      <label className="mt-4 block text-sm font-semibold text-ink" htmlFor={`${formId}-when`}>
        When
      </label>
      <input
        id={`${formId}-when`}
        type="datetime-local"
        required
        value={when}
        onChange={(event) => setWhen(event.target.value)}
        className={fieldClass}
      />

      <label className="mt-4 block text-sm font-semibold text-ink" htmlFor={`${formId}-note`}>
        Note
      </label>
      <input
        id={`${formId}-note`}
        name="note"
        required
        maxLength={160}
        placeholder="What is this for?"
        className={fieldClass}
      />

      <button
        type="submit"
        disabled={pending || !scheduledAt}
        className="mt-5 w-full rounded-full bg-mcw py-3 text-base font-semibold text-white shadow-[0_10px_24px_rgba(108,76,224,0.35)] disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save booking"}
      </button>
    </form>
  );
}

function AppointmentGroup({
  title,
  items,
  action,
  pending,
  confirmId,
  onConfirm,
}: {
  title: string;
  items: AppointmentItem[];
  action: (formData: FormData) => void;
  pending: boolean;
  confirmId: string | null;
  onConfirm: (id: string | null) => void;
}) {
  if (items.length === 0) return null;
  const now = new Date();
  return (
    <section>
      <h3 className="text-sm font-bold text-ink">{title}</h3>
      <ul className="mt-2 space-y-3">
        {items.map((item) => (
          <AppointmentCard
            key={item.id}
            item={item}
            when={formatAppointmentWhen(item.scheduledAt, now)}
            action={action}
            pending={pending}
            confirming={confirmId === item.id}
            onConfirm={onConfirm}
          />
        ))}
      </ul>
    </section>
  );
}

function AppointmentCard({
  item,
  when,
  action,
  pending,
  confirming,
  onConfirm,
}: {
  item: AppointmentItem;
  when: string;
  action: (formData: FormData) => void;
  pending: boolean;
  confirming: boolean;
  onConfirm: (id: string | null) => void;
}) {
  return (
    <li className="rounded-3xl bg-white p-4 ring-1 ring-[#F0EAF8]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold break-words text-ink">{item.customerName}</p>
          {when ? (
            <p className="mt-0.5 text-sm font-medium text-muted">{when}</p>
          ) : null}
        </div>
        <span
          className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] leading-none font-semibold whitespace-nowrap ${statusTone[item.status]}`}
        >
          {statusLabel(item.status)}
        </span>
      </div>
      <p className="mt-3 text-sm leading-5 break-words text-[#3C3A46]">{item.note}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {item.status === "scheduled" ? (
          <>
            <form action={action}>
              <input type="hidden" name="intent" value="complete" />
              <input type="hidden" name="id" value={item.id} />
              <button
                type="submit"
                disabled={pending}
                className="text-sm font-semibold text-mcw disabled:opacity-60"
              >
                Mark done
              </button>
            </form>
            <form action={action}>
              <input type="hidden" name="intent" value="cancel" />
              <input type="hidden" name="id" value={item.id} />
              <button
                type="submit"
                disabled={pending}
                className="text-sm font-semibold text-[#5C5870] disabled:opacity-60"
              >
                Cancel it
              </button>
            </form>
          </>
        ) : null}
        {confirming ? (
          <form action={action} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="intent" value="delete" />
            <input type="hidden" name="id" value={item.id} />
            <span className="text-sm text-[#3C3A46]">Delete this booking?</span>
            <button
              type="submit"
              disabled={pending}
              className="text-sm font-semibold text-[#9B3A4A] disabled:opacity-60"
            >
              Yes, delete
            </button>
            <button
              type="button"
              onClick={() => onConfirm(null)}
              className="text-sm font-semibold text-mcw"
            >
              Keep it
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => onConfirm(item.id)}
            className="text-sm font-semibold text-[#8B909A]"
          >
            Delete
          </button>
        )}
      </div>
    </li>
  );
}
