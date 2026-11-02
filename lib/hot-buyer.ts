/**
 * Rule-based hot-buyer score. No model and no network.
 * Recent inbound customer messages are scored for buying signals.
 * A chat is hot at 2 or more points: one clear buying signal, or a
 * quantity plus urgency. "Abeg" or "today" on their own stay quiet.
 */

export const HOT_BUYER_THRESHOLD = 2;
export const RECENT_INBOUND_LIMIT = 6;
export const RECENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export const buyingSignals = [
  "price",
  "availability",
  "delivery",
  "payment",
  "commitment",
  "quantity",
  "urgency",
] as const;

export type BuyingSignal = (typeof buyingSignals)[number];

export type HotBuyerMessage = {
  content: string;
  /** Missing, "user", or "customer" counts as the buyer. Owner and assistant do not. */
  role?: string | null;
  at?: string | number | Date | null;
};

export type HotBuyerScore = {
  score: number;
  hot: boolean;
  signals: BuyingSignal[];
};

const weights: Record<BuyingSignal, number> = {
  price: 2,
  availability: 2,
  delivery: 2,
  payment: 3,
  commitment: 3,
  quantity: 2,
  urgency: 1,
};

const price =
  /\b(how much|price|prices|cost|costing|discount|naira|last price)\b/;
const availability =
  /\b(available|availability|in stock|do you have|do you still have|you get|una get|you dey get|una dey get|still get|still dey get)\b/;
const delivery =
  /\b(delivery|deliver|delivered|delivering|shipping|dispatch|dispatched|pickup|pick up|where you dey|where una dey|where are you|your location|shop location|store location|your address|shop address)\b/;
const payment =
  /\b(pay|paid|paying|payment|transfer|transferred|account number|send account|send me account|send your account|send the account|your account|the account|acct|invoice|bank account|bank details|which bank|what bank)\b/;
const explicitCommitment =
  /\b(i'll take|i'll buy|i'll order|i will take|i will buy|i will order|i go take|i wan take|i wan buy|i wan am|i dey buy|i want it|i want this|i want that|i want them|i want am|i want one|i want some|i want to buy|i want to order|i want to pay|can i buy|can i order|i'd like to buy|i would like to buy|place an order|place order|make order|buying)\b|\bbuy\b/;
const bareWant = /\bi wan(t)?\b/;
const wantAside =
  /\bi wan(t)? (to )?(know|ask|check|understand|see|find|confirm|hear|talk|speak|schedule|book)\b/;
const strongQuantity =
  /\b\d{1,4}\s*(pcs|pc|pieces|piece|packs|pack|cartons|carton|bags|bag|yards|yard|kg|units|unit|pairs|pair|crates|crate)\b|\b(dozen|half dozen)\b/;
const weakQuantity =
  /\b(give me|i need|make am)\s+\d{1,4}\b(?!\s*(minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years|sec|second|seconds|time))/;
const urgency =
  /\b(abeg|asap|urgent|urgently|now now|sharp sharp|right now|immediately|today|this night|this evening|this morning)\b/;

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/₦/g, " naira ")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function signalsIn(text: string) {
  const signals: BuyingSignal[] = [];
  if (price.test(text)) signals.push("price");
  if (availability.test(text)) signals.push("availability");
  if (delivery.test(text)) signals.push("delivery");
  if (payment.test(text)) signals.push("payment");
  if (explicitCommitment.test(text) || (bareWant.test(text) && !wantAside.test(text))) {
    signals.push("commitment");
  }
  const strong = strongQuantity.test(text);
  if (strong) signals.push("quantity");
  if (urgency.test(text)) signals.push("urgency");
  return { signals, strongQuantity: strong, weakQuantity: !strong && weakQuantity.test(text) };
}

function asMessage(input: string | HotBuyerMessage): HotBuyerMessage {
  return typeof input === "string" ? { content: input } : input;
}

function isInbound(message: HotBuyerMessage) {
  if (!message.role) return true;
  return message.role === "user" || message.role === "customer";
}

function timeOf(message: HotBuyerMessage) {
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

/** Keep the newest inbound lines inside the window. Undated lines are demo or the live webhook body. */
export function recentInbound(
  messages: readonly (string | HotBuyerMessage)[],
  now?: Date,
) {
  const inbound = messages
    .map(asMessage)
    .filter((message) => isInbound(message) && message.content.trim().length > 0);
  const dated = inbound.filter((message) => timeOf(message) != null);
  if (dated.length === 0) return inbound.slice(-RECENT_INBOUND_LIMIT);
  const nowMs = (now ?? new Date()).getTime();
  return dated
    .filter((message) => {
      const at = timeOf(message);
      return at != null && at <= nowMs && nowMs - at <= RECENT_WINDOW_MS;
    })
    .sort((a, b) => (timeOf(b) ?? 0) - (timeOf(a) ?? 0))
    .slice(0, RECENT_INBOUND_LIMIT);
}

export function scoreBuyingIntent(
  messages: readonly (string | HotBuyerMessage)[],
  now?: Date,
): HotBuyerScore {
  const found = new Set<BuyingSignal>();
  let strongQuantityHit = false;
  let weakQuantityHit = false;
  for (const message of recentInbound(messages, now)) {
    const hit = signalsIn(normalize(message.content));
    for (const signal of hit.signals) found.add(signal);
    if (hit.strongQuantity) strongQuantityHit = true;
    if (hit.weakQuantity) weakQuantityHit = true;
  }
  if (weakQuantityHit) found.add("quantity");
  const signals = buyingSignals.filter((signal) => found.has(signal));
  let score = 0;
  for (const signal of signals) {
    score += signal === "quantity" && !strongQuantityHit ? 1 : weights[signal];
  }
  return { score, hot: score >= HOT_BUYER_THRESHOLD, signals };
}

export function isHotBuyer(
  messages: readonly (string | HotBuyerMessage)[],
  now?: Date,
) {
  return scoreBuyingIntent(messages, now).hot;
}
