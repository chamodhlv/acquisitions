# Acquisitions API

> A production-ready **Express.js REST API** with full User CRUD, JWT authentication, role-based access control, Arcjet security, Drizzle ORM, Neon PostgreSQL, Docker, and GitHub Actions CI/CD.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
  - [Auth Routes](#auth-routes)
  - [User Routes](#user-routes)
  - [Utility Endpoints](#utility-endpoints)
- [Authentication & Authorization](#authentication--authorization)
- [Validation](#validation)
- [Security](#security)
- [Database](#database)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
  - [Run Locally (No Docker)](#run-locally-no-docker)
  - [Run with Docker — Development](#run-with-docker--development)
  - [Run with Docker — Production](#run-with-docker--production)
- [Database Migrations](#database-migrations)
- [CI/CD — GitHub Actions](#cicd--github-actions)
- [Docker Image](#docker-image)
- [Architecture Overview](#architecture-overview)
- [Scripts Reference](#scripts-reference)
- [Troubleshooting](#troubleshooting)

---

## Overview

**Acquisitions** is a backend REST API built with Express.js. It provides:

- **Full authentication** — Sign up, sign in, sign out using JWT stored in HTTP-only cookies
- **Full User CRUD** — Create, read, update, and delete users
- **Role-based access control (RBAC)** — `user` and `admin` roles with middleware-level enforcement
- **Request validation** — Zod schemas on all routes
- **Security middleware** — Arcjet for bot detection, shield protection, and per-role rate limiting
- **Structured logging** — Winston with timestamps and service labels
- **Drizzle ORM** — Type-safe queries against Neon PostgreSQL (serverless)
- **Docker** — Multi-stage builds for dev (hot-reload) and production (lean image)
- **GitHub Actions CI/CD** — Lint, format, test, and Docker build/push pipelines

---

## Tech Stack

| Layer            | Technology                                                  |
| ---------------- | ----------------------------------------------------------- |
| Runtime          | Node.js 22 (ES Modules)                                     |
| Framework        | Express.js 5                                                |
| Database         | Neon PostgreSQL (serverless) via `@neondatabase/serverless` |
| ORM              | Drizzle ORM                                                 |
| Validation       | Zod 4                                                       |
| Authentication   | JSON Web Tokens (`jsonwebtoken`)                            |
| Security         | Arcjet (rate limiting, bot & shield protection)             |
| Logging          | Winston                                                     |
| Hashing          | bcrypt                                                      |
| HTTP Utilities   | helmet, cors, morgan, cookie-parser                         |
| Testing          | Jest + Supertest                                            |
| Linting          | ESLint 10                                                   |
| Formatting       | Prettier                                                    |
| Containerization | Docker (multi-stage), Docker Compose                        |
| CI/CD            | GitHub Actions                                              |

---

## Project Structure

```
acquisitions/
├── .github/
│   └── workflows/
│       ├── lint-and-format.yml       # ESLint + Prettier CI
│       ├── tests.yml                 # Jest test runner + coverage upload
│       └── docker-build-and-push.yml # Multi-platform Docker image build & push
├── drizzle/                          # Auto-generated migration files
├── scripts/
│   └── dev.sh                        # Dev helper script
├── src/
│   ├── config/
│   │   ├── arcjet.js                 # Arcjet client setup
│   │   ├── database.js               # Neon DB connection (dev/prod auto-detect)
│   │   └── logger.js                 # Winston logger configuration
│   ├── controllers/
│   │   ├── auth.controller.js        # signup, signIn, signOut handlers
│   │   └── users.controller.js       # fetchAllUsers, fetchUserById, updateUserById, deleteUserById
│   ├── middlewares/
│   │   ├── auth.middleware.js        # authenticateToken, requireRole
│   │   └── security.middleware.js    # Arcjet bot/shield/rate-limit middleware
│   ├── models/
│   │   └── user.model.js             # Drizzle users table schema
│   ├── routes/
│   │   ├── auth.routes.js            # /api/auth routes
│   │   └── users.routes.js           # /api/users routes
│   ├── services/
│   │   ├── auth.service.js           # hashPassword, comparePassword, authenticateUser, createUser
│   │   └── user.service.js           # getAllUsers, getUserById, updateUser, deleteUser
│   ├── utils/
│   │   ├── cookies.js                # Cookie set/clear helpers
│   │   ├── format.js                 # Zod validation error formatter
│   │   └── jwt.js                    # JWT sign/verify helpers
│   ├── validations/
│   │   ├── auth.validation.js        # signupSchema, signInSchema
│   │   └── users.validation.js       # userIdSchema, updateUserSchema
│   ├── app.js                        # Express app setup (middlewares + routes)
│   ├── index.js                      # Entry point export
│   └── server.js                     # HTTP server bootstrap
├── tests/
│   └── app.test.js                   # Integration tests (supertest)
├── .env.example                      # Safe env template (no secrets)
├── .env.development                  # Dev env file (git-ignored)
├── .env.production                   # Production env file (git-ignored)
├── docker-compose.dev.yml            # Dev stack: app + Neon Local proxy
├── docker-compose.prod.yml           # Prod stack: app only
├── Dockerfile                        # Multi-stage: base → development → production
├── drizzle.config.js                 # Drizzle Kit configuration
├── jest.config.mjs                   # Jest configuration (ESM + subpath alias mapping)
├── eslint.config.js                  # ESLint flat config
└── package.json
```

---

## API Reference

**Base URL:** `http://localhost:3000`

All JSON responses follow the format:

```json
{ "message": "...", "data": ... }
```

Errors follow:

```json
{ "error": "...", "details": [...] }
```

### Auth Routes

Base path: `/api/auth`

| Method | Endpoint    | Auth Required | Description                      |
| ------ | ----------- | :-----------: | -------------------------------- |
| POST   | `/sign-up`  |      ❌       | Register a new user              |
| POST   | `/sign-in`  |      ❌       | Sign in and receive a JWT cookie |
| POST   | `/sign-out` |      ❌       | Clear the JWT cookie             |

#### `POST /api/auth/sign-up`

**Request body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secret123",
  "role": "user"
}
```

| Field      | Type   | Required | Rules                           |
| ---------- | ------ | :------: | ------------------------------- |
| `name`     | string |    ✅    | 2–255 chars                     |
| `email`    | string |    ✅    | Valid email, max 255 chars      |
| `password` | string |    ✅    | 6–255 chars                     |
| `role`     | string |    ❌    | `"user"` (default) or `"admin"` |

**Response `201`:**

```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

---

#### `POST /api/auth/sign-in`

**Request body:**

```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

**Response `200`:** Sets `token` HTTP-only cookie.

```json
{
  "message": "User signed in successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

---

#### `POST /api/auth/sign-out`

**Response `200`:** Clears `token` cookie.

```json
{ "message": "User signed out successfully" }
```

---

### User Routes

Base path: `/api/users`

| Method | Endpoint | Auth Required | Role Required | Description                                 |
| ------ | -------- | :-----------: | ------------- | ------------------------------------------- |
| GET    | `/`      |      ✅       | `admin`       | Get all users                               |
| GET    | `/:id`   |      ✅       | Any           | Get a user by ID                            |
| PUT    | `/:id`   |      ✅       | Own or admin  | Update a user (users: own only; admin: any) |
| DELETE | `/:id`   |      ✅       | `admin`       | Delete a user by ID                         |

#### `GET /api/users` — Admin only

**Response `200`:**

```json
{
  "message": "Users fetched successfully",
  "count": 2,
  "users": [
    {
      "id": 1,
      "name": "John",
      "email": "john@example.com",
      "role": "user",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

#### `GET /api/users/:id`

**Params:** `id` — positive integer

**Response `200`:**

```json
{
  "message": "User fetched successfully",
  "user": {
    "id": 1,
    "name": "John",
    "email": "john@example.com",
    "role": "user",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

#### `PUT /api/users/:id`

**Params:** `id` — positive integer

**Request body** (all fields optional, at least one required):

```json
{
  "name": "Updated Name",
  "email": "newemail@example.com",
  "password": "newpassword123",
  "role": "admin"
}
```

> ⚠️ Only `admin` users can change the `role` field. Regular users can only update their own record.

**Response `200`:**

```json
{
  "message": "User updated successfully",
  "user": {
    "id": 1,
    "name": "Updated Name",
    "email": "newemail@example.com",
    "role": "user",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

#### `DELETE /api/users/:id` — Admin only

**Params:** `id` — positive integer

**Response `200`:**

```json
{ "message": "User deleted successfully" }
```

---

### Utility Endpoints

| Method | Endpoint  | Description                                      |
| ------ | --------- | ------------------------------------------------ |
| GET    | `/`       | Health ping — returns plain text                 |
| GET    | `/health` | Health check — returns status, timestamp, uptime |
| GET    | `/api`    | Confirms the API is running                      |

---

## Authentication & Authorization

Authentication uses **JWT stored in HTTP-only cookies** (not Authorization headers). This protects against XSS attacks.

**Flow:**

1. Client calls `POST /api/auth/sign-in` → server sets `token` cookie
2. All subsequent requests automatically carry the cookie
3. `authenticateToken` middleware verifies the JWT and attaches the decoded payload to `req.user`
4. `requireRole(['admin'])` middleware checks `req.user.role` against allowed roles

**Authorization rules:**

| Route                             | Rule                                                                     |
| --------------------------------- | ------------------------------------------------------------------------ |
| `GET /api/users`                  | `admin` only                                                             |
| `GET /api/users/:id`              | Any authenticated user                                                   |
| `PUT /api/users/:id`              | Authenticated users can update their own profile; `admin` can update any |
| `PUT /api/users/:id` (role field) | Only `admin` can change another user's role                              |
| `DELETE /api/users/:id`           | `admin` only                                                             |

---

## Validation

All request bodies are validated with **Zod** before reaching the service layer.

| Schema             | File                  | Validates                                     |
| ------------------ | --------------------- | --------------------------------------------- |
| `signupSchema`     | `auth.validation.js`  | `name`, `email`, `password`, `role`           |
| `signInSchema`     | `auth.validation.js`  | `email`, `password`                           |
| `userIdSchema`     | `users.validation.js` | Route param `id` — must be a positive integer |
| `updateUserSchema` | `users.validation.js` | Partial user fields, at least one required    |

Validation errors return HTTP `400` with structured details:

```json
{
  "error": "validation failed",
  "details": [{ "field": "email", "message": "Invalid email" }]
}
```

---

## Security

Security is handled by **Arcjet** running as a global middleware before all routes.

| Protection        | Behaviour                                                             |
| ----------------- | --------------------------------------------------------------------- |
| **Bot detection** | Returns `403` with `"Access denied. Bot detected."`                   |
| **Shield**        | Returns `403` with `"Access denied. Shield detected."`                |
| **Rate limiting** | Sliding window per role: `admin` → 20 req/30s, `user` → 10, guest → 5 |

Additional HTTP security headers are applied by **Helmet**.

---

## Database

The app uses **Neon PostgreSQL** (serverless) with **Drizzle ORM**.

### `users` table schema

| Column       | Type           | Constraints                |
| ------------ | -------------- | -------------------------- |
| `id`         | `serial`       | Primary key                |
| `name`       | `varchar(255)` | Not null                   |
| `email`      | `varchar(255)` | Not null, unique           |
| `password`   | `varchar(255)` | Not null (bcrypt hashed)   |
| `role`       | `varchar(50)`  | Not null, default `'user'` |
| `created_at` | `timestamp`    | Not null, default `now()`  |
| `updated_at` | `timestamp`    | Not null, default `now()`  |

### Dev vs. Production DB Connection

The `src/config/database.js` file auto-detects the environment via `NEON_LOCAL_HOST`:

- **Development** — Routes queries through the Neon Local proxy container over HTTP
- **Production** — Connects directly to Neon Cloud over HTTPS/WebSocket

---

## Environment Variables

Copy `.env.example` and fill in your values:

```bash
cp .env.example .env.development   # for local development
cp .env.example .env.production    # for production
```

| Variable           | Dev                                          | Prod                                          | Description                                             |
| ------------------ | -------------------------------------------- | --------------------------------------------- | ------------------------------------------------------- |
| `PORT`             | `3000`                                       | `3000`                                        | HTTP port                                               |
| `NODE_ENV`         | `development`                                | `production`                                  | Controls app behavior and logging                       |
| `LOG_LEVEL`        | `debug`                                      | `info`                                        | Winston log level                                       |
| `DATABASE_URL`     | `postgres://neon:npg@neon-local:5432/neondb` | `postgres://...neon.tech/...?sslmode=require` | Postgres connection string                              |
| `JWT_SECRET`       | ✅ Required                                  | ✅ Required                                   | Secret used to sign/verify JWTs (use 64+ chars in prod) |
| `ARCJET_KEY`       | ✅ Required                                  | ✅ Required                                   | Arcjet project key                                      |
| `NEON_API_KEY`     | ✅ Required                                  | ❌ Not needed                                 | Neon API key (for neon-local container)                 |
| `NEON_PROJECT_ID`  | ✅ Required                                  | ❌ Not needed                                 | Neon project ID (for neon-local container)              |
| `PARENT_BRANCH_ID` | ✅ Required*                                 | ❌ Not needed                                 | Creates ephemeral branch from this parent               |
| `BRANCH_ID`        | Optional*                                    | ❌ Not needed                                 | Connect to a specific existing Neon branch              |
| `DELETE_BRANCH`    | `true`                                       | ❌ Not needed                                 | Set `false` to persist branch after `down`              |
| `NEON_LOCAL_HOST`  | Set by Compose                               | ❌ Not set                                    | Triggers HTTP mode in `database.js`                     |
| `NEON_LOCAL_PORT`  | `5432`                                       | ❌ Not set                                    | Neon Local port within compose network                  |

*Use either `PARENT_BRANCH_ID` **or** `BRANCH_ID`, not both.

---

## Getting Started

### Prerequisites

| Tool                                        | Version   | Notes                               |
| ------------------------------------------- | --------- | ----------------------------------- |
| Node.js                                     | ≥ 22      | Required for running outside Docker |
| Docker Desktop                              | ≥ 4.x     | With Docker Compose v2 built-in     |
| A [Neon account](https://console.neon.tech) | Free tier |                                     |
| An [Arcjet account](https://arcjet.com)     | Free tier |                                     |

---

### Run Locally (No Docker)

```bash
# 1. Install dependencies
npm install

# 2. Create your env file
cp .env.example .env

# 3. Fill in DATABASE_URL, JWT_SECRET, ARCJET_KEY in .env

# 4. Run migrations
npm run db:migrate

# 5. Start the dev server with hot-reload
npm run dev
```

The server will be available at `http://localhost:3000`.

---

### Run with Docker — Development

Development uses **Neon Local** — a Docker container that creates an ephemeral Neon branch for each session, giving you a clean database every time.

#### 1. Get Your Neon Credentials

From the [Neon console](https://console.neon.tech):

1. **API Key** → Account Settings → API Keys → Create Key
2. **Project ID** → Project Settings → General → Project ID
3. **Parent Branch ID** → Your project → Branches → click `main` → copy the `br-...` ID from the URL

#### 2. Fill in `.env.development`

```bash
cp .env.example .env.development
```

```dotenv
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug

DATABASE_URL=postgres://neon:npg@neon-local:5432/neondb

NEON_API_KEY=your_neon_api_key_here
NEON_PROJECT_ID=your_neon_project_id_here
PARENT_BRANCH_ID=br-your-main-branch-id

JWT_SECRET=dev_jwt_secret_change_me
ARCJET_KEY=your_arcjet_key_here
```

#### 3. Start the Dev Stack

```bash
docker compose -f docker-compose.dev.yml --env-file .env.development up --build
```

Or use the npm shortcut:

```bash
npm run dev:docker
```

**What happens:**

1. `neon-local` container authenticates with Neon API and creates a fresh ephemeral branch
2. `app` waits for `neon-local` to pass its health check
3. App starts with `node --watch` (hot-reload on file changes)
4. Source code is mounted as a volume — edit files and the app restarts instantly

> The ephemeral Neon branch is **automatically deleted** when you run `docker compose down`.

#### 4. Stop the Stack

```bash
docker compose -f docker-compose.dev.yml down
```

---

### Run with Docker — Production

#### 1. Fill in `.env.production`

```dotenv
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

DATABASE_URL=postgres://neondb_owner:<password>@ep-something.neon.tech/neondb?sslmode=require

JWT_SECRET=your_strong_production_secret_minimum_64_characters
ARCJET_KEY=your_production_arcjet_key
```

> ⚠️ **Never commit `.env.production`** — it's in `.gitignore`.

#### 2. Build and Run

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up --build -d
```

Or:

```bash
npm run prod:docker
```

**Differences from dev:**

- Only the `app` service runs — no Neon Local proxy
- Built using the lean `production` Dockerfile stage (`--omit=dev`)
- Source is baked into the image, not mounted
- No hot-reload, `NODE_ENV=production`

---

## Database Migrations

Migrations are managed with **Drizzle Kit**.

```bash
# Generate a new migration from schema changes
npm run db:generate

# Apply migrations to the database
npm run db:migrate

# Open Drizzle Studio (visual DB browser)
npm run db:stub
```

**Running migrations against dev (Docker):**

```bash
DATABASE_URL="postgres://neon:npg@localhost:5432/neondb" npm run db:migrate
```

**Running migrations against production:**

```bash
DATABASE_URL="postgres://neondb_owner:...@ep-....neon.tech/neondb?sslmode=require" npm run db:migrate
```

---

## CI/CD — GitHub Actions

All three workflows trigger **only on push to `main`**.

### 1. `lint-and-format.yml` — Code Quality

```
Trigger: push → main
```

| Step               | Command                 |
| ------------------ | ----------------------- |
| Setup Node.js 24.x | `actions/setup-node@v4` |
| Install deps       | `npm ci`                |
| Lint               | `npm run lint`          |
| Format check       | `npm run format:check`  |

On failure: Emits a `::error` annotation suggesting `npm run lint:fix` and `npm run format`.

### 2. `tests.yml` — Test Runner

```
Trigger: push → main
```

| Step               | Details                                                                   |
| ------------------ | ------------------------------------------------------------------------- |
| Setup Node.js 24.x | `actions/setup-node@v4`                                                   |
| Install deps       | `npm ci`                                                                  |
| Run tests          | `npm test` with `NODE_ENV=test`, `NODE_OPTIONS=--experimental-vm-modules` |
| Upload coverage    | Artifact retained for **30 days**                                         |
| Step summary       | Posted to GitHub Actions job summary                                      |

### 3. `docker-build-and-push.yml` — Docker Publish

```
Trigger: push → main | workflow_dispatch (manual)
```

| Step                 | Details                                                      |
| -------------------- | ------------------------------------------------------------ |
| Set up QEMU + Buildx | Multi-platform support                                       |
| Log in to Docker Hub | Using `DOCKER_USERNAME` and `DOCKER_PASSWORD` secrets        |
| Extract metadata     | Tags: `branch`, `sha`, `latest`, `prod-YYYYMMDD-HHmmss`      |
| Build & push         | Platforms: `linux/amd64`, `linux/arm64`; GHA cache for speed |
| Job summary          | Published image name and all tags                            |

**Required GitHub Secrets:**

| Secret            | Description                                                    |
| ----------------- | -------------------------------------------------------------- |
| `DOCKER_USERNAME` | Your Docker Hub username                                       |
| `DOCKER_PASSWORD` | A Docker Hub Personal Access Token with **Read & Write** scope |

---

## Docker Image

The `Dockerfile` uses a **3-stage multi-stage build**:

```
┌─────────────┐
│    base     │  node:22-alpine + WORKDIR + package files
└──────┬──────┘
       │
  ┌────┴────┐         ┌─────────────┐
  │   dev   │         │    prod     │
  │ npm ci  │         │ npm ci      │
  │ (all    │         │ --omit=dev  │
  │  deps)  │         │ (lean)      │
  │ --watch │         │ npm start   │
  └─────────┘         └─────────────┘
```

| Stage         | Image size | Used for                          |
| ------------- | ---------- | --------------------------------- |
| `development` | Larger     | Local development with hot-reload |
| `production`  | Lean       | CI/CD builds, Docker Hub pushes   |

**Pull the latest production image:**

```bash
docker pull <your-dockerhub-username>/acquisitions:latest
```

---

## Architecture Overview

```
┌───────────────────────────────────────────────────────────┐
│                        DEVELOPMENT                        │
│                                                           │
│  ┌──────────────┐   postgres://neon:npg   ┌────────────┐  │
│  │     app      │ ─────────────────────►  │ neon-local │  │
│  │  (Node.js)   │    @neon-local:5432     │  (proxy)   │  │
│  └──────────────┘                         └─────┬──────┘  │
│                                                 │ API     │
└─────────────────────────────────────────────────┼─────────┘
                                                  ▼
                                       ┌──────────────────┐
                                       │   Neon Cloud     │
                                       │ (ephemeral branch│
                                       │  auto-created &  │
                                       │  auto-deleted)   │
                                       └──────────────────┘

┌───────────────────────────────────────────────────────────┐
│                        PRODUCTION                         │
│                                                           │
│  ┌──────────────┐   postgres://...neon.tech?sslmode=...   │
│  │     app      │ ──────────────────────────────────►     │
│  │  (Node.js)   │                  ┌──────────────────┐   │
│  └──────────────┘                  │   Neon Cloud     │   │
│                                    │ (production DB)  │   │
│                                    └──────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

**Request lifecycle:**

```
Request
  └─► Arcjet Security Middleware  (bot/shield/rate-limit)
        └─► Helmet (security headers)
              └─► Morgan (HTTP logging)
                    └─► Route
                          └─► authenticateToken (JWT verify)
                                └─► requireRole (RBAC check)
                                      └─► Zod Validation
                                            └─► Controller
                                                  └─► Service
                                                        └─► Drizzle ORM
                                                              └─► Neon DB
```

---

## Scripts Reference

```bash
# Development
npm run dev               # Start with hot-reload (node --watch)
npm run dev:docker         # Start full dev Docker stack

# Production
npm start                  # Start production server
npm run prod:docker        # Start production Docker stack

# Database
npm run db:generate        # Generate Drizzle migration files
npm run db:migrate         # Apply migrations
npm run db:stub            # Open Drizzle Studio

# Code quality
npm run lint               # Run ESLint
npm run lint:fix           # Auto-fix ESLint issues
npm run format              # Run Prettier (write)
npm run format:check        # Check Prettier formatting (CI)

# Testing
npm test                   # Run Jest tests with coverage
```

---

## Troubleshooting

### `Cannot find module '#services/...'` in Tests

Jest cannot resolve subpath imports by default. The `moduleNameMapper` in `jest.config.mjs` maps all `#alias/*` paths to their real locations. If you add a new alias to `package.json` `imports`, add the corresponding entry to `jest.config.mjs`.

### `NODE_OPTIONS is not recognized` on Windows

The test script uses `node --experimental-vm-modules` directly (not the Unix `NODE_OPTIONS=...` syntax). This is already configured in `package.json`:

```json
"test": "node --experimental-vm-modules node_modules/jest/bin/jest.js"
```

### App Fails to Connect to DB in Dev: `connection refused`

The Neon branch creation can take 15–20 seconds. The `depends_on: condition: service_healthy` in `docker-compose.dev.yml` handles this. If you have a slow network, increase `start_period` in the compose file:

```yaml
start_period: 30s
```

### Neon Local Exits with "invalid API key"

Verify `NEON_API_KEY` and `NEON_PROJECT_ID` in `.env.development` are correct. The key must have **read/write** permissions on the project.

### Docker Push Fails with `401 Unauthorized`

Your `DOCKER_PASSWORD` GitHub secret is likely a Docker Hub token with **Read-only** access. Create a new Personal Access Token at [hub.docker.com](https://hub.docker.com) → Account Settings → Personal Access Tokens with **Read & Write** scope, and update the secret.

### Arcjet Warning: "Client IP address is missing"

In test/local environments, Arcjet logs a warning when the request IP is unavailable. Set `ARCJET_ENV=development` to suppress this in non-production environments:

```bash
ARCJET_ENV=development npm run dev
```

### Production SSL Errors

Ensure `?sslmode=require` is appended to your `DATABASE_URL` in `.env.production`. Neon Cloud requires TLS.

### Drizzle Studio Cannot Connect in Dev

Run it from your host (not inside Docker) with the localhost-mapped port:

```bash
DATABASE_URL="postgres://neon:npg@localhost:5432/neondb" npm run db:stub
```
