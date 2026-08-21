# Mast project discovery report

Primary source: `/Users/chris/Desktop/mastil proyecto/dosier_sentinel_v3`. It is more coherent than the seeded PLM demo at `/Users/chris/Desktop/Proyectos Drones y mastil/backend/app/seed.py`.

## Mechanical

V1 documents a fixed, approximately 4 m mast in galvanized steel or aluminium, IP65 minimum/IP66 recommended. Foundation, wind calculations, CAD, guides and motorised elevation remain open. Motorised/telescopic elevation is a later design, not confirmed V1 hardware.

## Electrical and energy

Documented prototype assumption: LiFePO4 12.8 V/50 Ah (~640 Wh), 100–200 Wp solar (150–200 Wp recommended), estimated 238–494 Wh/day and about 1–2 days without sun. A 24 V motor bus is only an option. Seeded PLM values of 24 V, 2.4 kWh and 400 Wp conflict and are not primary evidence.

## Connectivity, docking, sensors and control

4G/LTE primary, local Wi‑Fi and optional LoRa; ESP32/LILYGO, gateway or PLC are alternatives. Wind, rain, temperature and energy sensing are proposed. V1 dock is manual/semiautomatic; automatic landing/centring/charging is conceptual. DJI Neo + HEISHA DPad 60 compatibility is not closed.

## Costs and status

The BOM has 30 lines: mast €180–450, battery €180–450, router €90–350, controller/gateway €20–180, DJI Neo €199–350; dock price pending. No closed CAD, electrical schematic, wind calculation, fabrication proof or test package was found.

## Conflicts

- `CONFLICT: SENTINEL_MAX_HEIGHT`: 4 m is repeated in the V1 dossier; 5 m is previous-design memory without equivalent primary evidence.
- Fixed V1 versus telescopic fail-safe mast in seeded PLM.
- 12.8 V/640 Wh versus 24 V/2.4 kWh; 150–200 Wp versus 400 Wp.
- 4G primary versus Starlink primary; IP65/66 versus IP67; DJI Neo versus Matrice 350.

Seeded records marked `locked`, `VALIDATED` or `READY_FOR_FAB` point to virtual file paths and example suppliers; treat them as demo data, not fabrication evidence.
