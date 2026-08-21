# Energia y Autonomia

## Objetivo

Dimensionar una primera version que pueda operar comunicaciones y sensores de forma continua, y que reserve energia para carga ocasional de baterias del dron.

## Bateria Base

Propuesta inicial:

- Tipo: LiFePO4.
- Tension nominal: 12.8 V.
- Capacidad: 50 Ah.
- Energia nominal: 640 Wh.
- Energia util conservadora al 80 %: 512 Wh.
- Energia util muy conservadora al 70 %: 448 Wh.

## Consumos Estimados V1

| Carga | Potencia estimada | Horas/dia | Energia/dia |
|---|---:|---:|---:|
| Router 4G/LTE | 5-10 W | 24 h | 120-240 Wh |
| Controlador IoT | 1-3 W | 24 h | 24-72 Wh |
| Sensores meteorologicos | 1-3 W | 24 h | 24-72 Wh |
| Perdidas DC/DC y MPPT | 10-15 % | - | 20-60 Wh |
| Margen seguridad | - | - | 50 Wh |

Consumo diario V1 estimado: 238-494 Wh/dia.

Conclusion: una bateria de 640 Wh puede sostener la estacion aproximadamente 1-2 dias sin sol, segun router, sensores y temperatura. Para mayor autonomia rural se recomienda subir a 100 Ah o reducir consumo del router con modos de ahorro.

## Carga de Dron

Referencia DJI Neo:

- Energia por bateria: 10.5 Wh.
- Carga directa maxima: 15 W.
- Tiempo aproximado de carga directa: 50 min.
- Hub de carga: hasta 60 W para tres baterias.

Energia real tomada del sistema por una carga completa, incluyendo perdidas: 13-18 Wh por bateria.

Impacto: cargar una bateria DJI Neo es poco costoso frente a la bateria principal. El problema no es la energia total, sino la mecanica de carga, temperatura, conectores y operacion segura.

## Panel Solar

Escenarios aproximados:

| Panel | Horas solares pico | Energia bruta/dia | Energia neta estimada |
|---:|---:|---:|---:|
| 100 Wp | 3 h | 300 Wh | 210-255 Wh |
| 150 Wp | 3 h | 450 Wh | 315-382 Wh |
| 200 Wp | 3 h | 600 Wh | 420-510 Wh |
| 200 Wp | 5 h | 1000 Wh | 700-850 Wh |

Recomendacion:

- V1 minima: 150 Wp si se optimiza consumo.
- V1 robusta: 200 Wp.
- Si se mantiene router 4G siempre activo y se quiere margen invernal: 200-300 Wp y bateria de 100 Ah.

## Arquitectura Electrica Recomendada

Opcion A, simple:

- Bateria 12.8 V 50-100 Ah.
- MPPT 12 V.
- DC/DC 12 V a 5 V.
- USB-C PD 12 V a 20 V.

Opcion B, mas robusta:

- Bateria 24 V.
- MPPT 24 V.
- DC/DC 24 V a 12 V.
- DC/DC 24 V a 5 V.
- Mejor para motores y actuadores, pero mas cara.

Recomendacion para prototipo: 12.8 V si no hay motor de elevacion. Pasar a 24 V si se implementa actuador/motor.

## Protecciones

- Fusible bateria.
- Fusible panel solar.
- Fusible por carga: router, controlador, sensores, cargador dron.
- Seccionador DC.
- Proteccion contra sobretension transitoria en lineas exteriores.
- Cableado con margen de corriente del 25-50 %.
- Terminales etiquetados.

## Umbrales Iniciales

| Variable | Umbral | Accion |
|---|---:|---|
| SOC bateria < 40 % | Advertencia | No cargar dron |
| SOC bateria < 25 % | Critico | Apagar cargas no esenciales |
| Temperatura caja > 55 C | Critico | Reducir carga y alertar |
| Viento > 6 m/s | Preventivo | No vuelo experimental |
| Viento > 8 m/s | Critico para DJI Neo | Bloquear operacion |
| Lluvia detectada | Preventivo | Bloquear vuelo/carga exterior |
