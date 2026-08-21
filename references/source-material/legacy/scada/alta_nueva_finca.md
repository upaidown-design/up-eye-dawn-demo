# Alta de una nueva finca en SCADA v1

Este procedimiento describe el onboarding sin incluir credenciales reales.

## 1. Información necesaria

- Identificador estable de la finca.
- Nombre y propietario.
- Ubicación general.
- Gateway que tendrá acceso a la red industrial.
- Fuentes y protocolos.
- Inventario de dispositivos.
- Mapa de variables o registros.
- Escalas, unidades y tipos.
- Frecuencia de polling.
- Política de acceso público al visor.
- Acciones de control previstas, aunque inicialmente quedarán deshabilitadas.

## 2. Identificadores

Usar slugs estables:

```text
installation_id: campillo-el-negro
gateway_id:      campillo-main
source_id:       schneider-main
device_key:      campillo-plc-schneider
```

No utilizar IP, DDNS, email o nombre comercial mutable como clave primaria.

## 3. Configuración del gateway

Crear un JSON en `backend_cloud/server/scada-platform/gateways/config/` usando Campillo como referencia. Los secretos y hosts se indican mediante nombres de variables de entorno:

```json
{
  "installationId": "nueva-finca",
  "gatewayId": "nueva-finca-main",
  "mode": "read_only",
  "secretEnv": "NUEVA_FINCA_GATEWAY_SECRET",
  "sources": [
    {
      "id": "plc-main",
      "deviceKey": "nueva-finca-plc",
      "protocol": "modbus_tcp",
      "hostEnv": "NUEVA_FINCA_PLC_HOST",
      "portEnv": "NUEVA_FINCA_PLC_PORT",
      "blocks": []
    }
  ]
}
```

## 4. Alta en base de datos

La creación de instalación, gateway, fuente, dispositivo y template es una mutación productiva. Antes de ejecutarla se debe:

1. Preparar el SQL exacto.
2. Mostrarlo al usuario.
3. Obtener aprobación explícita.
4. Crear backup.
5. Ejecutar dentro de una transacción.
6. Verificar después.

No utilizar valores seed como verdad productiva.

## 5. Validación sin hardware

- Validar JSON.
- Validar que todos los bloques usan funciones de lectura.
- Validar solapamientos y rangos.
- Probar canonicalización HMAC.
- Probar payloads contra un API local simulado.
- Confirmar que `mode` es `read_only`.

## 6. Validación con hardware

La conexión inicial debe limitarse a lecturas y realizarse en una ventana acordada:

1. Probar acceso TCP.
2. Leer un bloque pequeño conocido.
3. Compararlo con la herramienta oficial del PLC.
4. Aumentar gradualmente los bloques.
5. Confirmar que la frecuencia no sobrecarga el equipo o enlace.
6. Ejecutar en paralelo sin sustituir la captación existente.

## 7. Construcción de vistas

Una vista no debe conocer registros Modbus. Solo utiliza tag paths normalizados:

```text
nueva-finca.nueva-finca-plc.pressure
nueva-finca.nueva-finca-plc.pump_status
```

Los bindings relacionan esos paths con propiedades de widgets. De esta forma se puede cambiar el PLC o mapa de registros sin reconstruir el frontend.

## 8. Activación de control

La activación de órdenes es una fase independiente. Requiere:

- Evaluación de riesgos por acción.
- Mapa cerrado de acciones semánticas.
- Registros autorizados.
- Rangos y precondiciones.
- Confirmación y roles.
- TTL.
- Lectura posterior de verificación.
- Prueba en entorno controlado.
- Autorización expresa para esa finca.

Nunca se debe cambiar `mode` a `telemetry_and_control` solamente para probar la interfaz.
