import type { PostgrestError } from "@supabase/supabase-js";
import { cache } from "react";
import {
  demoWorkspace,
  sampleWorkspace,
  unavailableWorkspace,
  workspaceFromRecords,
  type WorkspaceView,
} from "@/lib/db/inbox";
import { getWhatsAppConnection } from "@/lib/whatsapp/store";
import type {
  Appointment,
  AppointmentInput,
  AppointmentPatch,
  Channel,
  ChatPreview,
  Conversation,
  ConversationInput,
  ConversationPatch,
  ConversationStatus,
  Customer,
  CustomerInput,
  CustomerPatch,
  Message,
  MessageInput,
  MessageRole,
  Payment,
  PaymentInput,
  PaymentPatch,
  PaymentStatus,
  AppointmentStatus,
} from "@/lib/db/types";
import {
  appointmentInsert,
  appointmentUpdate,
  assertAmount,
  assertChannel,
  assertId,
  conversationInsert,
  conversationUpdate,
  customerInsert,
  customerUpdate,
  messageInsert,
  paymentInsert,
  paymentUpdate,
} from "@/lib/db/validate";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("Supabase is not configured.");
    this.name = "DatabaseNotConfiguredError";
  }
}

export class DatabaseQueryError extends Error {
  readonly code: string | undefined;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "DatabaseQueryError";
    this.code = code;
  }
}

type Db = Awaited<ReturnType<typeof createClient>>;

async function database() {
  if (!getSupabaseEnv()) throw new DatabaseNotConfiguredError();
  return createClient();
}

function throwQuery(error: PostgrestError): never {
  throw new DatabaseQueryError(error.message, error.code);
}

function requiredRow<T>(data: T | null, error: PostgrestError | null) {
  if (error) throwQuery(error);
  if (!data) {
    throw new DatabaseQueryError("The database did not return a row.", "PGRST116");
  }
  return data;
}

function asAmount(value: number | string) {
  return assertAmount(typeof value === "number" ? value : Number(value));
}

function customerFromRow(row: {
  id: string;
  user_id: string;
  name: string;
  channel: string;
  phone: string | null;
  email: string | null;
  mood: string | null;
  happiness: number | null;
  ready_to_close: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}): Customer {
  return {
    ...row,
    channel: assertChannel(row.channel),
  };
}

function conversationFromRow(row: {
  id: string;
  user_id: string;
  customer_id: string;
  channel: string;
  status: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}): Conversation {
  return {
    ...row,
    channel: assertChannel(row.channel),
    status: row.status as ConversationStatus,
  };
}

function messageFromRow(row: {
  id: string;
  chat_id: string;
  role: string;
  content: string;
  created_at: string;
}): Message {
  return {
    ...row,
    role: row.role as MessageRole,
  };
}

function appointmentFromRow(row: {
  id: string;
  user_id: string;
  customer_id: string;
  title: string;
  scheduled_at: string;
  status: string;
  created_at: string;
  updated_at: string;
}): Appointment {
  return {
    ...row,
    status: row.status as AppointmentStatus,
  };
}

function paymentFromRow(row: {
  id: string;
  user_id: string;
  customer_id: string;
  amount: number | string;
  currency: string;
  status: string;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}): Payment {
  return {
    id: row.id,
    user_id: row.user_id,
    customer_id: row.customer_id,
    amount: asAmount(row.amount),
    currency: row.currency,
    status: row.status as PaymentStatus,
    confirmed_at: row.confirmed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function previewFromRow(row: {
  id: string;
  customer_id: string;
  channel: string;
  status: string;
  last_message_at: string | null;
  updated_at: string;
  customer_name: string;
  ready_to_close: boolean;
  last_message: string | null;
}): ChatPreview {
  return {
    id: row.id,
    customer_id: row.customer_id,
    channel: assertChannel(row.channel),
    status: row.status as ConversationStatus,
    last_message_at: row.last_message_at,
    updated_at: row.updated_at,
    customer_name: row.customer_name,
    ready_to_close: row.ready_to_close,
    last_message: row.last_message,
  };
}

export async function listCustomers(): Promise<Customer[]> {
  return listCustomersOn(await database());
}

async function listCustomersOn(db: Db) {
  const { data, error } = await db
    .from("customers")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throwQuery(error);
  return (data ?? []).map(customerFromRow);
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const db = await database();
  const { data, error } = await db
    .from("customers")
    .insert(customerInsert(input))
    .select("*")
    .single();
  return customerFromRow(requiredRow(data, error));
}

export async function updateCustomer(
  id: string,
  input: CustomerPatch,
): Promise<Customer> {
  const db = await database();
  const { data, error } = await db
    .from("customers")
    .update(customerUpdate(input))
    .eq("id", assertId(id, "Customer"))
    .select("*")
    .single();
  return customerFromRow(requiredRow(data, error));
}

export async function listConversations(): Promise<Conversation[]> {
  const db = await database();
  const { data, error } = await db
    .from("chats")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false });
  if (error) throwQuery(error);
  return (data ?? []).map(conversationFromRow);
}

export async function createConversation(
  input: ConversationInput,
): Promise<Conversation> {
  const db = await database();
  const { data, error } = await db
    .from("chats")
    .insert(conversationInsert(input))
    .select("*")
    .single();
  return conversationFromRow(requiredRow(data, error));
}

export async function updateConversation(
  id: string,
  input: ConversationPatch,
): Promise<Conversation> {
  const db = await database();
  const { data, error } = await db
    .from("chats")
    .update(conversationUpdate(input))
    .eq("id", assertId(id, "Chat"))
    .select("*")
    .single();
  return conversationFromRow(requiredRow(data, error));
}

export async function listMessages(chatId: string): Promise<Message[]> {
  const db = await database();
  const { data, error } = await db
    .from("messages")
    .select("*")
    .eq("chat_id", assertId(chatId, "Chat"))
    .order("created_at", { ascending: true });
  if (error) throwQuery(error);
  return (data ?? []).map(messageFromRow);
}

export async function createMessage(input: MessageInput): Promise<Message> {
  const db = await database();
  const { data, error } = await db
    .from("messages")
    .insert(messageInsert(input))
    .select("*")
    .single();
  return messageFromRow(requiredRow(data, error));
}

export async function listAppointments(): Promise<Appointment[]> {
  const db = await database();
  const { data, error } = await db
    .from("appointments")
    .select("*")
    .order("scheduled_at", { ascending: true });
  if (error) throwQuery(error);
  return (data ?? []).map(appointmentFromRow);
}

export async function createAppointment(
  input: AppointmentInput,
): Promise<Appointment> {
  const db = await database();
  const { data, error } = await db
    .from("appointments")
    .insert(appointmentInsert(input))
    .select("*")
    .single();
  return appointmentFromRow(requiredRow(data, error));
}

export async function updateAppointment(
  id: string,
  input: AppointmentPatch,
): Promise<Appointment> {
  const db = await database();
  const { data, error } = await db
    .from("appointments")
    .update(appointmentUpdate(input))
    .eq("id", assertId(id, "Appointment"))
    .select("*")
    .single();
  return appointmentFromRow(requiredRow(data, error));
}

export async function listPayments(): Promise<Payment[]> {
  const db = await database();
  const { data, error } = await db
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throwQuery(error);
  return (data ?? []).map((row) => paymentFromRow(row));
}

export async function createPayment(input: PaymentInput): Promise<Payment> {
  const db = await database();
  const { data, error } = await db
    .from("payments")
    .insert(paymentInsert(input))
    .select("*")
    .single();
  return paymentFromRow(requiredRow(data, error));
}

export async function updatePayment(
  id: string,
  input: PaymentPatch,
): Promise<Payment> {
  const db = await database();
  const { data, error } = await db
    .from("payments")
    .update(paymentUpdate(input))
    .eq("id", assertId(id, "Payment"))
    .select("*")
    .single();
  return paymentFromRow(requiredRow(data, error));
}

async function listChatPreviewsOn(db: Db): Promise<ChatPreview[]> {
  const { data, error } = await db
    .from("chat_previews")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false });
  if (error) throwQuery(error);
  return (data ?? []).map(previewFromRow);
}

/**
 * Demo inbox when Supabase is unset.
 * A signed-in account with no rows and WhatsApp disconnected stays on sample chats.
 * Saved rows replace the sample once any customer or chat exists, or WhatsApp is connected.
 * A failed read stays empty instead of mixing sample people into a broken account.
 */
export const loadWorkspace = cache(async (): Promise<WorkspaceView> => {
  if (!getSupabaseEnv()) return demoWorkspace();

  try {
    const db = await database();
    const [customers, previews, connection] = await Promise.all([
      listCustomersOn(db),
      listChatPreviewsOn(db),
      getWhatsAppConnection(),
    ]);
    if (!connection && customers.length === 0 && previews.length === 0) {
      return sampleWorkspace();
    }
    return workspaceFromRecords(customers, previews, new Date(), {
      connected: Boolean(connection),
      autoReply: connection?.autoReply ?? false,
    });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return demoWorkspace();
    console.error(
      "MyCoWorker could not load the workspace.",
      error instanceof Error ? error.message : error,
    );
    return unavailableWorkspace();
  }
});

export type { Channel, WorkspaceView };
