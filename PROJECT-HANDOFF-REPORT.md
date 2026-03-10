# TBP CRM v2 — Project Handoff Report (Gemini → Claude)

This document describes the **structure, conventions, and data flow** of the TBP Auto B2B Logistics CRM so a new maintainer or AI context (e.g. Claude) can understand the codebase quickly.

---

## 1. Project overview

- **Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide React.
- **Purpose:** B2B logistics “Freight Radar” and DDP product quoting for TBP Auto (auto parts manufacturer/exporter). One module is active: **Shipping & Quoting**; others are placeholders (Coming Soon).
- **Repo:** `tbp-crm-v2` (e.g. `https://github.com/LeThienKhiem/tbp-crm-v2`).

---

## 2. Directory layout and routing

### 2.1 Two parallel trees: `app/` and `src/`

The project keeps **two parallel trees** so that:

- **Runtime:** Next.js serves from the **`app/`** directory at the repo root (this is where `layout.tsx` and `globals.css` live).
- **Canonical / mirror:** A copy of most app and API code lives under **`src/app/`** (and `src/data/`). When making changes, **update both** so behavior and routing stay in sync.

High-level layout:

```
tbp-crm-v2/
├── app/                          # ← Primary App Router (used at runtime)
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx                  # Landing: AI Transformation Hub
│   ├── shipping/
│   │   └── page.tsx              # Legacy shipping quote (mock API)
│   ├── market-radar/
│   │   ├── page.tsx              # Global Freight Radar (main table + live sync)
│   │   └── quote/
│   │       └── [id]/
│   │           └── page.tsx      # DDP Quote Builder (3 phases + print)
│   └── api/
│       ├── quotes/route.ts       # Mock POST shipping quote
│       ├── rates/route.ts        # GET CSV-based rates (optional)
│       └── freightos/route.ts    # POST Freightos sandbox estimates
├── src/
│   ├── app/                      # Mirror of app (keep in sync)
│   │   ├── page.tsx
│   │   ├── market-radar/
│   │   │   ├── page.tsx
│   │   │   └── quote/[id]/page.tsx
│   │   └── api/
│   │       ├── rates/route.ts
│   │       └── freightos/route.ts
│   └── data/
│       └── rates.csv             # Optional CSV for /api/rates (not used by radar UI currently)
├── .env.local                    # FREIGHTOS_API_KEY (gitignored)
├── .env.local.example            # Template for env vars
├── package.json
├── next.config.ts
├── tsconfig.json
└── PROJECT-HANDOFF-REPORT.md     # This file
```

**Convention:** Any change to a page or API under `app/` should be mirrored under `src/app/` (and vice versa if you start from `src/`), except for files that exist only in one tree (e.g. `app/layout.tsx`, `app/globals.css`, `app/shipping/`, `app/api/quotes/` exist only in `app/`).

---

## 3. Routes and pages

| URL | File (primary) | Purpose |
|-----|----------------|--------|
| `/` | `app/page.tsx` | AI Transformation Hub: hero + 8 module cards. Only “Shipping & Quoting” is active and links to `/market-radar`. |
| `/shipping` | `app/shipping/page.tsx` | Legacy shipping quote form; calls `POST /api/quotes` (mock). |
| `/market-radar` | `app/market-radar/page.tsx` | **Global Freight Radar:** filters (Origin, Region, Equipment), “Refresh Live Rates” (Freightos), table/cards of lanes, “Create Quote” → `/market-radar/quote/[id]`. |
| `/market-radar/quote/[id]` | `app/market-radar/quote/[id]/page.tsx` | **DDP Quote Builder:** Phase A/B/C, product/pricing, summary, “Save & Generate Quote” (print). Optional `?liveBaseFreight=` from radar. |

---

## 4. API routes

| Method | Path | Handler | Purpose |
|--------|------|--------|--------|
| POST | `/api/quotes` | `app/api/quotes/route.ts` | Mock shipping quote (origin, destination, equipment); returns randomized costs + transit. |
| GET | `/api/rates` | `app/api/rates/route.ts` | Reads `src/data/rates.csv`, parses and returns JSON. **Not used by the radar table** (radar uses in-memory `mockRates` + live Freightos). |
| POST | `/api/freightos` | `app/api/freightos/route.ts` | Proxies to Freightos Sandbox; body: `originPort`, `destinationPort`. Uses `process.env.FREIGHTOS_API_KEY`; returns `{ estimatedPrice, transitTime, source }` or fallback. |

- **Environment:** Copy `.env.local.example` to `.env.local` and set `FREIGHTOS_API_KEY` for live estimates; otherwise the API returns a safe fallback (e.g. `estimatedPrice: 2500`).

---

## 5. Data and state

### 5.1 Market Radar (`/market-radar`)

- **Rates source:** In-memory `mockRates` array (same structure in both `app` and `src` versions of the page). Contains: `id`, `region`, `port`, `carrier`, `baseFreight`, `thc`, `bunker`, `pss`, `inlandTrucking`, `transit`, `trend`, `validUntil`.
- **State:** `rates` (initialized from `mockRates`), `isSyncing`, `updatedRateIds`; filters: `origin`, `regionFilter`, `equipment`.
- **Live sync:** “Refresh Live Rates” calls `POST /api/freightos` for the **top 5 visible lanes** (by current filter), then updates `rates` by replacing `baseFreight` with the API `estimatedPrice`. Port codes are parsed from `rate.port` (e.g. `(USLAX)`) and origin from selector (e.g. Hai Phong → `VNHPH`).
- **Total Est.** = Base + THC + Bunker + PSS + Inland (all from current `rates`). Table styling: Base/THC/Bunker/Inland/PSS(when 0) use `text-slate-600`; PSS &gt; 0 uses `text-orange-600`; Total Est. stays bold black.

### 5.2 Quote detail (`/market-radar/quote/[id]`)

- **Lane:** Resolved from a **local `rates` array** in the page (same IDs as radar). If the URL has `?liveBaseFreight=<number>`, that value overrides `baseFreight` for that lane so the quote uses the radar’s last-synced ocean cost.
- **Phases:**  
  - **A:** Origin trucking (VND → USD with fixed rate 25,000).  
  - **B:** Ocean freight; state `oceanFreightCost` (initialized from lane’s base+thc+bunker+pss or from `liveBaseFreight`). “Fetch Live Freightos Estimate” can overwrite it and set `isLiveFreight`.  
  - **C:** `inlandTrucking` from lane.
- **Calculations:** Total Landed Cost = EXW + A + B + C + Duties; Selling Price from margin; “Save & Generate Quote” opens a new window with print-ready HTML and triggers `window.print()`.

---

## 6. UI and styling

- **Design:** Enterprise SaaS: white cards, slate borders, Tailwind. Icons from `lucide-react`.
- **Radar header:** Sticky nav with TBP Auto, breadcrumbs (Home / Market Radar), “Shipping & Quoting” (active), “Apollo API” (disabled). “Live API Connected” indicator (green blinking dot) in the radar section header.
- **Responsive:** Table hidden on small screens; cards shown instead. Control panel stacks on small screens.

---

## 7. Important conventions for edits

1. **Dual tree:** When changing Market Radar or Quote Builder logic/UI, update both `app/...` and `src/app/...` so routing and behavior stay consistent.
2. **Quote handoff:** “Create Quote” links must include current ocean cost for the detail page:  
   `href={\`/market-radar/quote/${rate.id}?liveBaseFreight=${encodeURIComponent(rate.baseFreight)}\`}`  
   The quote page uses `useSearchParams().get('liveBaseFreight')` to override lane `baseFreight` when present.
3. **Env:** Never commit `.env.local`. Use `.env.local.example` for documentation (e.g. `FREIGHTOS_API_KEY`).
4. **Freightos:** All external freight estimates go through `POST /api/freightos` (server-side) so the API key is not exposed to the client.

---

## 8. Quick reference: key files

| Concern | Primary location |
|--------|-------------------|
| Root layout + fonts | `app/layout.tsx` |
| Global styles | `app/globals.css` |
| Landing / hub | `app/page.tsx` |
| Freight Radar (table, live sync, filters) | `app/market-radar/page.tsx` |
| Quote Builder (3 phases, print) | `app/market-radar/quote/[id]/page.tsx` |
| Freightos proxy | `app/api/freightos/route.ts` |
| Env template | `.env.local.example` |
| Optional CSV rates | `src/data/rates.csv` + `app/api/rates/route.ts` |

---

## 9. Handoff checklist for Claude / new maintainer

- [ ] Understand that **`app/`** is the live App Router; **`src/app/`** is a mirror to keep in sync.
- [ ] Market Radar does **not** use `/api/rates` or CSV for the table; it uses **in-memory `mockRates`** and optional **live sync via `/api/freightos`**.
- [ ] Quote detail page uses **query param `liveBaseFreight`** to receive the radar’s latest ocean cost when user clicks “Create Quote.”
- [ ] All Freightos usage goes through **`POST /api/freightos`**; env var is **`FREIGHTOS_API_KEY`** in `.env.local`.
- [ ] When editing radar or quote flow, **update both `app/` and `src/app/`** for the same file paths.

This report should be enough for Claude (or any new developer) to understand the project structure, data flow, and where to change code without breaking the dual-tree convention or the quote handoff.
