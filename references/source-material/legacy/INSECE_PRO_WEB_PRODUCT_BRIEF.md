# INSECE PRO - brief de producto para la web publica

Fecha: 2026-05-11

Este documento define el relato correcto para la web publica de `insece.pro`. La web debe vender una solucion premium, pero separando lo que ya esta implementado de lo que esta en fase de producto para no prometer capacidades que todavia no existen.

## Posicionamiento

INSECE PRO debe presentarse como un ecosistema de agricultura inteligente:

- Sonda portatil para lecturas reales de suelo.
- App movil para campo, sesiones, sitios, zonas y sincronizacion.
- Dron para video, capturas aereas, telemetria y analisis visual.
- Mastil portable como nuevo producto de despliegue rapido para trabajo agricola.
- Dashboard cloud para propietarios, clientes, mapas, informes y decisiones.

El mensaje principal recomendado:

> Sonda, dron y mastil portable para convertir cada parcela en datos accionables.

## Estilo visual

Referencia de marca INSECE:

- Web corporativa: `https://insece.es/`
- Logo/avatar detectado: `https://insece.es/wp-content/uploads/2021/01/INSECE-AVATAR.png`
- Color principal historico detectado en CSS: `#66ccff`
- Colores secundarios detectados: `#0056a7`, `#020202`, blanco y grises.

Propuesta para INSECE PRO:

- Mantener el azul INSECE `#66ccff`.
- Subir el tono a futurista profesional con fondos oscuros, mapas, lineas de telemetria, verde crecimiento `#16d187` y ambar alerta `#ffc857`.
- Evitar copiar DJI o EVION. Inspirarse en estructura B2B: hardware + software + datos + API + casos de uso.

## Sonda de suelo

Estado: implementado como prototipo real.

Codigo relevante:

- `/Users/chris/Desktop/insece/esp32_ble_bridge/insece_ble_bridge.ino`
- `/Users/chris/Desktop/insece/mac_bridge/mac_bridge.js`
- `/Users/chris/Desktop/insece/app/src/main/java/com/insece/usbserialreader/data/sync/SyncWorker.kt`

Descripcion comercial segura:

La sonda portatil se pincha en el suelo y envia datos al telefono. La lectura se asocia a una finca, sitio, zona, sesion y ubicacion para que el dato no quede aislado.

Variables reales soportadas por el firmware:

- Humedad del suelo.
- Temperatura.
- Conductividad electrica / EC.
- pH.
- Nitrogeno.
- Fosforo.
- Potasio.

Base tecnica actual:

- ESP32-S3.
- BLE con nombre `INSECE-SONDA`.
- MAX485 TTL-RS485 hacia la sonda.
- Modbus RTU 9600 8N1.
- Direccion Modbus `0x01`.
- Funcion `0x03`, lectura de 7 registros desde `0x0000`.
- Intervalo de lectura de 2 segundos.
- JSON compacto por BLE: `m`, `t`, `c`, `ph`, `n`, `p`, `k`, `raw`.

Mensaje para la web:

- "Medicion en campo en segundos."
- "Datos reales de suelo, no estimaciones."
- "Lecturas conectadas a parcelas y zonas."
- "Sincronizacion cloud cuando hay conexion."

## Dron

Estado: parcialmente implementado. Hay app, video, HUD, captura local/cloud y dashboard base. Falta analisis agronomico real avanzado.

Codigo relevante:

- `/Users/chris/Desktop/insece/app/src/main/java/com/insece/usbserialreader/utils/DroneManager.kt`
- `/Users/chris/Desktop/insece/app/src/main/java/com/insece/usbserialreader/ui/screens/DroneScreen.kt`
- `/Users/chris/Desktop/insece/app/src/main/java/com/insece/usbserialreader/ui/screens/VlcPlayerView.kt`
- `/Users/chris/Desktop/insece/app/src/main/java/com/insece/usbserialreader/utils/DroneCaptureStore.kt`
- `/Users/chris/Desktop/insece/backend_cloud/server/migrate_drone.js`
- `/Users/chris/Desktop/insece/backend_cloud/server/server.js`
- `/Users/chris/Desktop/insece/backend_cloud/dashboard/public/sentinel.html`
- `/Users/chris/Desktop/insece/backend_cloud/dashboard/public/js/sentinel-react.jsx`
- `/Users/chris/Desktop/insece/backend_cloud/dashboard/public/js/sentinel-map.js`

Hardware/protocolo actual documentado:

- Dron M3 MAX / KY UFO.
- IP local del dron: `192.168.1.1`.
- Video: `rtsp://192.168.1.1:7070/webcam`.
- Handshake UDP puerto `8800`, payload `63 00 00 00 00`.
- Heartbeat UDP puerto `50000`, payload `66 80 80 80 80 00 00 99`, cada 50 ms.
- Telemetria prototipo escuchando UDP `50001`.
- Captura por comando UDP/TCP/HTTP y fallback por frame del video con PixelCopy.

Funcionalidad real:

- Conexion a WiFi del dron y binding de red en Android.
- Reproductor VLC embebido.
- HUD con altitud, velocidad y bateria.
- Captura de frame real cuando hay stream.
- Captura demo si no hay video.
- Galeria local persistente.
- Subida multipart al cloud.
- Sincronizacion de pendientes cuando vuelve internet.
- Dashboard con galeria/mapa/zonas.

Lo que falta o no se debe vender como terminado:

- NDVI real con sensor multiespectral.
- IA de deteccion agronomica entrenada.
- Ortomosaicos reales.
- Misiones automaticas complejas tipo DJI FlightHub.
- Integracion DJI Dock/FlightHub.
- Georreferenciacion precisa de cada captura.

Como venderlo ahora:

- "Captura aerea y video operativo."
- "Base para mapas de salud visual."
- "Analisis por zonas y comparativa temporal en desarrollo."
- "Preparado para integrar indices RGB/VARI y modelos IA."

## Mastil portable

Estado: concepto/producto nuevo. No se ha encontrado codigo de control fisico del mastil.

Descripcion segura:

El mastil portable debe presentarse como una estacion de trabajo de campo todo incluido: transporte, energia, comunicaciones, pantalla operativa y soporte para sensores/dron. La ventaja frente a un dock fijo es que se puede llevar a una parcela, desplegar y operar sin infraestructura permanente.

Elementos a mostrar en web:

- Caja portable resistente.
- Mastil telescopico.
- Pantalla de estado.
- Energia/bateria.
- Comunicacion 4G/5G/WiFi.
- Conexion con sonda, dron y cloud.
- Utilidad para agricultores: menos desplazamientos, despliegue rapido, datos en campo, soporte para campañas.

No afirmar todavia:

- Aterrizaje autonomo certificado.
- Carga automatica de drones.
- Operacion BVLOS.
- Integracion directa con DJI Dock.

## Referencias externas investigadas

EVION:

- `https://www.evion.tech/`
- Comunica una plataforma de agricultura de precision basada en imagen RGB y NDVI sintetico con IA.
- Mensajes utiles para INSECE: upload de imagenes, analisis instantaneo, dashboards, zonas, informes y API.
- Diferenciacion INSECE: no limitarse a imagen; sumar sonda fisica y operacion de campo.

DJI Enterprise / FlightHub:

- `https://enterprise.dji.com/flighthub-2`
- Presenta plataforma cloud B2B: control remoto, planificacion, rutas, datos, IA e integracion.
- `https://developer.dji.com/resources/private/landing/`
- DJI FlightHub OpenAPI permite integrar plataformas de terceros con FlightHub 2. La documentacion tambien referencia AIO, Dock/controlador y SDKs.
- INSECE debe inspirarse en la estructura, no copiar assets ni prometer integracion DJI si no esta hecha.

INSECE corporativa:

- `https://insece.es/`
- Mensaje base: innovacion, agricultura, renovables, eficiencia, control remoto y confianza local.
- La web PRO debe mantener la marca pero subir el nivel visual hacia producto tecnologico.

## Estructura recomendada de la landing

1. Hero:
   - "Sonda, dron y mastil portable para decidir con datos reales."
   - Imagen agricola real o escena propia.
   - Resumen visual de lecturas, video, zonas y cloud.

2. Sonda:
   - Foto real de la sonda.
   - Infografia de las 7 variables.
   - Flujo: pinchar, leer, guardar, sincronizar.

3. Dron:
   - Animacion de vuelo/ruta/capturas.
   - Telemetria: altitud, velocidad, bateria, video.
   - Zonas y mapas de salud.

4. Mastil portable:
   - Nuevo producto destacado.
   - Caja + mastil + comunicaciones + pantalla.
   - Casos agricolas: riego, inspeccion, vigilancia, campañas.

5. Cloud:
   - Dashboard, clientes, sitios, zonas, informes, API.
   - Diferenciar `app.insece.pro` y `api.insece.pro`.

6. Casos de uso:
   - Agricultura.
   - Inspeccion con dron.
   - Bombeo/renovables.
   - Servicios premium con imagen aerea.

7. CTA:
   - Contacto comercial.
   - Acceso al panel.

## Reglas para el siguiente agente

- No tocar `app.insece.pro` ni `api.insece.pro` en produccion sin backup.
- No mezclar dashboard HTML legacy con landing publica.
- No copiar imagenes de DJI ni EVION; usar imagenes propias, generadas o con licencia.
- No afirmar integracion DJI Dock hasta que este implementada.
- No volver a hardcodear `api.noahpro.es` en nuevas piezas; usar `api.insece.pro`.
- Mantener separado:
  - Landing publica: `insece.pro`
  - App web: `app.insece.pro`
  - API: `api.insece.pro`

## Borrador creado

Se ha creado una version de trabajo en:

`/Users/chris/Documents/Codex/2026-05-09/quiero-que-me-analices-mi-proyecto/insece-domain/landing/index.html`

Incluye:

- Estilo INSECE PRO con color `#66ccff`.
- Infografias SVG animadas para sonda, dron y mastil.
- Relato tecnico/comercial alineado con lo que existe.
- CTA hacia `https://app.insece.pro`.

Pendiente antes de desplegar:

- Sustituir imagen de hero por imagen propia de INSECE si esta disponible.
- Integrar logo local en produccion en lugar de depender del remoto `insece.es`.
- Revisar copy comercial final con el propietario.
- Probar en movil y escritorio.
- Subir a `/var/www/insece-landing/public/index.html` solo cuando se apruebe.
