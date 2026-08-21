# UP-EYE-DAWN — 3D Visual Experience Handoff

**Date:** 16 August 2026  
**Audience:** senior product designer, 3D artist, technical artist and WebGL/frontend engineer  
**Status:** engineering handoff; not a claim of physical product completion

## 1. Executive verdict

The application has a working deterministic mission runtime, product reference imagery, a real WebGL integration scaffold and a newly generated environment plate. It does **not** yet contain production-quality animated 3D models of the approved Rover and Sentinel.

The current WebGL scene uses procedural placeholder geometry. It proves camera, lighting, state binding, terrain, shadows, interaction and lazy loading, but it is not visually faithful enough to replace the approved renders. A PNG cannot be turned into a correctly articulated 3D machine merely by placing it in Three.js: it has no hidden surfaces, depth, pivots, topology, material channels or rig.

The correct next step is to create two master GLB assets from the approved image boards, validate their identity, rig their moving assemblies and then replace the procedural groups through the component interfaces already prepared.

## 2. Product truth and visual rules

### Rover identity to preserve

- Compact tracked commercial mobility architecture.
- Black and white faceted industrial body.
- Twin rubber tracks and light-colored side plates.
- Front multi-sensor perception array.
- Central retractable soil probe.
- Closed upper drone bay in default state.
- Hinged protective bay lid.
- External communications antenna.
- No anthropomorphic face, eyes or character behavior.
- No WALL·E, Pixar or Disney resemblance.

### Sentinel identity to preserve

- Fixed concrete foundation.
- Rugged telescopic mast.
- Mechanically elevated upper carriage.
- Green protected equipment/docking enclosure.
- Hinged protective lid.
- Drone platform and autonomous drone.
- Meteorological instruments and communications antennas.
- No asserted maximum height or unverified power/communications specification.

### Mandatory classification

- Product imagery: `CONCEPT_RENDER`.
- Exploded imagery: `CONCEPT_ENGINEERING_VISUAL`.
- WebGL geometry until engineering validation: `PROCEDURAL_PLACEHOLDER` or `CONCEPT_3D`.
- Demo farm, telemetry, NDVI and soil: `SIMULATED` / `SYNTHETIC`.
- Never describe renders as photographs or physical prototypes.

## 3. What exists now

### Runtime

- React 19 + TypeScript + Vite frontend.
- Fastify API and WebSocket simulation runtime.
- Deterministic scenario with seek, play, pause, speeds and reset.
- Docker Compose gateway, API, worker, PostgreSQL and Redis services.
- Investor and operator modes.
- Nginx endpoints:
  - `/investor/`
  - `/demo/preflight`
  - `/demo/investor-demo`
  - `/demo/mission-control`

### Visual libraries now installed

- `maplibre-gl`: farm geography and operational mapping.
- `echarts`: data-driven charts and animated updates.
- `motion`: React transitions and state motion.
- `three`: 3D rendering engine.
- `@react-three/fiber`: React renderer for Three.js.
- `@react-three/drei`: Three.js helpers.

### Approved/reference raster assets

Root directory:

`apps/web/public/assets/concepts/generated-2026-08-16/`

Key files:

- `rover-master-reference-board.png`
- `rover-cutout-front-three-quarter.png`
- `rover-cutout-rear-three-quarter.png`
- `rover-cutout-left-side.png`
- `rover-cutout-top-front-isometric.png`
- `rover-cutout-bay-open.png`
- `rover-cutout-probe-deployed.png`
- `rover-exploded-concept.png`
- `sentinel-master-reference-board.png`
- `sentinel-animation-reference.png`
- `ecosystem-hero.png`
- `mission-storyboard.png`
- `data-ai-engine.png`
- `dashboard-concept.png`
- `ecosystem-3d-fallback-v2.png` — new 16:9 plate generated from the Rover, Sentinel and ecosystem masters.

The registry is `assets/manifest/visual-asset-registry.json` and the runtime resolver is `apps/web/src/visual-assets.ts`.

### Product UI already implemented

- Fleet ecosystem landing.
- Rover product hero.
- Rover anatomy hotspots.
- Rover mission-state selector.
- Sentinel product hero.
- Sentinel deployment-state selector.
- Mission Control with map, timeline and intelligence rail.
- NDVI view with ECharts distribution.
- Data Engine visual narrative.
- Round Decision capital/dilution simulator.
- Investor HTML transitions into the demo.

### 3D scaffold just implemented

Source: `apps/web/src/field-scene-3d.tsx`

It currently provides:

- React Three Fiber `Canvas`.
- Perspective camera.
- Orbit controls.
- Ambient and directional illumination.
- Cast/receive shadows.
- Ground plane and crop rows.
- Procedural Rover group.
- Procedural Sentinel group.
- Procedural drone group.
- Sentinel height bound to mast telemetry.
- Sentinel lid bound to `bayOpen` telemetry.
- Rover probe bound to mission phase.
- Drone hover bound to aerial mission phases.
- Environment lighting.
- Lazy-loaded 3D chunk.
- Static raster fallback behind WebGL.
- Explicit `INTERACTIVE 3D CONCEPT SCENE / PROCEDURAL PLACEHOLDER GEOMETRY · GLB READY` disclosure.

## 4. What is not good enough yet

### The central gap

There are no approved Rover or Sentinel GLB/GLTF models. Therefore:

- The 3D Rover does not reproduce the exact body panels or track system.
- The 3D Sentinel does not reproduce the exact enclosure, mast and instruments.
- The models have no production topology.
- Materials are generic rather than authored PBR materials.
- There is no UV unwrap or texture bake.
- There is no mechanical rig or named animation clips.
- There is no verified scale.
- Hidden/back surfaces have not been designed.
- Mechanical clearances and collision envelopes are unknown.

### Why the PNG assets cannot solve this alone

A reference render contains only pixels from visible camera angles. It does not contain:

- geometry behind the object;
- exact depth;
- animation pivots;
- separate moving parts;
- surface normals;
- metallic/roughness channels;
- collision geometry;
- mesh hierarchy;
- consistent real-world scale.

Using a PNG on a plane, sprite or billboard would move the picture but would not create advanced 3D. It would fail under camera rotation and would expose that it is flat.

## 5. Required 3D asset package

### Rover master GLB

Recommended hierarchy:

```text
ROVER_ROOT
├── chassis
├── body_lower
├── body_upper
├── track_left
│   ├── belt
│   └── wheels
├── track_right
│   ├── belt
│   └── wheels
├── perception_front
├── antenna
├── soil_probe
│   ├── actuator
│   ├── shaft
│   └── probe_head
├── drone_bay
│   ├── lid
│   ├── docking_platform
│   └── charging_interface_concept
└── drone
```

Required pivots:

- `track_left`, `track_right`: track motion or texture offset.
- `soil_probe.actuator`: vertical deployment.
- `drone_bay.lid`: hinge rotation.
- `drone`: vertical takeoff and flight path.

Required clips:

- `rover_idle`
- `rover_drive`
- `rover_arrive`
- `probe_deploy`
- `probe_measure`
- `probe_retract`
- `bay_open`
- `drone_takeoff`
- `drone_return`
- `bay_close`

### Sentinel master GLB

Recommended hierarchy:

```text
SENTINEL_ROOT
├── foundation
├── lower_equipment_enclosure
├── mast_stage_01
├── mast_stage_02
├── mast_stage_03
├── upper_carriage
│   ├── main_enclosure
│   ├── lid
│   ├── docking_platform
│   ├── drone
│   ├── meteo_suite
│   └── antennas
└── cable_management_concept
```

Required pivots:

- Each mast stage: vertical telescopic translation.
- Upper lid: hinge rotation.
- Drone: docking/takeoff/return.
- Optional instrument rotation only if mechanically justified.

Required clips:

- `sentinel_stowed`
- `mast_raise`
- `sentinel_deployed`
- `bay_open`
- `drone_takeoff`
- `drone_return`
- `bay_close`
- `mast_lower`

### Material set

- Powder-coated black aluminum.
- Powder-coated white/light aluminum.
- Olive-green powder-coated enclosure.
- Matte polymer.
- Brushed/anodized metal.
- Rubber tracks.
- Glass/sensor lenses.
- Concrete.

Use compressed PBR textures: base color, normal, roughness, metallic and optional ambient occlusion. Do not bake fictional labels or specifications into textures.

## 6. Technical constraints for delivery

### File format

- Primary delivery: `.glb`.
- Coordinate system: Y-up.
- Real-world unit: metre.
- Origins placed predictably at ground contact / root center.
- Transforms applied before export.
- Named meshes and clips in English.
- No spaces or duplicated auto-generated names.

### Performance targets

Per product, initial target:

- 100K–250K visible triangles for desktop master.
- Optional 30K–70K presentation LOD.
- 2K texture sets; 4K only where a close-up proves necessary.
- KTX2/Basis texture compression.
- Draco or Meshopt geometry compression.
- Instanced repeated components.
- No unbounded shadow casters.
- Target 60 fps at 1920×1080 on the presentation laptop.

### Loader contract

The procedural components should be replaced by `useGLTF()` adapters without changing `FieldScene3D` props. The mission simulation remains the source of truth for state. A model adapter maps simulation state to clip/action names and normalized joint values.

Suggested interface:

```ts
type RoverVisualState = {
  motion: 'IDLE' | 'DRIVE' | 'ARRIVE';
  probe: number;       // 0..1
  bay: number;         // 0..1
  droneDocked: boolean;
};

type SentinelVisualState = {
  mast: number;        // 0..1, no public height claim
  bay: number;         // 0..1
  droneDocked: boolean;
};
```

## 7. Required scenes

### Scene A — Investor ecosystem hero

- Vineyard/field environment.
- Rover foreground.
- Sentinel middle distance.
- Drone airborne.
- Restrained camera move.
- No HUD overload.
- 15–25 second self-running narrative.

### Scene B — Mission Control digital twin

- Operational geospatial terrain.
- Sentinel fixed coordinate.
- Drone route and current position.
- Rover route and current position.
- Anomaly polygon.
- Survey coverage.
- NDVI raster when available.
- Camera focus transitions for Sentinel, drone, rover and anomaly.

### Scene C — Rover product viewer

- Neutral studio.
- Orbit and controlled zoom.
- Hotspot focus.
- Bay and probe controls.
- State transitions.
- No environment distraction.

### Scene D — Sentinel product viewer

- Neutral studio or subtle field floor.
- Mast deployment scrubber.
- Bay opening.
- Drone takeoff/return.
- No maximum-height label.

## 8. Animation direction

The visual grammar is `state → change → result`.

- Micro interaction: 120–200 ms.
- Standard UI change: 250–400 ms.
- Narrative transition: 600–1000 ms.
- Cinematic camera move: 1200–1800 ms.

Mechanical motion must use controlled easing, no elastic/cartoon bounce. Track movement, mast translation, lid rotation and probe travel must remain mechanically credible. Drone motion can use gentle stabilized hover, never exaggerated bobbing.

## 9. GIS and NDVI direction

MapLibre is already present and should remain the root map engine. For real geospatial visualisation:

- GeoJSON layers: farm, anomaly, routes and sample points.
- MapLibre symbol/custom layers: devices and trails.
- deck.gl integration only when useful for data volume or raster/image layers.
- A real NDVI raster should be delivered as GeoTIFF/COG or a tiled/preprocessed raster with known bounds.
- deck.gl `BitmapLayer` can render a georeferenced image when bounds are known.
- Current NDVI is synthetic JSON plus procedural colour surface; it is not a real raster pipeline.

## 10. Data visualisation direction

ECharts is now installed for quantitative charts. It should be used for:

- runway and burn curves;
- accumulated use of funds;
- dilution vs valuation;
- scenario comparisons;
- NDVI distribution;
- temporal telemetry where real/declared series exist.

Avoid default dashboard aesthetics. Every chart requires:

- a clear question;
- units;
- timeframe;
- source;
- classification badge;
- honest missing-data state;
- tooltip and keyboard-accessible summary;
- reduced-motion behavior.

Charts must not invent time series. Missing approved revenue/EBITDA series must remain an explicit empty state.

## 11. Current technical risks

### P0

1. No production GLB for either product.
2. Visual identity cannot be guaranteed under arbitrary camera angles until models exist.
3. Product mechanical pivots and limits are not engineered/validated.
4. Current 3D is too generic for investor-facing final use.
5. Current WebGL chunk is large and requires further optimization.

### P1

1. Need error boundary and explicit WebGL capability test.
2. Need deterministic camera choreography tied to scenario timestamps.
3. Need KTX2/Draco/Meshopt pipeline.
4. Need real terrain/basemap visual alignment for digital twin mode.
5. Need GPU/performance test on the actual meeting laptop.

### P2

1. Additional LODs.
2. Cinematic post-processing kept restrained.
3. Offline environment maps.
4. Optional recorded fallback of the final GLB scene.

## 12. Test status at handoff

- TypeScript and Vite build: passing after the 3D scaffold integration.
- Generated 3D/fallback scene loads manually at `/demo/investor-demo`.
- API and WebSocket state are visible in the page.
- Initial critical-path runs exposed two integration issues: an external HDR dependency and a gateway restart during polling. The HDR dependency was removed, the `.mjs` MIME type was corrected, and a final uninterrupted offline-oriented critical-path run passed in 1.8 minutes.
- Data-visualization E2E passed before the 3D integration; the full deterministic critical path now also passes after the corrections above.

## 13. Immediate backlog for the expert team

### Sprint 1 — Identity lock

1. Choose the exact Rover and Sentinel master boards.
2. Produce turnaround drawings with consistent orthographic projection.
3. Resolve all contradictions before modelling hidden surfaces.
4. Approve color/material palette.
5. Approve moving parts and mechanical ranges.

### Sprint 2 — Model and rig

1. Model Rover master.
2. Model Sentinel master.
3. Create UVs and PBR materials.
4. Set pivots and hierarchy.
5. Create named animation clips.
6. Export optimized GLBs.
7. Create presentation LODs.

### Sprint 3 — Runtime integration

1. Replace `Rover3D` and `Sentinel3D` procedural groups with GLB adapters.
2. Bind clips to deterministic mission states.
3. Add camera choreography.
4. Implement WebGL fallback and error boundary.
5. Add asset preload and progress UI.

### Sprint 4 — Mission visuals

1. Drone route visualization.
2. Capture footprint and image acquisition.
3. Progressive NDVI raster reveal.
4. Anomaly transition.
5. Rover dispatch and arrival.
6. Probe deployment and soil reading.
7. Data-fusion conclusion.

### Sprint 5 — QA

1. Visual identity comparison against masters.
2. Frame-rate profiling.
3. Memory and GPU profiling.
4. Offline rehearsal.
5. Full deterministic Playwright path.
6. Recorded fallback.

## 14. Acceptance criteria

The 3D experience is ready only when:

- Rover and Sentinel match approved masters from all presentation angles.
- The same models are reused across every scene/state.
- Mast, lid, probe, tracks and drone animate from named pivots/clips.
- All state transitions are driven by the simulation, not independent decorative loops.
- WebGL errors fall back to a coherent approved image/video.
- No unverified technical claim appears visually or textually.
- The critical path completes twice identically after reset.
- The presentation laptop sustains the agreed frame-rate target.
- The complete system works without internet access.

## 15. Key source files

- `apps/web/src/field-scene-3d.tsx` — current Three.js scaffold.
- `apps/web/src/field-scene-3d.css` — WebGL/fallback layer.
- `apps/web/src/app.tsx` — scenario and frontend routes.
- `apps/web/src/product-experience.tsx` — product pages and state UI.
- `apps/web/src/industrial-chart.tsx` — ECharts wrapper.
- `apps/web/src/data-viz.tsx` — financial/NDVI/data views.
- `apps/web/src/visual-assets.ts` — runtime asset registry.
- `assets/manifest/visual-asset-registry.json` — approved asset catalogue.
- `packages/simulation-engine/src/index.ts` — deterministic state source.
- `PRODUCT_VISUAL_BIBLE.md` — product visual rules.
- `ROVER_3D_ASSET_PIPELINE.md` — previous asset pipeline notes.
- `docs/VISUAL_EXPERIENCE_AUDIT_PHASE_1.md` — surface audit.

## 16. Final instruction to the receiving team

Do not improve the procedural models as if they were the final product. Use them only to validate integration. Invest modelling effort in one canonical Rover GLB and one canonical Sentinel GLB, derived from the approved masters and reviewed together. Once those two assets are correct, the existing runtime can animate them across product, mission-control and investor scenes without duplicating product geometry.
