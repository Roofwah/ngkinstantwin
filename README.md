# Repco Rewards × NGK / NTK / KYB — Scratch & Win

> Powered by **PureRandom Instant Win Engine**

A production-ready prototype of a secure digital Scratch & Win instant-win promotion. Prize outcomes are determined server-side before the scratch card is shown. The scratch animation is cosmetic only.

---

## Architecture

```
pure-random-instant-win-mockup/
├── server/
│   ├── index.js                  Express app entry point
│   ├── db.js                     SQLite setup (schema, indexes)
│   ├── routes/
│   │   ├── claims.js             POST /api/claims, GET /api/claims/:id, POST reveal
│   │   └── admin.js              Admin API (stats, manifest, audit, reconcile)
│   ├── services/
│   │   ├── manifestGenerator.js  Deterministic prize schedule from seed
│   │   ├── prizeEngine.js        Claim → prize window matching
│   │   └── auditLogger.js        Tamper-evident chained audit log
│   └── middleware/
│       └── auth.js               Simple token auth for admin routes
└── client/                       React + Vite SPA
    └── src/
        ├── pages/                Landing, Claim, Scratch, Result, Admin*
        └── components/           AdminLayout
```

### PureRandom Engine

1. **Seed**: A mock Bitcoin block hash (`MOCK_SEED` env var) is used as entropy.
2. **Manifest generation**: SHA-256 is applied to `seed:index` to deterministically spread prizes across the campaign window. Each prize gets a `winningTimestamp` and a `winningWindowSeconds`.
3. **Claim processing**: When a claim is submitted, the server timestamp is compared against open prize windows. If a match exists, that prize is atomically assigned.
4. **Demo mode** (`DEMO_MODE=true`): Counter-based logic (every 5th/12th/30th claim wins Tier 1/2/3) for easy demo without waiting for real time windows.

### Prize tiers

| Tier | Value     | Status              | Examples                              |
|------|-----------|---------------------|---------------------------------------|
| 1    | < $50     | Instant win         | NGK Cap, Stubby Cooler, $25 Voucher   |
| 2    | $50–$1k   | Provisional         | $250 Voucher, NGK Tool Kit, KYB Pack  |
| 3    | $1k+      | Manual review       | Bathurst Experience, $5k Prize        |

---

## Local development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
# 1. Clone and enter the directory
cd pure-random-instant-win-mockup

# 2. Install all dependencies (server + client)
npm run setup

# 3. Copy env file and configure
cp .env.example .env
# Edit .env as needed — defaults work out of the box

# 4. Start both servers (Express + Vite dev server)
npm run dev
```

- **App (Vite)**: http://localhost:5173
- **API**: http://localhost:3000/api/health
- **Admin**: http://localhost:5173/admin — password is `changeme` (set in .env)

### First run checklist

1. Open http://localhost:5173/admin
2. Log in with password `changeme`
3. Click **Generate Manifest** to create the prize schedule
4. Open http://localhost:5173 and submit a test claim (DEMO_MODE=true, so every 5th claim wins Tier 1)
5. Scratch the card, see the result

---

## Render deployment

### Option A — render.yaml (recommended)

1. Push this repo to GitHub
2. In Render, click **New → Blueprint** and connect your repo
3. Render will read `render.yaml` and configure everything automatically
4. After deploy, note the generated `ADMIN_PASSWORD` in the Render environment panel

### Option B — manual

1. Create a new **Web Service** in Render
2. Set:
   - **Build command**: `npm run build`
   - **Start command**: `npm start`
   - **Node version**: 18
3. Add environment variables from `.env.example`
4. Set `NODE_ENV=production`
5. Set `DATABASE_PATH=/opt/render/project/data/instant-win.db`
6. Deploy

> **Note**: Render free tier has an ephemeral filesystem. The SQLite database will reset on each deploy. For persistence, use a PostgreSQL add-on and replace `better-sqlite3` with `pg` (see Production Hardening below).

---

## Production hardening

The following changes are required before a real campaign launch:

### Database
- Replace SQLite with PostgreSQL (Render Postgres add-on or Neon)
- Use connection pooling (`pg-pool`)
- Run migrations rather than `db.exec` at startup

### Authentication
- Replace the token-in-header admin auth with a proper session (express-session + Redis)
- Add rate limiting to the claim endpoint (express-rate-limit)
- Add CSRF protection

### Receipt handling
- Use pre-signed S3 URLs (AWS S3 or Cloudflare R2) instead of local disk storage
- Integrate receipt OCR (Google Cloud Vision or AWS Textract) to auto-extract:
  - Transaction ID, date, total, brand, store
- Cross-reference extracted data against the submitted form values

### SMS verification
- Integrate Twilio or MessageBird to send OTP to the mobile number
- Require OTP verification before the claim is processed
  `// PRODUCTION TODO: Twilio OTP call would go here`

### Repco Rewards API
- Replace the mock reconciliation screen with real API calls to Repco Rewards:
  - Verify member ID, purchase history, eligible products
  `// PRODUCTION TODO: Repco Rewards API integration`

### Seed / manifest
- Use a real Bitcoin block hash (published before campaign start) as the seed
- Store the seed and manifest on-chain or in a publicly verifiable location
- Publish a manifest hash before the campaign begins so it cannot be changed

### Monitoring
- Add structured logging (pino or winston)
- Add error tracking (Sentry)
- Add uptime monitoring
- Expose `/api/health` with database connectivity checks

---

## API reference

### Public

| Method | Path                          | Description                  |
|--------|-------------------------------|------------------------------|
| GET    | /api/health                   | Health check                 |
| POST   | /api/claims                   | Submit a claim (multipart)   |
| GET    | /api/claims/:claimId          | Get claim result             |
| POST   | /api/claims/:claimId/reveal   | Mark scratch as revealed     |

### Admin (x-admin-token header required)

| Method | Path                          | Description                  |
|--------|-------------------------------|------------------------------|
| GET    | /api/admin/stats              | Dashboard statistics         |
| GET    | /api/admin/claims             | All claims                   |
| GET    | /api/admin/manifest           | Prize manifest               |
| GET    | /api/admin/audit              | Audit log                    |
| POST   | /api/admin/generate-manifest  | Regenerate prize manifest    |
| POST   | /api/admin/reconcile          | Validate or reject a claim   |

---

## Environment variables

| Variable       | Default                                    | Description                         |
|----------------|--------------------------------------------|-------------------------------------|
| PORT           | 3000                                       | Express server port                 |
| NODE_ENV       | development                                | Set to `production` for Render      |
| DEMO_MODE      | true                                       | Counter-based prize assignment      |
| DATABASE_PATH  | ./data/instant-win.db                      | SQLite file path                    |
| DATABASE_URL   |                                            | PostgreSQL URL (future)             |
| MOCK_SEED      | 00000000000000000001f4a9c8b7e6d9mockseed  | Deterministic prize seed            |
| ADMIN_PASSWORD | changeme                                   | Admin dashboard password            |

---

*Repco Rewards × NGK / NTK / KYB Scratch & Win — Prototype Demo*  
*Powered by PureRandom Instant Win Engine*
