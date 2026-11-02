import { isHotBuyer } from "@/lib/hot-buyer";

/** A light hint that this customer is ready for the owner. Not a model call. */
export function isBuyingIntent(text: string) {
  return isHotBuyer([text]);
}
