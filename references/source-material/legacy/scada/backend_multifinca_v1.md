# Backend SCADA multífinca v1

**Estado:** implementación local, no desplegada  
**Primera instalación:** Campillo El Negro  
**Backend objetivo:** `scada-api.insece.pro`  
**Frontends previstos:** `scada.insece.pro` y `scada-studio.insece.pro`  
**Fuera de alcance actual:** migración de `app.insece.pro` y ejecución física de órdenes

## 1. Objetivo

El backend v1 desacopla las vistas SCADA de las redes industriales. El navegador no conoce la IP del PLC, no abre conexiones Modbus y no guarda credenciales de campo. Los gateways leen los equipos, normalizan las variables y transmiten telemetría firmada al API central.

```text
PLC / sensores / inversores
            │ protocolos industriales
            ▼
Gateway local o remoto de la finca
            │ HTTPS + HMAC + nonce
            ▼
SCADA Platform (`scada-api.insece.pro`)
   ├── PostgreSQL
   ├── histórico y último valor
   ├── heartbeat
   ├── alarmas (fase posterior)
   ├── cola persistente de órdenes
   └── WebSocket por instalación
            │
            ▼
scada.insece.pro
```

## 2. Principios de seguridad

1. Abrir el visor nunca genera una orden.
2. Campillo arranca siempre en `read_only`.
3. El runtime v1 solo admite funciones Modbus FC01, FC02, FC03 y FC04.
4. FC05, FC06, FC15 y FC16 quedan bloqueadas antes de abrir el socket.
5. Cada gateway tiene un secreto independiente, suministrado por variable de entorno.
6. El secreto no se guarda en Git ni se devuelve por la API.
7. Toda petición del gateway incluye timestamp, nonce y firma HMAC-SHA256.
8. Los nonces quedan registrados y no pueden reutilizarse.
9. Una orden requiere JWT, motivo, confirmación literal y una acción semántica permitida.
10. Un gateway `read_only` nunca recibe órdenes de la cola.

## 3. Compatibilidad con el prototipo

Se conservan los conceptos válidos del prototipo de `app.insece.pro`:

```text
Instalación → Dispositivo → Template → Tag → Binding → Pantalla
```

Se añaden dos niveles necesarios para operar múltiples fincas:

```text
Instalación → Gateway → Fuente de datos → Dispositivo → Tags
```

- **Gateway:** proceso autorizado que comunica una finca con INSECE.
- **Fuente:** conexión concreta, por ejemplo un PLC Modbus TCP.
- **Dispositivo:** representación funcional del PLC, inversor o sensor.
- **Template:** mapa reutilizable de variables y escalas.
- **Tag:** último valor normalizado.
- **Binding:** relación entre un tag y un widget de una vista.

## 4. Componentes implementados

| Componente | Ruta | Responsabilidad |
|---|---|---|
| Servicio | `backend_cloud/server/scada-platform/server.js` | Proceso HTTP y WebSocket independiente |
| API v1 | `backend_cloud/server/scada-platform/routes/v1.js` | Telemetría, heartbeat y snapshots |
| Seguridad | `backend_cloud/server/scada-platform/security/gateway-signature.js` | Canonicalización y HMAC |
| Runtime | `backend_cloud/server/scada-platform/gateways/scada_gateway_v1.py` | Polling industrial read-only |
| Campillo | `backend_cloud/server/scada-platform/gateways/config/campillo-el-negro.json` | Mapa declarativo inicial |
| Migración | `backend_cloud/server/scada-platform/migrations/001_initial.sql` | Esquema PostgreSQL exclusivo |

La API no se monta en `api.insece.pro`. Es un proceso separado, exige `SCADA_DATABASE_URL` propia y no modifica `app.insece.pro`.

La telemetría v1 se publica únicamente en la sala `installation:<installation_id>`. Los clientes se suscriben con el evento `subscribe:installation`; la emisión global antigua no se utiliza para datos v1.

## 5. Modelo de datos

Las tablas se crean con una migración explícita. El proceso nunca ejecuta migraciones al arrancar.

- `scada_gateways`: identidad, instalación, modo, capacidades y estado.
- `scada_data_sources`: conexiones industriales asociadas al gateway.
- `scada_gateway_nonces`: protección contra replay.
- `scada_gateway_heartbeats`: histórico de salud del enlace.
- `scada_telemetry_readings`: histórico físico normalizado por instalación, gateway y dispositivo.
- `scada_commands`: cola persistente de acciones semánticas.
- `scada_command_events`: auditoría de transiciones.

La base SCADA aislada incluye sus propias tablas para:

- `scada_installations`.
- `scada_devices`.
- `scada_tags`.
- `scada_device_templates`.
- `scada_projects`.
- `scada_project_revisions`.
- `scada_project_releases`.

## 6. Firma de peticiones

Headers requeridos:

```http
X-SCADA-Timestamp: 1784707200000
X-SCADA-Nonce: <valor aleatorio de al menos 16 caracteres>
X-SCADA-Signature: <hex HMAC-SHA256>
```

Texto firmado:

```text
timestamp + "." + nonce + "." + canonical_json(body)
```

`canonical_json` ordena recursivamente las claves. La ventana temporal aceptada es de cinco minutos. Un nonce repetido devuelve `409`.

Los secretos se proporcionan al API mediante un único objeto JSON:

```bash
SCADA_GATEWAY_SECRETS='{"campillo-main":"<secreto-generado-fuera-de-git>"}'
```

Y al gateway mediante la variable indicada en su configuración:

```bash
CAMPILLO_SCADA_GATEWAY_SECRET='<mismo-secreto>'
```

## 7. Contrato API

### 7.1 Telemetría

```http
POST /api/v1/gateways/:gatewayId/telemetry
```

```json
{
  "installationId": "campillo-el-negro",
  "deviceKey": "campillo-plc-schneider",
  "sourceTimestamp": "2026-07-22T08:00:00Z",
  "readings": [
    { "variable": "pwrReal", "value": 125.4, "unit": "kW", "quality": "good" }
  ]
}
```

Reglas:

- Máximo 1000 lecturas por lote.
- Solo números finitos.
- `quality`: `good`, `uncertain` o `bad`.
- La instalación debe coincidir con la asignada al gateway.
- El dispositivo debe existir previamente.
- Tags e histórico se guardan dentro de una transacción.

### 7.2 Heartbeat

```http
POST /api/v1/gateways/:gatewayId/heartbeat
```

```json
{
  "plcReachable": true,
  "latencyMs": 84,
  "version": "1.0.0",
  "capabilities": { "telemetry": true, "commands": false, "mode": "read_only" },
  "details": { "readings": 28, "failures": [] }
}
```

### 7.3 Snapshot público

```http
GET /api/v1/public/installations/:installationId/snapshot
```

Devuelve instalación, gateways y tags únicamente cuando `config.public_read_access` es exactamente `true`. En cualquier otro caso devuelve `403`.

### 7.4 Gestión autenticada

```http
GET /api/v1/installations/:installationId/devices
```

Respeta el contexto multitenant existente.

### 7.5 Solicitud de orden

```http
POST /api/v1/installations/:installationId/commands
Authorization: Bearer <JWT>
```

```json
{
  "gatewayId": "campillo-main",
  "action": "stop_pump",
  "parameters": { "pumpId": "bomba-2" },
  "reason": "Parada operativa confirmada por responsable",
  "confirmation": "CONFIRM",
  "ttlSeconds": 60
}
```

Las órdenes están deshabilitadas globalmente en esta fase. Además, Campillo permanece en `read_only`. No se aceptan direcciones Modbus ni function codes desde el frontend.

## 8. Estados de una orden

```text
pending → claimed → executed → verified
                    └────────→ failed
pending → expired | cancelled
```

- `pending`: almacenada en el backend.
- `claimed`: recogida por un gateway autorizado.
- `executed`: el gateway informa de ejecución.
- `verified`: el gateway leyó de nuevo el estado y confirmó el resultado.
- `failed`: fallo de validación, comunicación o verificación.
- `expired`: superó el TTL sin ejecutarse.

La creación de órdenes exige JWT, rol `admin`, propiedad de la instalación, confirmación literal y un gateway en `telemetry_and_control`.

## 9. Estado específico de Campillo

La configuración inicial traduce el mapa de registros existente a JSON declarativo. Mantiene exclusivamente FC03 y las escalas actuales.

Todavía no debe reemplazar al gateway productivo. La migración correcta es:

1. Registrar gateway, fuente y dispositivo en un entorno controlado.
2. Configurar secretos fuera de Git.
3. Ejecutar el runtime nuevo sin publicar al frontend o contra una instalación de comparación.
4. Comparar valores con el gateway antiguo.
5. Comprobar timestamps, escalas, unidades y frescura.
6. Cambiar el frontend al snapshot v1.
7. Mantener `mode=read_only` hasta una autorización separada para control.

## 10. Pendientes antes de producción

- Seed/migración controlada de Campillo, mostrando previamente el SQL.
- Provisionar una base PostgreSQL exclusiva para SCADA.
- Integrar el emisor de identidad mediante JWT RS256 y clave pública.
- Expirador periódico de comandos.
- Validación JSON Schema de parámetros por acción.
- Autorización RBAC específica para operadores de control.
- Rotación de secretos.
- Retención/limpieza de nonces y heartbeats.
- Inserción masiva optimizada para grandes lotes.
- Comparación paralela con el gateway actual.
- Revisión de ciberseguridad OT antes de habilitar órdenes.

## 11. Rollback

La implementación está aislada en `backend_cloud/server/scada-platform/`. Para rollback local:

1. Detener únicamente el proceso SCADA Platform.
2. Mantener intactos `insece-api`, `insece-cloud` y el gateway Campillo anterior.
3. Conservar la base separada para auditoría o eliminarla únicamente con aprobación explícita.

No se debe borrar información de producción como parte de un rollback ordinario.
