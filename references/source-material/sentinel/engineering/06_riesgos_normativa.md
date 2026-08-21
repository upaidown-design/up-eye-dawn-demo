# Riesgos, Seguridad y Normativa

## Riesgos Tecnicos

| Riesgo | Probabilidad | Impacto | Mitigacion |
|---|---:|---:|---|
| Bateria insuficiente en invierno | Media | Alto | Panel 200-300 Wp y bateria 100 Ah |
| Sobretemperatura en caja | Alta | Alto | Color claro, ventilacion pasiva, sensor interno |
| Cobertura 4G mala | Media | Alto | Estudio de cobertura y antena direccional |
| Fallo de carga del dron | Alta | Alto | Empezar con carga manual USB-C |
| Entrada de agua/polvo | Media | Alto | IP66 real, prensaestopas, pruebas de lluvia |
| Viento incompatible con DJI Neo | Alta | Alto | Bloqueo por anemometro, usar dron mayor si procede |
| Vandalismo o robo | Media | Medio/Alto | Cerradura, ubicacion, tamper, tracking |
| Corrosion | Media | Medio | Galvanizado, inox, mantenimiento |
| Rayos/sobretensiones | Baja/Media | Alto | Puesta a tierra y protecciones |

## Riesgos de Producto

- Demasiadas funciones en una sola version.
- Coste final mayor que el valor percibido por agricultor individual.
- Dron ligero insuficiente para uso agricola serio.
- Falta de integracion real entre dock, dron y software.
- Mantenimiento demasiado frecuente.

## Riesgos Legales y Operativos

### Drones

En Espana y la UE, la operacion de drones esta regulada por normativa EASA/AESA. Un dron C0 como DJI Neo puede ser sencillo para operaciones basicas, pero la automatizacion, vuelos fuera de vista directa, vigilancia o misiones recurrentes pueden exigir analisis operacional, permisos o procedimientos especificos.

Puntos a confirmar:

- Categoria operacional: abierta, especifica o certificada.
- Vuelo VLOS o BVLOS.
- Zona geografica UAS.
- Altura maxima.
- Distancia a personas, carreteras y edificios.
- Proteccion de datos si hay grabacion de imagenes.
- Seguro de responsabilidad civil si aplica.

### Comunicaciones

- 4G/LTE: usar equipos con marcado CE.
- WiFi: respetar potencias permitidas.
- LoRa 868 MHz: respetar duty cycle y potencia maxima permitida en Europa.

### Electricidad

- Sistema DC de baja tension, aun asi requiere protecciones.
- Baterias LiFePO4 con BMS certificado.
- Cableado exterior protegido contra UV y agua.
- Puesta a tierra del mastil.

### Obra Civil

- Base de hormigon y mastil deben dimensionarse por viento y suelo.
- Si se instala en finca ajena o zona protegida, revisar permisos.

## Recomendaciones de Seguridad

- Boton o seccionador de apagado general.
- Fusibles claramente etiquetados.
- Etiqueta de tension y bateria.
- Manual de mantenimiento.
- Registro de incidencias.
- No permitir carga de dron con lluvia.
- No permitir vuelo con viento alto.
- No dejar conectores electricos expuestos.

## Matriz de Decision Para V1

| Funcion | Incluir V1 | Motivo |
|---|---|---|
| Solar + bateria | Si | Base del producto |
| Router 4G/WiFi | Si | Valor inmediato |
| Sensores meteo | Si | Necesarios para campo y dron |
| Dashboard | Si | Necesario para demostrar utilidad |
| DJI Neo | Opcional | Util como demo, limitado para operacion seria |
| Carga USB-C | Opcional V2 temprana | Bajo riesgo |
| HEISHA DPad | No | Coste/integracion |
| Mecanismo elevador | No | Riesgo mecanico alto |
| Rescate CO2/strobe | No | No aporta al MVP |

## Conclusion de Riesgo

La estacion como nodo rural IoT es de riesgo medio y viable. La estacion como drone-in-a-box autonomo es de riesgo alto y debe tratarse como fase posterior.
