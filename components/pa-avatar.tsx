"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";
import {
  paAvatarById,
  readStoredPaAvatar,
  subscribePaAvatar,
  DEFAULT_PA_AVATAR_ID,
  type PaAvatarOption,
} from "@/lib/pa-avatar";

const sizeClass = {
  hero: "h-16 w-16",
  fab: "h-9 w-9",
  empty: "h-12 w-12",
  inline: "h-9 w-9",
} as const;

export type PaAvatarSize = keyof typeof sizeClass;

function useSelectedPaAvatar() {
  const id = useSyncExternalStore(
    subscribePaAvatar,
    readStoredPaAvatar,
    () => DEFAULT_PA_AVATAR_ID,
  );
  return paAvatarById(id);
}

export function PaPortrait({
  avatar,
  crop = "spot",
  idle = false,
  className,
}: {
  avatar: PaAvatarOption;
  crop?: "spot" | "picker";
  idle?: boolean;
  className?: string;
}) {
  const frame = crop === "picker" ? avatar.picker : avatar.spot;
  return (
    <span
      className={`relative block overflow-hidden bg-[#F3F0FA] ${
        idle ? "mcw-pa-idle" : ""
      } ${className ?? ""}`}
    >
      <Image
        src={avatar.src}
        alt=""
        fill
        sizes="96px"
        className="object-cover"
        style={{
          transform: `scale(${frame.scale})`,
          transformOrigin: `50% ${frame.originY * 100}%`,
        }}
      />
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
      idle={idle && size === "hero"}
      className={`shrink-0 rounded-full ring-1 ring-[#E4DCFF] ${sizeClass[size]} ${className ?? ""}`}
    />
  );
}
