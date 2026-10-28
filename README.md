# MyCoWorker

A friendly assistant for small business, by **OKEREX**.

**I handle the chats. You close the deals.**

This is step 1: a mobile-first app shell. There is no backend yet. The inbox, buyers, and daily summary are hardcoded demo data so the product can be clicked through before any channel is connected.

## Stack

- Next.js (App Router) and TypeScript
- Tailwind CSS
- Installable PWA (web manifest, icons, and a small service worker)

## Screens

- **Inbox** — daily summary (“I handled 42 chats today. 3 buyers ready for you.”), channel chips, status tags, and demo threads
- **Buyers**, **Analytics**, **Settings** — friendly placeholders
- **Talk to MyCoWorker** — assistant button with the headset helper. The eyes blink and look around.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build
npm start
```

The service worker registers in production (`npm start` or a Vercel deploy), not during `npm run dev`.

## Deploy on Vercel

Import this repository. Framework preset: **Next.js**. No environment variables. Vercel deploys from `main`.

After deploy, the site can be installed to a phone home screen from the browser menu.

## Brand

- Accent: `#6C4CE0`
- `public/logo_final.png` is the lockup (smiling chat bubble, wordmark, and “Your friendly assistant for small business”)
- Favicon and PWA icons use that same bubble mark
- The assistant icon is a simple SVG of concept C, the headset helper
