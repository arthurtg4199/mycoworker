"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";
import {
  paAvatarById,
  readStoredPaAvatar,
  subscribePaAvatar,
  DEFAULT_PA_AVATAR_ID,
  PA_EYE_COVER,
  PA_EYE_PUPIL,
  type PaAvatarOption,
} from "@/lib/pa-avatar";

const sizeClass = {
  hero: "h-16 w-16",
  fab: "h-9 w-9",
  empty: "h-12 w-12",
  inline: "h-9 w-9",
} as const;

export type PaAvatarSize = keyof typeof sizeClass;

const SKIN = "#FFD3AC";
const INK = "#3A3A3C";

function useSelectedPaAvatar() {
  const id = useSyncExternalStore(
    subscribePaAvatar,
    readStoredPaAvatar,
    () => DEFAULT_PA_AVATAR_ID,
  );
  return paAvatarById(id);
}

function PaEyes({ eyes }: { eyes: PaAvatarOption["eyes"] }) {
  const pupil = `${PA_EYE_PUPIL * 100}%`;
  const cover = `${PA_EYE_COVER * 100}%`;

  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden="true">
      {eyes.map((eye) => (
        <span
          key={`cover-${eye.x}`}
          className="absolute rounded-full"
          style={{
            left: `${eye.x * 100}%`,
            top: `${eye.y * 100}%`,
            width: cover,
            height: cover,
            transform: "translate(-50%, -50%)",
            background: SKIN,
          }}
        />
      ))}
      {eyes.map((eye) => (
        <span
          key={`pupil-${eye.x}`}
          className="absolute"
          style={{
            left: `${eye.x * 100}%`,
            top: `${eye.y * 100}%`,
            width: pupil,
            height: pupil,
            transform: "translate(-50%, -50%)",
          }}
        >
          <span className="mcw-pa-eye block h-full w-full">
            <span
              className="mcw-pa-pupil block h-full w-full rounded-full"
              style={{ background: INK }}
            />
          </span>
        </span>
      ))}
    </span>
  );
}

export function PaPortrait({
  avatar,
  crop = "spot",
  idle = false,
  lively = false,
  className,
}: {
  avatar: PaAvatarOption;
  crop?: "spot" | "picker";
  idle?: boolean;
  lively?: boolean;
  className?: string;
}) {
  const frame = crop === "picker" ? avatar.picker : avatar.spot;
  return (
    <span
      className={`relative block overflow-hidden bg-[#F3F0FA] ${
        idle ? "mcw-pa-idle" : ""
      } ${className ?? ""}`}
    >
      <span
        className="absolute inset-0"
        style={{
          transform: `scale(${frame.scale})`,
          transformOrigin: `50% ${frame.originY * 100}%`,
        }}
      >
        <Image
          src={avatar.src}
          alt=""
          fill
          sizes="96px"
          className="object-cover"
        />
        {lively ? <PaEyes eyes={avatar.eyes} /> : null}
      </span>
    </span>
  );
}

export function PaAvatar({
  size = "inline",
  idle = false,
  className,
}: {
  size?: PaAvatarSize;
  idle?: boolean;
  className?: string;
}) {
  const avatar = useSelectedPaAvatar();
  return (
    <PaPortrait
      avatar={avatar}
      lively
      idle={idle && size === "hero"}
      className={`shrink-0 rounded-full ring-1 ring-[#E4DCFF] ${sizeClass[size]} ${className ?? ""}`}
    />
  );
}
