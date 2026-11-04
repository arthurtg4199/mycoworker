"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  emptyStoredAppointments,
  readStoredAppointments,
  subscribeAppointments,
  todayAppointmentCount,
  type AppointmentItem,
} from "@/lib/appointments";

function useOnClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function AppointmentsTodayLink({
  mode,
  items,
}: {
  mode: "demo" | "live" | "unavailable";
  items: AppointmentItem[];
}) {
  const stored = useSyncExternalStore(
    subscribeAppointments,
    readStoredAppointments,
    emptyStoredAppointments,
  );
  const ready = useOnClient();
  const visible = mode === "demo" ? (stored ?? items) : items;
  const count = ready ? todayAppointmentCount(visible, new Date()) : null;
  const detail =
    mode === "unavailable"
      ? "Open bookings"
      : count === null
        ? "Today and upcoming"
        : count === 0
          ? "Nothing today"
          : count === 1
            ? "1 today"
            : `${count} today`;

  return (
    <Link
      href="/appointments"
      className="mt-3 flex items-center justify-between gap-3 rounded-3xl bg-white p-4 ring-1 ring-[#F0EAF8]"
    >
      <span className="min-w-0">
        <span className="block text-sm font-bold text-ink">Appointments</span>
        <span className="mt-0.5 block text-sm font-medium text-[#4A4560]">
          {detail}
        </span>
      </span>
      <span className="shrink-0 text-sm font-semibold text-mcw">Open</span>
    </Link>
  );
}
