# DOSIER MAESTRO - SENTINEL V3

## Lectura Recomendada

1. `00_resumen_ejecutivo.md`
2. `01_especificaciones_tecnicas.md`
3. `02_arquitectura_sistema.md`
4. `03_energia_autonomia.md`
5. `04_bom_costes.csv`
6. `05_plan_mvp_fases.md`
7. `06_riesgos_normativa.md`
8. `07_requisitos_pendientes.md`

## Definicion Corta

SENTINEL V3 es una estacion autonoma agricola para comunicaciones, energia, sensores y soporte operativo de dron. La version viable inicial debe construirse como un nodo IoT rural con energia solar, bateria, router 4G/WiFi, sensores meteorologicos y soporte manual para dron.

La carga automatica, el docking autonomo, el mastil motorizado y las funciones avanzadas de rescate deben quedar para fases posteriores.

## Especificacion Base V1

- Mastil fijo de 4 m.
- Base de hormigon dimensionada por calculo.
- Caja tecnica IP65/IP66.
- Panel solar de 150-200 Wp.
- Bateria LiFePO4 de 12.8 V 50 Ah como minimo; 100 Ah recomendado.
- Controlador MPPT.
- Router 4G/LTE con WiFi local.
- Sensores de viento, lluvia, temperatura, humedad y estado electrico.
- Dashboard remoto con alertas.
- Carga manual o semiautomatica de baterias de dron como opcion V2.

## Decision Tecnica Principal

La estacion base es viable con riesgo medio. El sistema drone-in-a-box autonomo tiene riesgo alto y requiere validacion independiente de mecanica, legalidad, carga, aterrizaje y seguridad.

## Activos Incluidos

- `assets/concepto_sentinel_v3.jpeg`
- `assets/video_concepto_sentinel_v3.mp4`

## Fuentes Tecnicas

- DJI Neo Specs: https://www.dji.com/mobile/neo/specs
- HEISHA DPad: https://heishatech.com/for-developers/dpad-c500-drone-charging-pad/
