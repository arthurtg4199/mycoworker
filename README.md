# MyCoWorker

A friendly assistant for small business, by **OKEREX**.

**I handle the chats. You close the deals.**

This is a mobile-first app shell. Without Supabase settings it runs in demo mode: the inbox, buyers, and daily summary are hardcoded so the product can be clicked through. With the Supabase URL and anon key set, email sign-in gates the tabs, and the inbox reads that account's customers, chats, and messages. A new account starts empty.

## Stack

- Next.js (App Router) and TypeScript
- Tailwind CSS
- Installable PWA (web manifest, icons, and a small service worker)
- Supabase email sign-in, when the public URL and anon key are set
- Supabase Postgres for the business profile, customers, chats, messages, appointments, and payments

## Screens

- **Sign in** — email and password, shown when the Supabase URL and anon key are set
- **Inbox** — daily summary (“I handled 42 chats today. 3 buyers ready for you.”), a morning check-in (“Here's what needs you today”), channel chips, status tags, and demo threads
- **Buyers**, **Analytics**, **Settings** — buyers and analytics follow the inbox. Settings is where you name the shop, pick the assistant picture, choose how chats are handled, and sign out
- **Talk to MyCoWorker** — assistant button with the corporate PA portrait you picked in Settings. The same morning check-in sits on that screen.
- **Nudges** — the bell lists hot buyers, follow-ups, unanswered customers, and the daily check-in. The header shows Ask me first, Auto-reply, or Paused.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local` and fill in the two Supabase values to try sign-in. Leave them blank to stay in demo mode. WhatsApp needs the Meta values in that same file, and it stays disconnected until a signed-in business connects a number in Settings.

## Database

Apply these in order in the Supabase SQL editor, or with the Supabase CLI (`supabase db push`):

1. `supabase/migrations/20261031120000_business_tables.sql`
2. `supabase/migrations/20261031150000_whatsapp_connections.sql`
3. `supabase/migrations/20261031220000_business_profiles.sql`
4. `supabase/migrations/20261101170000_assistant_nudges.sql`

The first migration creates `customers`, `chats`, `messages`, `appointments`, and `payments`, plus a `chat_previews` view for the inbox. The third adds `business_profiles`, one row per owner: shop name, what they sell, hours, city, reply style, and an optional currency. Row level security is on for every table. A signed-in user can only read and write their own rows. Messages are visible only when the parent chat belongs to that user. No rows are seeded.

Settings → Your shop saves that profile. Without Supabase, the form keeps a sample shop on this device. With Supabase, each account starts blank until they save. The assistant greeting, an empty inbox, and the menu use the saved shop name. The sample inbox is unchanged until there is a real profile.

The fourth migration adds `assistant_settings` and `nudges`. `assistant_settings` is one row per owner: `ask_first` (default), `auto_reply`, or `paused`. With no row, the app behaves as Ask me first. `nudges` stores in-app reminders only (hot buyer, follow-up, unanswered, and one morning check-in per UTC day). Row level security keeps both tables to the signed-in user. A customer or chat on a nudge must belong to that same user. Demo mode builds nudges from the sample inbox and keeps the handling choice on this device. A signed-in account with no customers or chats gets an empty bell until real chats exist. Mark read sets `read_at`. This does not send email, SMS, push, or WhatsApp. The WhatsApp ask-me-first switch in Channels is unchanged.

`lib/db/queries.ts` and `lib/db/profile.ts` read and write those tables with the anon key and the signed-in session. The service role key is not used. When the URL or anon key is missing, the inbox stays on the sample chats and the shop form keeps its edits on this device. When they are set and a query fails, the inbox stays empty and asks you to refresh, instead of showing the sample people inside a broken account. A signed-in account with no rows, and WhatsApp not connected, still shows the sample inbox. Connecting WhatsApp, or any saved chat, switches the inbox to that account's rows.

## WhatsApp

Settings → Channels links a WhatsApp Business number through the Cloud API. Three ways, in the order the screen offers them:

1. **Connect with Meta** when `META_APP_ID` and `META_APP_SECRET` are set. If `META_EMBEDDED_SIGNUP_CONFIG_ID` is also set, this opens embedded signup v4. Otherwise it asks for the WhatsApp OAuth scopes.
2. **Use the number saved on the server** when `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are set. The token stays in the server environment and is not copied into the database.
3. **Paste a Cloud API token** plus the phone number ID. Meta is asked to confirm the pair before it is saved.

Inbound messages hit `POST /api/whatsapp/webhook`. The route checks `X-Hub-Signature-256` with `META_APP_SECRET`, then saves the customer, chat, and message for the signed-in business that connected that phone number ID. A buying-intent message is marked hot and ready for you. Anything else is marked your turn. The owner replies from the inbox. Nothing is sent until they tap Send, unless auto-reply is turned on in Settings. Auto-reply is off by default and only sends one short acknowledgement. This app does not send template messages.

The webhook write goes through `mcw_ingest_whatsapp`, which checks `WEBHOOK_VERIFY_TOKEN` before it inserts. The anon key alone cannot forge a chat. Open Settings once after you change that token so the saved hash stays in step.

Instagram and email stay unconnected. They can share this Meta app later.

### What to click in the Meta Developer Console

Do this in [developers.facebook.com](https://developers.facebook.com/). Stay in Development mode. Do not buy a number, add a payment method, or publish the app until that is an explicit decision.

1. **My Apps → Create App**. Choose the Business type. Name it MyCoWorker.
2. **App settings → Basic**. Copy the App ID into `META_APP_ID`. Show the App secret and copy it into `META_APP_SECRET`.
3. **Add product → WhatsApp**. Open **WhatsApp → API Setup**. Copy the **Phone number ID** into `WHATSAPP_PHONE_NUMBER_ID` and a token into `WHATSAPP_ACCESS_TOKEN`. The token on that screen is temporary. For a longer one: **Business settings → Users → System users → Generate token**, with `whatsapp_business_messaging` and `whatsapp_business_management`.
4. **WhatsApp → Configuration** (or the Webhooks product). Callback URL: `https://<your-host>/api/whatsapp/webhook`. Verify token: the same string as `WEBHOOK_VERIFY_TOKEN`. Subscribe to the **messages** field.
5. **Facebook Login for Business → Settings → Valid OAuth Redirect URIs**. Add `https://<your-host>/api/whatsapp/callback` (and `http://localhost:3000/api/whatsapp/callback` for local).
6. Optional embedded signup: **Facebook Login for Business → Configurations → Create**. Choose WhatsApp. Copy the Configuration ID into `META_EMBEDDED_SIGNUP_CONFIG_ID`.
7. On the API Setup screen, add your own phone under **To** so the free test number is allowed to message it. Development mode only delivers to numbers on that list.

Apply the WhatsApp migration, set the env vars, redeploy, sign in, and open Settings → Connect. The test number can message the allow list. It cannot reach the public.

### Before real Nigerian customers

These need an explicit OK. This app does not do them.

- Switch the Meta app from Development to Live, or submit App Review for advanced access.
- Business verification. Meta usually asks for the CAC certificate of incorporation, a proof of address, and a director's ID.
- Display-name approval for the WhatsApp business profile.
- A phone number that is not already on the WhatsApp or WhatsApp Business app. Use a number the business already owns. Buying a new number is a separate cost.
- A payment method on the WhatsApp Business account. Session replies inside the customer-care window are the only sends here. Template messages, which can be billed, are not implemented.

```bash
npm run build
npm start
```

The service worker registers in production (`npm start` or a Vercel deploy), not during `npm run dev`.

## Deploy on Vercel

Import this repository. Framework preset: **Next.js**. Vercel deploys from `main`.

In the Vercel project, open Settings → Environment Variables.
Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the Supabase project (Project Settings → API).
For WhatsApp, also add `META_APP_ID`, `META_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, and `WEBHOOK_VERIFY_TOKEN`. `META_EMBEDDED_SIGNUP_CONFIG_ID` is optional.
Redeploy after saving them. Leave the Supabase pair unset and the site stays in demo mode. Leave the Meta values unset and WhatsApp stays disconnected.

After deploy, the site can be installed to a phone home screen from the browser menu.

## Brand

- Accent: `#6C4CE0`
- `public/logo_final.png` is the lockup (smiling chat bubble, wordmark, and “Your friendly assistant for small business”)
- Favicon and PWA icons use that same bubble mark
- The assistant portrait is one of four corporate PA options in `public/avatars/pa/`. The default is glasses, a charcoal suit, and a purple tie. Change it like a profile picture: in Settings, or while creating an account, tap the picture and then pick one. The chat screen does not ask again. The choice is stored on the device, and on the Supabase user when you are signed in. The portrait’s dot eyes blink and glance, and stay still when reduced motion is on.
