import type { DailySummary } from "@/lib/daily-summary";

const stats = [
  { key: "newChats", label: "New chats" },
  { key: "messages", label: "Messages" },
  { key: "nudges", label: "Nudges" },
] as const;

export function DailySummaryCard({ summary }: { summary: DailySummary }) {
  return (
    <section
      aria-labelledby="daily-summary-heading"
      className="mx-4 mt-3 rounded-[22px] bg-white px-3.5 py-3.5 ring-1 ring-[#F0EAF8]"
    >
      <h2
        id="daily-summary-heading"
        className="text-[11px] font-bold tracking-wide text-[#6C4CE0] uppercase"
      >
        Daily summary
      </h2>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <div
            key={stat.key}
            className="grid rounded-2xl bg-mcw-soft px-2 py-2.5 text-center"
          >
            <dt className="row-start-2 mt-1 text-[11px] leading-4 font-semibold text-[#5C5870]">
              {stat.label}
            </dt>
            <dd className="row-start-1 text-[1.65rem] leading-none font-extrabold tracking-tight text-[#6C4CE0] tabular-nums">
              {summary[stat.key]}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm leading-5 font-medium text-[#3C3458]">{summary.line}</p>
    </section>
  );
}
