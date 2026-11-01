"use client";

export type PaPresence = "rest" | "focus" | "notice";

export type PaPose = {
  /** Face shift in px. Sideways is the turn. Up/down is a small held gaze, not a bob. */
  shiftX: number;
  shiftY: number;
  /** Head turn left/right, degrees. */
  yaw: number;
  /** Head turn up/down, degrees. */
  pitch: number;
  scale: number;
  px: number;
  py: number;
};

type Gaze = { x: number; y: number };

type Slot = {
  since: number;
  pupil: Gaze;
  head: Gaze;
  lean: number;
  pose: PaPose;
  glance: Gaze;
  glanceUntil: number;
  glanceIndex: number;
};

type Listener = {
  getPresence: () => PaPresence;
  presence: PaPresence;
  notify: (pose: PaPose) => void;
};

/** Look directions. x is left (−) / right (+). y is up (−) / down (+). */
const looks: Gaze[] = [
  { x: -1, y: 0.05 },
  { x: 1, y: -0.06 },
  { x: 0.04, y: -1 },
  { x: -0.05, y: 1 },
  { x: -0.74, y: -0.62 },
  { x: 0.8, y: 0.5 },
  { x: 0.66, y: -0.58 },
  { x: -0.7, y: 0.46 },
  { x: 0, y: 0 },
  { x: -0.42, y: 0.1 },
  { x: 0.38, y: -0.12 },
  { x: 0.12, y: 0.72 },
  { x: -0.16, y: -0.78 },
];

const neutralPose: PaPose = {
  shiftX: 0,
  shiftY: 0,
  yaw: 0,
  pitch: 0,
  scale: 1,
  px: 0,
  py: 0,
};

function makeSlot(now: number): Slot {
  return {
    since: now,
    pupil: { x: 0, y: 0 },
    head: { x: 0, y: 0 },
    lean: 0,
    pose: neutralPose,
    glance: { x: 0, y: 0 },
    glanceUntil: now,
    glanceIndex: -1,
  };
}

const slots: Record<PaPresence, Slot> = {
  rest: makeSlot(0),
  focus: makeSlot(0),
  notice: makeSlot(0),
};

const listeners = new Set<Listener>();
let raf = 0;
let last = 0;
let reduced = false;

function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

function lookAxis(look: Gaze) {
  return Math.abs(look.x) >= Math.abs(look.y) ? "x" : "y";
}

function pickGlance(slot: Slot, now: number) {
  const previousAxis = lookAxis(slot.glance);
  const pool = looks
    .map((look, index) => ({ look, index }))
    .filter(
      (item) =>
        item.index !== slot.glanceIndex && lookAxis(item.look) !== previousAxis,
    );
  const choice =
    pool[Math.floor(Math.random() * pool.length)] ??
    looks
      .map((look, index) => ({ look, index }))
      .find((item) => item.index !== slot.glanceIndex) ?? { look: looks[0]!, index: 0 };
  const index = choice.index;
  const look = choice.look;
  const magnitude = 0.78 + Math.random() * 0.22;
  const nearCenter = Math.abs(look.x) < 0.2 && Math.abs(look.y) < 0.2;
  const hold = nearCenter
    ? 1700 + Math.random() * 1200
    : 1400 + Math.random() * 900;
  slot.glanceIndex = index;
  slot.glance = { x: look.x * magnitude, y: look.y * magnitude };
  slot.glanceUntil = now + hold;
}

function gazeFor(slot: Slot, presence: PaPresence, now: number): Gaze {
  if (presence === "focus") {
    const elapsed = (now - slot.since) / 1000;
    return {
      x: Math.sin(elapsed * 0.7) * 0.1,
      y: 0.42,
    };
  }
  if (presence === "notice") {
    const elapsed = (now - slot.since) / 1000;
    if (elapsed < 0.32) return { x: 0.42, y: -0.7 };
    if (elapsed < 0.7) return { x: -0.2, y: 0.08 };
    return { x: 0, y: 0 };
  }
  if (now >= slot.glanceUntil) pickGlance(slot, now);
  return slot.glance;
}

function rates(presence: PaPresence) {
  if (presence === "notice") return { pupil: 14, head: 7, lean: 8 };
  if (presence === "focus") return { pupil: 8, head: 4, lean: 5 };
  return { pupil: 6.5, head: 4.4, lean: 5 };
}

function seed(to: Slot, from: Slot, now: number) {
  to.pupil = { ...from.pupil };
  to.head = { ...from.head };
  to.lean = from.lean;
  to.since = now;
}

function step(slot: Slot, presence: PaPresence, now: number, dt: number) {
  const target = gazeFor(slot, presence, now);
  const rate = rates(presence);
  slot.pupil = {
    x: damp(slot.pupil.x, target.x, rate.pupil, dt),
    y: damp(slot.pupil.y, target.y, rate.pupil, dt),
  };
  slot.head = {
    x: damp(slot.head.x, slot.pupil.x, rate.head, dt),
    y: damp(slot.head.y, slot.pupil.y, rate.head, dt),
  };
  const leanTarget = presence === "focus" ? 1 : 0;
  slot.lean = damp(slot.lean, leanTarget, rate.lean, dt);

  slot.pose = {
    shiftX: slot.head.x * 9,
    shiftY: 0,
    yaw: slot.head.x * -16,
    pitch: slot.head.y * 14,
    scale: 1 + slot.lean * 0.06,
    px: slot.pupil.x * 2.8,
    py: slot.pupil.y * 2.8,
  };
}

function publish(pose: PaPose) {
  for (const listener of listeners) listener.notify(pose);
}

function frame(now: number) {
  raf = 0;
  const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
  last = now;

  const used = new Set<PaPresence>();
  for (const listener of listeners) {
    const next = listener.getPresence();
    if (next !== listener.presence) {
      seed(slots[next], slots[listener.presence], now);
      listener.presence = next;
    }
    used.add(listener.presence);
  }

  for (const presence of used) step(slots[presence], presence, now, dt);

  for (const listener of listeners) {
    listener.notify(reduced ? neutralPose : slots[listener.presence].pose);
  }

  if (listeners.size > 0 && !reduced && !document.hidden) {
    raf = window.requestAnimationFrame(frame);
  }
}

function start() {
  if (raf || listeners.size === 0) return;
  last = 0;
  raf = window.requestAnimationFrame(frame);
}

function stop() {
  if (!raf) return;
  window.cancelAnimationFrame(raf);
  raf = 0;
}

function syncMotionPreference() {
  reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    stop();
    publish(neutralPose);
    return;
  }
  start();
}

let preferenceBound = false;

function bindPreference() {
  if (preferenceBound) return;
  preferenceBound = true;
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  reduced = media.matches;
  media.addEventListener("change", syncMotionPreference);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });
}

export function subscribePaPose(
  getPresence: () => PaPresence,
  notify: (pose: PaPose) => void,
) {
  bindPreference();
  const presence = getPresence();
  const listener: Listener = { getPresence, presence, notify };
  if (presence !== "rest") seed(slots[presence], slots.rest, performance.now());
  listeners.add(listener);
  notify(reduced ? neutralPose : slots[presence].pose);
  if (!reduced) start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}
