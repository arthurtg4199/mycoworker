import { connection } from "next/server";
import {
  localCoworkerReply,
  type CoworkerContext,
  type CoworkerTurn,
} from "@/lib/coworker-chat";
import { handlingModeCopy } from "@/lib/assistant-mode";

const CONTENT_LIMIT = 1800;

function envValue(name: string) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

export async function readGeminiConfig() {
  await connection();
  const apiKey = envValue("GEMINI_API_KEY");
  const model = envValue("GEMINI_MODEL") || "gemini-2.5-flash";
  return { apiKey, model, enabled: Boolean(apiKey) };
}

function clip(value: string, max: number) {
  const line = value.replace(/\s+/g, " ").trim();
  if (line.length <= max) return line;
  return `${line.slice(0, max - 1)}…`;
}

function systemPrompt(context: CoworkerContext) {
  const shop = context.shop;
  const shopLines = shop
    ? [
        `Shop: ${shop.business_name}.`,
        shop.what_they_sell ? `Sells: ${clip(shop.what_they_sell, 240)}.` : "",
        shop.hours ? `Hours: ${clip(shop.hours, 160)}.` : "",
        shop.location ? `Location: ${clip(shop.location, 80)}.` : "",
        `Reply tone for customer drafts: ${shop.reply_tone}.`,
      ]
    : ["The owner has not saved shop details yet. If they ask, point them to Settings."];
  const people =
    context.people.length === 0
      ? "Nobody is waiting in the inbox."
      : context.people
          .map((person) => `${person.name}: ${clip(person.preview, 140)}`)
          .join(" | ");
  const inbox =
    context.inbox === "sample"
      ? "The inbox they can see is sample data, not live customer messages. Say so if you mention those people."
      : context.inbox === "demo"
        ? "This is a product preview with a sample inbox."
        : context.inbox === "unavailable"
          ? "The saved inbox could not be loaded. Do not invent customers."
          : "The inbox lines below are this owner's real chats.";

  return [
    "You are MyCoWorker, a friendly assistant for one small-business owner.",
    "You are talking to the owner, not to their customers.",
    "You never send WhatsApp, Instagram, email, or any other channel message.",
    "You may draft a reply the owner can send themselves from the inbox.",
    "Keep replies to two to five short sentences. Plain text. No markdown headings, no bullet lists.",
    "Do not invent orders, prices, stock, or customers that are not in the notes below.",
    handlingModeCopy(context.handlingMode).stance,
    inbox,
    ...shopLines.filter(Boolean),
    `Today: ${context.summary.chatsHandled} chats handled, ${context.summary.buyersReady} buyers ready.`,
    `Waiting: ${people}`,
  ].join("\n");
}

function contentsFrom(history: CoworkerTurn[], text: string) {
  const prior = history
    .filter((turn) => turn.content.trim())
    .slice(-10)
    .map((turn) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: clip(turn.content, 2000) }],
    }));
  prior.push({ role: "user", parts: [{ text: clip(text, 2000) }] });
  return prior;
}

type GeminiBody = {
  candidates?: {
    content?: { parts?: { text?: string }[] };
  }[];
};

function replyText(body: GeminiBody) {
  const parts = body.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

export async function coworkerReply(
  text: string,
  history: CoworkerTurn[],
  context: CoworkerContext,
) {
  const fallback = () => localCoworkerReply(text, history, context);
  const { apiKey, model, enabled } = await readGeminiConfig();
  if (!enabled) return { text: fallback(), source: "local" as const };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt(context) }] },
          contents: contentsFrom(history, text),
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 320,
          },
        }),
      },
    );
    if (!response.ok) return { text: fallback(), source: "local" as const };
    const body = (await response.json()) as GeminiBody;
    const reply = replyText(body);
    if (!reply) return { text: fallback(), source: "local" as const };
    return {
      text: reply.slice(0, CONTENT_LIMIT),
      source: "gemini" as const,
    };
  } catch {
    return { text: fallback(), source: "local" as const };
  } finally {
    clearTimeout(timer);
  }
}
