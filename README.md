# Ndoti

Household trash pickup for Yaoundé: households request pickups, collectors pick up and dump at approved bacs, and admins verify payments and dumps. One Progressive Web App (PWA) with three modes: household (`/h`), collector (`/c`) and admin (`/a`).

**Stack:** Next.js (App Router) + TypeScript, MongoDB (Atlas free tier), Tailwind CSS, i18next (FR/EN), Cloudinary (dump photos), a hand-written service worker and an IndexedDB outbox for offline collectors.

## How it fits together

```
Phone (PWA)                         Next.js server                    Services
─────────────                       ──────────────                    ────────
screens (React)  ── fetch /api ──▶  route handlers ── driver ──▶     MongoDB Atlas
outbox (IndexedDB) ─ replays ──▶    check role + status               (users, zones, pickups,
service worker: caches screens      atomic updates                     dumps, dumpPoints)
  and last API responses            signs photo uploads
dump photo ───────── direct upload (signed) ─────────────────────▶  Cloudinary
```

All access control is on the server. The browser never talks to MongoDB.

## What already works

| Area | Status |
| --- | --- |
| Sign-up and login with phone number + 6-digit PIN (hashed, account locks for 15 min after 5 wrong PINs) | Done |
| Household: gate code (ND-B-017, assigned automatically), request pickup, 4-digit confirmation code, manual Mobile Money payment | Done |
| Collector: open requests in their zones, accept (atomic: never two collectors on one job), call, directions, enter code, report failure | Done |
| Collector offline: actions and dump photos are saved on the phone and sent when the network returns | Done |
| Dump proof: live camera photo + GPS, compressed to about 200 KB, auto-approved within 100 m of a registered bac | Done |
| Collector earnings today (50% at pickup, 50% after dump approval) | Done |
| Admin: approve collectors, confirm payments, review dump photos, today's numbers | Done |
| Subscriptions, route-order and zone editing screens, payouts, reports, push notifications | Next milestones |

## 1. Create the free accounts (once)

1. **MongoDB Atlas** (https://www.mongodb.com/atlas): create a free M0 cluster, pick a region close to Cameroon (for example Europe). Under *Database Access* create a user; under *Network Access* allow your server's IP (or `0.0.0.0/0` while testing). Copy the connection string.
2. **Cloudinary** (https://cloudinary.com): create a free account and copy the cloud name, API key and API secret.

## 2. Run it locally

```bash
npm install
cp .env.example .env.local     # fill in MongoDB, AUTH_SECRET, Cloudinary, MoMo / OM numbers
npm run setup-db -- --admin-phone 677123456 --admin-pin 123456 --admin-name "Your Name"
npm run dev                    # http://localhost:3000
```

`setup-db` creates the indexes, an example **Zone A**, an example dump point and your admin account. Edit zones and dump points in Atlas (*Browse Collections*) until the admin screens for them exist:

- `zones`: `{ _id: "B", name: "Zone B – derrière le marché", boundaries: "Du carrefour jusqu'à l'école", nextHouseNumber: 1 }`
- `dumpPoints`: `{ name: "Bac HYSACAM carrefour X", location: { lat: 3.87, lng: 11.52 } }`

The service worker only runs in production (`npm run build && npm start`). Camera and GPS need HTTPS on a phone, so test phones against a deployed server.

## 3. Deploy (small server, about $5–7/month)

Any server that runs Node.js 22 or Docker works. With Docker on a small VPS:

```bash
docker build -t ndoti --build-arg NEXT_PUBLIC_MOMO_NUMBER=6XXXXXXXX --build-arg NEXT_PUBLIC_OM_NUMBER=6XXXXXXXX .
docker run -d --restart unless-stopped -p 3000:3000 --env-file .env.local ndoti
```

Put a reverse proxy with free HTTPS in front (for example Caddy: `caddy reverse-proxy --from ndoti.example.com --to localhost:3000`). Then open the site on an Android phone in Chrome and choose **Add to Home screen**.

Without Docker: `npm ci && npm run build && node .next/standalone/server.js` (copy `.next/static` and `public` next to it, as in the Dockerfile).

## Functional requirements

`docs/FUNCTIONAL_REQUIREMENTS.md` tracks every requirement against what's actually built, with a Status column kept up to date as features land.

## Project layout

```
src/app/            screens: login, register, pending, h (household), c (collector), a (admin)
src/app/api/        auth, me, zones, pickups, pickups/[id], dumps, dumps/sign, admin
src/lib/            db, session (JWT cookie), models, types, pricing, geo, phone,
                    client (fetch), outbox (offline queue), hooks, auth (React context)
src/components/     AppShell, GatePlate, StatusPill, RequireRole
src/i18n/           fr.json, en.json
public/sw.js        service worker (offline screens + last data)
scripts/setup-db.mjs indexes, first zone, admin account
```

## Key design decisions

- **Pickup changes** all go through `POST /api/pickups/:id`. Each action is one atomic MongoDB update whose filter encodes who may do it and from which status. Actions are safe to replay, which the offline outbox relies on.
- **Confirmation codes** are stored on the pickup but only ever sent to the household that owns it. Collectors submit the code; the server checks it and fails the pickup after 5 wrong tries.
- **Prices** are decided by the server (`src/lib/pricing.ts`); what the phone sends is ignored. Next step: a `config` collection editable by admins.
- **Accepting a request needs network** on purpose, so two collectors never both believe they have the job. Everything after accepting works offline.
- **Photos** go straight from the phone to Cloudinary with a server signature, so they don't load the small server.
