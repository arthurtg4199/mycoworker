export type AppointmentStatus = "scheduled" | "completed" | "cancelled";

export type AppointmentItem = {
  id: string;
  customerName: string;
  note: string;
  scheduledAt: string;
  status: AppointmentStatus;
};

export type AppointmentChange =
  | { type: "add"; item: AppointmentItem }
  | { type: "status"; id: string; status: "completed" | "cancelled" }
  | { type: "delete"; id: string };

export type AppointmentActionState = {
  ok?: boolean;
  demo?: boolean;
  message?: string;
  change?: AppointmentChange;
};

export type BookingDraft = {
  customerName: string;
  note: string;
  scheduledAt: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const APPOINTMENTS_STORAGE_KEY = "mycoworker.appointments";

const CHANGE_EVENT = "mycoworker-appointments";

const dayMs = 86_400_000;

export function sampleAppointments(now: Date): AppointmentItem[] {
  return [
    {
      id: "a1111111-1111-4111-8111-111111111111",
      customerName: "James Carter",
      note: "Bring the blue, size 10",
      scheduledAt: atLocal(now, 0, 11, 0),
      status: "scheduled",
    },
    {
      id: "a2222222-2222-4222-8222-222222222222",
      customerName: "Ryan Thompson",
      note: "Quick call about the offer",
      scheduledAt: atLocal(now, 0, 16, 30),
      status: "scheduled",
    },
    {
      id: "a3333333-3333-4333-8333-333333333333",
      customerName: "Aisha Bello",
      note: "Pickup at the shop",
      scheduledAt: atLocal(now, 1, 10, 0),
      status: "scheduled",
    },
    {
      id: "a4444444-4444-4444-8444-444444444444",
      customerName: "Sarah Mitchell",
      note: "She came in for the order",
      scheduledAt: atLocal(now, -1, 15, 0),
      status: "completed",
    },
  ];
}

export function sampleCustomerNames(now: Date) {
  return uniqueNames(sampleAppointments(now).map((item) => item.customerName));
}

function atLocal(now: Date, dayOffset: number, hours: number, minutes: number) {
  const date = new Date(now);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

function startOfDay(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function appointmentGroup(
  scheduledAt: string,
  now: Date,
): "today" | "upcoming" | "past" | null {
  const when = new Date(scheduledAt);
  if (Number.isNaN(when.getTime())) return null;
  const today = startOfDay(now).getTime();
  const day = startOfDay(when).getTime();
  const diff = Math.round((day - today) / dayMs);
  if (diff === 0) return "today";
  if (diff > 0) return "upcoming";
  return "past";
}

export function groupAppointments(items: AppointmentItem[], now: Date) {
  const today: AppointmentItem[] = [];
  const upcoming: AppointmentItem[] = [];
  const past: AppointmentItem[] = [];
  for (const item of items) {
    const group = appointmentGroup(item.scheduledAt, now);
    if (group === "today") today.push(item);
    else if (group === "upcoming") upcoming.push(item);
    else if (group === "past") past.push(item);
  }
  const byTime = (a: AppointmentItem, b: AppointmentItem) =>
    Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt);
  today.sort(byTime);
  upcoming.sort(byTime);
  past.sort((a, b) => Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt));
  return { today, upcoming, past };
}

export function todayAppointmentCount(items: AppointmentItem[], now: Date) {
  return groupAppointments(items, now).today.length;
}

export function appointmentSummary(
  groups: ReturnType<typeof groupAppointments>,
) {
  const today = groups.today.length;
  const upcoming = groups.upcoming.filter(
    (item) => item.status === "scheduled",
  ).length;
  const todayLabel = today === 1 ? "1 today" : `${today} today`;
  const upcomingLabel =
    upcoming === 1 ? "1 coming up" : `${upcoming} coming up`;
  if (today === 0 && upcoming === 0) return "Nothing booked today.";
  if (today === 0) {
    return `${upcomingLabel.charAt(0).toUpperCase()}${upcomingLabel.slice(1)}.`;
  }
  if (upcoming === 0) return `${todayLabel}.`;
  return `${todayLabel}. ${upcomingLabel}.`;
}

export function formatAppointmentWhen(iso: string, now: Date) {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return "";
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(when);
  const today = startOfDay(now).getTime();
  const day = startOfDay(when).getTime();
  const diff = Math.round((day - today) / dayMs);
  if (diff === 0) return `Today, ${time}`;
  if (diff === 1) return `Tomorrow, ${time}`;
  if (diff === -1) return `Yesterday, ${time}`;
  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(when);
  return `${date}, ${time}`;
}

export function statusLabel(status: AppointmentStatus) {
  if (status === "completed") return "Done";
  if (status === "cancelled") return "Cancelled";
  return "Booked";
}

export function isoFromDateTimeLocal(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
}

export function parseBookingDraft(input: {
  customerName: string;
  note: string;
  scheduledAt: string;
}): { ok: true; draft: BookingDraft } | { ok: false; message: string } {
  const customerName = input.customerName.trim();
  const note = input.note.trim();
  const scheduledAt = input.scheduledAt.trim();
  if (!customerName) return { ok: false, message: "Add the customer's name." };
  if (customerName.length > 120) {
    return { ok: false, message: "That name is too long." };
  }
  if (!scheduledAt || Number.isNaN(Date.parse(scheduledAt))) {
    return { ok: false, message: "Pick a date and time." };
  }
  if (!note) return { ok: false, message: "Add a short note." };
  if (note.length > 160) {
    return { ok: false, message: "Keep the note under 160 characters." };
  }
  return {
    ok: true,
    draft: {
      customerName,
      note,
      scheduledAt: new Date(scheduledAt).toISOString(),
    },
  };
}

export function isAppointmentId(value: string) {
  return uuidPattern.test(value);
}

function isStatus(value: unknown): value is AppointmentStatus {
  return value === "scheduled" || value === "completed" || value === "cancelled";
}

export function parseStoredAppointments(raw: string | null): AppointmentItem[] | null {
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const items: AppointmentItem[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue;
      const record = entry as Record<string, unknown>;
      if (typeof record.id !== "string" || !isAppointmentId(record.id)) continue;
      if (typeof record.customerName !== "string") continue;
      if (typeof record.note !== "string") continue;
      if (typeof record.scheduledAt !== "string") continue;
      if (!isStatus(record.status)) continue;
      const customerName = record.customerName.trim();
      const note = record.note.trim();
      if (!customerName || customerName.length > 120) continue;
      if (!note || note.length > 160) continue;
      if (Number.isNaN(Date.parse(record.scheduledAt))) continue;
      items.push({
        id: record.id,
        customerName,
        note,
        scheduledAt: new Date(record.scheduledAt).toISOString(),
        status: record.status,
      });
    }
    return items;
  } catch {
    return null;
  }
}

export function applyAppointmentChange(
  items: AppointmentItem[],
  change: AppointmentChange,
) {
  if (change.type === "add") {
    if (items.some((item) => item.id === change.item.id)) return items;
    return [...items, change.item];
  }
  if (change.type === "status") {
    return items.map((item) =>
      item.id === change.id ? { ...item, status: change.status } : item,
    );
  }
  return items.filter((item) => item.id !== change.id);
}

export function uniqueNames(names: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const name of names) {
    const trimmed = name.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    unique.push(trimmed);
  }
  unique.sort((a, b) => a.localeCompare(b));
  return unique;
}

let snapshot: AppointmentItem[] | null = null;
let snapshotRaw: string | null | undefined;
let memoryRaw: string | null = null;

export function emptyStoredAppointments(): AppointmentItem[] | null {
  return null;
}

export function readStoredAppointments(): AppointmentItem[] | null {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(APPOINTMENTS_STORAGE_KEY);
  } catch {
    raw = memoryRaw;
  }
  if (raw === snapshotRaw) return snapshot;
  snapshotRaw = raw;
  snapshot = parseStoredAppointments(raw);
  return snapshot;
}

export function writeStoredAppointments(items: AppointmentItem[]) {
  const raw = JSON.stringify(items);
  memoryRaw = raw;
  snapshotRaw = raw;
  snapshot = items;
  try {
    window.localStorage.setItem(APPOINTMENTS_STORAGE_KEY, raw);
    memoryRaw = null;
  } catch {
    // This tab still has the bookings in memory.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeAppointments(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}
