"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ChannelIcon } from "@/components/icons";
import {
  connectWhatsAppFromEnv,
  connectWhatsAppWithToken,
  disconnectWhatsApp,
  setWhatsAppAutoReply,
  startWhatsAppOAuth,
  type WhatsAppFormState,
} from "@/app/whatsapp/actions";
import { WHATSAPP_AUTO_REPLY } from "@/lib/whatsapp/copy";

export type WhatsAppConnectProps = {
  connected: boolean;
  displayPhone: string | null;
  businessName: string | null;
  phoneNumberId: string | null;
  autoReply: boolean;
  oauthReady: boolean;
  embeddedSignup: boolean;
  serverNumberReady: boolean;
  webhookReady: boolean;
  webhookUrl: string | null;
  notice: string | null;
  canConnect: boolean;
};

const initialState: WhatsAppFormState = {};

function PendingButton({
  idle,
  pending,
  className,
}: {
  idle: string;
  pending: string;
  className: string;
}) {
  const { pending: busy } = useFormStatus();
  return (
    <button type="submit" disabled={busy} className={className}>
      {busy ? pending : idle}
    </button>
  );
}

export function WhatsAppConnect(props: WhatsAppConnectProps) {
  const [oauthState, oauthAction] = useActionState(startWhatsAppOAuth, initialState);
  const [envState, envAction] = useActionState(connectWhatsAppFromEnv, initialState);
  const [pasteState, pasteAction] = useActionState(
    connectWhatsAppWithToken,
    initialState,
  );
  const phone =
    props.displayPhone ||
    (props.phoneNumberId ? `Number ID ${props.phoneNumberId}` : "WhatsApp");

  return (
    <div className="rounded-3xl bg-white p-4 ring-1 ring-[#F0EAF8]">
      <div className="flex items-center gap-3">
        <ChannelIcon channel="whatsapp" className="h-9 w-9" />
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-ink">WhatsApp</h3>
          <p className="truncate text-sm text-muted">
            {props.connected ? phone : "Cloud API · Nigeria first"}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            props.connected
              ? "bg-[#E5F8EE] text-[#1F7A4D]"
              : "bg-[#F4F2F8] text-[#7A7688]"
          }`}
        >
          {props.connected ? "Connected" : "Not connected"}
        </span>
      </div>

      {props.businessName ? (
        <p className="mt-3 text-sm font-semibold text-ink">{props.businessName}</p>
      ) : null}

      {props.notice ? (
        <p className="mt-3 rounded-2xl bg-mcw-soft px-3 py-2 text-sm leading-5 text-[#3C3458]">
          {props.notice}
        </p>
      ) : null}

      {props.connected ? (
        <ConnectedControls {...props} />
      ) : !props.canConnect ? (
        <p className="mt-3 text-sm leading-5 text-muted">
          Turn on Supabase sign-in before a business can link WhatsApp. Until
          then this inbox stays on sample chats.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm leading-5 text-muted">
            Link the business number, then reply from the inbox. Nothing here
            buys a number or publishes the Meta app.
          </p>
          {props.oauthReady ? (
            <form action={oauthAction}>
              <PendingButton
                idle={props.embeddedSignup ? "Connect with Meta" : "Connect with Meta"}
                pending="Opening Meta…"
                className="w-full rounded-full bg-mcw py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              />
              {oauthState.message ? (
                <p className="mt-2 text-sm font-semibold text-[#9A3B4A]">
                  {oauthState.message}
                </p>
              ) : null}
            </form>
          ) : (
            <p className="text-sm leading-5 text-muted">
              Add META_APP_ID and META_APP_SECRET to enable Meta sign-in.
            </p>
          )}
          {props.serverNumberReady ? (
            <form action={envAction}>
              <PendingButton
                idle="Use the number saved on the server"
                pending="Checking Meta…"
                className="w-full rounded-full bg-[#F6F4FB] py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
              />
              {envState.message ? (
                <p className="mt-2 text-sm font-semibold text-[#9A3B4A]">
                  {envState.message}
                </p>
              ) : null}
            </form>
          ) : null}
          <TokenPasteForm state={pasteState} action={pasteAction} />
        </div>
      )}

      <WebhookHint
        webhookUrl={props.webhookUrl}
        webhookReady={props.webhookReady}
      />
    </div>
  );
}

function ConnectedControls(props: WhatsAppConnectProps) {
  return (
    <div className="mt-4 space-y-3">
      <form action={setWhatsAppAutoReply}>
        <input
          type="hidden"
          name="autoReply"
          value={props.autoReply ? "off" : "on"}
        />
        <button
          type="submit"
          role="switch"
          aria-checked={props.autoReply}
          className="flex w-full items-center justify-between gap-3 rounded-2xl bg-[#F6F4FB] px-3 py-3 text-left"
        >
          <span>
            <span className="block text-sm font-bold text-ink">
              {props.autoReply ? "Auto-reply is on" : "Ask me first"}
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-muted">
              {props.autoReply
                ? `MyCoWorker sends: “${WHATSAPP_AUTO_REPLY}”`
                : "Replies wait until you tap Send in the inbox."}
            </span>
          </span>
          <span
            className={`relative h-6 w-11 shrink-0 rounded-full ${
              props.autoReply ? "bg-mcw" : "bg-[#D9D4E4]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white ${
                props.autoReply ? "right-0.5" : "left-0.5"
              }`}
            />
          </span>
        </button>
      </form>
      {!props.webhookReady ? (
        <p className="text-sm leading-5 text-[#9A3B4A]">
          Set WEBHOOK_VERIFY_TOKEN on the server, then open Settings again so
          new WhatsApp messages can be saved.
        </p>
      ) : null}
      <form action={disconnectWhatsApp}>
        <PendingButton
          idle="Disconnect WhatsApp"
          pending="Disconnecting…"
          className="w-full rounded-full bg-white py-2.5 text-sm font-semibold text-ink ring-1 ring-[#E7E2F4] disabled:opacity-60"
        />
      </form>
      <p className="text-xs leading-5 text-muted">
        Chats you already saved stay in the inbox.
      </p>
    </div>
  );
}

function TokenPasteForm({
  state,
  action,
}: {
  state: WhatsAppFormState;
  action: (payload: FormData) => void;
}) {
  return (
    <details className="rounded-2xl bg-[#FBFBFD] px-3 py-2">
      <summary className="cursor-pointer text-sm font-semibold text-ink">
        Paste a Cloud API token
      </summary>
      <form action={action} className="mt-3 space-y-2">
        <label className="block text-xs font-semibold text-muted" htmlFor="phoneNumberId">
          Phone number ID
        </label>
        <input
          id="phoneNumberId"
          name="phoneNumberId"
          inputMode="numeric"
          autoComplete="off"
          required
          className="h-11 w-full rounded-2xl border border-[#E7E7EC] px-3 text-sm outline-none focus:border-mcw"
        />
        <label className="block text-xs font-semibold text-muted" htmlFor="accessToken">
          Access token
        </label>
        <input
          id="accessToken"
          name="accessToken"
          type="password"
          autoComplete="off"
          required
          className="h-11 w-full rounded-2xl border border-[#E7E7EC] px-3 text-sm outline-none focus:border-mcw"
        />
        <PendingButton
          idle="Save token"
          pending="Checking Meta…"
          className="w-full rounded-full bg-mcw py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        />
        {state.message ? (
          <p className="text-sm font-semibold text-[#9A3B4A]">{state.message}</p>
        ) : null}
      </form>
    </details>
  );
}

function WebhookHint({
  webhookUrl,
  webhookReady,
}: {
  webhookUrl: string | null;
  webhookReady: boolean;
}) {
  if (!webhookUrl) return null;
  return (
    <div className="mt-4 border-t border-[#F4F2F8] pt-3">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">
        Webhook
      </p>
      <p className="mt-1 break-all text-sm leading-5 text-ink">{webhookUrl}</p>
      <p className="mt-1 text-xs leading-5 text-muted">
        {webhookReady
          ? "Paste this in the Meta app, with the same verify token as WEBHOOK_VERIFY_TOKEN. Subscribe to messages."
          : "Add WEBHOOK_VERIFY_TOKEN before Meta can verify this address."}
      </p>
    </div>
  );
}
