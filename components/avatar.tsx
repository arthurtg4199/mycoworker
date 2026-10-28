import { ChannelIcon } from "@/components/icons";
import type { AvatarSpec } from "@/lib/demo-data";

const sizes = {
  md: "h-12 w-12 text-[18px]",
  sm: "h-10 w-10 text-base",
};

export function Avatar({
  spec,
  size = "md",
}: {
  spec: AvatarSpec;
  size?: keyof typeof sizes;
}) {
  return (
    <span className={`relative inline-flex shrink-0 ${sizes[size]}`}>
      {spec.kind === "channel" ? (
        <ChannelIcon channel={spec.channel} className="h-full w-full" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-full font-bold"
          style={{ backgroundColor: spec.tint, color: spec.ink }}
        >
          {spec.letter}
        </span>
      )}
      {spec.badge ? (
        <span className="absolute -bottom-0.5 -left-0.5 flex h-[18px] w-[18px] rounded-full ring-2 ring-white">
          <ChannelIcon channel={spec.badge} className="h-full w-full" />
        </span>
      ) : null}
    </span>
  );
}
