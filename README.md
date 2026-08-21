# UP AI DOWN Enterprise Demo

An isolated, deterministic and explicitly synthetic investor demo for autonomous field intelligence.

## Run locally

Requires Node 24 LTS, pnpm 10 and Docker.

```bash
pnpm demo:setup
pnpm demo:up
pnpm demo:preflight
```

Open `http://localhost:8088/demo/preflight`. Investor HTML is available at `http://localhost:8088/investor/`.

Private meeting operations are available at `http://localhost:8088/demo/admin/login`. Confidential share links are created inside the administrator portal. The local SMTP inbox is available at `http://localhost:8025`.

The NDA supplied with the repository is a workflow-test draft, not approved legal text. Replace it and complete the privacy/retention decisions before external distribution. See `docs/PRIVATE_PORTAL_AND_NDA.md`.

Controls: Space play/pause; `R` reset; `F` fullscreen; `1`, `2`, `5` speed; `N` NDVI; `D` drone; `W` rover.

## Honest status

The deterministic simulation, REST API, WebSocket snapshot stream, synthetic farm, route motion, mast/rover concept animation, NDVI fallback, anomaly, probe readings and report endpoint are functional. PostgreSQL/PostGIS and Redis run in Compose but the current API uses a presentation-safe in-memory adapter. External INSECE dashboard and NDVI source was subsequently found on the Desktop; it has not been imported and requires ownership, security, dependency and non-regression review before reuse. See `DISCOVERY_COMPLETE.md` and the audit documentation under `docs/investor-meeting-new-york-2026/demo-application/`.
