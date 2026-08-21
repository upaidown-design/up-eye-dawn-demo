# Documentación de Desarrollo - INSECE AgTech/Industrial Ecosystem

Bienvenido al espacio de documentación técnica para desarrolladores de INSECE. Este directorio actúa como diario de desarrollo, bitácora de publicación y registro técnico permanente para que cualquier persona que comience a colaborar en el ecosistema (iOS, Android, Backend, SCADA o Web Dashboard) entienda el estado actual, las decisiones clave y cómo operar cada componente.

## 📁 Estructura de esta Carpeta

Para facilitar la navegación, la documentación técnica está dividida en los siguientes archivos clave:

1.  **[historial_cambios.md](file:///Users/chris/Desktop/insece/docs/documentacion_dev/historial_cambios.md):** Diario de desarrollo cronológico. Registra qué se ha hecho, qué versiones se han subido, estado de cumplimiento de normativas (como la DSA de Apple) y el estado en el que se encuentra el proyecto hoy en día.
2.  **[arquitectura_telemetria_ios.md](file:///Users/chris/Desktop/insece/docs/documentacion_dev/arquitectura_telemetria_ios.md):** Detalle técnico de la app iOS (SwiftUI). Explica cómo se resuelve el problema de la falta de USB OTG nativo mediante:
    *   **BLE Mode** (Bluetooth con ESP32).
    *   **Mac Bridge Mode** (Puente por Wi-Fi mediante JSON).
    *   **Stealth USB Demo Mode** (El modo de simulación táctil sigilosa con interpolación progresiva y simulación de tramas Modbus RTU).
3.  **[guia_publicacion_apple.md](file:///Users/chris/Desktop/insece/docs/documentacion_dev/guia_publicacion_apple.md):** Instrucciones técnicas para compilar, firmar y desplegar versiones de iOS de forma automática a través de App Store Connect, incluyendo los identificadores de credenciales y el estado actual de cumplimiento de regulaciones.

---

## 📌 Resumen de Estado Actual del Proyecto (Junio 2026)

*   **iOS App:** Versión actual en cola de revisión: **`1.3.1 (1)`** (enviada automáticamente a revisión el 31 de mayo de 2026).
*   **Android App:** App primaria de campo en producción.
*   **Backend Cloud:** API PostgreSQL y panel SCADA unificado.
*   **Cumplimiento DSA (Apple):** Completado y verificado (Estado: **`Activo`** desde el 29 de mayo de 2026).
