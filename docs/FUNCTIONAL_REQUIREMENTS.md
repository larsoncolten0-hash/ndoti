# Ndoti – Functional Requirements & Status

This is the working copy of the product's functional requirements, kept in the repo so implementation work can be checked against it directly instead of relying on memory. It mirrors the original requirements document, with a **Status** column added to every requirement table.

**How to use this file**
- Before starting work that touches a requirement area, check its row here first.
- After landing a feature, update its Status (and note) in the same change — don't let this drift from the code.
- Status reflects the code as of the "Last reviewed" date below, not aspirations. Re-verify a row before trusting it if much has changed since.
- ✅ Done · 🟡 Partial (works, but not to the full requirement) · ⬜ Missing · — Not due yet (Should/Could item, later phase)

**Last reviewed:** 2026-09-27, against the codebase in this repo.

---

## 1. Purpose and scope

The platform connects households that need trash picked up with local collectors (trashmen) who pick it up, dump it at approved sites, and get paid by mobile money. It targets neighborhoods where HYSACAM trucks cannot easily reach, starting with a pilot in one quartier of Yaoundé.

**In scope for the pilot:** household sign-up and pickup requests, subscriptions, collector routes, pickup confirmation, mobile money payments, dump proof, ratings, and an admin dashboard.

**Out of scope for the pilot:** embedded paid maps, automatic route optimization, recycling marketplace, and multi-city operations. These come in later phases (section 11).

**Guiding constraints:** low cost, works on cheap Android phones and weak networks, usable by people with low literacy, and bilingual (French and English).

Each requirement below has an ID and a priority: **Must** (needed for the pilot), **Should** (add if time allows), **Could** (later phase).

**Where the pilot core loop actually stands:** the transactional spine — request → accept → confirm-by-code → dump → admin-verify — is built and matches the atomic-filter design intent described in section 12. The biggest open Must-priority gaps are notifications (H-11), ratings/complaints (H-13/H-14), walking-order-driven routes (C-05/L-05), collector payouts (C-13/M-07), admin editability of prices/zones (M-02/M-03/A-02), refunds (M-08), and hiding the household phone number after a pickup closes (N-08).

**Payment provider decision:** Mobile Money collection will go through **Fapshi** (MTN MoMo + Orange Money aggregator) instead of the manual tx-ID flow — see section 7. Settlement order matters: the platform must be paid by the household through Fapshi *before* any collector payout for that pickup is released.

## 2. User roles

Five roles use the system; the pilot needs the first four.

| Role | Who | Main goal | Channel (pilot) |
| --- | --- | --- | --- |
| Household | Families, renters, compounds | Get trash picked up reliably and cheaply | Free household web app (PWA), plus the operator's free WhatsApp Business number for manual help |
| Business client | Restaurants, bars, shops, schools | Regular high-volume pickups on contract | Household web app + admin-managed contract |
| Collector (trashman) | Registered pushcart or foot collectors | Get steady pickups and guaranteed pay | Same PWA, collector mode (installed to home screen) |
| Admin / operator | You and your team | Manage zones, users, payments, disputes | Web dashboard |
| Field agent (Should) | Staff who register households on foot | Sign up households and place gate codes | Collector app with agent mode |

Implemented roles: `household`, `collector`, `admin` (`src/lib/types.ts`). Business client and field agent modes do not exist yet.

## 3. Household requirements

| ID | Requirement | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| H-01 | Register with name, phone number, zone, landmark description, and preferred language (FR/EN). | Must | ✅ | `src/app/api/auth/register/route.ts` |
| H-02 | Save location once with a "use my current location" button (phone GPS, free), or enter a Plus Code; system stores it with the account. | Must | 🟡 | GPS save works (`src/lib/geo.ts`); no Plus Code field |
| H-03 | Receive a unique gate code (e.g. ND-B-017) after registration or field agent visit. | Must | ✅ | Auto-assigned atomically at registration |
| H-04 | Request a one-time pickup: choose volume and time (now or a scheduled slot). | Must | ✅ | `src/app/h/request/page.tsx` |
| H-05 | Attach an optional photo of the trash to help price and plan the pickup. | Should | ⬜ | |
| H-06 | Subscribe to a plan (1, 2, or 3 pickups per week, or collection-point plan) with fixed pickup days. | Must | ⬜ | No subscription model at all |
| H-07 | Pause, change, or cancel a subscription, with changes applying from the next billing period. | Should | ⬜ | Depends on H-06 |
| H-08 | See the price before confirming any request. | Must | ✅ | Server sets price; shown before confirm |
| H-09 | Pay by MTN MoMo or Orange Money; payment is held until pickup is confirmed. | Must | ✅ | Manual tx-ID flow, admin-confirmed |
| H-10 | Receive a 4-digit confirmation code per pickup to give to the collector at handover. | Must | ✅ | |
| H-11 | Get notifications when a collector accepts, is on the way, and completes the pickup. | Must | ⬜ | No push; household only sees updates by opening the app (polling) |
| H-12 | Call the assigned collector through a number shown in the request. | Should | ⬜ | Collector can call household (C-08); reverse direction not built |
| H-13 | Rate the collector (1–5) and leave a short comment after each pickup. | Must | ⬜ | |
| H-14 | Report a problem: missed pickup, rude collector, trash spilled, overcharging. | Must | ⬜ | |
| H-15 | View pickup and payment history. | Should | 🟡 | Household screen lists last 20 pickups; no dedicated payment history |
| H-16 | Choose an urgent pickup (within about 1 hour) for an extra fee. | Could | — | |

## 4. Collector requirements

| ID | Requirement | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| C-01 | Register with name, phone, CNI number and photo, profile photo, transport type, and mobile money number. | Must | 🟡 | CNI number and transport type captured; no photo upload for CNI or profile |
| C-02 | Account stays inactive until an admin verifies the documents. | Must | ✅ | `status: 'pending'` until admin approves |
| C-03 | Log in with phone + 6-digit PIN; admin can reset the PIN. | Must | 🟡 | Login done; no admin PIN-reset action |
| C-04 | Set availability (on duty / off duty) and assigned zones. | Must | 🟡 | `zoneIds` set once at registration; no on/off-duty toggle, no way to edit zones after |
| C-05 | See today's route: subscribed households in the admin-defined walking order, listed by gate code, landmark, and volume. | Must | 🟡 | Route list sorts by gate-code string, not the `routeOrder` field; no admin UI sets walking order |
| C-06 | See open one-time requests in their zones and accept or decline them. | Must | 🟡 | Accept is atomic and safe; there's no explicit "decline" action, just inaction |
| C-07 | Open a household's saved location in the phone's normal maps app with one tap. | Must | ✅ | `mapsLink()` |
| C-08 | Call the household from the pickup screen. | Must | ✅ | |
| C-09 | Mark a pickup as done by entering the household's 4-digit code. | Must | ✅ | |
| C-10 | Mark a pickup as failed with a reason. | Must | ✅ | |
| C-11 | Record a dump: GPS-tagged photo at an approved dump point, linked to the pickups since the last dump. | Must | ✅ | |
| C-12 | See earnings for today, this week, and this month, split into paid and pending. | Must | 🟡 | Only an in-page "today" estimate; no week/month view, no ledger |
| C-13 | Receive payouts to their mobile money number (daily or weekly, set by admin). | Must | ⬜ | No payout mechanism exists |
| C-14 | Rate households and report problems. | Should | ⬜ | |
| C-15 | Log recyclables collected by estimated weight. | Could | — | |

## 5. Pickup lifecycle and statuses

Implemented statuses (`src/lib/types.ts`): `requested → assigned → on_the_way → picked_up → dumped`, plus `failed` and `cancelled`. This collapses the spec's separate `Paid` status into a parallel `paymentStatus` field (`unpaid/to_verify/confirmed/refunded`) rather than gating acceptance on payment — a deliberate simplification, but it means a collector can currently accept an unpaid request, which the original flow (`Paid → Assigned`) did not intend.

| Rule | Priority | Status | Notes |
| --- | --- | --- | --- |
| P-01 — unaccepted request re-offered after 30 min, flagged to admin after 2 h | Must | ⬜ | No re-offer or time-based flagging job |
| P-02 — collector gets 50% at Picked up, 50% at Dumped | Must | 🟡 | Reflected only as a UI earnings *estimate* (`src/app/c/page.tsx`); no real payout ledger enforces it |
| P-03 — pickup stuck in Picked up >24h without dump proof flagged for admin | Must | ⬜ | |
| P-04 — household-fault failures not refunded; others refunded/rescheduled | Must | ⬜ | No refund logic anywhere; `paymentStatus: 'refunded'` exists in the type but nothing sets it |
| P-05 — every status change logged with time, user, location | Should | ⬜ | Only `updatedAt` is kept; no audit trail of who/what/where |

## 6. Location without paid maps

| ID | Requirement | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| L-01 | Admin creates zones with name, code letter, landmark boundaries in text. | Must | ✅ | Data model supports it; done by hand in Atlas per README, no admin UI |
| L-02 | Each household belongs to one zone and gets a gate code. | Must | ✅ | |
| L-03 | Store each household's lat/lng from GPS at sign-up or agent registration. | Must | ✅ | |
| L-04 | Store an optional Plus Code for each household. | Should | ⬜ | |
| L-05 | Admin sets the walking order of households in each zone; collector's route follows it. | Must | 🟡 | `routeOrder` field exists (auto-assigned sequentially at signup) but no admin UI edits it, and the collector view doesn't sort by it |
| L-06 | Tapping a location opens it in the device's default maps app. | Must | ✅ | |
| L-07 | Admin creates collection points for the collection-point plan. | Should | ⬜ | |
| L-08 | Admin registers approved dump points with saved locations. | Must | 🟡 | Used by the server; managed by hand in Atlas, no admin UI |
| L-09 | Dump photo auto-accepted only within ~100 m of an approved dump point; else admin review. | Must | ✅ | `DUMP_RADIUS_M` in `src/lib/pricing.ts` |
| L-10 | Show an in-app map using free OpenStreetMap tiles. | Could | — | |

## 7. Payments, subscriptions and revenue split

| ID | Requirement | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| M-01 | Households pay to platform's MoMo/OM number, enter tx ID; admin confirms. | Must | ✅ | Manual flow works for the pilot. **Decision:** replace with **Fapshi** (aggregator API for MTN MoMo + Orange Money) for automatic confirmation — not yet integrated. See note below. |
| M-02 | Admin sets prices per volume/plan/zone without code changes. | Must | ⬜ | Hardcoded in `src/lib/pricing.ts` (`PRICES`); README already flags this as next |
| M-03 | Admin sets the revenue split per product. | Must | ⬜ | Hardcoded `COLLECTOR_SHARE = 0.8` |
| M-04 | Subscriptions bill monthly; optional 3-month prepay discount. | Must | ⬜ | No subscriptions |
| M-05 | Payment reminder 3 days before renewal; suspend after 5-day grace. | Must | ⬜ | |
| M-06 | Subscription pickups credit collector a fixed per-pickup amount. | Must | ⬜ | |
| M-07 | Collector payouts run daily/weekly in batches, with a payout record each. | Must | ⬜ | |
| M-08 | Admin can issue full or partial refunds with a reason. | Must | ⬜ | |
| M-09 | Business clients billed monthly by contract, with a generated PDF invoice. | Should | ⬜ | |
| M-10 | Record mobile money fees per transaction for true margin. | Should | ⬜ | |
| M-11 | Record recycling sales, split profit with collectors. | Could | — | |

**Payment provider: Fapshi.** Mobile Money collection (M-01) moves from the manual tx-ID flow to the **Fapshi API**, which covers both MTN MoMo and Orange Money collection and payout. This also gives M-01 automatic confirmation instead of admin-checked tx IDs, which is the "later" step M-01 already anticipated.

**Settlement order is a hard constraint on M-07 / C-13 / P-02 / Q-04:** the platform is paid by the household through Fapshi *before* it pays any collector out — a collector payout must never run ahead of confirmed incoming settlement. Concretely, once the payout system (C-13, M-07) is built:
- The pickup-time 50% (P-02) can only be released once Fapshi confirms the household's payment has settled to the platform — not merely once the household submitted a payment request.
- The dump-time second 50% (P-02, Q-04) still additionally requires an approved (non-rejected) dump, on top of that settlement.
- Payout batches (M-07) should only include pickups whose corresponding Fapshi settlement has already landed.

Not yet implemented — the current app has no Fapshi integration, and the manual flow (M-01, ✅) still runs the pilot.

## 8. Dump proof and quality control

| ID | Requirement | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| Q-01 | Dump photos taken in-app only, time/location auto-stamped. | Must | ✅ | Live camera via `getUserMedia`, no gallery picker |
| Q-02 | Each dump lists its covered pickups; collector can't start a new batch beyond the limit (default 15) without dumping. | Must | 🟡 | `MAX_PICKUPS_PER_DUMP` caps a query, but nothing blocks a collector from accepting past 15 pickups without dumping |
| Q-03 | Admin reviews flagged dumps and approves/rejects. | Must | ✅ | |
| Q-04 | Rejected dump withholds the second 50% for those pickups. | Must | 🟡 | `dumpRejected` flag is set; there's no payout system yet for it to actually withhold anything from |
| Q-05 | Collectors below 3.5 avg rating over 20 pickups flagged; suspended after 2 warnings. | Should | ⬜ | No ratings exist |
| Q-06 | Households with repeated failures/unpaid balances flagged/suspended. | Should | ⬜ | |
| Q-07 | Admin records neighbor/commune complaints linked to a collector. | Should | ⬜ | |
| Q-08 | Weekly bonus for high-rating, zero-rejection collectors. | Could | — | |

## 9. Admin dashboard requirements

| ID | Requirement | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| A-01 | Manage users: approve, suspend, edit households/collectors/business clients. | Must | 🟡 | Only collector approval exists (`src/app/api/admin/route.ts`); no suspend/edit |
| A-02 | Manage zones, gate codes, walking order, collection points, dump points. | Must | ⬜ | No admin UI; direct Atlas edits only, per README |
| A-03 | Assign collectors to zones and reassign pickups manually. | Must | ⬜ | |
| A-04 | Live list of today's pickups by status, filterable by zone/collector. | Must | 🟡 | Recent list shown; not filterable |
| A-05 | Review queue for flagged dumps, complaints, failed pickups. | Must | 🟡 | Dump review exists; no complaints or failed-pickup queue |
| A-06 | Manage prices, plans, revenue splits, payout schedule. | Must | ⬜ | |
| A-07 | Payments view: incoming payments, refunds, payouts, platform margin. | Must | 🟡 | Payment-confirmation queue only |
| A-08 | Daily and monthly reports. | Must | 🟡 | Only today's counts; no historical reports |
| A-09 | Collector performance: pickups/day, time/pickup, ratings, rejected dumps. | Should | ⬜ | |
| A-10 | Estimated tonnage per zone for commune/NGO reports. | Should | ⬜ | |
| A-11 | Export any report to CSV/Excel. | Should | ⬜ | |
| A-12 | Role-based admin access (owner, operator, finance). | Could | — | |

## 10. Notifications, language, offline and constraints

| ID | Requirement | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| N-01 | Household notifications via free Web Push; no paid SMS/WhatsApp API. | Must | ⬜ | |
| N-02 | Collector notifications via free in-app push; new requests show on app open. | Must | ⬜ | Requests show on open (polling); no push |
| N-03 | All screens/messages in FR and EN; choice remembered. | Must | ✅ | i18next + `localStorage` |
| N-04 | Collector app uses icons, colors, large buttons for low literacy. | Must | ✅ | |
| N-05 | Collector app works offline: route, codes, dump photos saved and synced later. | Must | ✅ | IndexedDB outbox + service worker |
| N-06 | Runs on Chrome/Android 8+, 2 GB RAM; <5s load on 3G; <2 MB first download. | Must | ⬜ | Not measured/verified against a real budget |
| N-07 | Photos compressed before upload. | Must | ✅ | `browser-image-compression`, target ~200 KB |
| N-08 | Household phone numbers hidden from collectors after pickup is closed. | Should | ⬜ | `toPickup()` always includes `householdPhone` regardless of status |
| N-09 | Personal data stored securely, visible only to authorized admins. | Must | 🟡 | Role checks + hashed PIN cover the pilot; no field-level encryption |
| N-10 | Run on free tiers during pilot; upgrade only when usage requires it. | Must | ✅ | Atlas M0, Cloudinary free tier, small VPS |

## 11. Phasing and open questions

Build the Must requirements first, prove households will pay in one quartier, then add the rest.

| Phase | Timing | What is built |
| --- | --- | --- |
| 0. Manual pilot | Months 1–2 | Free WhatsApp Business number (manual) + Google Sheet + manual mobile money; tests prices and routes before any code |
| 1. MVP | Months 2–4 | All Must requirements: one PWA with household, collector, and admin modes, plus manual payment confirmation |
| 2. Growth | Months 4–8 | Should requirements: business client billing, performance reports, tonnage reports, collection points |
| 3. Scale | Month 8+ | Could requirements: OpenStreetMap view, recycling income, bonuses, new quartiers and cities |

We are currently mid-Phase 1: the core Must-priority transactional loop works, but several other Must items above (notifications, ratings, payouts, admin editability, refunds) are still open.

**Open questions** (still open — not something the code can answer)
- Which quartier is the pilot, and how many zones does it need?
- Which payment aggregator will handle MTN MoMo and Orange Money, and what are its fees? — **Answered:** Fapshi. Fees still to confirm.
- Will HYSACAM and the Commune d'arrondissement authorize use of their bacs as approved dump points?
- Do all pilot collectors have an Android phone with Chrome, or will some need a phone provided?
- Are collectors paid daily or weekly?
- Is the 50/50 payment split between pickup and dump acceptable to collectors?

## 12. Technology stack

Everything is one Progressive Web App (PWA) for households, collectors, and admins, built with Next.js and MongoDB on free or very cheap services. This matches the current implementation:

| Part | Technology | Notes |
| --- | --- | --- |
| App (all three modes) and API | Next.js (App Router) + TypeScript | Screens and server API in one project; role decides which screens a user sees |
| Database | MongoDB Atlas (free M0 tier, 512 MB) | Accessed only by the server, never from the phone |
| Mobile Money | Fapshi API (MTN MoMo + Orange Money) | Households pay the platform through Fapshi; collector payouts are only released after Fapshi settles that payment to the platform's account (see section 7) |
| Login | Phone number + 6-digit PIN, hashed with bcrypt; signed session cookie (jose) | No paid SMS; account locks for 15 minutes after 5 wrong PINs |
| Input validation | Zod | Every API request is checked before touching the database |
| Styling | Tailwind CSS | Large buttons, icons and colors for low-literacy users |
| Translations | i18next | French and English |
| Offline screens and data | Hand-written service worker | Caches screens and the last API responses |
| Offline actions | IndexedDB outbox (idb-keyval) | Collector actions and dump photos saved on the phone and sent when the network returns |
| Dump photos | Cloudinary (free tier), signed direct upload + in-browser compression | Target about 200 KB per photo; photos do not pass through the server |
| Camera | Browser camera API (getUserMedia) | Photos taken live in the app, not picked from the gallery |
| Location | Browser Geolocation API | Free; opens the phone's maps app via a link, no embedded map |
| Hosting | Small VPS with Docker (about $5–7/month) + Caddy for free HTTPS | HTTPS is required for camera and GPS |
| Code | GitHub | Free private repositories |

**Known limits:** accepting a request needs network, so two collectors never both believe they have the same job; everything after accepting works offline. Push notifications are not in the pilot yet. Collector payouts must wait for Fapshi settlement, not just pickup/dump status (see section 7) — the platform is paid before it pays out.
