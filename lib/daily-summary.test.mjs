import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chats } from "./demo-data.ts";
import {
  countsFromSampleChats,
  countCreatedOnUtcDay,
  coworkerTagline,
  dailySummaryLine,
  utcDayWindow,
} from "./daily-summary.ts";

describe("daily summary", () => {
  const now = new Date("2026-11-09T18:30:00.000Z");

  it("counts rows created on the UTC day and skips the rest", () => {
    const window = utcDayWindow(now);
    assert.equal(window.start, "2026-11-09T00:00:00.000Z");
    assert.equal(window.end, "2026-11-10T00:00:00.000Z");
    assert.equal(
      countCreatedOnUtcDay(
        [
          { createdAt: window.start },
          { createdAt: "2026-11-09T23:59:59.000Z" },
          { createdAt: "2026-11-08T23:59:59.000Z" },
          { createdAt: window.end },
          { createdAt: "not-a-date" },
        ],
        now,
      ),
      2,
    );
  });

  it("keeps the tagline when the day is quiet or only new chats arrived", () => {
    assert.equal(
      dailySummaryLine({ newChats: 0, messages: 0, nudges: 0 }),
      `Nothing new yet. ${coworkerTagline}`,
    );
    assert.equal(
      dailySummaryLine({ newChats: 3, messages: 8, nudges: 0 }),
      coworkerTagline,
    );
  });

  it("hands the deals back when new chats and nudges both showed up", () => {
    assert.equal(
      dailySummaryLine({ newChats: 4, messages: 9, nudges: 2 }),
      `New chats are in. ${coworkerTagline}`,
    );
  });

  it("mentions waiting nudges when no new chat started", () => {
    assert.equal(
      dailySummaryLine({ newChats: 0, messages: 0, nudges: 1 }),
      `One nudge is waiting. ${coworkerTagline}`,
    );
    assert.equal(
      dailySummaryLine({ newChats: 0, messages: 6, nudges: 2 }),
      `2 nudges are waiting. ${coworkerTagline}`,
    );
  });

  it("notes messages on chats that were already open", () => {
    assert.equal(
      dailySummaryLine({ newChats: 0, messages: 3, nudges: 0 }),
      `I kept the chats moving. ${coworkerTagline}`,
    );
  });

  it("drops junk counts before choosing a line", () => {
    assert.equal(
      dailySummaryLine({ newChats: -4, messages: Number.NaN, nudges: 1.9 }),
      `One nudge is waiting. ${coworkerTagline}`,
    );
  });

  it("counts today's sample chats and skips Yesterday", () => {
    assert.deepEqual(countsFromSampleChats(chats, 5), {
      newChats: 4,
      messages: 4,
      nudges: 5,
    });
    assert.deepEqual(
      countsFromSampleChats(
        [
          { time: "9:40 AM", preview: "Hi" },
          { time: "Yesterday", preview: "Old" },
          { time: " yesterday ", preview: "Also old" },
          { time: "9:01 AM", preview: "   " },
        ],
        2.2,
      ),
      { newChats: 2, messages: 1, nudges: 2 },
    );
  });
});
