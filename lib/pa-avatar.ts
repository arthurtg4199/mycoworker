/** Dot centers on the 1024px portraits. The dots stay dots; nothing here is a sclera. */
const eyes = {
  suit: [
    { x: 0.4279, y: 0.3768 },
    { x: 0.5716, y: 0.377 },
  ],
  navy: [
    { x: 0.4336, y: 0.3801 },
    { x: 0.5744, y: 0.3801 },
  ],
  plain: [
    { x: 0.4274, y: 0.3716 },
    { x: 0.5721, y: 0.3715 },
  ],
  purple: [
    { x: 0.4335, y: 0.3778 },
    { x: 0.5737, y: 0.3778 },
  ],
} as const;

export const PA_AVATARS = [
  {
    id: "pa-glasses-suit-tie",
    src: "/avatars/pa/pa-glasses-suit-tie.jpg",
    label: "Suit & tie",
    detail: "Glasses, charcoal suit, purple tie",
    spot: { scale: 1.85, originY: 0.44 },
    picker: { scale: 1.55, originY: 0.5 },
    eyes: eyes.suit,
  },
  {
    id: "pa-glasses-navy-purple",
    src: "/avatars/pa/pa-glasses-navy-purple.jpg",
    label: "Navy",
    detail: "Glasses, navy blazer, purple top",
    spot: { scale: 1.55, originY: 0.4 },
    picker: { scale: 1.28, originY: 0.5 },
    eyes: eyes.navy,
  },
  {
    id: "pa-suit-tie-noglasses",
    src: "/avatars/pa/pa-suit-tie-noglasses.jpg",
    label: "No glasses",
    detail: "Charcoal suit, purple tie, no glasses",
    spot: { scale: 1.55, originY: 0.4 },
    picker: { scale: 1.28, originY: 0.5 },
    eyes: eyes.plain,
  },
  {
    id: "pa-glasses-purple-cream",
    src: "/avatars/pa/pa-glasses-purple-cream.jpg",
    label: "Purple",
    detail: "Glasses, purple blazer, cream top",
    spot: { scale: 1.55, originY: 0.4 },
    picker: { scale: 1.28, originY: 0.5 },
    eyes: eyes.purple,
  },
] as const;

/** Pupil and skin-cover diameters as a fraction of the 1024px artwork. */
export const PA_EYE_PUPIL = 33 / 1024;
export const PA_EYE_COVER = 58 / 1024;

export type PaAvatarId = (typeof PA_AVATARS)[number]["id"];
export type PaAvatarOption = (typeof PA_AVATARS)[number];

export const DEFAULT_PA_AVATAR_ID: PaAvatarId = "pa-glasses-suit-tie";
export const PA_AVATAR_STORAGE_KEY = "mycoworker.pa-avatar";
export const PA_AVATAR_META_KEY = "pa_avatar";

const CHANGE_EVENT = "mycoworker-pa-avatar";

let memoryId: PaAvatarId | null = null;

export function isPaAvatarId(value: unknown): value is PaAvatarId {
  return (
    typeof value === "string" &&
    PA_AVATARS.some((avatar) => avatar.id === value)
  );
}

export function paAvatarById(id: PaAvatarId): PaAvatarOption {
  return PA_AVATARS.find((avatar) => avatar.id === id) ?? PA_AVATARS[0];
}

export function readStoredPaAvatar(): PaAvatarId {
  try {
    const raw = window.localStorage.getItem(PA_AVATAR_STORAGE_KEY);
    if (isPaAvatarId(raw)) return raw;
  } catch {
    return memoryId ?? DEFAULT_PA_AVATAR_ID;
  }
  return memoryId ?? DEFAULT_PA_AVATAR_ID;
}

export function writeStoredPaAvatar(id: PaAvatarId) {
  memoryId = id;
  try {
    window.localStorage.setItem(PA_AVATAR_STORAGE_KEY, id);
    memoryId = null;
  } catch {
    // Keep memoryId so this tab still shows the choice.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribePaAvatar(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

export function paAvatarIdFromMetadata(metadata: unknown): PaAvatarId | null {
  if (!metadata || typeof metadata !== "object") return null;
  if (!(PA_AVATAR_META_KEY in metadata)) return null;
  const value = (metadata as Record<string, unknown>)[PA_AVATAR_META_KEY];
  return isPaAvatarId(value) ? value : null;
}
