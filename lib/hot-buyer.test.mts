import assert from "node:assert/strict";
import test from "node:test";
import { isHotBuyer, scoreBuyingIntent } from "./hot-buyer.ts";

const now = new Date("2026-11-02T12:00:00.000Z");

test("flags price, stock, delivery, and payment phrasing", () => {
  assert.equal(isHotBuyer(["How much last?"]), true);
  assert.equal(isHotBuyer(["How much e be?"]), true);
  assert.equal(isHotBuyer(["Wetin be the price?"]), true);
  assert.equal(isHotBuyer(["This one na ₦15000"]), true);
  assert.equal(isHotBuyer(["Do you have it in blue and size 10?"]), true);
  assert.equal(isHotBuyer(["You get am?"]), true);
  assert.equal(isHotBuyer(["Is it in stock?"]), true);
  assert.equal(isHotBuyer(["Where you dey?"]), true);
  assert.equal(isHotBuyer(["Can you deliver to Lekki today?"]), true);
  assert.equal(isHotBuyer(["Abeg send account"]), true);
  assert.equal(isHotBuyer(["I don transfer"]), true);
  assert.equal(isHotBuyer(["Which bank?"]), true);
});

test("flags commitment, including pidgin, and a clear quantity", () => {
  assert.equal(isHotBuyer(["I go take am"]), true);
  assert.equal(isHotBuyer(["I’ll take the blue one"]), true);
  assert.equal(isHotBuyer(["I want this"]), true);
  assert.equal(isHotBuyer(["I wan buy"]), true);
  assert.equal(isHotBuyer(["Give me 2 packs"]), true);
  assert.equal(isHotBuyer(["I need 3 today"]), true);
  const stacked = scoreBuyingIntent(["Abeg how much last?", "I go take 2. Send account."]);
  assert.equal(stacked.hot, true);
  assert.ok(stacked.signals.includes("price"));
  assert.ok(stacked.signals.includes("commitment"));
  assert.ok(stacked.signals.includes("payment"));
});

test("leaves thanks, scheduling, and weak words alone", () => {
  assert.equal(isHotBuyer(["Thanks! That works perfectly."]), false);
  assert.equal(isHotBuyer(["Okay, thank you!"]), false);
  assert.equal(isHotBuyer(["Can we schedule a call?"]), false);
  assert.equal(isHotBuyer(["Great, please send the details."]), false);
  assert.equal(isHotBuyer(["Abeg"]), false);
  assert.equal(isHotBuyer(["Thanks for today"]), false);
  assert.equal(isHotBuyer(["I want to know your hours"]), false);
  assert.equal(isHotBuyer(["I want to schedule a call"]), false);
  assert.equal(isHotBuyer(["Just confirming in order to visit"]), false);
  assert.equal(isHotBuyer(["The size is 10"]), false);
  assert.equal(isHotBuyer(["I need 5 minutes"]), false);
  assert.equal(isHotBuyer([""]), false);
});

test("uses only recent inbound customer lines", () => {
  const old = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString();
  const fresh = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  assert.equal(
    isHotBuyer(
      [
        { role: "user", content: "How much last?", at: old },
        { role: "user", content: "Thanks!", at: fresh },
      ],
      now,
    ),
    false,
  );
  assert.equal(
    isHotBuyer(
      [
        { role: "owner", content: "Send account", at: fresh },
        { role: "assistant", content: "How much is it?", at: fresh },
        { role: "user", content: "Okay thanks", at: fresh },
      ],
      now,
    ),
    false,
  );
  assert.equal(
    isHotBuyer(
      [
        { role: "user", content: "Hello", at: fresh },
        { role: "user", content: "I go take", at: fresh },
      ],
      now,
    ),
    true,
  );
});

test("keeps the newest inbound lines when a chat is long", () => {
  const lines = [
    { role: "user", content: "How much last?", at: "2026-11-01T08:00:00.000Z" },
    ...Array.from({ length: 6 }, (_, index) => ({
      role: "user" as const,
      content: "Just checking in",
      at: new Date(Date.parse("2026-11-02T08:00:00.000Z") + index * 60_000).toISOString(),
    })),
  ];
  assert.equal(isHotBuyer(lines, now), false);
});
