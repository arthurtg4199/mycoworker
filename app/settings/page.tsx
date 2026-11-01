import type { Metadata } from "next";
import Image from "next/image";
import { AccountSettings } from "@/components/account-settings";
import { BusinessProfileForm } from "@/components/business-profile-form";
import { HandlingModeControl } from "@/components/handling-mode-control";
import { ChannelIcon } from "@/components/icons";
import { ChooseAssistant } from "@/components/pa-preference";
import { WhatsAppConnect } from "@/components/whatsapp-connect";
import { demoProfileFields, fieldsFromProfile } from "@/lib/business-profile";
import { loadAssistantHome } from "@/lib/db/assistant";
import { loadBusinessProfile } from "@/lib/db/profile";
import { channelFilters } from "@/lib/demo-data";
import { siteOrigin } from "@/lib/http/origin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { readWhatsAppConfig } from "@/lib/whatsapp/env";
import {
  getWhatsAppConnection,
  syncIngestHash,
} from "@/lib/whatsapp/store";

export const metadata: Metadata = {
  title: "Settings",
};

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function connectNotice(status: string | undefined, reason: string | undefined) {
  if (status === "connected" && reason === "subscribe") {
    return "WhatsApp is connected. Meta did not confirm webhook subscription yet. In the app dashboard, subscribe this account to messages.";
  }
  if (status === "connected") return "WhatsApp is connected. New messages will land in the inbox.";
  if (status === "disconnected") {
    return "WhatsApp is disconnected. Saved chats stay in the inbox.";
  }
  if (status !== "error") return null;
  if (reason === "denied") return "Meta sign-in was cancelled.";
  if (reason === "state") return "That connect attempt expired. Try again.";
  if (reason === "token") return "Meta did not return a usable token.";
  if (reason === "number") return "Meta did not return a WhatsApp number for this account.";
  if (reason === "config") return "Add META_APP_ID and META_APP_SECRET on the server first.";
  if (reason === "disconnect") return "WhatsApp could not be disconnected. Try again.";
  return "WhatsApp could not be connected.";
}

export default async function SettingsPage({
  searchParams,
}: PageProps<"/settings">) {
  const query = await searchParams;
  const [connection, config, origin, shop, assistant] = await Promise.all([
    getWhatsAppConnection(),
    readWhatsAppConfig(),
    siteOrigin(),
    loadBusinessProfile(),
    loadAssistantHome(),
  ]);
  if (connection && config.webhookReady) {
    await syncIngestHash();
  }

  const laterChannels = channelFilters.filter((channel) => channel.id !== "whatsapp");
  const shopFields =
    shop.source === "demo" ? demoProfileFields() : fieldsFromProfile(shop.profile);

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

      <ChooseAssistant />

      <HandlingModeControl mode={assistant.mode} />

      <AccountSettings />

      <BusinessProfileForm
        mode={shop.source}
        initial={shopFields}
        notice={shop.notice}
      />

      <section className="mt-3">
        <h3 className="px-1 text-sm font-bold text-ink">Channels</h3>
        <div className="mt-3">
          <WhatsAppConnect
            connected={Boolean(connection)}
            displayPhone={connection?.displayPhoneNumber ?? null}
            businessName={connection?.businessName ?? null}
            phoneNumberId={connection?.phoneNumberId ?? null}
            autoReply={connection?.autoReply ?? false}
            oauthReady={config.oauthReady}
            embeddedSignup={config.embeddedSignup}
            serverNumberReady={config.serverNumberReady}
            webhookReady={config.webhookReady}
            webhookUrl={origin ? `${origin}/api/whatsapp/webhook` : null}
            notice={connectNotice(one(query.whatsapp), one(query.reason))}
            canConnect={Boolean(getSupabaseEnv())}
          />
        </div>
        <ul className="mt-3 divide-y divide-[#F4F2F8] rounded-3xl bg-white px-4 ring-1 ring-[#F0EAF8]">
          {laterChannels.map((channel) => (
            <li key={channel.id} className="flex items-center gap-3 py-3">
              <ChannelIcon channel={channel.id} className="h-9 w-9" />
              <span className="flex-1">
                <span className="block font-semibold text-ink">{channel.label}</span>
                <span className="block text-xs text-muted">
                  Same Meta app later. WhatsApp comes first.
                </span>
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
