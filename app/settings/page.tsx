import type { Metadata } from "next";
import Image from "next/image";
import { AccountSettings } from "@/components/account-settings";
import { ChannelIcon } from "@/components/icons";
import { channelFilters } from "@/lib/demo-data";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div className="px-4 pt-2 pb-10">
      <h2 className="text-[1.35rem] font-extrabold tracking-[-0.03em] text-ink">
        Settings
      </h2>
      <div className="mt-4 rounded-3xl bg-mcw-soft px-4 py-6 text-center">
        <Image
          src="/logo_final.png"
          alt="MyCoWorker. Your friendly assistant for small business."
          width={880}
          height={620}
          className="mx-auto h-auto w-56"
        />
        <p className="mt-2 text-sm leading-5 font-semibold text-[#3C3458]">
          I handle the chats. You close the deals.
        </p>
      </div>

      <AccountSettings />

      <section className="mt-4 rounded-3xl bg-white p-4 ring-1 ring-[#F0EAF8]">
        <h3 className="text-sm font-bold text-ink">Your shop</h3>
        <p className="mt-1 text-base font-semibold text-ink">Your business</p>
        <p className="mt-1 text-sm leading-5 text-muted">
          You will name the shop in a later step.
        </p>
      </section>

      <section className="mt-3 rounded-3xl bg-white p-4 ring-1 ring-[#F0EAF8]">
        <h3 className="text-sm font-bold text-ink">Channels</h3>
        <ul className="mt-3 divide-y divide-[#F4F2F8]">
          {channelFilters.map((channel) => (
            <li key={channel.id} className="flex items-center gap-3 py-3">
              <ChannelIcon channel={channel.id} className="h-9 w-9" />
              <span className="flex-1 font-semibold text-ink">
                {channel.label}
              </span>
              <span className="rounded-full bg-[#F4F2F8] px-2.5 py-1 text-[11px] font-semibold text-[#7A7688]">
                Not connected
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6 text-center text-xs font-semibold tracking-wide text-muted uppercase">
        MyCoWorker by OKEREX
      </p>
    </div>
  );
}
