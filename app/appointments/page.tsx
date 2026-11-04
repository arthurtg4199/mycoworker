import type { Metadata } from "next";
import { Suspense } from "react";
import { AppointmentsScreen } from "@/components/appointments-screen";
import { loadAppointmentBoard } from "@/lib/db/appointments";

export const metadata: Metadata = {
  title: "Appointments",
};

export default function AppointmentsPage() {
  return (
    <Suspense fallback={<AppointmentsFallback />}>
      <AppointmentsLoader />
    </Suspense>
  );
}

function AppointmentsFallback() {
  return (
    <div className="px-4 pt-2 pb-8">
      <h2 className="text-[1.35rem] font-extrabold tracking-[-0.03em] text-ink">
        Appointments
      </h2>
      <p className="mt-1 text-sm leading-5 text-muted">Loading bookings…</p>
    </div>
  );
}

async function AppointmentsLoader() {
  const board = await loadAppointmentBoard();
  return (
    <AppointmentsScreen
      mode={board.mode}
      notice={board.notice}
      items={board.items}
      customerNames={board.customerNames}
    />
  );
}
