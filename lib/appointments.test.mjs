import assert from "node:assert/strict";
import test from "node:test";
import {
  applyAppointmentChange,
  appointmentSummary,
  formatAppointmentWhen,
  groupAppointments,
  isoFromDateTimeLocal,
  parseBookingDraft,
  parseStoredAppointments,
  sampleAppointments,
  todayAppointmentCount,
} from "./appointments.ts";

const now = new Date(2026, 10, 4, 9, 15, 0);

test("groups sample bookings into today, upcoming, and past", () => {
  const groups = groupAppointments(sampleAppointments(now), now);
  assert.deepEqual(
    groups.today.map((item) => item.customerName),
    ["James Carter", "Ryan Thompson"],
  );
  assert.deepEqual(
    groups.upcoming.map((item) => item.customerName),
    ["Aisha Bello"],
  );
  assert.deepEqual(
    groups.past.map((item) => item.customerName),
    ["Sarah Mitchell"],
  );
  assert.equal(todayAppointmentCount(sampleAppointments(now), now), 2);
});

test("puts midnight on the next day in upcoming", () => {
  const item = {
    id: "b1111111-1111-4111-8111-111111111111",
    customerName: "Ada",
    note: "Opening time",
    scheduledAt: new Date(2026, 10, 5, 0, 0, 0).toISOString(),
    status: "scheduled",
  };
  const late = {
    ...item,
    id: "b2222222-2222-4222-8222-222222222222",
    scheduledAt: new Date(2026, 10, 4, 23, 59, 0).toISOString(),
  };
  const groups = groupAppointments([item, late], now);
  assert.equal(groups.today.length, 1);
  assert.equal(groups.upcoming.length, 1);
  assert.equal(groups.today[0]?.id, late.id);
});

test("summarizes today and upcoming bookings", () => {
  const groups = groupAppointments(sampleAppointments(now), now);
  assert.equal(appointmentSummary(groups), "2 today. 1 coming up.");
  assert.equal(
    appointmentSummary({ today: [], upcoming: [], past: [] }),
    "Nothing booked today.",
  );
});

test("formats a booking on today as Today", () => {
  const when = formatAppointmentWhen(
    new Date(2026, 10, 4, 11, 0, 0).toISOString(),
    now,
  );
  assert.match(when, /^Today,/);
  assert.match(when, /11/);
  assert.match(when, /AM/);
});

test("ignores a half typed date instead of throwing", () => {
  assert.equal(isoFromDateTimeLocal(""), "");
  assert.equal(isoFromDateTimeLocal("2026-11-05T14"), "");
  assert.match(isoFromDateTimeLocal("2026-11-05T14:00"), /^2026-11-05T/);
});

test("checks the booking form", () => {
  const missing = parseBookingDraft({
    customerName: "  ",
    note: "Haircut",
    scheduledAt: "2026-11-04T11:00:00.000Z",
  });
  assert.equal(missing.ok, false);
  const saved = parseBookingDraft({
    customerName: "  Ada Obi  ",
    note: "  Fitting  ",
    scheduledAt: "2026-11-04T11:00:00.000Z",
  });
  assert.equal(saved.ok, true);
  if (saved.ok) {
    assert.equal(saved.draft.customerName, "Ada Obi");
    assert.equal(saved.draft.note, "Fitting");
  }
});

test("drops bad saved rows and keeps a real booking", () => {
  const raw = JSON.stringify([
    {
      id: "c1111111-1111-4111-8111-111111111111",
      customerName: "Ada",
      note: "Fitting",
      scheduledAt: "2026-11-04T10:00:00.000Z",
      status: "scheduled",
    },
    { id: "nope", customerName: "Ada", note: "Nope", scheduledAt: "x", status: "nope" },
  ]);
  const items = parseStoredAppointments(raw);
  assert.equal(items?.length, 1);
  assert.equal(items?.[0]?.customerName, "Ada");
  assert.equal(parseStoredAppointments("nope"), null);
  assert.equal(parseStoredAppointments("{}"), null);
});

test("adds, updates, and deletes without duplicating an id", () => {
  const start = [];
  const item = {
    id: "d1111111-1111-4111-8111-111111111111",
    customerName: "Ada",
    note: "Fitting",
    scheduledAt: "2026-11-04T10:00:00.000Z",
    status: "scheduled",
  };
  const added = applyAppointmentChange(start, { type: "add", item });
  const again = applyAppointmentChange(added, { type: "add", item });
  assert.equal(again.length, 1);
  const done = applyAppointmentChange(again, {
    type: "status",
    id: item.id,
    status: "completed",
  });
  assert.equal(done[0]?.status, "completed");
  const removed = applyAppointmentChange(done, { type: "delete", id: item.id });
  assert.deepEqual(removed, []);
});
