"use client";

export type PaPresence = "rest" | "focus" | "notice";

export type PaPose = {
  hx: number;
  hy: number;
  rot: number;
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
};

type Listener = {
  getPresence: () => PaPresence;
  presence: PaPresence;
  notify: (pose: PaPose) => void;
};

const restPath: { x: number; y: number; hold: number }[] = [
  { x: 0.02, y: 0.16, hold: 2.35 },
  { x: -0.8, y: 0.05, hold: 1.05 },
  { x: -0.22, y: -0.7, hold: 0.9 },
  { x: 0.04, y: 0.02, hold: 1.85 },
  { x: 0.84, y: 0.18, hold: 1.1 },
  { x: 0.28, y: 0.78, hold: 1.05 },
  { x: -0.48, y: -0.28, hold: 0.85 },
  { x: 0.1, y: -0.58, hold: 0.8 },
  { x: 0, y: 0.14, hold: 2.6 },
];

const TRAVEL = 0.62;

const neutralPose: PaPose = { hx: 0, hy: 0, rot: 0, scale: 1, px: 0, py: 0 };

function makeSlot(now: number): Slot {
  return {
    since: now,
    pupil: { x: 0.02, y: 0.14 },
    head: { x: 0.01, y: 0.1 },
    lean: 0,
    pose: neutralPose,
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

function smoothstep(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

function restGaze(now: number): Gaze {
  const holds = restPath.reduce((sum, point) => sum + point.hold, 0);
  const cycle = holds + TRAVEL * restPath.length;
  let t = (now / 1000) % cycle;
  for (let index = 0; index < restPath.length; index += 1) {
    const point = restPath[index]!;
    const next = restPath[(index + 1) % restPath.length]!;
    if (t < point.hold) {
      return {
        x: point.x + Math.sin(now / 1400 + index) * 0.04,
        y: point.y + Math.cos(now / 1700 + index * 0.6) * 0.035,
      };
    }
    t -= point.hold;
    if (t < TRAVEL) {
      const k = smoothstep(t / TRAVEL);
      return {
        x: point.x + (next.x - point.x) * k,
        y: point.y + (next.y - point.y) * k,
      };
    }
    t -= TRAVEL;
  }
  return { x: 0, y: 0.12 };
}

function gazeFor(presence: PaPresence, now: number, since: number): Gaze {
  if (presence === "focus") {
    const elapsed = (now - since) / 1000;
    return {
      x: Math.sin(elapsed * 1.45) * 0.16 + Math.sin(elapsed * 0.45) * 0.05,
      y: 0.84 + Math.sin(elapsed * 2.1) * 0.05,
    };
  }
  if (presence === "notice") {
    const elapsed = (now - since) / 1000;
    if (elapsed < 0.26) return { x: -0.18, y: -0.92 };
    if (elapsed < 0.62) return { x: 0.12, y: -0.08 };
    return { x: 0.02, y: 0.16 };
  }
  return restGaze(now);
}

function rates(presence: PaPresence) {
  if (presence === "notice") return { pupil: 16, head: 8, lean: 7 };
  if (presence === "focus") return { pupil: 9, head: 4.2, lean: 6 };
  return { pupil: 4.6, head: 2.4, lean: 4 };
}

function seed(to: Slot, from: Slot, now: number) {
  to.pupil = { ...from.pupil };
  to.head = { ...from.head };
  to.lean = from.lean;
  to.since = now;
}

function step(slot: Slot, presence: PaPresence, now: number, dt: number) {
  const target = gazeFor(presence, now, slot.since);
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

  const elapsed = (now - slot.since) / 1000;
  let nod = 0;
  let react = 0;
  if (presence === "notice" && elapsed > 0.16 && elapsed < 0.7) {
    const k = (elapsed - 0.16) / 0.54;
    nod = Math.sin(Math.min(1, k) * Math.PI) * 9;
    react = Math.sin(Math.min(1, k) * Math.PI);
  }

  const breath =
    presence === "focus"
      ? Math.sin(now / 560) * 0.4
      : Math.sin(now / 980) * 2.1;

  slot.pose = {
    hx: slot.head.x * 12,
    hy: slot.head.y * 10 + breath + nod + slot.lean * 8,
    rot: slot.head.x * 16 - slot.head.y * 6,
    scale: 1 + slot.lean * 0.16 + react * 0.07,
    px: slot.pupil.x * 58,
    py: slot.pupil.y * 48,
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
