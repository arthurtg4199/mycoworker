import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { StatusPill } from "@/components/status-pill";
import { buyers, channelLabel, dailySummary } from "@/lib/demo-data";

export const metadata: Metadata = {
  title: "Buyers",
};

export default function BuyersPage() {
  return (
    <div className="px-4 pt-2 pb-8">
      <h2 className="text-[1.35rem] font-extrabold tracking-[-0.03em] text-ink">
        Buyers
      </h2>
      <p className="mt-1 text-sm leading-5 text-muted">
        {dailySummary.buyersReady} people are ready for a real hello. Profiles
        arrive in a later step.
      </p>
      <ul className="mt-4 space-y-3">
        {buyers.map((buyer) => {
          const channel = buyer.channels[0];
          return (
            <li
              key={buyer.id}
              className="rounded-3xl bg-white p-4 ring-1 ring-[#F0EAF8]"
            >
              <div className="flex items-center gap-3">
                <Avatar spec={buyer.avatar} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">{buyer.name}</p>
                  <p className="text-xs font-medium text-muted">
                    {channel ? channelLabel(channel) : "Chat"}
                  </p>
                </div>
                <StatusPill status={buyer.status} />
              </div>
              <p className="mt-3 text-sm leading-5 text-[#3C3A46]">
                {buyer.preview}
              </p>
            </li>
          );
        })}
      </ul>
      <Link
        href="/"
        className="mt-4 inline-flex text-sm font-semibold text-mcw"
      >
        Back to Inbox
      </Link>
    </div>
  );
}
