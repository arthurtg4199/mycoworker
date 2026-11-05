import assert from "node:assert/strict";
import test from "node:test";
import {
  registerMoodEngine,
  scoreCustomerMood,
  scoreMood,
  selectMoodEngine,
} from "./mood.ts";

const now = new Date("2026-11-02T12:00:00.000Z");

test("reads happy thanks, blessings, and praise", () => {
  assert.equal(scoreMood(["Thank you so much"]).mood, "happy");
  assert.equal(scoreMood(["Thanks so much for this"]).mood, "happy");
  assert.equal(scoreMood(["God bless you"]).mood, "happy");
  assert.equal(scoreMood(["Thanks! That works perfectly."]).mood, "happy");
  assert.equal(scoreMood(["Okay, thank you!"]).mood, "happy");
  assert.equal(scoreMood(["You try!"]).mood, "happy");
  assert.equal(scoreMood(["E sweet, no wahala"]).mood, "happy");
  assert.equal(scoreMood(["😊"]).mood, "happy");
  const strong = scoreMood(["Thank you so much. God bless."]);
  assert.equal(strong.mood, "happy");
  assert.equal(strong.label, "Happy");
  assert.ok(strong.happiness >= 60 && strong.happiness <= 100);
});

test("reads upset wahala, pidgin, and heavy punctuation", () => {
  assert.equal(scoreMood(["Wahala dey"]).mood, "upset");
  assert.equal(scoreMood(["I no happy"]).mood, "upset");
  assert.equal(scoreMood(["I no dey happy at all"]).mood, "upset");
  assert.equal(scoreMood(["This thing no work"]).mood, "upset");
  assert.equal(scoreMood(["Abeg this thing no work. I no happy!!!"]).mood, "upset");
  assert.equal(scoreMood(["What is this???"]).mood, "upset");
  assert.equal(scoreMood(["Hey!!!!!!"]).mood, "upset");
  assert.equal(scoreMood(["😡"]).mood, "upset");
  assert.equal(scoreMood(["You dey waste my time"]).mood, "upset");
  const upset = scoreMood(["I no happy"]);
  assert.equal(upset.label, "Upset");
  assert.ok(upset.happiness >= 0 && upset.happiness <= 40);
});

test("leaves please, product questions, and a single mark alone", () => {
  assert.equal(scoreMood(["Abeg"]).mood, "neutral");
  assert.equal(scoreMood(["Abeg how much?"]).mood, "neutral");
  assert.equal(scoreMood(["Do you have it in blue and size 10?"]).mood, "neutral");
  assert.equal(scoreMood(["Is the offer still available?"]).mood, "neutral");
  assert.equal(scoreMood(["Can we schedule a call?"]).mood, "neutral");
  assert.equal(scoreMood(["Great, please send the details."]).mood, "neutral");
  assert.equal(scoreMood(["Hello"]).mood, "neutral");
  assert.equal(scoreMood(["What??"]).mood, "neutral");
  assert.equal(scoreMood(["Haba"]).mood, "neutral");
  assert.equal(scoreMood([""]).mood, "neutral");
  assert.equal(scoreMood([]).happiness, 50);
});

test("treats no wahala and no vex as calm, and keeps a negated happy line upset", () => {
  assert.equal(scoreMood(["No wahala"]).mood, "happy");
  assert.equal(scoreMood(["Abeg no vex"]).mood, "neutral");
  assert.equal(scoreMood(["I am not happy"]).mood, "upset");
  assert.equal(scoreMood(["I’m not happy"]).mood, "upset");
  assert.notEqual(scoreMood(["I no happy"]).mood, "happy");
});

test("excited thanks stay happy, and ??? does not cancel a real thank you", () => {
  assert.equal(scoreMood(["Thank you so much!!!"]).mood, "happy");
  assert.equal(scoreMood(["Thank you???"]).mood, "happy");
  assert.equal(scoreMood(["I no happy!!!"]).mood, "upset");
});

test("uses only recent customer lines, and lets a new thanks replace an old upset", () => {
  const old = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString();
  const fresh = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  assert.equal(
    scoreMood(
      [
        { role: "user", content: "I no happy", at: old },
        { role: "user", content: "Hello", at: fresh },
      ],
      now,
    ).mood,
    "neutral",
  );
  assert.equal(
    scoreMood(
      [
        { role: "owner", content: "I no happy!!!", at: fresh },
        { role: "assistant", content: "Wahala", at: fresh },
        { role: "user", content: "Thank you so much", at: fresh },
      ],
      now,
    ).mood,
    "happy",
  );
  assert.equal(
    scoreMood(
      [
        { role: "user", content: "I no happy", at: fresh },
        { role: "user", content: "Thank you so much", at: fresh },
      ],
      now,
    ).mood,
    "happy",
  );
});

test("drops an older upset line once six newer notes fill the window", () => {
  const lines = [
    { role: "user", content: "I no happy" },
    ...Array.from({ length: 6 }, () => ({
      role: "user",
      content: "Just checking in",
    })),
  ];
  assert.equal(scoreMood(lines).mood, "neutral");
});

test("keeps the rules scorer when GEMINI_API_KEY is empty", () => {
  registerMoodEngine({
    name: "gemini",
    score: () => ({ mood: "upset", happiness: 1, label: "Upset" }),
  });
  try {
    assert.equal(selectMoodEngine("").name, "rules");
    assert.equal(selectMoodEngine("   ").name, "rules");
    assert.equal(selectMoodEngine(null).name, "rules");
    assert.equal(selectMoodEngine(undefined).name, "rules");
    assert.equal(scoreCustomerMood(["Thank you so much"]).mood, "happy");
    assert.equal(scoreCustomerMood(["Thank you so much"], undefined, "").mood, "happy");
    assert.equal(selectMoodEngine("present").name, "gemini");
    assert.equal(
      scoreCustomerMood(["Thank you so much"], undefined, "present").mood,
      "upset",
    );
  } finally {
    registerMoodEngine(null);
  }
});

test("falls back to rules when a model scorer throws or returns junk", () => {
  registerMoodEngine({
    name: "gemini",
    score() {
      throw new Error("no network");
    },
  });
  try {
    assert.equal(scoreCustomerMood(["Wahala dey"], undefined, "key").mood, "upset");
  } finally {
    registerMoodEngine(null);
  }

  registerMoodEngine({
    name: "gemini",
    score: () => ({ mood: "angry", happiness: 10, label: "Angry" }),
  });
  try {
    assert.equal(scoreCustomerMood(["Thank you so much"], undefined, "key").mood, "happy");
  } finally {
    registerMoodEngine(null);
  }

  assert.equal(selectMoodEngine("still-set").name, "rules");
});
