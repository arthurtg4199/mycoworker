const buying =
  /\b(buy|buying|price|prices|how much|cost|available|availability|order|pay|payment|deliver(?:y)?|size|naira|invoice|discount|in stock|do you have)\b/i;

/** A light hint that this customer is ready for the owner. Not a model call. */
export function isBuyingIntent(text: string) {
  return text.includes("₦") || buying.test(text);
}
