# Production deployment

## Decision

**Host:** Render Web Service (Node.js)  
**Datastore:** SQLite via `better-sqlite3` on a **persistent disk**  
**Why not Vercel/Netlify serverless:** `better-sqlite3` needs a native Node addon and durable filesystem. Ephemeral serverless instances would lose appointments on cold start / redeploy.

Acceptance criterion: a judge can create an appointment, reload, and still see it via `get_appointment`.

## Architecture

```
Browser (WebMCP)
  → HTTPS Next.js (Node runtime)
  → BookingService / domain
  → SQLite file on mounted disk (DATABASE_PATH)
```

## Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_PATH` | Yes in prod | Absolute path on persistent disk, e.g. `/var/data/schedulemcp.db` |
| `DEMO_RESET_TOKEN` | Optional | If set, enables `POST /api/demo/reset` with matching bearer token |
| `NODE_ENV` | Set by host | `production` |

See `.env.example`.

## Render setup

1. Create a **Web Service** from this repo.
2. Runtime: **Docker** (see `Dockerfile`) or Node with `npm install && npm run build && npm start`.
3. Attach a **persistent disk** mounted at `/var/data`.
4. Set `DATABASE_PATH=/var/data/schedulemcp.db`.
5. Optionally set `DEMO_RESET_TOKEN` to a long random secret for maintained demos.
6. Health check: `GET /`.

`render.yaml` is a blueprint starting point.

## Demo reset

Judges may create many appointments. If availability becomes noisy:

```bash
curl -X POST "$ORIGIN/api/demo/reset" \
  -H "Authorization: Bearer $DEMO_RESET_TOKEN"
```

This force-reseeds SQLite. Without `DEMO_RESET_TOKEN`, the endpoint returns 404.

For low challenge traffic, redeploy / empty the disk and restart is also sufficient. Seeded conflict appointments use fixed 2026-08 dates for automated tests; they do not block availability on later challenge dates.

## Local production-like check

```bash
npm run build
DATABASE_PATH=./data/prod-like.db npm start
```
