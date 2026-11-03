import { stageLabel } from "@/lib/crm";
import type { CustomerStage } from "@/lib/db/types";

const tones: Record<CustomerStage, string> = {
  new: "bg-[#F4F2F8] text-[#5C5870]",
  interested: "bg-mcw-soft text-mcw",
  paid: "bg-[#E5F6EC] text-[#1F7A4D]",
  follow_up: "bg-[#FFF4E0] text-[#8A5A12]",
};

export function StagePill({ stage }: { stage: CustomerStage }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] leading-none font-semibold whitespace-nowrap ${tones[stage]}`}
    >
      {stageLabel(stage)}
    </span>
  );
}
