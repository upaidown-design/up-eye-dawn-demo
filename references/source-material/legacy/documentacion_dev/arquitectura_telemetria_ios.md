# Arquitectura de Telemetría e Captura de Sonda en iOS

La aplicación iOS de INSECE está diseñada para capturar, procesar y comparar lecturas de sensores agronómicos multi-profundidad (Humedad, Temperatura, Conductividad, pH, Nitrógeno, Fósforo y Potasio).

A diferencia de la app de Android, que permite la conexión directa por USB OTG cableado (mediante un chip de conversión serie integrado), los dispositivos Apple (iPhones/iPads) tienen restricciones estrictas a nivel de hardware y APIs. Por ello, iOS resuelve este problema implementando tres vías de telemetría diferenciadas.

---

## 📱 1. Vías de Telemetría Soportadas en iOS

### A. Modo BLE (Bluetooth Low Energy)
*   **Clase principal:** [BLESerialService.swift](file:///Users/chris/Desktop/insece/insece_ios/Data/BLESerialService.swift)
*   **Lógica:** Conecta de forma inalámbrica con un puente físico basado en ESP32 configurado en campo junto a la sonda. Escucha las características de lectura/escritura BLE e interpreta el flujo de datos Modbus RTU que la sonda emite.

### B. Modo Mac Bridge (Wi-Fi Local)
*   **Clase principal:** [SerialService.swift (Sección de Red / API Bridge)](file:///Users/chris/Desktop/insece/insece_ios/Data/SerialService.swift#L373-L431)
*   **Lógica:** Durante pruebas de laboratorio o demostraciones, un script Python corriendo en una Mac puentea el puerto serie USB físico y expone un endpoint HTTP JSON en la red local. La app de iOS consulta este endpoint cada 1.0 segundos (`pollBridgeData()`) para renderizar los valores reales de la sonda física.

### C. Modo Stealth USB Demo (Simulación Táctica Integrada)
*   **Lógica:** Permite realizar una simulación real de datos en vivo sin tener ninguna sonda física cerca. Se activa por defecto en el simulador de Xcode o cuando no hay ningún otro canal de telemetría conectado.

---

## 🤫 2. Funcionamiento Detallado del "Stealth USB Demo Mode"

Este modo simula una sonda física conectada mediante gestos ocultos en la pantalla para demostraciones comerciales.

### ¿Dónde se define la interfaz táctil?
En [DashboardView.swift](file:///Users/chris/Desktop/insece/insece_ios/Views/DashboardView.swift#L200-L208):
Cada tarjeta de métrica en la rejilla principal captura gestos táctiles. Pulsar cualquiera de ellas activa el disparador oculto en el servicio:
```swift
InseceMetricCard(metric: metric)
    .contentShape(Rectangle())
    .onTapGesture {
        serialService.toggleUSBTouch() // Alterna el estado del demo
    }
```

### ¿Cómo se procesan los datos en el servicio?
En [SerialService.swift](file:///Users/chris/Desktop/insece/insece_ios/Data/SerialService.swift#L637-L736):
1.  **`toggleUSBTouch()`**: Alterna la bandera `usbTouchActive`.
2.  **`startUSBMockTimer()`**: Es un bucle recursivo con un intervalo de **0.1 segundos** (10 Hz) que interpola valores reales de forma progresiva.
    *   **Estado Activo (Touch Activo):** Se define un objetivo realista de suelo húmedo (Humedad: **38.0%**, Temperatura: **25.1°C**, Conductividad: **517**, pH: **6.3**, N: **25**, P: **17**, K: **34**).
    *   **Estado Inactivo (Touch Inactivo):** El objetivo vuelve a ser el aire libre (Humedad: **0.0%**, Conductividad: **0**, etc.).
3.  **Interpolación Progresiva:** Para evitar que los números cambien de golpe, el temporizador aplica una aproximación progresiva hacia el objetivo:
    ```swift
    let diff = targets[i] - self.interpolatedValues[i]
    self.interpolatedValues[i] += diff * 0.15
    ```
4.  **Micro-fluctuaciones Orgánicas:** Cuando los valores están cerca del objetivo, se añade un pequeño componente aleatorio decimal (ej. `Double.random(in: -0.3...0.3)`) para que los números vibren sutilmente imitando la lectura analógica de un sensor real.
5.  **Simulación Modbus RTU (`generateMockHexPacket`):** El temporizador genera tramas binarias Modbus válidas a partir de los valores redondeados y las traduce a formato hexadecimal. Esto permite rellenar la consola inferior de diagnóstico con tramas reales para que el operario pueda verificar el flujo binario (ej. `01 03 0E ... AA BB`).
6.  **Persistencia controlada:** Durante el muestreo activo, se graba una lectura real en la base de datos Core Data local cada 2.0 segundos (20 ticks del temporizador), evitando saturar el almacenamiento local.
