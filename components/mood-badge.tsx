import { moodLabel, type Mood } from "@/lib/mood";

const tone = {
  happy: "bg-[#E5F6EC] text-[#1F7A4D]",
  neutral: "bg-[#F3F4F6] text-[#5F6670]",
  upset: "bg-[#FDE8EC] text-[#9A3B4A]",
} as const;

export function MoodBadge({ mood }: { mood?: Mood | null }) {
  if (!mood) return null;
  const label = moodLabel(mood);
  return (
    <span
      data-mood={mood}
      className={`inline-flex shrink-0 rounded-full px-2 py-1 text-[11px] leading-none font-semibold whitespace-nowrap ${tone[mood]}`}
    >
      {label}
    </span>
  );
}
