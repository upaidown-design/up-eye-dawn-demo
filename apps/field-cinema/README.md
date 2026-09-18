# UPAIDOWN Field Cinema

Standalone 120-second agricultural mission, created alongside the existing investor application. No API, login token, financial dataset or production telemetry is bundled. The Sites deployment is private to its owner.

## Run

`pnpm install --ignore-workspace`, then `pnpm dev` (http://127.0.0.1:5186/).

`pnpm test` validates deterministic mission behavior and consistency of the map, histogram, quantiles and CSV. `pnpm models` regenerates authored GLBs. `pnpm build` typechecks and creates the static release in `dist/`.

The offline release includes the exact static build, all models, terrain maps and HDR lighting. Run START_DEMO.command; Python 3 is required only for the local HTTP server. Internet access is not required after download.

## Experience

Play / pause / seek / reset, 0.5x–2x playback, seven chapters, guided and manual cameras, independent product viewers, mast and bay articulation, probe deployment and track separation. A shared deterministic grid powers the selectable 2D/3D NDVI layer, histogram, statistics and CSV. Battery/coverage lines show only elapsed simulated time. Soil appears only after the sample event. JSON report is available after the result chapter.

The video button records the entire mission to WebM, including scene, chapter title, classifications, NDVI inset and progress. Keep the tab open during the recording; Esc or the stop button ends it. PNG captures and CSV/JSON downloads are local browser exports. Chromium is recommended for WebM recording.

## Asset provenance and limitations

- Latest design reference: UPAIDOWN_Dossier_Enterprise_A4_300DPI_FINAL.pdf, pp. 4–6 (2026-09-05). Names: WALL-AI, UPAIDOWN Station, SENTINEL-V3. Tracked rover chosen because it is the consistent product reference; the alternative wheeled illustration on p. 10 is not combined with it.
- Supporting references: existing 2026-08-16 product boards. Geometry is newly authored in scripts/build-models.mjs and exported as GLB with named moving assemblies. It is concept geometry, not CAD, a certified digital twin, or proof of a manufactured machine. Camera layouts, hidden faces, proportions and articulation limits are illustrative.
- Foliage: one original AI-generated grapevine-leaf RGBA texture, 2026-09-09, used on thin alpha-cutout leaf geometry.
- Texture: https://polyhaven.com/a/aerial_ground_rock — Poly Haven CC0, local 2K color / 1K normal / 1K roughness.
- Environment: https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky — Poly Haven CC0, local 1K HDR.
- No coordinates, field measurements, agronomic diagnoses or validated hardware speeds are implied. The 120-second timeline is cinematic compression. The 30 × 21 m NDVI grid is synthetic and all summary statistics are computed from it.
- WebGL2 is required for the live 3D scene. Failure leaves data views available. Video is an optional browser recording, not a claim of offline frame-by-frame determinism; model state and data are deterministic when seeking.

## Existing application integration

Run `node scripts/integrate.mjs` after a build to copy the self-contained release under apps/web/public/field-cinema. The investor app's protected /field-cinema route embeds this release. Its own timeline intentionally does not submit commands to the production simulation API. Re-run integration whenever this build changes.

## Revisión visual 10 septiembre 2026
Vegetación con hojas originales RGBA sobre superficies curvadas, cordones leñosos y brotes; relieve con textura y variación cromática; GTAO en calidad alta y antialias multisample; modelos con biseles más suaves y herrajes adicionales. Ajuste de la altura para mantener la reproducción visible en escritorio. Referencia técnica: https://threejs.org/docs/pages/GTAOPass.html . Los modelos siguen siendo conceptos, no fotogrametría ni CAD de ingeniería.

## Revisión de bahías y análisis
Ambos equipos despliegan un dron. La Station usa puerta frontal y cajón con guías telescópicas; WALL-AI usa tapa trasera y plataforma elevadora. Los controles de producto permiten revisar la apertura y el ciclo completo de 24 segundos. La misión incluye la salida y retorno del dron embarcado en WALL-AI entre los segundos 80 y 96.

El laboratorio RGB/NDVI se abre tras la captura. Genera una vista cenital del mismo campo y compara una cuadrícula de reflectancias sintéticas con máscara de dosel. Exporta un informe HTML A4 autónomo con RGB incrustado, mapa vectorial, metodología, estado de calidad y fuentes, además del JSON y CSV. Ver DOCUMENTATION_ALIGNMENT.md para decisiones y límites de fidelidad.
