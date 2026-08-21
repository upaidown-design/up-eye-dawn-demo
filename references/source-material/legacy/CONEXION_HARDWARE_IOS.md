# Manual de Conectividad de Hardware y Sonda en iOS vs Android

Este documento detalla la arquitectura de comunicación, las limitaciones físicas de iOS, el análisis del chipset de la sonda y las soluciones técnicas disponibles para el ecosistema AgTech **INSECE PRO**.

---

## 1. Arquitectura de Conectividad por Plataforma

La sonda portátil **INSECE Soil Tester** es un dispositivo de medición de 7 parámetros de suelo (Humedad, Temperatura, Conductividad, pH, Nitrógeno, Fósforo y Potasio) que opera bajo el protocolo industrial **Modbus RTU** sobre una interfaz física **RS485**.

La comunicación varía drásticamente entre sistemas operativos móviles debido a las políticas de seguridad y acceso a hardware de Apple y Google:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SONDA SOIL TESTER                             │
│                     Modbus RTU / RS-485 (9600 8N1)                      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
         [ Conexión Directa USB ]          [ Puente Bluetooth (ESP32) ]
                    │                                 │
         ┌──────────┴──────────┐                      │
         ▼                     ▼                      ▼
  [ Android USB-OTG ]   [ iOS USB-C ]          [ iOS CoreBluetooth ]
         │                     │                      │
   ✅ FUNCIONA           ❌ BLOQUEADO           ✅ FUNCIONA
  (Acceso directo       (Restricción Apple     (Protocolo inalámbrico
   User-Space driver)    MFi / Sin drivers)     GATT / BLE Bridge)
```

### 1.1. Android (Acceso Abierto USB-OTG)
En Android, el sistema permite que las aplicaciones soliciten permisos para interactuar directamente con dispositivos conectados por USB en modo Host/OTG. La app utiliza el driver de espacio de usuario `usb-serial-for-android` (basado en `hoho`), que implementa de forma nativa los comandos para inicializar chips USB-Serie comunes (como CH340 o CP2102) y transmitir flujos serie directamente.

### 1.2. iOS / iPhone (Restricción por Entornos Seguros)
A pesar de la inclusión del puerto USB-C en los modelos de iPhone 15 en adelante, **iOS no permite la comunicación serie directa con chips no certificados**. 
*   **MFi (Made for iPhone):** Apple exige que cualquier dispositivo USB que transmita datos a un iPhone pase por su programa de certificación de hardware, integrando un coprocesador físico de cifrado/autenticación en el cable.
*   **Ausencia de Virtual COM Ports:** iOS carece de archivos de dispositivo serie de tipo `/dev/cu.usbserial` de acceso público.
*   **Bloqueo de APIs de bajo nivel:** Aunque el framework `IOUSBHost` existe en el SDK de iOS, su uso para tomar el control de endpoints USB requiere de entitlements privados (`com.apple.developer.driverkit.transport.usb`) que Apple solo otorga a partners de hardware autorizados.

---

## 2. Diagnóstico del Chipset de la Sonda

Tras realizar un escaneo de hardware de la sonda física conectada a un entorno macOS de desarrollo, se obtuvieron los siguientes metadatos del bus USB:

*   **Identificador de Fabricante (Vendor ID - VID):** `6790` (equivalente a `0x1A86` en hexadecimal), que corresponde a **WCH (Nanjing Qinheng Microelectronics)**.
*   **Identificador de Producto (Product ID - PID):** `29987` (equivalente a `0x7523` en hexadecimal), que identifica al chipset **CH340 USB-to-Serial Bridge**.
*   **Clase de Dispositivo (bDeviceClass):** `255` (Clase específica de fabricante).
*   **Protocolo de Comunicación:** Modbus RTU serial a una velocidad de **9600 baudios, 8 bits de datos, sin paridad y 1 bit de parada (9600 8N1)**.

### Prueba de Lectura Directa en Mac
La sonda fue testeada exitosamente en macOS conectándola al puerto USB-C nativo (donde el driver del sistema `AppleUSBCHCOM` mapea el puerto en `/dev/cu.usbserial-110`). Al enviarle la trama de consulta estándar Modbus:

`01 03 00 00 00 07 04 08`

La sonda respondió con la siguiente trama de 19 bytes en crudo:

`01 03 0E 00 00 01 30 00 00 00 46 00 00 00 00 00 00 CA 12`

Donde:
*   `01`: Dirección del esclavo.
*   `03`: Función de lectura.
*   `0E`: Recuento de bytes de datos (14 bytes de telemetría correspondientes a los 7 registros).
*   `00 00`: Humedad ($0.0\%$).
*   `01 30`: Temperatura ($30.4^\circ\text{C}$).
*   `00 00`: Conductividad ($0\text{ }\mu\text{S/cm}$).
*   `00 46`: pH ($7.0$).
*   `00 00`, `00 00`, `00 00`: Nitrógeno, Fósforo y Potasio ($0\text{ mg/kg}$).
*   `CA 12`: Bytes del código de redundancia cíclica (CRC).

---

## 3. Soluciones Arquitectónicas para iOS

Debido a que la sonda física utiliza un chip CH340 genérico, la aplicación iOS implementa las siguientes soluciones alternativas de conexión:

### Solución A: Puente de Comunicación Bluetooth (ESP32 BLE Bridge)
Es la solución de campo predeterminada. La sonda USB se enchufa a un dispositivo portátil intermedio (Puente BLE) equipado con un microcontrolador ESP32 y batería.

*   **Funcionamiento:** El ESP32 alimenta la sonda y le consulta los datos Modbus cada 2 segundos por hardware serie (RS485). A continuación, el ESP32 transmite el resultado vía notificaciones Bluetooth Low Energy (BLE) utilizando el servicio UART de Nordic (`6e400001-b5a3-f393-e0a9-e50e24dcca9e`).
*   **Cambios implementados en la App iOS v1.3.1:**
    1.  **Corrección de Inicialización:** Se corrigió el orden de carga en `SerialService.swift` para que los callbacks de recepción de datos y la llamada a `autoConnect()` de BLE se ejecuten correctamente al abrir la aplicación en un iPhone real.
    2.  **Buffer de Acumulación de Datos:** Para evitar errores por fragmentación del paquete debido a la MTU de BLE, `BLESerialService.swift` ahora cuenta con un buffer binario (`bleRxBuffer`) que concatena los bytes entrantes hasta formar un paquete JSON completo.
    3.  **Detección Automática de Trama Binaria:** Si el firmware del ESP32 está configurado para retransmitir la trama Modbus binaria pura en lugar de JSON, la app la detecta y procesa directamente a partir de sus bytes de cabecera (`0x01` o `0xFE`).

### Solución B: Pasarela de Red Local (Mac Bridge)
Diseñado para la toma de datos estática u oficina.
*   **Funcionamiento:** La sonda se conecta al puerto USB del Mac. En el ordenador se ejecuta el script en Python (`insece_bridge.py`), el cual lee los datos en bucle desde el puerto serie y expone un servidor HTTP local en el puerto `8080`.
*   **Lógica de la App:** La app de iOS consulta mediante `HTTP GET` cada 2 segundos a la dirección IP del ordenador Mac para obtener el estado y las lecturas sincronizadas.

### Solución C: Conectores Especiales con Licencia MFi (Futura línea cableada)
Si se desea eliminar la necesidad del puente Bluetooth para iPhones, se debe rediseñar la conexión cableada directa mediante hardware certificado:
1.  **Cable MFi Redpark:** Comprar cables convertidores MFi de USB-C a Serie de la marca *Redpark*.
2.  **Integración del SDK:** Modificar la aplicación iOS para integrar el SDK de Redpark (`ExternalAccessory.framework`) a fin de abrir y cerrar sesiones de lectura serie por hardware.
3.  **Coprocesador Apple:** Si se produce hardware propio en serie, se debe integrar el chip de autenticación criptográfica de Apple en la propia placa del sensor.

---

## 4. Resumen de Archivos de Conectividad en iOS

Los siguientes archivos del directorio `insece_ios/Data/` controlan el ciclo de vida y parsing de los datos de sonda:

1.  **[SerialService.swift](file:///Users/chris/Desktop/insece/insece_ios/Data/SerialService.swift):** Orquestador central. Gestiona el estado de muestreo (`isConnected`), administra la selección de zonas y delega la escucha en el modo activo (Simulación, Mac Bridge o BLE).
2.  **[BLESerialService.swift](file:///Users/chris/Desktop/insece/insece_ios/Data/BLESerialService.swift):** Maneja la conexión con el adaptador Bluetooth `INSECE-SONDA`, acumula las tramas entrantes en el buffer `bleRxBuffer` y parsea los resultados.
3.  **[ModbusProcessor.swift](file:///Users/chris/Desktop/insece/insece_ios/Data/ModbusProcessor.swift):** Contiene la lógica para extraer valores Big Endian de tramas hexadecimales Modbus.
