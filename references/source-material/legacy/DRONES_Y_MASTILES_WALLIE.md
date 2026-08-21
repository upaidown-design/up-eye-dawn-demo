# 🛸 Módulo de Drones y Mástil Portable Wallie (Sentinel) — INSECE PRO

> **Documento Exclusivo de Especificación Técnica y Funcional**  
> **Fecha de creación:** 12 de Agosto de 2026  
> **Ámbito:** Exclusivamente el subsistema de Drones y la estación portable Mástil Sentinel / Wallie.

---

## 📌 1. Resumen Ejecutivo y Alcance Exclusivo

El ecosistema **INSECE PRO** integra capacidades aéreas y de telemetría de campo autónoma para la agricultura de precisión e inspección agroindustrial. Este documento recopila **única y exclusivamente** el comportamiento, la arquitectura y las funcionalidades del software relativas a:

1. **Módulo de Drones:** Captura aérea, transmisión de video en tiempo real, recepción de telemetría, procesamiento fotogramétrico/VHI y gestión de capturas en la nube.
2. **Mástil Portable Sentinel / Wallie:** Estación de trabajo de campo telescópica (~4m), energía autónoma, conectividad industrial, soporte operativo y gemelo digital en plataforma SCADA.

---

## 🛸 2. Subsistema de Drones

### 2.1. Aplicación Móvil Android (`app/`)
La aplicación Android actúa como la estación de control en tierra (GCS) en campo para la flota de drones (compatible con DJI / prototipos tipo KY UFO / M3 MAX).

* **Enlace y Vinculación de Red:**
  * Detecta y realiza *binding* exclusivo del proceso a la interfaz Wi-Fi del dron (IP por defecto `192.168.1.1`).
  * Ejecuta la secuencia de *handshake* en UDP puerto `8800` (paquete hexadecimal `0x6300000000`).
  * Mantiene la conexión activa mediante un *heartbeat* en UDP puerto `50000` (paquete `66 80 80 80 80 00 00 99` transmitido cada 50 ms).

* **Streaming de Video y HUD:**
  * Motor de reproducción embebido LibVLC decodificando el stream RTSP `rtsp://192.168.1.1:7070/webcam`.
  * Interfaz de HUD (Heads-Up Display) superpuesta sobre el video con indicadores visuales de cobertura y estado del enlace.

* **Recepción de Telemetría UDP:**
  * Escuchador en tiempo real en puerto UDP `5001`.
  * Extrae y actualiza reactivamente los parámetros de vuelo:
    * **Altitud (m):** Distancia respecto al suelo/punto de despegue.
    * **Velocidad (m/s):** Desplazamiento horizontal.
    * **Batería (%):** Nivel de carga del dron.

* **Captura y Almacenamiento Local:**
  * Captura de fotogramas de alta resolución mediante `PixelCopy` desde la superficie del reproductor.
  * Fallback automático a modo demostración si no hay señal de video activa.
  * Persistencia local con `DroneCaptureStore` para consulta en la galería del dispositivo sin requerir internet.

* **Sincronización Cloud Asíncrona:**
  * Subida *multipart/form-data* al backend (`/api/drone/upload`).
  * Envío de metadatos adjuntos: latitud (`lat`), longitud (`lng`), altitud (`alt`), identificador de sesión y nombre del sitio (`site_name`).
  * Gestor de cola para reintentar la subida automáticamente cuando el dispositivo recupera conectividad a internet.

---

### 2.2. Backend API y Servicios Cloud (`backend_cloud/server/`)
El servidor backend gestiona el almacenamiento persistente, la autenticación y las APIs del módulo de drones:

* **Estructura de Base de Datos (PostgreSQL):**
  * `drone_captures`: Guarda id, email del propietario, session_id, nombre del archivo raw (`filename_raw`), coordenadas GPS (lat, lng, alt), nombre de la finca/sitio y marca de tiempo (`timestamp`).
  * `capture_zones`: Zonas asociadas a cada foto aérea (puntos poligonales JSON, área en hectáreas `area_ha`, promedio de salud vegetal `ndvi_avg`, estado de salud `health_status` y notas agronómicas).

* **Endpoints Principales (`/api/drone/*`):**
  * `POST /api/drone/upload`: Recepción de imágenes raw desde Android o cliente web.
  * `GET /api/drone/captures`: Listado filtrado de capturas con conteo de zonas delimitadas.
  * `POST /api/drone/zones`: Creación y edición de polígonos de zonas de estrés sobre imágenes aéreas.
  * `GET /api/drone/captures/:captureId/zones`: Consulta de zonas de análisis vinculadas a una foto.

* **Control de Acceso y Servicios Premium:**
  * Integrado en la columna JSONB `premium_services` de la tabla de usuarios (`{"drone": true, "reports": true}`).
  * Permite la activación/desactivación granular de la funcionalidad de drones según el nivel de suscripción del cliente.

---

### 2.3. Motor de Análisis Vegetal y Salud Agronómica (`/api/ndvi/*`)
El backend cuenta con el servicio `ndvi-engine` especializado en el análisis de las capturas aéreas:

* **Índice de Salud Vegetal (VHI - Vegetation Health Index):**
  * Procesa imágenes fotográficas RGB procedentes de los drones.
  * Aplica algoritmos de contraste vegetativo y segmentación cromática (VHI) para identificar patrones de vigor foliar y estrés hídrico.
  * *Veracidad estricta:* Garantiza que las imágenes RGB convencionales no sean etiquetadas falsamente como NDVI multiespectral puro, ofreciendo una estimación analítica confiable.
* **Superposición de Capas (Overlays):**
  * Genera mapas de falso color (verde para vegetación sana, amarillo/rojo para zonas de estrés).
  * Almacenamiento local en `/uploads/ndvi/` y exportación opcional hacia Google Cloud Storage (`gs://.../overlay.png`).
* **Diagnóstico Enriquecido con Inteligencia Artificial:**
  * Integración opcional con Gemini Vision API (`ndvi-ai.js`) para sugerir interpretaciones de anomalías en el cultivo basadas en las zonas de color analizadas.

---

### 2.4. Dashboard Web y SCADA (`backend_cloud/dashboard/public/`)
* **Mapa GIS de Drones (`droneMap`):**
  * Visor cartográfico basado en Leaflet y capas satelitales ArcGIS World Imagery.
  * Ubicación exacta de cada disparo de dron con marcadores interactivos georreferenciados.
* **Galería Comparativa Aérea:**
  * Comparador interactivo "Antes / Después" (o *Raw vs Processed VHI Overlay*).
  * Dibujo de polígonos de zonas de inspección directamente sobre la ortofoto.
* **Fondo de Pantalla SCADA (`/api/scada/drone-backgrounds`):**
  * Permite utilizar las fotos aéreas tomadas por el dron como fondo de plano 2D/3D en los esquemas SCADA de la finca.

---

## 🏗️ 3. Mástil Portable Sentinel / Wallie

### 3.1. Concepto y Propuesta de Valor
El **Mástil Portable (conocido internamente como "Wallie" / Mástil Sentinel)** es un subsistema de hardware y software diseñado para ofrecer una estación de trabajo agrícola y telemetría de campo desplegable sin infraestructura fija permanente.

* **Ventaja Clave:** A diferencia de una caseta o base fija, el Wallie se transporta en vehículo a cualquier parcela o embalse, se despliega en minutos y comienza a operar de forma autónoma.
* **Estructura Mecánica:** Mástil telescópico de ~4 metros de altura con mecanismo de elevación/extensión ("lo que sube y baja").

---

### 3.2. Equipamiento e Infraestructura del Mástil Wallie
El hardware del Mástil Wallie integra los siguientes componentes de campo:

1. **Caja Portable Intemperie:** Envolvente reforzada de alta resistencia para protección contra polvo, lluvia y temperatura.
2. **Sistema de Energía Autónomo:** Panel solar con controlador de carga y banco de baterías integrado para operación 24/7.
3. **Comunicaciones Integradas:** Módem industrial 4G/5G con fallback local Wi-Fi para enviar datos a la nube o conectar con la app Android en campo.
4. **Pantalla de Estado Local:** Pantalla táctil/operativa externa para verificación rápida de parámetros sin necesidad de sacar el teléfono.
5. **Estación Meteorológica y Sensores de Entorno:** Medición continua de viento, humedad ambiental, temperatura y radiación.
6. **Soporte de Apoyo a Drones y Sensores:** Plataforma y soporte de amarre/recarga en el propio mástil para servir como base de operaciones terrestres de los drones y otros dispositivos.

---

### 3.3. Integración en Software y SCADA Industrial
En el ecosistema de software de INSECE, el Mástil Sentinel / Wallie se gestiona desde el panel SCADA y la nube:

* **Gemelo Digital (Three.js):**
  * Representación en 3D/2D del mástil en los mapas de la finca (ejemplo en el complejo *Campillo El Negro*).
  * Visualización del estado de elevación y sensores acoplados.
* **Telemetría e Integración Modbus/PLC:**
  * Conexión mediante pasarelas SCADA industriales (`base_gateway.py`) para leer datos del mástil y de las bombas o niveles de embalse asociados.
* **Planes de Suscripción:**
  * Incluido como nivel **Sentinel V3 Mástil** dentro de las ofertas de suscripción Enterprise y modelos de negocio CapEx/OpEx (Leasing / HaaS).

---

## 📊 4. Cuadro Comparativo de Funcionalidades

| Característica / Módulo | Subsistema Drones | Mástil Portable Wallie (Sentinel) |
| :--- | :--- | :--- |
| **Plataforma Principal** | App Android (`DroneScreen`) + Dashboard Cloud | SCADA Studio 3D/2D + Landing / API |
| **Conectividad** | Wi-Fi directo con dron (`192.168.1.1`) | Módem 4G/5G + Wi-Fi local |
| **Alimentación** | Baterías LiPo de vuelo | Energía solar + Banco de baterías interno |
| **Salida de Datos** | Streaming RTSP, Fotos Raw, Capas VHI, Coordenadas | Telemetría meteo, Altura mástil, Estado SCADA |
| **Rol en Campo** | Inspección aérea de cobertura y salud foliar | Estación base portable de energía, datos y comunicaciones |
| **Estado de Código** | Funcional (Android, Backend Node.js, VHI, Dashboard) | Prototipo comercial / Gemelo digital en SCADA |

---

## 🛠️ 5. Estado de Desarrollo y Plan Futuro

### Subsistema Drones
* **Implementado y Operativo:**
  * Enlace Wi-Fi, handshake UDP, heartbeat y stream LibVLC en Android.
  * Captura de fotogramas, almacenamiento local y sincronización Cloud.
  * Backend PostgreSQL para imágenes y zonas poligonales.
  * Visor GIS en Dashboard web con cálculo VHI (Vegetation Health Index).
* **En Hoja de Ruta:**
  * Soporte para cámaras multiespectrales puras (NDVI espectral directo).
  * Generación automática de ortomosaicos 3D en servidor.
  * Integración con DJI FlightHub 2 OpenAPI.

### Mástil Portable Wallie (Sentinel)
* **Implementado:**
  * Modelo comercial y especificación de producto.
  * Gemelo digital 3D/2D integrado en módulos SCADA.
  * Gestión de permisos y suscripciones *Enterprise Sentinel*.
* **En Hoja de Ruta:**
  * Desarrollo del firmware de control electromecánico para extensión/plegado remoto del mástil.
  * Integración de estación de recarga automática para drones sobre el mástil.

---
*Documento generado automáticamente para la especificación exclusiva de Drones y Mástil Wallie en INSECE PRO.*
