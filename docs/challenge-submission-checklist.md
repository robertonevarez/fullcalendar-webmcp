# Challenge submission checklist

Challenge: [The WebMCP Challenge](https://webmcp.devpost.com/)  
Deadline: **September 3, 2026 @ 1:00pm PDT**  
Video: public YouTube, **under 3 minutes**, with audio

| Item | Status | Notes |
|------|--------|-------|
| Public GitHub repository | Done | https://github.com/robertonevarez/schedulemcp |
| Open-source license (About-detectable) | Done | MIT `LICENSE` |
| Live HTTPS URL | **Pending Vercel + PlanetScale** | Replace after deploy |
| WebMCP tools visible on business page | Done | 8 tools register when WebMCP-enabled |
| Chrome inspector test | Done | Phase 1 + cleanup verification |
| ChatGPT in-app browser test | **Needs human** | Confirm on Vercel URL |
| Positive booking path (`78701`) | Done (Chrome executeTool + inspector) | Reconfirm on prod URL |
| Negative eligibility (`90210`) | Done | Structured `OUTSIDE_SERVICE_AREA`, no red overlay |
| Multi-resource proof (auto / clinic) | Done | Seeded + tests |
| Demo video | **Needs human** | See `docs/demo-video-script.md` |
| Devpost description | Drafted | See `docs/devpost-submission-draft.md` |
| Repository URL on submission | Ready | Same as above |
| Deployment URL on submission | **Pending** | Vercel production URL |

## Judge testing notes

- No auth required for the demo.
- Start at `/` → **Try the demo** → `/businesses/acme-hvac`.
- Optional: salon (`northline-salon`) and auto (`mesa-auto-service`) for multi-vertical proof.
- Persistence: appointments survive reload via PlanetScale Postgres.
- Demo reset (maintainers only): `POST /api/demo/reset` with `Authorization: Bearer $DEMO_RESET_TOKEN` when configured.

## Remaining human actions

1. `pscale auth login` and create PlanetScale **Postgres** database + role credentials.
2. Set `DATABASE_URL` (port **6432**) and optional `DATABASE_MIGRATE_URL` (port **5432**); run `npm run db:migrate` and `npm run db:seed`.
3. Deploy to Vercel with `DATABASE_URL`; confirm live HTTPS URL.
4. Confirm ChatGPT in-app browser against the Vercel URL (create → reload → get same appointment).
5. Record and upload YouTube demo (&lt;3 min).
6. Submit on Devpost before the deadline.
