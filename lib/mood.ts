/**
 * Customer mood from recent messages. No model and no network.
 *
 * scoreMood is the rule scorer (keywords, emoji, punctuation, Nigerian English
 * and Pidgin). selectMoodEngine keeps that scorer when GEMINI_API_KEY is
 * missing or blank. Register a model engine later and pass the key to
 * scoreCustomerMood; a thrown or unusable model score falls back to the rules.
 */

export const MOOD_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
export const MOOD_RECENT_LIMIT = 6;

const HAPPY_AT = 4;
const UPSET_AT = -4;
const NEWEST_WEIGHT = 3;

export const moods = ["happy", "neutral", "upset"] as const;

export type Mood = (typeof moods)[number];

export type MoodMessage = {
  content: string;
  /** Missing, "user", or "customer" counts. Owner and assistant do not. */
  role?: string | null;
  at?: string | number | Date | null;
};

export type MoodScore = {
  mood: Mood;
  /** 0 to 100. Higher means happier. Matches customers.happiness. */
  happiness: number;
  label: "Happy" | "Neutral" | "Upset";
};

export type MoodScorer = (
  messages: readonly (string | MoodMessage)[],
  now?: Date,
) => MoodScore;

export type MoodEngine = {
  /** "rules" needs no key. "gemini" is reserved for a later model scorer. */
  name: "rules" | "gemini";
  score: MoodScorer;
};

const happyStrong =
  /\b(thank you so much|thanks so much|thank you very much|god bless|i dey happy|i'm happy|i am happy|im happy|i happy|so happy|i love this|i love it|i love am)\b/;
const happyMedium =
  /\b(thank you|thanks|grateful|appreciate|well done|you try|you too much|perfectly|perfect|amazing|wonderful|excellent|awesome|e sweet|no wahala|no problem)\b/;
const happyLight = /\b(great|lovely|nice one)\b/;

const upsetStrong =
  /\b(i no happy|i no dey happy|i'm not happy|i am not happy|im not happy|not happy|i dey vex|you dey vex|this thing no work|e no work|una no try|you no try)\b/;
const upsetMedium =
  /\b(wahala|angry|annoyed|upset|frustrated|disappointed|rubbish|useless|nonsense|scam|worst|e tire me|you no reply|why you no reply|i no like|waste my time)\b/;
const upsetMild = /\b(abeg|haba|chai|na wa|mtchew|mtschew)\b/;

const happyEmoji = /😊|😁|😄|😃|😀|🥰|😍|😂|🤣|😉|😎|👍|🙏|❤|💖|💗|✨|🎉|💜/u;
const upsetEmoji = /😠|😡|😤|👎|😒|🙄|💔|😢|😭|🤬|👿|😣|😩|😫|😕|😞/u;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function moodLabel(mood: Mood): MoodScore["label"] {
  if (mood === "happy") return "Happy";
  if (mood === "upset") return "Upset";
  return "Neutral";
}

export function isMood(value: string): value is Mood {
  return moods.some((mood) => mood === value);
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function withoutNegatedHappy(text: string) {
  return text
    .replace(/\bi am not happy\b/g, " ")
    .replace(/\bi'm not happy\b/g, " ")
    .replace(/\bim not happy\b/g, " ")
    .replace(/\bnot so happy\b/g, " ")
    .replace(/\bi no dey happy\b/g, " ")
    .replace(/\bi no happy\b/g, " ")
    .replace(/\bnot happy\b/g, " ")
    .replace(/\bno happy\b/g, " ");
}

function withoutCalm(text: string) {
  return text
    .replace(/\bno wahala\b/g, " ")
    .replace(/\bno problem\b/g, " ")
    .replace(/\bno vex\b/g, " ");
}

function happyPoints(text: string) {
  const line = withoutNegatedHappy(text);
  if (happyStrong.test(line)) return 3;
  if (happyMedium.test(line)) return 2;
  if (happyLight.test(line)) return 1;
  return 0;
}

function upsetPoints(text: string) {
  const line = withoutCalm(text);
  if (upsetStrong.test(line)) return 4;
  if (upsetMedium.test(line)) return 3;
  if (upsetMild.test(line)) return 1;
  return 0;
}

function emojiPoints(raw: string) {
  let score = 0;
  if (happyEmoji.test(raw)) score += 2;
  if (upsetEmoji.test(raw)) score -= 2;
  return score;
}

function markPoints(raw: string, happy: number, upset: number) {
  const bangs = raw.split("!").length - 1;
  const asks = raw.split("?").length - 1;
  if (bangs >= 3 && upset === 0 && happy > 0) return 1;
  if ((bangs >= 3 || asks >= 3) && happy === 0) return -3;
  return 0;
}

function messageDelta(raw: string) {
  const text = normalize(raw);
  const happy = happyPoints(text);
  const upset = upsetPoints(text);
  return happy - upset + emojiPoints(raw) + markPoints(raw, happy, upset);
}

function asMessage(input: string | MoodMessage): MoodMessage {
  return typeof input === "string" ? { content: input } : input;
}

function isCustomer(message: MoodMessage) {
  if (!message.role) return true;
  const role = message.role.toLowerCase();
  return role === "user" || role === "customer";
}

function timeOf(message: MoodMessage) {
  if (message.at == null || message.at === "") return null;
  if (message.at instanceof Date) {
    const value = message.at.getTime();
    return Number.isNaN(value) ? null : value;
  }
  if (typeof message.at === "number") {
    return Number.isFinite(message.at) ? message.at : null;
  }
  const parsed = Date.parse(message.at);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Newest customer lines inside the window, oldest first. Undated lines are demo previews. */
export function recentCustomerMessages(
  messages: readonly (string | MoodMessage)[],
  now?: Date,
) {
  const inbound = messages
    .map(asMessage)
    .filter((message) => isCustomer(message) && message.content.trim().length > 0);
  const dated = inbound.filter((message) => timeOf(message) != null);
  if (dated.length === 0) return inbound.slice(-MOOD_RECENT_LIMIT);
  const nowMs = (now ?? new Date()).getTime();
  return dated
    .filter((message) => {
      const at = timeOf(message);
      return at != null && at <= nowMs && nowMs - at <= MOOD_WINDOW_MS;
    })
    .sort((a, b) => (timeOf(a) ?? 0) - (timeOf(b) ?? 0))
    .slice(-MOOD_RECENT_LIMIT);
}

function happinessFor(mood: Mood, total: number) {
  if (mood === "neutral") return 50;
  if (mood === "happy") {
    return clamp(Math.round(64 + Math.min(total, 12) * 3), 60, 100);
  }
  return clamp(Math.round(36 + Math.max(total, -12) * 3), 0, 40);
}

export function scoreMood(
  messages: readonly (string | MoodMessage)[],
  now?: Date,
): MoodScore {
  const recent = recentCustomerMessages(messages, now);
  let total = 0;
  recent.forEach((message, index) => {
    const weight = index === recent.length - 1 ? NEWEST_WEIGHT : 1;
    total += messageDelta(message.content) * weight;
  });
  let mood: Mood = "neutral";
  if (total >= HAPPY_AT) mood = "happy";
  else if (total <= UPSET_AT) mood = "upset";
  return {
    mood,
    happiness: happinessFor(mood, total),
    label: moodLabel(mood),
  };
}

const rulesEngine: MoodEngine = {
  name: "rules",
  score: scoreMood,
};

let modelEngine: MoodEngine | null = null;

export function registerMoodEngine(engine: MoodEngine | null) {
  modelEngine = engine;
}

export function selectMoodEngine(apiKey?: string | null): MoodEngine {
  if (typeof apiKey === "string" && apiKey.trim() && modelEngine) return modelEngine;
  return rulesEngine;
}

function usableScore(score: MoodScore) {
  return (
    isMood(score.mood) &&
    typeof score.happiness === "number" &&
    Number.isFinite(score.happiness) &&
    score.happiness >= 0 &&
    score.happiness <= 100
  );
}

export function scoreCustomerMood(
  messages: readonly (string | MoodMessage)[],
  now?: Date,
  apiKey?: string | null,
): MoodScore {
  const engine = selectMoodEngine(apiKey);
  if (engine === rulesEngine) return scoreMood(messages, now);
  try {
    const score = engine.score(messages, now);
    if (!usableScore(score)) return scoreMood(messages, now);
    return {
      mood: score.mood,
      happiness: Math.round(score.happiness),
      label: moodLabel(score.mood),
    };
  } catch {
    return scoreMood(messages, now);
  }
}
