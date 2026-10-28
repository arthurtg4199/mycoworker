import { CheckIcon } from "@/components/icons";
import type { ChatStatus } from "@/lib/demo-data";

export function StatusPill({ status }: { status?: ChatStatus }) {
  if (!status) return null;

  if (status === "answered") {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] font-semibold whitespace-nowrap text-[#1F9D62]">
        <CheckIcon className="h-3.5 w-3.5" />
        Answered
      </span>
    );
  }

  if (status === "hot") {
    return (
      <span className="inline-flex rounded-full bg-mcw px-2.5 py-1 text-[11px] leading-none font-semibold whitespace-nowrap text-white">
        Hot buyer, your turn
      </span>
    );
  }

  const label = status === "followed_up" ? "Followed up" : "Your turn";

  return (
    <span className="inline-flex rounded-full bg-[#EFE8FF] px-2.5 py-1 text-[11px] leading-none font-semibold whitespace-nowrap text-mcw">
      {label}
    </span>
  );
}
