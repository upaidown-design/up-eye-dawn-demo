# Especificaciones Tecnicas

## 1. Sistema General

Nombre: SENTINEL V3  
Tipo: estacion autonoma agricola para dron, sensores y comunicaciones  
Instalacion: exterior, fija, sobre base de hormigon  
Altura objetivo del mastil: 4 m estimados  
Entorno: campo agricola, polvo, radiacion solar, viento, lluvia ocasional  
Vida util objetivo: 5 anos con mantenimiento preventivo  
Mantenimiento objetivo: trimestral en V1, mensual durante pilotos  

## 2. Requisitos Funcionales

| ID | Requisito | Prioridad | Estado |
|---|---|---:|---|
| RF-01 | Alimentar electronica de campo con bateria y panel solar | Alta | V1 |
| RF-02 | Enviar estado remoto de bateria, cobertura y sensores | Alta | V1 |
| RF-03 | Proporcionar conectividad 4G/LTE y WiFi local | Alta | V1 |
| RF-04 | Medir viento, lluvia, temperatura y humedad | Media | V1/V2 |
| RF-05 | Permitir mantenimiento fisico del dron en una caja protegida | Media | V1 |
| RF-06 | Cargar baterias del dron desde el sistema solar | Media | V2 |
| RF-07 | Carga automatica por plataforma de contactos | Baja | V3 |
| RF-08 | Despegue y aterrizaje autonomos | Baja | V3/V4 |
| RF-09 | Mecanismo motorizado de elevacion | Baja | V4 |
| RF-10 | Funcion de rescate/baliza/estroboscopio | Baja | V4 |

## 3. Especificacion Mecanica

### Mastil

- Material recomendado: acero galvanizado en caliente o aluminio estructural anodizado.
- Altura: 4 m estimados.
- Diametro recomendado: 80-120 mm segun calculo de viento.
- Espesor recomendado: 3-5 mm segun material y cargas.
- Proteccion: anticorrosion, tornilleria inoxidable A2/A4.
- Acceso de cables: canal interno o tubo exterior protegido UV.
- Puesta a tierra: pica de tierra y conductor de proteccion.

### Base

- Tipo: zapata de hormigon armado.
- Dimension inicial estimada: 1000 x 1000 x 250-350 mm.
- Placa de anclaje: acero galvanizado con pernos quimicos o embebidos.
- Requisito pendiente: calculo estructural por viento, suelo y carga superior.

### Caja Tecnica

- Grado de proteccion objetivo: IP65 minimo, IP66 recomendado.
- Material: ABS/PC industrial, poliester reforzado o aluminio pintado.
- Color: verde oliva o gris claro; evitar negro por temperatura.
- Ventilacion: respiradero con membrana hidrofoba.
- Cierre: cerradura con llave o pestillo antivandalico.
- Interior: carril DIN, fusibles, MPPT, BMS, router, controlador y borneras.

## 4. Energia

### Bateria Principal

- Quimica recomendada: LiFePO4.
- Tension nominal recomendada V1: 12.8 V o 24 V.
- Capacidad inicial propuesta: 12.8 V 50 Ah, aprox. 640 Wh nominales.
- Energia util recomendada: 70-80 % de la nominal para preservar vida util.
- BMS: obligatorio, con proteccion por sobrecarga, sobredescarga, temperatura y cortocircuito.

### Solar

- Panel recomendado V1: 100-200 Wp.
- Controlador: MPPT, dimensionado con margen minimo del 25 %.
- Inclinacion: optimizada para latitud local y limpieza de polvo.
- Proteccion: fusibles DC, seccionador y proteccion contra sobretensiones si procede.

### Salidas Electricas

- Bus principal: 12 VDC o 24 VDC.
- Salida USB-C PD para dron/cargador: 45-65 W recomendados si se usa DJI Neo.
- Salida 5 VDC: sensores/controlador.
- Salida 12 VDC: router, actuadores ligeros, sensores industriales.
- Salida 24 VDC: motores o actuadores si se implementa elevacion.

## 5. Dron de Referencia

Referencia visual: DJI Neo.

Datos verificados del DJI Neo:

- Peso aproximado: 135 g.
- Dimensiones: 130 x 157 x 48.5 mm.
- Tiempo maximo de vuelo: aprox. 18 min en condiciones controladas.
- Resistencia maxima al viento: 8 m/s, nivel 4.
- Temperatura operativa: -10 a 40 C.
- Bateria: Li-ion, 7.3 V nominal, 1435 mAh, 10.5 Wh.
- Carga directa del dron: hasta 15 W, aprox. 50 min.
- Hub de carga: hasta 60 W, aprox. 60 min para tres baterias.

Implicacion: el DJI Neo encaja mejor como dron de inspeccion ligera que como dron industrial. Para operacion autonoma exterior seria necesario validar aterrizaje, viento, proteccion, legalidad y compatibilidad de control.

## 6. Plataforma de Carga

Opcion conceptual: HEISHA DPad 60 o equivalente.

Datos publicos de HEISHA DPad 60:

- Tamano aproximado: 61 x 64.4 cm.
- Peso: 9.5 kg.
- Temperatura de trabajo: -20 a 55 C.
- Tension de carga indicada: 17.5 V.
- Corriente maxima indicada: 6 A.
- Tiempo de carga indicado: 45 min, segun dron/integracion.
- Material: fibra de vidrio y aleacion de aluminio.

Advertencia: HEISHA DPad 60 se plantea como plataforma para drones pequenos, pero la compatibilidad exacta con DJI Neo no queda cerrada en el concepto. Se debe validar con proveedor o plantear soporte de carga USB-C manual/semiautomatico como V2.

## 7. Comunicaciones

### 4G/LTE

- Funcion: enlace principal a internet.
- SIM: tarjeta M2M o datos convencional.
- Antena: LTE exterior omnidireccional o direccional segun cobertura.
- Requisito: watchdog para reinicio del router/modem.

### WiFi

- Funcion: red local para mantenimiento y acceso de campo.
- Banda: 2.4 GHz para alcance; 5 GHz opcional para mantenimiento cercano.
- Seguridad: WPA2/WPA3, clave unica por estacion.

### LoRa

- Funcion recomendada: telemetria de bajo ancho de banda, no control de video.
- Casos: alarma de bateria baja, estado del sistema, sensor remoto.
- Banda en Europa: 868 MHz, sujeta a limites de potencia y duty cycle.

## 8. Sensores

V1 recomendado:

- Temperatura.
- Humedad relativa.
- Presion atmosferica.
- Velocidad de viento.
- Direccion de viento.
- Lluvia o pluviometro basculante.
- Tension y corriente de bateria.
- Estado de carga estimado.
- Temperatura interna de caja.
- Apertura de puerta/tamper.

V2/V3:

- Camara fija de supervision.
- Sensor de irradiancia solar.
- Sensor de nivel de polvo o suciedad en panel.
- GNSS de estacion.

## 9. Controlador

Opciones:

- ESP32/LILYGO con 4G para telemetria ligera.
- Raspberry Pi Compute Module o industrial gateway para vision/camara.
- PLC compacto si se prioriza robustez industrial.

Recomendacion V1: microcontrolador ESP32 o gateway industrial simple, evitando cargar demasiada logica en un solo modulo experimental.

## 10. App / Panel

Pantallas minimas:

- Estado general: online/offline, bateria, solar, cobertura.
- Meteorologia: viento, lluvia, temperatura.
- Alertas: bateria baja, puerta abierta, perdida de red, viento alto.
- Mantenimiento: fecha, tecnico, incidencias.
- Historico: energia diaria y eventos.

Tecnologia sugerida:

- Backend ligero MQTT/HTTP.
- Dashboard web.
- Base de datos de series temporales o SQLite/PostgreSQL en prototipo.

## 11. Seguridad

- Fusible por cada rama DC.
- Proteccion contra polaridad inversa.
- Desconexion manual de bateria.
- Cableado protegido UV y roedores.
- Puesta a tierra del mastil.
- Proteccion contra sobretensiones si hay antenas altas.
- Bloqueo fisico de caja.
- Registro de acceso/mantenimiento.

## 12. Condiciones Ambientales Objetivo

- Temperatura exterior: -10 a 45 C para V1.
- Temperatura interna caja: objetivo menor de 55 C.
- Viento operacional para dron: no operar por encima de 6-8 m/s si se usa DJI Neo.
- Lluvia: estacion operativa; dron no debe operar sin validacion.
- Polvo: requiere filtros, juntas y mantenimiento de panel solar.

## 13. Fuentes Publicas Consultadas

- DJI Neo Specs: https://www.dji.com/mobile/neo/specs
- HEISHA DPAD-C500 / DPad specs: https://heishatech.com/for-developers/dpad-c500-drone-charging-pad/
- HEISHA Catalogue: https://www.heishatech.com/wp-content/uploads/2023/02/HEISHA-Catalogue.pdf
