# Challenge submission checklist

Challenge: [The WebMCP Challenge](https://webmcp.devpost.com/)  
Deadline: **September 3, 2026 @ 1:00pm PDT**  
Video: public YouTube, **under 3 minutes**, with audio

| Item | Status | Notes |
|------|--------|-------|
| Public GitHub repository | Done | https://github.com/robertonevarez/schedulemcp |
| Open-source license (About-detectable) | Done | MIT `LICENSE` |
| Live HTTPS URL | **Needs human** | Deploy Render blueprint (`render.yaml` / `Dockerfile`); set `DATABASE_PATH` on disk |
| WebMCP tools visible on business page | Done | 8 tools register when WebMCP-enabled |
| Chrome inspector test | Done | Phase 1 + cleanup verification |
| ChatGPT in-app browser test | **Needs human** | Confirm on deployed URL |
| Positive booking path (`78701`) | Done (Chrome executeTool + inspector) | Reconfirm on prod URL |
| Negative eligibility (`90210`) | Done | Structured `OUTSIDE_SERVICE_AREA`, no red overlay |
| Multi-resource proof (auto / clinic) | Done | Seeded + tests |
| Demo video | **Needs human** | See `docs/demo-video-script.md` |
| Devpost description | Drafted | See `docs/devpost-submission-draft.md` |
| Repository URL on submission | Ready | Same as above |
| Deployment URL on submission | **Needs human** | After Render deploy |

## Judge testing notes

- No auth required for the demo.
- Start at `/` → **Try the demo** → `/businesses/acme-hvac`.
- Optional: salon (`northline-salon`) and auto (`mesa-auto-service`) for multi-vertical proof.
- Demo reset (maintainers only): `POST /api/demo/reset` with `Authorization: Bearer $DEMO_RESET_TOKEN` when configured.

## Remaining human actions

1. Deploy to Render (or equivalent Node + persistent disk host).
2. Paste live URL into README + this checklist.
3. Confirm ChatGPT in-app browser against production.
4. Record and upload YouTube demo (&lt;3 min).
5. Submit on Devpost before the deadline.
