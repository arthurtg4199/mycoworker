import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { PaAvatar } from "@/components/pa-avatar";
import { StatusPill } from "@/components/status-pill";
import { loadWorkspace } from "@/lib/db/queries";
import { channelLabel } from "@/lib/demo-data";

export const metadata: Metadata = {
  title: "Buyers",
};

export default async function BuyersPage() {
  const workspace = await loadWorkspace();
  const buyers = workspace.buyers;
  const ready = workspace.summary.buyersReady;
  const people = ready === 1 ? "person is" : "people are";

  return (
    <div className="px-4 pt-2 pb-8">
      <h2 className="text-[1.35rem] font-extrabold tracking-[-0.03em] text-ink">
        Buyers
      </h2>
      {workspace.notice ? (
        <p className="mt-3 rounded-[22px] bg-mcw-soft px-3.5 py-3 text-sm leading-5 font-medium text-[#3C3458]">
          {workspace.notice}
        </p>
      ) : null}
      <p className="mt-1 text-sm leading-5 text-muted">
        {buyers.length === 0
          ? "When someone is ready to close, they will show up here."
          : `${ready} ${people} ready for a real hello. Profiles arrive in a later step.`}
      </p>
      {buyers.length === 0 ? (
        <div className="px-2 py-10 text-center">
          <PaAvatar size="empty" className="mx-auto" />
        </div>
      ) : (
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
      )}
      <Link
        href="/"
        className="mt-4 inline-flex text-sm font-semibold text-mcw"
      >
        Back to Inbox
      </Link>
    </div>
  );
}
