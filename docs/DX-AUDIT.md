# Developer Experience notes (historical)

Consumer-facing DX benchmarking for the `0.2.0` submission pass lives in:

[`docs/audits/vercel-dx-benchmark.md`](./audits/vercel-dx-benchmark.md)

This file is excluded from Blume publish (`**/DX-AUDIT.md`).

## Known ecosystem friction (still relevant)

These are documentation / ecosystem issues, not blockers for the `0.2.0` freeze:

1. **FullCalendar v6 vs v7 ref types** — Documented in Troubleshooting; optional convenience alias deferred.
2. **`CalendarEvent.end: null` vs FullCalendar `undefined`** — Documented map in Quickstart / Troubleshooting; helper deferred.
3. **Invisible WebMCP registration** — Quickstart now ends with an observable Verify checklist; optional registration status API deferred.
4. **`events` option name vs FullCalendar `events` prop** — Clarified in docs; renaming would be a breaking change and is deferred.
