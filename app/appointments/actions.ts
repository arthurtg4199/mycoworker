"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import {
  isAppointmentId,
  parseBookingDraft,
  type AppointmentActionState,
  type AppointmentItem,
} from "@/lib/appointments";
import {
  bookAppointment,
  deleteAppointment,
  setAppointmentStatus,
} from "@/lib/db/appointments";
import {
  DatabaseNotConfiguredError,
  DatabaseQueryError,
} from "@/lib/db/queries";
import { getSupabaseEnv } from "@/lib/supabase/env";

function textField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function refreshBookings(createdCustomer: boolean) {
  revalidatePath("/appointments");
  revalidatePath("/analytics");
  if (createdCustomer) {
    revalidatePath("/");
    revalidatePath("/buyers");
  }
}

export async function saveAppointmentAction(
  _previous: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  const intent = textField(formData, "intent");

  if (intent === "create") {
    const parsed = parseBookingDraft({
      customerName: textField(formData, "customer"),
      note: textField(formData, "note"),
      scheduledAt: textField(formData, "scheduled_at"),
    });
    if (!parsed.ok) return { ok: false, message: parsed.message };

    if (!getSupabaseEnv()) {
      const item: AppointmentItem = {
        id: crypto.randomUUID(),
        customerName: parsed.draft.customerName,
        note: parsed.draft.note,
        scheduledAt: parsed.draft.scheduledAt,
        status: "scheduled",
      };
      return {
        ok: true,
        demo: true,
        message: "Saved on this device.",
        change: { type: "add", item },
      };
    }

    const user = await getAuthUser();
    if (!user) return { ok: false, message: "Sign in to save bookings." };

    try {
      const booked = await bookAppointment(parsed.draft);
      refreshBookings(booked.createdCustomer);
      return {
        ok: true,
        message: "Booking saved.",
        change: { type: "add", item: booked.item },
      };
    } catch (error) {
      return failure("MyCoWorker could not save the booking.", error);
    }
  }

  const id = textField(formData, "id");
  if (!isAppointmentId(id)) {
    return { ok: false, message: "That booking is not valid." };
  }

  if (intent === "complete" || intent === "cancel") {
    const status = intent === "complete" ? "completed" : "cancelled";
    if (!getSupabaseEnv()) {
      return {
        ok: true,
        demo: true,
        message: status === "completed" ? "Marked done." : "Booking cancelled.",
        change: { type: "status", id, status },
      };
    }
    const user = await getAuthUser();
    if (!user) return { ok: false, message: "Sign in to save bookings." };
    try {
      await setAppointmentStatus(id, status);
      refreshBookings(false);
      return {
        ok: true,
        message: status === "completed" ? "Marked done." : "Booking cancelled.",
        change: { type: "status", id, status },
      };
    } catch (error) {
      if (error instanceof DatabaseQueryError && error.code === "PGRST116") {
        return { ok: false, message: "That booking is already gone." };
      }
      return failure("MyCoWorker could not update the booking.", error);
    }
  }

  if (intent === "delete") {
    if (!getSupabaseEnv()) {
      return {
        ok: true,
        demo: true,
        message: "Booking deleted.",
        change: { type: "delete", id },
      };
    }
    const user = await getAuthUser();
    if (!user) return { ok: false, message: "Sign in to save bookings." };
    try {
      const removed = await deleteAppointment(id);
      refreshBookings(false);
      if (!removed) {
        return { ok: false, message: "That booking is already gone." };
      }
      return {
        ok: true,
        message: "Booking deleted.",
        change: { type: "delete", id },
      };
    } catch (error) {
      return failure("MyCoWorker could not delete the booking.", error);
    }
  }

  return { ok: false, message: "I could not tell what to do with that booking." };
}

function failure(label: string, error: unknown): AppointmentActionState {
  if (error instanceof DatabaseNotConfiguredError) {
    return {
      ok: false,
      message: "Sign in to save bookings.",
    };
  }
  console.error(
    label,
    error instanceof DatabaseQueryError ? error.message : error,
  );
  return {
    ok: false,
    message: "I could not save that just now. Try again.",
  };
}
