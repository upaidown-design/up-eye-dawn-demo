# Investor demo release — 11 September 2026

Published Cinema: https://upaidown.com/field-cinema/
Homepage: https://upaidown.com/demo/
Video with ES/EN subtitles: https://upaidown.com/field-cinema/media/presentacion.html

## Delivered

- Presentation mode by default, with telemetry available on demand. Product explorers hide unrelated mission data.
- Official transparent wordmark in 3D decals, recorded video and self-contained HTML reports.
- Thermal camera rendered from the same geometry and orthographic camera as RGB. Temperatures remain synthetic; NDVI continues to use synthetic bands independently of the RGB render.
- Readable seven-channel INSECE comparison across three samples; initial reference sample explicitly identified as S-01.
- Recording selects supported MP4 or WebM, locks disruptive mission controls, stops playback on completion or manual stop and distinguishes complete/partial recordings.
- Four H.264 previews, stills, full 192.2-second MP4 at 1280×720/30 fps, and ES/EN subtitle tracks. Public investor CTA opens the presentation; private portal availability is explained explicitly.
- VTT MIME mapping added to the production Nginx configuration.

## Validation

15 tests passed. Two full recordings completed with automatic downloads. Final distribution MP4 decoded without errors. HTML report inspected visually. Published UI exercised for modes, sampling, captures, fullscreen and English preview captions. All 37 release files fetched anonymously over HTTPS and verified against SHA-256 manifest.

Sources were built in `/tmp/upaidown-cinema-validation` after unusually slow dependency reads in the Desktop workspace. Source hashes were compared with the project; validation dependency lock retained in `output/investor-release-20260911/validation-lock.yaml`.

## Deployment and recovery

VM ued-prod-01, project project-6ec58af7-91e9-4c25-870, europe-west1-b.
Static release: `/opt/up-eye-dawn/field-cinema/releases/20260911T064834Z`.
Recovery metadata: `/opt/up-eye-dawn/field-cinema/backups/20260911T064834Z` containing previous-link, previous-gateway and nginx.conf.
Homepage source backup: `/opt/up-eye-dawn/backups/investor-20260911`.
Gateway image: `production_gateway:investor-20260911`, built as `9819a154393f`.
Previous gateway tag: `production_gateway:before-investor-20260911`.

To recover, restore the previous relative Cinema link and gateway image recorded in the backup, restore the homepage source before a subsequent build, then recreate only the gateway with the existing ued-compose command. Restore nginx.conf if reverting the MIME change. No API/CRM/database migration was performed.

## Remaining scope

Private registration remains disabled, with NDA/privacy drafts unchanged. Full Cinema UI and burned-in video text remain Spanish; video narration subtitles and homepage support ES/EN. Safari and real mobile devices were not certified. HTML was inspected on screen; printed A4 pagination remains to be validated.

Full Spanish work log: `output/inventory/INFORME_DE_MEJORAS.md` in the parent workspace.

## Homepage correction

Replaced the older generated ecosystem hero with `assets/cinema/hero-current-20260911.jpg`, captured directly from the deployed Cinema at t=31 seconds in Station view. The image shows the current scissor platform and drone. Text sits alongside the full image on desktop and above it on narrower layouts. Updated ES/EN alt and caption explicitly identify the current simulated scene.

Gateway update tag: `production_gateway:hero-current-20260911`. Previous homepage source and image ID stored in `/opt/up-eye-dawn/backups/hero-20260911`.
