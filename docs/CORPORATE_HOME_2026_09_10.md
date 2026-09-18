# Corporate homepage — 10 September 2026

Public entry: https://upaidown.com/ (redirects to /demo/).
Cinema destination: https://upaidown.com/field-cinema/.

The homepage now presents the concept ecosystem with the existing vineyard render, public Cinema links in navigation, hero, mission section and footer, actual screenshots of the simulated mission, four equipment/data roles and seven INSECE probe parameters. Spanish and English use the existing LanguageProvider. Hardware renders and mission readings are explicitly conceptual/simulated. No GPS or uptime claims are presented as measured facts. NDVI and thermal interpretation are distinguished.

Reference: docs/3D_VISUAL_EXPERIENCE_HANDOFF_REPORT.md, the Enterprise dossier already reviewed for Field Cinema, and the current Field Cinema implementation. Existing investor and CRM destinations remain unchanged.

Deployment scope: public-home.tsx, public-home.css and three JPEG screenshots under assets/cinema. Existing production checkout and language infrastructure retained. Gateway image compiled on the Google Cloud VM; no database migration or changes to Caddy/CRM.

Rollback image: production_gateway:before-home-20260910.
Source backup: /opt/up-eye-dawn/backups/home-20260910/.
To roll back the UI, tag the backup image as production_gateway and recreate only gateway with the existing ued-compose production command. Restore the two source files before a subsequent rebuild. Keep the field-cinema read-only volume.

## Mission previews and transparent branding

Four H.264 MP4 excerpts (1280×720, silent, 12–16 seconds) and JPEG stills were extracted from the previously recorded 192-second mission. Source: output/field-cinema/UPAIDOWN-Mision-3D.mp4. Intervals: Station 22–37 s, aerial/thermal 40–52 s, soil 94–110 s, onboard route 114–126 s. All show simulated operation, not physical field footage. Native controls, inline playback and preload=none avoid unsolicited playback and downloading all videos on entry. The selector mounts only the selected clip. Screenshots can be downloaded; the full Cinema remains a distinct link.

Original PNGs from the workspace logo folder remain unmodified. The wordmark uses its alpha channel directly over the navigation surface; individual white logo boxes were removed. Footer uses the original slogan variant. Cinema header uses the same transparent wordmark.

Production source backup: /opt/up-eye-dawn/backups/previews-20260910.
Rollback gateway image: production_gateway:before-previews-20260910.
