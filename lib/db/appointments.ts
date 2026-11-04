import { cache } from "react";
import { connection } from "next/server";
import {
  sampleAppointments,
  sampleCustomerNames,
  uniqueNames,
  type AppointmentItem,
  type AppointmentStatus,
} from "@/lib/appointments";
import {
  createAppointment,
  createCustomer,
  DatabaseNotConfiguredError,
  DatabaseQueryError,
  listAppointments,
  listCustomers,
  updateAppointment,
} from "@/lib/db/queries";
import { assertId } from "@/lib/db/validate";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type AppointmentBoard = {
  mode: "demo" | "live" | "unavailable";
  notice: string | null;
  items: AppointmentItem[];
  customerNames: string[];
};

function itemFromRow(
  row: {
    id: string;
    customer_id: string;
    title: string;
    scheduled_at: string;
    status: AppointmentStatus;
  },
  names: Map<string, string>,
): AppointmentItem {
  return {
    id: row.id,
    customerName: names.get(row.customer_id) || "Customer",
    note: row.title,
    scheduledAt: row.scheduled_at,
    status: row.status,
  };
}

/**
 * Demo bookings when Supabase is unset.
 * A signed-in account reads the appointments table, even when it is empty.
 * A failed read stays empty instead of mixing sample people into the account.
 */
export const loadAppointmentBoard = cache(async (): Promise<AppointmentBoard> => {
  await connection();
  const now = new Date();
  if (!getSupabaseEnv()) {
    return {
      mode: "demo",
      notice: null,
      items: sampleAppointments(now),
      customerNames: sampleCustomerNames(now),
    };
  }

  try {
    const [appointments, customers] = await Promise.all([
      listAppointments(),
      listCustomers(),
    ]);
    const names = new Map(
      customers.map((customer) => [
        customer.id,
        customer.name.trim() || "Customer",
      ]),
    );
    return {
      mode: "live",
      notice: null,
      items: appointments.map((row) => itemFromRow(row, names)),
      customerNames: uniqueNames(customers.map((customer) => customer.name)),
    };
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return {
        mode: "demo",
        notice: null,
        items: sampleAppointments(now),
        customerNames: sampleCustomerNames(now),
      };
    }
    console.error(
      "MyCoWorker could not load appointments.",
      error instanceof Error ? error.message : error,
    );
    return {
      mode: "unavailable",
      notice: "I could not open your bookings yet. Refresh in a moment.",
      items: [],
      customerNames: [],
    };
  }
});

export async function bookAppointment(input: {
  customerName: string;
  note: string;
  scheduledAt: string;
}) {
  const customers = await listCustomers();
  const key = input.customerName.trim().toLowerCase();
  const existing = customers.find(
    (customer) => customer.name.trim().toLowerCase() === key,
  );
  let customerId = existing?.id;
  let createdCustomer = false;
  if (!customerId) {
    const customer = await createCustomer({
      name: input.customerName,
      channel: "whatsapp",
    });
    customerId = customer.id;
    createdCustomer = true;
  }
  const appointment = await createAppointment({
    customer_id: customerId,
    title: input.note,
    scheduled_at: input.scheduledAt,
  });
  return {
    createdCustomer,
    item: {
      id: appointment.id,
      customerName: input.customerName.trim(),
      note: appointment.title,
      scheduledAt: appointment.scheduled_at,
      status: appointment.status,
    } satisfies AppointmentItem,
  };
}

export async function setAppointmentStatus(
  id: string,
  status: "completed" | "cancelled",
) {
  return updateAppointment(id, { status });
}

export async function deleteAppointment(id: string) {
  if (!getSupabaseEnv()) throw new DatabaseNotConfiguredError();
  const db = await createClient();
  const appointmentId = assertId(id, "Appointment");
  const { data, error } = await db
    .from("appointments")
    .delete()
    .eq("id", appointmentId)
    .select("id")
    .maybeSingle();
  if (error) throw new DatabaseQueryError(error.message, error.code);
  return Boolean(data);
}
