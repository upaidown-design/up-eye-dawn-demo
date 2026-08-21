# INSECE PRO — Estado del Proyecto

> **Última actualización:** 31 Mayo 2026, 17:43 CEST  
> **Versión SCADA:** v16

---

## 1. Arquitectura del Ecosistema

INSECE PRO es una plataforma AgTech/Industrial con múltiples componentes:

### Producción
```
insece.pro          → Landing pública (Puerto 3034)
app.insece.pro      → Dashboard/App web (Puerto 3033)
api.insece.pro      → API REST + WebSocket (Puerto 3032)
doc.insece.pro      → Wiki/Documentación Docsify (Puerto 3037)
PostgreSQL          → Docker insece_db_pro (Puerto 5444)
Nginx Proxy Manager → Enrutamiento SSL (Puerto 80/443)
```

### Desarrollo
```
dev.insece.pro      → Dashboard dev (Puerto 3035)
api-dev.insece.pro  → API dev (Puerto 3036)
PostgreSQL          → Docker insece_db_dev (Puerto 5445)
```

### Servicios PM2
| PM2 ID | Nombre | Puerto | Dominio |
|--------|--------|--------|---------|
| 2 | `insece-api` | 3032 | api.insece.pro |
| 3 | `insece-cloud` | 3033 | app.insece.pro |
| 4 | `insece-landing` | 3034 | insece.pro |
| 5 | `insece-cloud-dev` | 3035 | dev.insece.pro |
| 6 | `insece-api-dev` | 3036 | api-dev.insece.pro |
| 9 | `insece-docs` | 3037 | doc.insece.pro |

### Puertos UFW Abiertos (INSECE)
`3032, 3033, 3034, 3035, 3036, 3037`

**VPS:** 217.154.191.3 | **Usuario:** root | **Gestión:** PM2 | **DB:** PostgreSQL (Docker)

---

## 2. Componentes del Ecosistema

| Componente | Ruta | Estado |
|------------|------|--------|
| **App Android** | `app/` | ✅ Producción (USB Serial Reader, BLE, GPS, Sync) |
| **App iOS** | `insece_ios/` | 🔧 Prototipo (SwiftUI, sin cloud sync) |
| **Dashboard Web** | `backend_cloud/dashboard/public/` | ✅ Producción |
| **API Backend** | `backend_cloud/server/` | ✅ Producción (Express.js modular) |
| **Landing** | `backend_cloud/landing/` | ✅ Producción |
| **ESP32 BLE Bridge** | `esp32_ble_bridge/` | ✅ Firmware |

---

## 3. Módulos del Dashboard (SPA: `app.html`)

> **IMPORTANTE:** El dashboard real es `app.html` (SPA con hash routing), NO `dashboard.html` (legacy).
> URL de producción: `https://app.insece.pro/app.html#/admin-dash`

| Módulo | Archivo JS | Vista HTML | Estado |
|--------|-----------|------------|--------|
| Dashboard Admin | `modules/admin.js` | `views/admin-dash.html` | ✅ |
| Dashboard Cliente | `modules/client-dash.js` | `views/client-dash.html` | ✅ |
| Telemetría | `modules/telemetry.js` | `views/telemetry.html` | ✅ |
| Telemetría Admin | `modules/admin-telemetry.js` | `views/admin-telemetry.html` | ✅ |
| Gestión Clientes | `modules/users.js` | `views/users.html` | ✅ |
| **Centro SCADA** | `modules/scadas.js` | `views/scadas.html` | ✅ v16 |
| Centro de Drones | `modules/drones-hub.js` | `views/drones-hub.html` | 🔧 |
| Suscripciones | `modules/subscriptions.js` | `views/subscriptions.html` | ✅ |
| Marketing & Push | `modules/marketing.js` | `views/marketing.html` | ✅ |
| Notificaciones Push | `modules/notifications.js` | `views/notifications.html` | ✅ |
| Plantillas Email | `modules/templates.js` | `views/templates.html` | ✅ |
| Mapas de Calor | `modules/heatmaps.js` | `views/heatmaps.html` | 🔧 |
| API Health | `modules/api-health.js` | `views/api-health.html` | ✅ |
| **Lanzamientos & Métricas** | `modules/releases.js` | `views/releases.html` | ✅ |
| **Wiki Ingeniería** | `modules/wiki.js` | `views/wiki.html` | ✅ |
| Trabajadores | `modules/workers.js` | `views/worker-manager.html` | ✅ |
| Papelera | `modules/trash.js` | `views/trash.html` | ✅ |

---

## 4. SCADA Industrial — Resumen v16

Documentación detallada en [`docs/scada/README.md`](./scada/README.md).

### Funcionalidades Implementadas
- Gestión de instalaciones SCADA (solar, agro, agua, eólica, industrial)
- Editor visual con 9 tipos de widgets industriales
- Device Manager con pantalla completa de gestión
- Pantalla dedicada de configuración de devices (conexión, test, tags)
- Templates de dispositivos (Circutor, Panasonic, Huawei, ESP32, Meteo)
- Sistema de tags con binding a widgets
- Push API para recibir datos de dispositivos en campo
- WebSocket bus para datos en tiempo real
- Historian replay (slider temporal 24h)
- TV Wall mode
- Snap-to-grid, capas, duplicar/eliminar widgets

### Dispositivos de Prueba
- Circutor CVM-C10 (Cuadro Principal) — Modbus TCP
- PLC Panasonic FP7 #1 — Modbus TCP

---

## 5. API — Rutas Principales

### Autenticación
```
POST /api/auth/login | register | forgot-password | reset-password
GET  /api/auth/users (admin)
```

### Lecturas de Sonda
```
GET/POST /api/readings | /api/sites | /api/zones | /api/sync
```

### SCADA (ver docs/scada/README.md para detalle completo)
```
/api/scada/installations | /screens | /devices | /tags | /templates | /bindings
/api/scada/connector/push | /connector/test-connection
WebSocket: /ws/scada
```

---

## 6. Repositorio

- **Local:** `/Users/chris/Desktop/insece`
- **GitHub:** `https://github.com/christian-eduard/insece.git`
- **Branch:** `master`

### Estructura
```
insece/
├── app/                          # Android (Kotlin)
├── insece_ios/                   # iOS (SwiftUI)
├── backend_cloud/
│   ├── server/                   # API (Express.js modular)
│   │   ├── server.js             # Entry point
│   │   └── routes/scada.js       # Rutas SCADA completas
│   ├── dashboard/public/         # Dashboard web
│   │   ├── app.html              # SPA principal
│   │   ├── js/modules/scadas.js  # Módulo SCADA (~2400 líneas)
│   │   └── views/scadas.html     # HTML/CSS del SCADA
│   └── landing/                  # Landing pública
├── docs/
│   ├── scada/README.md           # ★ Documentación SCADA completa
│   ├── SERVIDOR_PRODUCCION.md    # Guía del servidor
│   └── INSECE_PRO_WEB_PRODUCT_BRIEF.md
├── informes/                     # Informes técnicos
├── esp32_ble_bridge/             # Firmware ESP32
└── AGENTS.md                     # Reglas para agentes IA
```

---

## 7. Comandos Útiles

```bash
# Servidor
pm2 list | pm2 restart insece-api | pm2 logs insece-api

# Validación
node -c backend_cloud/dashboard/public/js/modules/scadas.js

# Android
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew installDebug

# Deploy SCADA
scp dashboard/public/js/modules/scadas.js root@217.154.191.3:/var/www/insece-cloud/public/js/modules/
scp dashboard/public/views/scadas.html root@217.154.191.3:/var/www/insece-cloud/public/views/
scp server/routes/scada.js root@217.154.191.3:/var/www/insece-api/routes/
ssh root@217.154.191.3 "pm2 restart insece-api"
```

## 🔑 INTEGRACIÓN DE CREDENCIALES (2026-05-31)
La integración de credenciales para la automatización de lanzamientos (releases) ha sido implementada y documentada en [CREDENTIALS_INTEGRATION.md](file:///Users/chris/Desktop/insece/docs/CREDENTIALS_INTEGRATION.md).

### 1. Apple App Store Connect (iOS API)
- **Estado:** ✅ ACTIVO en producción (`insece-api`). El Key ID real `C22X7JS8DR` y la clave privada están inyectados correctamente. Se detectó con éxito la App `6770504327`.
- **Entorno Dev:** 🔧 Pendiente (postpuesto).

### 2. Google Play Developer API (Android API)
- **Estado:** 🟡 Configurado en producción (`GOOGLE_PLAY_SA_JSON` inyectado), pero requiere invitar a la cuenta de servicio `insece-play-publisher@insece-play-upload.iam.gserviceaccount.com` en Google Play Console con permisos para la app `com.insece.usbserialreader`.
- **Entorno Dev:** 🔧 Pendiente (postpuesto).
