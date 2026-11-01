export const handlingModes = [
  {
    id: "ask_first",
    label: "Ask me first",
    hint: "I watch, draft, and nudge you. Nothing reaches a customer until you say so.",
    short: "I wait before anyone hears from me",
    stance:
      "Ask me first. I'll nudge you here, and I wait before a customer hears from me.",
  },
  {
    id: "auto_reply",
    label: "Auto-reply",
    hint: "I treat routine chats as mine to answer, and I still nudge you when a buyer is ready to close.",
    short: "I can answer routine chats",
    stance:
      "Auto-reply is on. I'll handle routine chats and still tap you when a buyer is ready.",
  },
  {
    id: "paused",
    label: "Paused",
    hint: "I stay quiet. Your inbox stays put, and I stop handling new chats.",
    short: "I'm not handling chats",
    stance:
      "I'm paused. I'll keep this list, and I won't handle chats until you turn me back on.",
  },
] as const;

export type HandlingMode = (typeof handlingModes)[number]["id"];

export const HANDLING_MODE_STORAGE_KEY = "mycoworker.handling-mode";

const CHANGE_EVENT = "mycoworker-handling-mode";

export function isHandlingMode(value: unknown): value is HandlingMode {
  return (
    typeof value === "string" &&
    handlingModes.some((mode) => mode.id === value)
  );
}

export function handlingModeCopy(mode: HandlingMode) {
  return handlingModes.find((item) => item.id === mode) ?? handlingModes[0];
}

let snapshot: HandlingMode | null = null;
let snapshotRaw: string | null = null;
let memoryRaw: string | null = null;

export function readStoredHandlingMode(): HandlingMode | null {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(HANDLING_MODE_STORAGE_KEY);
  } catch {
    raw = memoryRaw;
  }
  if (raw === snapshotRaw) return snapshot;
  snapshotRaw = raw;
  snapshot = isHandlingMode(raw) ? raw : null;
  return snapshot;
}

export function writeStoredHandlingMode(mode: HandlingMode) {
  memoryRaw = mode;
  snapshotRaw = mode;
  snapshot = mode;
  try {
    window.localStorage.setItem(HANDLING_MODE_STORAGE_KEY, mode);
    memoryRaw = null;
  } catch {
    // This tab still has the choice in memory.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeHandlingMode(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}
