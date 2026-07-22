# Acquisitions — Docker & Neon Database Setup

> A complete guide for running the app locally with **Neon Local** and deploying it to production with **Neon Cloud**.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Project Files Created](#project-files-created)
- [Development — Local Setup with Neon Local](#development--local-setup-with-neon-local)
- [Production — Deploying with Neon Cloud](#production--deploying-with-neon-cloud)
- [Environment Variable Reference](#environment-variable-reference)
- [Database Migrations (Drizzle ORM)](#database-migrations-drizzle-orm)
- [Useful Commands](#useful-commands)
- [How `DATABASE_URL` Switches Between Environments](#how-database_url-switches-between-environments)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                       DEVELOPMENT                            │
│                                                              │
│  ┌──────────────┐   postgres://neon:npg   ┌──────────────┐   │
│  │   app        │ ──────────────────────► │  neon-local  │   │
│  │  (Node.js)   │      @neon-local:5432   │   (proxy)    │   │
│  └──────────────┘                         └──────┬───────┘   │
│                                                  │ Neon API  │
└──────────────────────────────────────────────────┼────────── ┘
                                                   ▼
                                        ┌──────────────────┐
                                        │   Neon Cloud     │
                                        │ (ephemeral branch│
                                        │  auto-created &  │
                                        │  auto-deleted)   │
                                        └──────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                       PRODUCTION                             │
│                                                              │
│  ┌──────────────┐   postgres://...neon.tech?sslmode=require  │
│  │   app        │ ──────────────────────────────────────►    │
│  │  (Node.js)   │                                            │
│  └──────────────┘          ┌──────────────────┐              │
│                             │   Neon Cloud     │             │
│                             │ (production DB)  │             │
│                             └──────────────────┘             │
└──────────────────────────────────────────────────────────────┘
```

**Key principle:** `DATABASE_URL` is the single variable that controls which database the app connects to. The `NEON_LOCAL_HOST` env var (only present in dev) tells the Neon serverless driver to use HTTP mode for the local proxy.

---

## Prerequisites

| Tool                                        | Version         | Notes                           |
| ------------------------------------------- | --------------- | ------------------------------- |
| Docker Desktop                              | ≥ 4.x           | With Docker Compose v2 built-in |
| Node.js                                     | ≥ 22            | Only for running outside Docker |
| A [Neon account](https://console.neon.tech) | Free tier works |                                 |

---

## Project Files Created

| File                      | Purpose                                                               |
| ------------------------- | --------------------------------------------------------------------- |
| `Dockerfile`              | Multi-stage build: `development` (hot-reload) and `production` (lean) |
| `docker-compose.dev.yml`  | Dev stack: Neon Local proxy + app with live reload                    |
| `docker-compose.prod.yml` | Prod stack: app only, direct Neon Cloud connection                    |
| `.env.development`        | Dev environment variables (git-ignored)                               |
| `.env.production`         | Production environment variables (git-ignored)                        |
| `.env.example`            | Safe template to commit — no secrets                                  |
| `.dockerignore`           | Keeps images lean & secrets out of build context                      |
| `src/config/database.js`  | Auto-detects dev vs. prod and configures Neon driver                  |

---

## Development — Local Setup with Neon Local

### 1. Get Your Neon Credentials

From the [Neon console](https://console.neon.tech):

1. **API Key** → Account Settings → API Keys → Create Key
2. **Project ID** → Project Settings → General → Project ID
3. **Parent Branch ID** → Your project → Branches → click your `main` branch → copy the Branch ID from the URL (`br-...`)

### 2. Fill in `.env.development`

```bash
cp .env.example .env.development
```

Edit `.env.development`:

```dotenv
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug

# App connects to Neon Local proxy (inside compose network)
DATABASE_URL=postgres://neon:npg@neon-local:5432/neondb

# Neon Local container credentials
NEON_API_KEY=your_neon_api_key_here
NEON_PROJECT_ID=your_neon_project_id_here
PARENT_BRANCH_ID=br-your-main-branch-id   # creates ephemeral branch from this

JWT_SECRET=dev_jwt_secret_change_me
ARCJET_KEY=your_arcjet_key_here
```

### 3. Start the Development Stack

```bash
docker compose -f docker-compose.dev.yml --env-file .env.development up --build
```

**What happens:**

1. `neon-local` container starts → authenticates with Neon API → creates a fresh ephemeral branch based on `PARENT_BRANCH_ID`
2. `app` waits for `neon-local` to pass its health check (up to 15s for branch creation)
3. App starts with `node --watch` (hot-reload on file changes)
4. Source code is mounted as a volume — edit files and the app restarts automatically

**Stop the stack:**

```bash
docker compose -f docker-compose.dev.yml down
```

> The ephemeral Neon branch is **automatically deleted** when Neon Local stops. You always get a clean slate on the next `up`.

### 4. Connect Directly (Optional)

While the stack is running, you can connect with `psql` from your host:

```bash
psql "postgres://neon:npg@localhost:5432/neondb?sslmode=require"
```

Or use **Drizzle Studio** (runs on your host, not inside Docker):

```bash
# Run with the dev env file loaded
DATABASE_URL=postgres://neon:npg@localhost:5432/neondb npm run db:stub
```

---

## Production — Deploying with Neon Cloud

### 1. Get Your Production Database URL

From the [Neon console](https://console.neon.tech) → your project → **Connection Details**:

```
postgres://neondb_owner:<password>@ep-something.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

### 2. Fill in `.env.production`

```bash
cp .env.example .env.production
```

Edit `.env.production`:

```dotenv
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

DATABASE_URL=postgres://neondb_owner:<password>@ep-....neon.tech/neondb?sslmode=require

JWT_SECRET=your_strong_production_jwt_secret_64_chars_minimum
ARCJET_KEY=your_production_arcjet_key
```

> **Never commit `.env.production`** — it's in `.gitignore`. On CI/CD, inject these as environment variables or secrets.

### 3. Build and Run Production

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up --build -d
```

**What's different from dev:**

- Only the `app` service runs — no Neon Local proxy
- Built using the lean `production` Dockerfile stage (no `devDependencies`)
- Source code is **not** mounted — it's baked into the image
- `NODE_ENV=production` — no hot-reload, full performance

**View logs:**

```bash
docker compose -f docker-compose.prod.yml logs -f app
```

**Stop:**

```bash
docker compose -f docker-compose.prod.yml down
```

---

## Environment Variable Reference

| Variable           | Dev                                          | Prod                                          | Description                                |
| ------------------ | -------------------------------------------- | --------------------------------------------- | ------------------------------------------ |
| `PORT`             | `3000`                                       | `3000`                                        | HTTP port the app listens on               |
| `NODE_ENV`         | `development`                                | `production`                                  | Controls app behavior & logging            |
| `LOG_LEVEL`        | `debug`                                      | `info`                                        | Winston log level                          |
| `DATABASE_URL`     | `postgres://neon:npg@neon-local:5432/neondb` | `postgres://...neon.tech/...?sslmode=require` | Postgres connection string                 |
| `NEON_API_KEY`     | ✅ Required                                  | ❌ Not needed                                 | Neon API key (for neon-local container)    |
| `NEON_PROJECT_ID`  | ✅ Required                                  | ❌ Not needed                                 | Neon project ID (for neon-local container) |
| `PARENT_BRANCH_ID` | ✅ Required\*                                | ❌ Not needed                                 | Creates ephemeral branch from this parent  |
| `BRANCH_ID`        | Optional\*                                   | ❌ Not needed                                 | Connect to a specific existing branch      |
| `DELETE_BRANCH`    | `true`                                       | ❌ Not needed                                 | Set `false` to persist branch after `down` |
| `JWT_SECRET`       | ✅ Required                                  | ✅ Required                                   | JWT signing secret                         |
| `ARCJET_KEY`       | ✅ Required                                  | ✅ Required                                   | Arcjet rate-limiting key                   |
| `NEON_LOCAL_HOST`  | Set by compose                               | ❌ Not set                                    | Triggers HTTP mode in `database.js`        |
| `NEON_LOCAL_PORT`  | `5432`                                       | ❌ Not set                                    | Port of neon-local within compose network  |

\* Use either `PARENT_BRANCH_ID` **or** `BRANCH_ID`, not both.

---

## Database Migrations (Drizzle ORM)

Run migrations **against the currently active stack:**

```bash
# Development — runs against Neon Local (via localhost:5432)
DATABASE_URL="postgres://neon:npg@localhost:5432/neondb" npm run db:migrate

# Production — runs against Neon Cloud directly
DATABASE_URL="postgres://neondb_owner:...@ep-....neon.tech/neondb?sslmode=require" npm run db:migrate
```

Or add a migrate step to your compose `app` command:

```yaml
command: sh -c "npm run db:migrate && node src/index.js"
```

---

## Useful Commands

```bash
# ── Development ──────────────────────────────────────────────
# Start (build first time)
docker compose -f docker-compose.dev.yml --env-file .env.development up --build

# Start in background
docker compose -f docker-compose.dev.yml --env-file .env.development up -d

# Follow app logs
docker compose -f docker-compose.dev.yml logs -f app

# Open a shell in the running app container
docker compose -f docker-compose.dev.yml exec app sh

# Tear down (ephemeral branch is deleted automatically)
docker compose -f docker-compose.dev.yml down

# ── Production ───────────────────────────────────────────────
# Build & run detached
docker compose -f docker-compose.prod.yml --env-file .env.production up --build -d

# Check health
docker compose -f docker-compose.prod.yml ps

# Rolling restart (after image rebuild)
docker compose -f docker-compose.prod.yml up -d --no-deps --build app

# Stop without removing containers
docker compose -f docker-compose.prod.yml stop
```

---

## How `DATABASE_URL` Switches Between Environments

The entire environment switch is controlled by a single variable:

```
Development → DATABASE_URL=postgres://neon:npg@neon-local:5432/neondb
Production  → DATABASE_URL=postgres://neondb_owner:***@ep-*.neon.tech/neondb?sslmode=require
```

In `src/config/database.js`, the Neon serverless driver is additionally configured for HTTP mode when `NEON_LOCAL_HOST` is set (dev only):

```js
if (process.env.NEON_LOCAL_HOST) {
  // HTTP mode for Neon Local — only in development
  neonConfig.fetchEndpoint = `http://${process.env.NEON_LOCAL_HOST}:5432/sql`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.poolQueryViaFetch = true;
}
// No else needed — production uses Neon Cloud defaults (HTTPS/WebSocket)
const sql = neon(process.env.DATABASE_URL);
```

`NEON_LOCAL_HOST` is injected by `docker-compose.dev.yml` and is **never present** in production, so no conditional logic is needed in prod.

---

## Troubleshooting

### App fails to start: "connection refused" on neon-local

The branch creation can take up to 15–20 seconds on first run. The `depends_on: condition: service_healthy` with `start_period: 15s` handles this, but if you have a slow network:

```yaml
# In docker-compose.dev.yml, increase start_period:
start_period: 30s
```

### Neon Local exits with "invalid API key"

Check that `NEON_API_KEY` and `NEON_PROJECT_ID` in `.env.development` are correct. The API key must have **read/write** permissions to the project.

### "Cannot use import statement" error

This project uses ES modules (`"type": "module"` in `package.json`). Ensure the Node.js version in the container is ≥ 16. The Dockerfile uses `node:22-alpine`.

### Drizzle Studio can't connect in dev

Run it from your host with the localhost port (5432 is mapped):

```bash
DATABASE_URL="postgres://neon:npg@localhost:5432/neondb" npm run db:stub
```

### Production: SSL certificate errors

Ensure `?sslmode=require` is appended to your `DATABASE_URL` in `.env.production`. Neon Cloud requires TLS.
