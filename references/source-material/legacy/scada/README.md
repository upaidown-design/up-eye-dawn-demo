# INSECE SCADA — Documentación del Sistema Industrial

> Nueva arquitectura multífinca: consulte [Backend SCADA multífinca v1](backend_multifinca_v1.md) y [Alta de una nueva finca](alta_nueva_finca.md). La API v1 está implementada localmente y todavía no sustituye al sistema productivo.

> **Última actualización:** 20 Mayo 2026  
> **Versión:** v16  
> **Autor:** INSECE Engineering Team

---

## 1. Visión General

INSECE SCADA es una plataforma industrial OT (Operational Technology) integrada en el ecosistema INSECE PRO. Permite:

- **Monitorizar instalaciones** (solares, agrícolas, industriales, eólicas, hídricas) en tiempo real
- **Gestionar dispositivos** (PLCs, sensores, gateways, inversores) con conexión Modbus TCP, MQTT, OPC-UA y REST
- **Diseñar vistas SCADA** con un editor visual drag & drop
- **Vincular widgets a tags reales** de autómatas en campo
- **Visualizar datos en tiempo real** vía WebSocket

### Arquitectura

```
┌────────────────────────────────────────────────────┐
│                    NAVEGADOR WEB                    │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐   │
│  │  L1:     │  │  L2:     │  │  L3:           │   │
│  │  Centro  │→ │  SCADA   │→ │  Vista Pantalla│   │
│  │  SCADA   │  │  Detail  │  │  (Canvas)      │   │
│  └──────────┘  └──────────┘  └────────────────┘   │
│       ↓              ↓                             │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐   │
│  │ Gestión  │  │  Editor  │  │  Device Config │   │
│  │ Devices  │  │  Visual  │  │  (Full Page)   │   │
│  └──────────┘  └──────────┘  └────────────────┘   │
└────────────────────┬───────────────────────────────┘
                     │ REST API + WebSocket
┌────────────────────┴───────────────────────────────┐
│              BACKEND (api.insece.pro)               │
│  ┌─────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ /api/scada  │  │ WebSocket│  │  Connector   │  │
│  │  REST API   │  │  /ws/    │  │  /push       │  │
│  └──────┬──────┘  └────┬─────┘  └──────┬───────┘  │
│         └──────────────┼───────────────┘           │
│                   PostgreSQL                        │
│  ┌─────────────────────────────────────────────┐   │
│  │ scada_installations | scada_screens         │   │
│  │ scada_devices       | scada_device_templates│   │
│  │ scada_tags          | scada_bindings        │   │
│  │ scada_tag_history   | scada_alarms          │   │
│  └─────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
  ┌─────────────┐         ┌─────────────┐
  │ PLC Modbus  │         │ ESP32/MQTT  │
  │ (Panasonic  │         │ Sensor IoT  │
  │  FP7, etc.) │         │             │
  └─────────────┘         └─────────────┘
```

---

## 2. Navegación (Niveles)

### Level 1 — Centro SCADA Industrial
La vista principal donde se listan todas las instalaciones SCADA creadas.

**Acciones disponibles:**
- **Crear SCADA**: Wizard para nueva instalación (nombre, tipo, ubicación, descripción)
- **Gestión Devices**: Pantalla completa para registrar, configurar y probar dispositivos
- **Click en tarjeta SCADA**: Navega al Level 2

**Tipos de instalación soportados:** Solar FV, Cultivo/Finca, Gestión de Agua, Eólica, Industrial

### Level 2 — Detalle de Instalación SCADA
Muestra las pantallas (screens) de una instalación específica.

**Acciones disponibles:**
- **Devices**: Abre el Device Manager filtrado por esta instalación
- **TV Wall**: Modo visualización rotativa de pantallas
- **Editor**: Abre el editor visual SCADA
- **Click en pantalla**: Navega al Level 3

**Tipos de pantalla:** Overview, P&ID, Alarmas, Tendencias, SLD, Mapa/GIS, CCTV

### Level 3 — Vista de Pantalla en Tiempo Real
El canvas SCADA real con widgets vinculados a tags de dispositivos.

**Toolbar flotante:**
- **3D**: Toggle vista perspectiva
- **Replay**: Slider temporal 24h con play/pause
- **TV**: Modo rotación automática
- **Fullscreen**: Pantalla completa

---

## 3. Gestión de Dispositivos

### Concepto
Los **devices** son autómatas/PLCs físicos instalados en campo (como un Panasonic FP7, Circutor CVM-C10, Huawei SUN2000) que envían datos al sistema.

### Flujo Operativo

```
1. REGISTRAR
   → Nombre, IP, Puerto, Protocolo, Tipo, Template, Instalación
   → Se genera un device_key único

2. CONFIGURAR (Pantalla dedicada)
   → Editar datos de conexión
   → Test TCP en vivo
   → Aplicar template → crea tags automáticos
   → Añadir tags manualmente
   → Ver Device Key + Push endpoint

3. PROBAR
   → Test de conexión TCP al IP:puerto
   → Verificar que los tags reciben datos
   → Push de prueba vía API

4. USAR EN SCADA
   → En el editor, pestaña "Devices"
   → Click en device → se añade al canvas
   → Vincular widget a tag en panel de propiedades
```

### Device Manager (Pantalla Completa)
Accesible desde L1 ("Gestión Devices") o L2 ("Devices").

**Sección izquierda — Lista de Devices:**
- Todos los devices registrados con status LED, protocolo, template, tag count
- Botones por device: Test, Config, Tags, Eliminar

**Sección derecha — Formulario de Registro:**
- Nombre, Tipo (PLC/Sensor/Gateway/Inversor/Cámara/Genérico)
- Protocolo (REST/Modbus TCP/MQTT/OPC-UA)
- IP, Puerto, Template, Instalación

**Sección inferior — Templates Disponibles:**
- Lista de templates predefinidos con manufacturer, model, registros

### Pantalla de Configuración de Device
Al pulsar "Config" se abre una pantalla dedicada con:

| Sección | Contenido |
|---------|-----------|
| **Conexión** | Nombre, tipo, protocolo, IP, puerto (editables) + Guardar + Test |
| **Integración** | Device Key, Push endpoint con ejemplo JSON |
| **Template** | Si tiene template: nombre, fabricante, modelo, botón "Aplicar Template" |
| **Tags** | Tabla completa: Path, Label, Unidad, Tipo, Valor Actual, Quality |
| **Acciones** | Añadir tag manual, aplicar template, guardar cambios |

---

## 4. Templates de Dispositivos

Los templates definen los registros/variables estándar de un modelo de dispositivo.

### Templates Predefinidos

| Template | Fabricante | Protocolo | Registros |
|----------|-----------|-----------|-----------|
| Circutor CVM-C10 | Circutor | Modbus TCP | voltage, current, power, energy, power_factor |
| ESP32 Sonda | INSECE | MQTT | humidity, temperature, conductivity |
| Cámara IP Generic | Generic | RTSP | stream_url |
| Huawei SUN2000 | Huawei | Modbus TCP | efficiency, daily_yield, active_power |
| Panasonic FP7 | Panasonic | Modbus TCP | t_cpu, pressure, analog_in, output_status, temperature |
| Meteo Station | Generic | REST | temperature, humidity, wind_speed, rain_24h, solar_radiation |

### Aplicar Template
Al pulsar "Aplicar Template" en la configuración de un device:
1. Lee los registros del template asociado
2. Para cada registro, crea un tag con path `{device_key}.{register_name}`
3. El tag hereda el label, unidad y tipo del registro

---

## 5. Tags y Bindings

### Tags
Un **tag** es una variable de proceso individual:

| Campo | Descripción |
|-------|-------------|
| `path` | Identificador único (ej: `plc_bombas_1.pressure`) |
| `device_id` | Device al que pertenece |
| `variable` | Nombre corto de la variable |
| `label` | Etiqueta legible |
| `unit` | Unidad (°C, bar, kW, etc.) |
| `tag_type` | numeric, boolean, state, text, gps, image |
| `quality` | good, bad, uncertain |
| `current_value` | Último valor recibido |

### Bindings
Un **binding** vincula un widget visual con un tag de un device real:

| Campo | Descripción |
|-------|-------------|
| `screen_id` | Pantalla donde está el widget |
| `widget_id` | ID del widget en el canvas |
| `tag_path` | Path del tag vinculado |
| `property` | Propiedad del widget afectada (value, color, visibility) |
| `color_rules` | Reglas de color por umbrales (warning, critical) |

---

## 6. Editor Visual SCADA

### Acceso
Desde L2, botón "Editor" en cada SCADA.

### Layout
```
┌──────────┬────────────────────────────┬──────────────┐
│ PANTALLAS│        CANVAS              │  WIDGETS /   │
│          │     (1920×1080)            │  DEVICES /   │
│ Screen 1 │                            │  PROPERTIES  │
│ Screen 2 │                            │              │
│ Screen 3 │    [widgets en el canvas]  │              │
│          │                            │              │
│ + Nueva  │                            │              │
├──────────┴────────────────────────────┴──────────────┤
│ TOOLBAR: 3D | Snap Grid | Capas | Fondo | etc.      │
└─────────────────────────────────────────────────────┘
```

### Widgets Disponibles
| Widget | Icono | Descripción |
|--------|-------|-------------|
| Gauge | 📊 | Indicador semicircular con valor numérico |
| Bomba | ⚙️ | Icono bomba con animación spin |
| Válvula | 🔧 | Indicador ON/OFF con estado visual |
| Motor | 🔄 | Motor con animación de rotación |
| Tanque | 🛢️ | Nivel de líquido visual |
| Panel Solar | ☀️ | Módulo FV con eficiencia |
| Alarma | 🚨 | Indicador alerta con parpadeo |
| Texto | 📝 | Label de texto libre |
| Línea | ━ | Tuberías y conexiones |

### Interacción con Widgets
- **Click en biblioteca** → Añade widget al canvas (posición auto)
- **Click en widget del canvas** → Selecciona y abre panel de propiedades
- **Drag** → Mover widget por el canvas (con snap-to-grid opcional)
- **Delete / Backspace** → Eliminar widget seleccionado
- **Ctrl/Cmd + D** → Duplicar widget seleccionado

### Panel de Propiedades
Al seleccionar un widget:
- **Nombre**: Editar etiqueta
- **X/Y/Ancho/Alto**: Posición y dimensiones
- **Tag Binding**: Dropdown con todos los tags disponibles
- **Reglas de color**: Umbrales para warning (🟡) y critical (🔴)
- **Duplicar / Eliminar**: Acciones rápidas

### Fondos / Ortofotos
El canvas soporta fondos personalizados:
- Imágenes subidas (planos, P&ID, fotos aéreas)
- Ortofotos predefinidas (solar, agrícola, industrial)
- Color sólido

---

## 7. API REST — Endpoints SCADA

### Instalaciones
```
GET    /api/scada/installations              → Lista instalaciones
POST   /api/scada/installations              → Crear instalación
```

### Pantallas
```
GET    /api/scada/screens?installation_id=X   → Pantallas de una instalación
POST   /api/scada/screens                     → Crear pantalla
PUT    /api/scada/screens/:id                 → Actualizar pantalla
DELETE /api/scada/screens/:id                 → Eliminar pantalla
```

### Dispositivos
```
GET    /api/scada/devices-with-tags           → Lista devices con conteo de tags
GET    /api/scada/devices/:id                 → Device individual con tags y template
POST   /api/scada/devices                     → Registrar device
PUT    /api/scada/devices/:id                 → Actualizar configuración
DELETE /api/scada/devices/:id                 → Eliminar device
```

### Tags
```
GET    /api/scada/tags                        → Lista todos los tags
POST   /api/scada/devices/:id/tags            → Crear tag para un device
POST   /api/scada/devices/:id/apply-template  → Crear tags desde template
```

### Templates
```
GET    /api/scada/templates                   → Lista templates
POST   /api/scada/templates                   → Crear template
```

### Bindings
```
POST   /api/scada/bindings                    → Vincular widget a tag
```

### Conectividad
```
POST   /api/scada/connector/push              → Push de datos desde device
POST   /api/scada/connector/test-connection    → Test TCP a IP:puerto
```

### WebSocket
```
ws://api.insece.pro/ws/scada                  → Bus en tiempo real
  Eventos: tag:update, device:status, alarm:trigger
```

---

## 8. Base de Datos — Esquema

```sql
-- Instalaciones SCADA (una por planta/finca)
scada_installations (
    id, name, type, location, description, owner_id, config, created_at
)

-- Pantallas de cada instalación
scada_screens (
    id, installation_id, name, screen_type, layout_data, background, config
)

-- Dispositivos físicos (PLCs, sensores, gateways)
scada_devices (
    id, installation_id, name, device_key, device_type, protocol,
    ip_address, port, template_id, status, last_seen, config, created_at
)

-- Templates de dispositivos (registros predefinidos)
scada_device_templates (
    id, name, manufacturer, model, protocol, registers, created_at
)

-- Variables de proceso (tags)
scada_tags (
    id, path, device_id, variable, label, unit, tag_type, quality,
    current_value, last_updated, config, created_at
)

-- Vínculos widget-tag
scada_bindings (
    id, screen_id, widget_id, tag_path, property, transform, color_rules
)

-- Histórico de valores
scada_tag_history (
    id, tag_id, value, quality, recorded_at
)

-- Alarmas
scada_alarms (
    id, tag_id, alarm_type, threshold, message, severity, active, created_at
)
```

---

## 9. Integración de Datos — Push API

Los dispositivos en campo envían datos al sistema mediante HTTP POST:

```bash
# Ejemplo: PLC enviando lecturas
curl -X POST https://api.insece.pro/api/scada/connector/push \
  -H "Content-Type: application/json" \
  -d '{
    "device_key": "plc_bombas_nave_3",
    "readings": {
      "pressure": 4.2,
      "temperature": 23.5,
      "flow_rate": 120.8,
      "pump_status": true
    }
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "tags_updated": 4,
  "device_status": "online"
}
```

---

## 10. Archivos del Sistema

### Frontend (Dashboard)
| Archivo | Función |
|---------|---------|
| `dashboard/public/views/scadas.html` | Estructura HTML + CSS del módulo SCADA |
| `dashboard/public/js/modules/scadas.js` | Toda la lógica del módulo (~2400 líneas) |

### Backend (API)
| Archivo | Función |
|---------|---------|
| `server/routes/scada.js` | Todas las rutas SCADA + migraciones DB |

### Funciones JavaScript Principales
| Función | Descripción |
|---------|-------------|
| `renderLevel1()` | Renderiza el Centro SCADA con tarjetas |
| `renderLevel2(scadaId)` | Detalle de instalación con pantallas |
| `renderLevel3(scadaId, screenId)` | Vista en tiempo real del canvas |
| `_openScadaEditor(scadaId)` | Abre el editor visual completo |
| `_openDeviceManagerFull()` | Pantalla completa de gestión de devices |
| `_dmFullConfigDevice(id)` | Pantalla dedicada de configuración de device |
| `_editorAddWidget(type, x, y)` | Añade widget al canvas del editor |
| `_editorLoadRealDevices()` | Carga devices reales en panel del editor |
| `_editorSelectWidget(el)` | Selecciona widget y muestra propiedades |
| `_editorBindTag(tagPath)` | Vincula tag a widget seleccionado |
| `_cfgApplyTemplate(id)` | Aplica template y crea tags |
| `_cfgAddTag(deviceId)` | Modal para añadir tag manualmente |
| `_openHistorianReplay()` | Slider temporal 24h para replay |

---

## 11. Roadmap

### ✅ Implementado (v16)
- [x] CRUD completo de instalaciones SCADA
- [x] Gestión de pantallas con 7 tipos
- [x] Editor visual con 9 tipos de widgets
- [x] Device Manager (pantalla completa)
- [x] Pantalla dedicada de configuración de device
- [x] Templates de dispositivos con registros
- [x] Sistema de tags con path, tipo, quality
- [x] Aplicar template → crear tags automáticos
- [x] Añadir tags manualmente
- [x] Test de conexión TCP
- [x] Push API para recibir datos de campo
- [x] WebSocket bus para tiempo real
- [x] Bindings widget-tag
- [x] Panel de propiedades en editor
- [x] Duplicar/eliminar widgets (teclado + UI)
- [x] Snap-to-grid en editor
- [x] Capas (layers) con z-index
- [x] Ortofotos como fondo de canvas
- [x] Historian replay (slider 24h)
- [x] TV Wall mode
- [x] Panel lateral colapsable en L3
- [x] Barra de estado con WS LED

### 🔧 Próximos pasos
- [ ] Connectors Modbus TCP y MQTT reales (servidor ↔ PLC)
- [ ] OPC-UA connector
- [ ] Canvas Konva/Fabric.js para rendimiento con muchos widgets
- [ ] Widget SDK (widgets personalizados por usuario)
- [ ] Heatmaps (temperatura, humedad)
- [ ] IA Industrial (detección de anomalías)
- [ ] Multiusuario (ver operadores conectados)
- [ ] Notificaciones push (WhatsApp/Telegram)
- [ ] Permisos por pantalla
- [ ] Mobile SCADA simplificado
- [ ] Digital Twin GIS (mapas con ubicación de sensores)
