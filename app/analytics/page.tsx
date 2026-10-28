import type { Metadata } from "next";
import Link from "next/link";
import { channelTotals, dailySummary } from "@/lib/demo-data";

export const metadata: Metadata = {
  title: "Analytics",
};

const barClass = {
  whatsapp: "bg-[#25D366]",
  instagram: "bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
  email: "bg-[#6C8CFF]",
} as const;

export default function AnalyticsPage() {
  return (
    <div className="px-4 pt-2 pb-8">
      <h2 className="text-[1.35rem] font-extrabold tracking-[-0.03em] text-ink">
        Analytics
      </h2>
      <p className="mt-1 text-sm leading-5 text-muted">
        A friendly peek at today. Live numbers come later.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <article className="rounded-3xl bg-mcw-soft p-4">
          <p className="text-4xl font-extrabold tracking-tight text-mcw">
            {dailySummary.chatsHandled}
          </p>
          <p className="mt-1 text-sm font-semibold text-[#3C3458]">
            chats I handled
          </p>
        </article>
        <Link
          href="/buyers"
          className="rounded-3xl bg-white p-4 ring-1 ring-[#F0EAF8]"
        >
          <p className="text-4xl font-extrabold tracking-tight text-ink">
            {dailySummary.buyersReady}
          </p>
          <p className="mt-1 text-sm font-semibold text-[#3C3458]">
            buyers ready for you
          </p>
        </Link>
      </div>
      <section className="mt-4 rounded-3xl bg-white p-4 ring-1 ring-[#F0EAF8]">
        <h3 className="text-sm font-bold text-ink">Where the chats came from</h3>
        <ul className="mt-4 space-y-4">
          {channelTotals.map((row) => (
            <li key={row.channel}>
              <div className="mb-1.5 flex items-baseline justify-between text-sm">
                <span className="font-semibold text-ink">{row.label}</span>
                <span className="text-muted">{row.count}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#F3F1F6]">
                <div
                  className={`h-full rounded-full ${barClass[row.channel]}`}
                  style={{
                    width: `${(row.count / dailySummary.chatsHandled) * 100}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
