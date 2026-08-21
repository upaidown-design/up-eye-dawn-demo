# Visual Experience Audit — Phase 1

As of 2026-08-16. Classifications describe presentation treatment, not product maturity.

| Surface | Decision | Hierarchy | Density / space | Motion | Images | Message clarity | Required action |
|---|---|---|---|---|---|---|---|
| `/demo/investor-demo` | REDESIGN | Strong map focus | Good 70/30 base | Functional but mechanical | Product renders absent | Mission state is clear | Add capture, processing and coordinated-response narrative states |
| `/demo/mission-control` | REPLACE | Weak | Card mosaic and raw JSON | Minimal | None | Operator purpose diluted | Replace with map-dominant command surface and intelligence rail |
| `/demo/analytics` | REMOVE | Placeholder | Empty | None | None | No analytical answer | Route to the implemented NDVI experience |
| `/demo/analytics/ndvi/ndvi-001` | KEEP + REDESIGN | Strong | Balanced | Reveal too immediate | Raster-like CSS only | Clear and honest | Add staged processing → raster → anomaly reveal |
| `/demo/fleet` | REPLACE | Placeholder | Empty | None | None | No fleet story | Replace with product-led Rover/Sentinel gateway |
| `/demo/fleet/rover/rover-001` | REPLACE | Evidence-led, not product-led | Sparse | None | None | Ground truth clear, Rover unclear | New Rover product experience; retain ground truth on a mission route |
| `/demo/fleet/sentinel/sentinel-001` | REPLACE | Placeholder | Empty | None | None | No product story | New Sentinel product experience with deployment states |
| `/demo/dev/round-decision` | REDESIGN | Strong | Good but table-first | Inputs update instantly | Not applicable | Decision is clear | Capital-first selector, animated runway/milestones/dilution, table secondary |
| Investor HTML | REDESIGN | Strong narrative | Different visual grammar | Limited | Inconsistent | Content is coherent | Share tokens, typography, disclosure badges and transitions |
| Investor financial view | KEEP + REDESIGN | Strong | Dense below fold | Static | Not applicable | Model status clear | Animate capital-to-assets and preserve non-approved labels |
| Anomaly | KEEP | Strong evidence sequence | Appropriate | Minimal | Not required | Clear | Add coordinated dispatch state only |
| Rover ground truth | KEEP + MOVE | Strong cause/effect | Appropriate | Minimal | Product absent | Clear | Move to mission evidence route and add product visual context |
| Data Engine | REDESIGN | Linear but box-like | Wide and mechanical | None | Approved asset unused | Thesis clear | Use approved visual asset plus restrained data-flow layers |

## Global findings

- Keep: truth disclosures, deterministic timeline, map, NDVI values, anomaly evidence, ground-truth chain, financial model outputs.
- Redesign: visual hierarchy, motion grammar, product imagery, capital interaction, Data Engine flow and Investor HTML chrome.
- Remove: generic placeholder routes and raw-JSON-first operator composition.
- Replace: Rover, Sentinel, fleet and Mission Control presentation layers.

## Quality target

The experience must read as an industrial deep-tech product interface in development: product-first, map-first, state-driven and evidence-controlled. Concept renders remain `CONCEPT_RENDER`, never prototype evidence.
