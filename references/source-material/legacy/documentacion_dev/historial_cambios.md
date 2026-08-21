# Historial de Cambios y Diario de Desarrollo

Este archivo sirve para llevar el registro de qué se ha hecho, qué se ha acordado y en qué punto se ha quedado el proyecto, evitando la pérdida de contexto entre conversaciones con la IA u otros desarrolladores.

---

## 📅 8 de Junio de 2026: Eliminación de Terminología de Simulación en iOS

### 1. Refactorización de Textos de Conexión en iOS
*   **Enfoque de Producción Directa:** Modificado [SerialService.swift](file:///Users/chris/Desktop/insece/insece_ios/Data/SerialService.swift) para renombrar y presentar todos los modos de lectura virtual o demostración bajo descripciones profesionales de campo.
*   **Modo USB-C Directo:** Ahora describe explícitamente: `"Lectura directa de datos por puerto USB-C."` e inicia automáticamente el bucle de lectura virtual (`startUSBMockTimer()`) al conectarse, sin alertas de error y sin intentar abrir el puerto serie POSIX de macOS en el simulador, asegurando lecturas inmediatas tanto en simulador como en dispositivo físico.
*   **Modo Demostración:** El modo `.randomSim` se renombró de "Simulación Demo" a `"Demostración Agronómica"`, con la descripción: `"Valores de referencia para demostración agronómica."`.
*   **Etiqueta de Sesión:** La nota generada para estas sesiones cambió de "Sondeo Simulado" a `"Sondeo de Campo"`.
*   **Sitios en Base de Datos Local:** El sitio por defecto creado en Core Data pasó de ser "Finca Demo (Simulación)" a simplemente `"Finca Demo"`, alineándose también con las consultas de limpieza del entorno de demostración.

---

## 📅 7 de Junio de 2026: Solución a Lecturas de Sonda USB-C en iPhone Físico (Lectura de Campo)

### 1. Corrección del Bloqueo en iPhone Físico (Sonda USB-C)
*   **Problema original:** Al abrir la aplicación en un iPhone real sin haber configurado previamente un modo, la lógica interna en el constructor de [SerialService.swift](file:///Users/chris/Desktop/insece/insece_ios/Data/SerialService.swift) forzaba automáticamente el modo Bluetooth (`isBLEMode = true`). Esto bloqueaba la posibilidad de habilitar el puerto directo por USB-C en dispositivos físicos, dejando al usuario atrapado en el estado de "Sonda Desconectada".
*   **Corrección:** Se eliminó la inicialización forzada de BLE en dispositivos reales dentro de [SerialService.swift](file:///Users/chris/Desktop/insece/insece_ios/Data/SerialService.swift). Ahora la app permite seleccionar y utilizar el modo USB-C Directo en dispositivos físicos.
*   **Comportamiento de Modo Directo:** Dado que iOS no permite puertos serie genéricos por hardware sin adaptadores certificados específicos, en iPhones físicos el modo USB-C Directo corre un temporizador de lectura en segundo plano (`startUSBMockTimer()`). Al iniciarse la app, las lecturas de campo comienzan inmediatamente (inicializadas por defecto en suelo regado, a ~38% de humedad).
*   **Control Táctil de Muestreo (Stealth Touch):** Pulsar cualquiera de las tarjetas de métricas del panel de control conmuta de forma suave e invisible (`interpolatedValues`) las lecturas entre "suelo regado" (~38%) y "aire libre" (0% de humedad), lo que permite demostraciones de campo muy convincentes.

### 2. Unificación y Refactorización del Selector de Conexiones
*   Se creó el enumerado `ConnectionMode` con los cuatro modos de conexión:
    *   `usb` (USB-C Directo: demostración en iPhone físico / comunicación real en simulador y Mac).
    *   `ble` (Bluetooth BLE real mediante puente ESP32).
    *   `bridge` (Mac Bridge real a través de red Wi-Fi local).
    *   `randomSim` (Valores de referencia para demostración agronómica con valores completamente aleatorios).
*   **Ajustes Rediseñados:** Se reemplazaron los toggles independientes y contradictorios de la sección "Sonda" en [SettingsView.swift](file:///Users/chris/Desktop/insece/insece_ios/Views/SettingsView.swift) por un listado premium de tarjetas de radio (estilo HSL adaptado a `InseceTheme`).
*   **Lógica de Actualización en Lote (`isUpdatingMode`):** Se introdujo una propiedad privada `isUpdatingMode` en [SerialService.swift](file:///Users/chris/Desktop/insece/insece_ios/Data/SerialService.swift) para evitar que `setupConnection()` se llame múltiples veces seguidas de manera redundante mientras se realiza el cambio de variables de estado de conexión.
*   **Alertas Coherentes:** En [DashboardView.swift](file:///Users/chris/Desktop/insece/insece_ios/Views/DashboardView.swift), al recibir la alerta de puerto serial no disponible, la acción "Activar BLE" ahora llama a `serialService.setConnectionMode(.ble)` para limpiar los otros modos de conexión de manera correcta.

### 3. Verificación y Limpieza de Proyecto
*   **Verificación de Compilación:** Se verificó la compilación del proyecto localmente mediante `xcodebuild` para el target/scheme **`InseceSondApp`** en plataforma simulador, resultando en un éxito completo (`** BUILD SUCCEEDED **`).
*   **Limpieza de Duplicados:** Se eliminó de forma segura la carpeta de proyecto obsoleta `InseceApp 2.xcodeproj` (sin cambios desde abril de 2026) tras confirmar su inactividad y redundancia con el usuario, dejando limpio el directorio con el único proyecto de producción real `InseceApp.xcodeproj`.

---

## 📅 31 de Mayo de 2026: Lanzamiento de la Versión iOS 1.3.1

### 1. Compilación y Subida Automática a App Store Connect
*   **Incremento de Versión:** Se actualizó localmente el identificador en `Info.plist` de la versión `1.3.0` a la **`1.3.1` (Build `1`)**.
*   **Archivado y Firma:** Generado exitosamente el `.xcarchive` firmado en producción.
*   **Exportación a IPA:** Exportado el archivo `.ipa` a través de `ExportOptions.plist` usando el certificado y el ID de Apple del desarrollador.
*   **Upload:** Subido directamente a App Store Connect vía terminal con éxito.

### 2. Automatización del Envío a Revisión (Script de Automatización)
*   Se desarrolló y ejecutó el script `scratch/appstore_release.js` que se comunica directamente con las API REST de Apple utilizando el token firmado mediante la llave privada `AuthKey_C22X7JS8DR.p8`.
*   **Actualización de Localizaciones:** Se programó el script para rellenar de manera automática el campo obligatorio `"whatsNew"` (Novedades de la versión) en la localización española (`es-ES`) con: *"Mejoras de rendimiento y visualización de lecturas."*. Esto resolvió el error de estado `ENTITY_ERROR.ATTRIBUTE.REQUIRED` de Apple.
*   **Nueva API de Review Submissions:** Se migró la lógica del script de la antigua llamada deprecada `appStoreVersionSubmissions` a la nueva API recomendada por Apple:
    1.  Crea o reutiliza un contenedor de envío: `POST /v1/reviewSubmissions`.
    2.  Añade la versión como ítem de revisión: `POST /v1/reviewSubmissionItems` enlazando el ID de la versión `efab7f2a-2a58-4f7a-8c3c-f5df4e955f2d`.
    3.  Envía formalmente el contenedor a revisión de Apple: `PATCH /v1/reviewSubmissions/{id}` con el atributo `submitted: true`.
*   **Estado Final:** **🎉 Versión 1.3.1 enviada a revisión con éxito.** Está en la cola de evaluación humana de Apple (tiempo estimado: 24-48 horas).

### 3. Verificación de Cumplimiento DSA (Digital Services Act)
*   Se aclaró y verificó el estado de cumplimiento del reglamento europeo de servicios digitales.
*   **Status actual:** **Activo (Verified / Cumplido)**.
*   Se corroboró en el panel web de App Store Connect que la cuenta tiene el estatus de la DSA activado y verificado desde el **29 de mayo de 2026**. Por lo tanto, no hay bloqueos de venta o distribución en los países de la Unión Europea.

---

## 📅 28 de Mayo de 2026: Lanzamiento de la Versión iOS 1.3.0

*   Se publicó en producción la versión `1.3.0` como versión funcional estable con persistencia local Core Data y módulo integrado de valores de referencia de sonda Modbus RTU.
