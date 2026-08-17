# Postman Spec-Driven Development Dashboard

A self-hosted web dashboard that lets your team practice Spec-Driven Development on top of
Postman: author OpenAPI specs as the source of truth, push them to Postman's Spec Hub,
auto-generate/sync collections, spin up mock servers, run contract tests, publish docs, and get
alerted when the spec, Postman, and reality drift apart.

## How it works

```
specs/<project>/openapi.yaml   <-- source of truth, checked into git
        |
        v
   Spec Hub (Postman)  --generate/sync-->  Collection  --create-->  Mock server
        |                                       |
        v                                       +--> Newman test runs
   Drift checker (repo vs Spec Hub)             +--> Published docs
```

- **Spec** — authored in the dashboard (Monaco editor) and written to `specs/<project>/openapi.yaml`
  in this repo. This file is the canonical source of truth.
- **Spec Hub sync** — pushes that file to Postman's Spec Hub (`createSpec` / `updateSpecFile`).
- **Collection** — generated from the spec (`generateCollection`) the first time, and kept in sync
  on every subsequent push (`syncCollectionWithSpec`). Both are async Postman operations that the
  backend polls to completion.
- **Mocks** — a Postman mock server created from the generated collection, so frontend teams can
  build against a fake API before the real implementation exists.
- **Tests** — the generated collection is run locally with [Newman](https://github.com/postmanlabs/newman)
  and results are stored per run.
- **Docs** — publishes Postman documentation for the collection.
- **Drift** — a scheduled job (plus a manual "Check drift" button) diffs the repo spec against what's
  currently stored in Spec Hub, so nobody can silently edit one side without the other noticing.

## Project layout

```
apps/api/      Node.js + Express + TypeScript backend, Prisma/SQLite for metadata
apps/web/      React + Vite + TypeScript dashboard (Tailwind, Monaco editor, TanStack Query)
specs/         OpenAPI specs, one folder per project — the source of truth, committed to git
docker-compose.yml   Self-host both apps together
```

## Prerequisites

- Node.js 22.9+ (the API's `dev`/`start` scripts pass `--use-system-ca` to Node so it trusts your
  OS's certificate store — see "Corporate network / TLS interception" below)
- A Postman account with an [API key](https://learning.postman.com/docs/developer/postman-api/authentication/)
  (Postman → Settings → API keys)
- A Postman workspace to create specs/collections/mocks in

## Setup

1. Install dependencies (this is an npm workspaces monorepo, so one install covers both apps):

   ```bash
   npm install
   ```

2. Copy the env file and fill in your Postman credentials:

   ```bash
   cp .env.example apps/api/.env
   ```

   - `POSTMAN_API_KEY` — your team's Postman API key (shared, backend-only secret; never exposed
     to the browser)
   - `POSTMAN_WORKSPACE_ID` — the workspace new specs/collections/mocks should land in (found in
     the workspace URL: `https://go.postman.co/workspace/<id>/overview`)

3. Create the local database:

   ```bash
   npm run prisma:migrate
   ```

4. Start both apps in dev mode (in separate terminals):

   ```bash
   npm run dev:api   # http://localhost:4000
   npm run dev:web   # http://localhost:5173
   ```

The dashboard talks to the API at `VITE_API_BASE_URL` (defaults to `http://localhost:4000`, see
`.env.example`).

## Running with Docker

```bash
cp .env.example .env   # fill in POSTMAN_API_KEY / POSTMAN_WORKSPACE_ID
docker compose up --build
```

This builds and runs both the API (port 4000) and the web dashboard (port 5173), with the SQLite
database persisted in a named volume and `specs/` mounted from the host so spec changes are
reflected on disk.

## Everyday workflow

1. Create a project in the dashboard, giving it a name and an initial OpenAPI spec.
2. Edit the spec in the built-in editor and save — this validates it and writes it to
   `specs/<project>/openapi.yaml`.
3. Click **Sync to Postman** to push the spec to Spec Hub.
4. Click **Generate collection** to create (or re-sync) the Postman collection from the spec.
5. From there: **Create mock** for frontend teams, **Run tests** for contract testing, **Publish
   docs** for documentation, and **Check drift** to confirm the repo and Postman haven't diverged.

Commit `specs/**` alongside your application code so spec changes go through the same review
process (PRs, CI) as everything else — that's the "spec-driven" part.

## Corporate network / TLS interception

If "Sync to Postman" (or any other Postman action) fails with a `502` and a message like
`fetch failed`, check your API terminal for the underlying cause. If it says something like
`unable to get local issuer certificate` / `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, your machine is
behind a corporate TLS-inspection proxy (Zscaler, Netskope, Cisco Umbrella, etc.). Your OS trusts
that proxy's root certificate (so `curl` and browsers work fine), but Node.js doesn't use the OS
certificate store by default, so its own `fetch()` calls fail.

This is already handled for you as long as you're on Node 22.9+: the `dev`/`start` scripts set
`NODE_OPTIONS=--use-system-ca`, which tells Node to trust the same certificates as the rest of
your OS. If you're stuck on an older Node version and can't upgrade, the fallback is to export
your OS's trusted root certificates to a `.pem` file and set `NODE_EXTRA_CA_CERTS` to that path
before starting the server.

## Notes on the Postman API integration

`apps/api/src/postman/client.ts` is a thin wrapper around the public
[Postman API](https://learning.postman.com/docs/developer/postman-api/intro-api/), mirroring the
same operations exposed by Postman's MCP tools (`createSpec`, `updateSpecFile`,
`generateCollection`, `syncCollectionWithSpec`, `createMock`, `publishDocumentation`, ...). Postman's
API surface evolves over time — if a call starts failing with a 404/400, check the current API
reference and adjust the request path/payload in that file.
