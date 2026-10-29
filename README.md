# MyCoWorker

A friendly assistant for small business, by **OKEREX**.

**I handle the chats. You close the deals.**

This is a mobile-first app shell. Without Supabase settings it runs in demo mode: the inbox, buyers, and daily summary are hardcoded so the product can be clicked through. With the Supabase URL and anon key set, email sign-in gates the tabs. There are no database tables yet.

## Stack

- Next.js (App Router) and TypeScript
- Tailwind CSS
- Installable PWA (web manifest, icons, and a small service worker)
- Supabase email sign-in, when the public URL and anon key are set

## Screens

- **Sign in** — email and password, shown when the Supabase URL and anon key are set
- **Inbox** — daily summary (“I handled 42 chats today. 3 buyers ready for you.”), channel chips, status tags, and demo threads
- **Buyers**, **Analytics**, **Settings** — friendly placeholders. Settings includes sign out once you are signed in
- **Talk to MyCoWorker** — assistant button with the headset helper. The eyes blink and look around.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local` and fill in the two Supabase values to try sign-in. Leave them blank to stay in demo mode.

```bash
npm run build
npm start
```

The service worker registers in production (`npm start` or a Vercel deploy), not during `npm run dev`.

## Deploy on Vercel

Import this repository. Framework preset: **Next.js**. Vercel deploys from `main`.

In the Vercel project, open Settings → Environment Variables.
Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the Supabase project (Project Settings → API).
Redeploy after saving them. Leave both unset and the site stays in demo mode.

After deploy, the site can be installed to a phone home screen from the browser menu.

## Brand

- Accent: `#6C4CE0`
- `public/logo_final.png` is the lockup (smiling chat bubble, wordmark, and “Your friendly assistant for small business”)
- Favicon and PWA icons use that same bubble mark
- The assistant icon is a simple SVG of concept C, the headset helper
