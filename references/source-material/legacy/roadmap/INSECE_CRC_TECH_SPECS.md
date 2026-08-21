# 🛡️ Especificación Técnica: Blindaje CRC16 (Insece)

Este documento detalla la implementación pendiente para asegurar la integridad total de los datos recibidos de la sonda mediante el protocolo Modbus RTU.

---

## 1. El Algoritmo (CRC-16/MODBUS)
Se debe implementar el estándar industrial `CRC-16/MODBUS` (Polinomio: `0x8005`, Valor inicial: `0xFFFF`).

### Lógica de Validación Propuesta:
```kotlin
fun isCrcValid(buffer: ByteArray, length: Int): Boolean {
    if (length < 3) return false
    val receivedCrc = ((buffer[length - 1].toInt() and 0xFF) shl 8) or (buffer[length - 2].toInt() and 0xFF)
    val calculatedCrc = calculateCRC16(buffer, length - 2)
    return receivedCrc == calculatedCrc
}
```

---

## 2. Estrategia de Gestión de Errores
Cuando se detecte una trama con CRC inválido, el sistema deberá actuar de la siguiente forma:

1.  **Descarte Inmediato**: No pasar los datos al `ProtocolProcessor`. Evitar que el sensor de humedad registre picos imposibles (ej. 1000%).
2.  **Retry Silencioso**: Solicitar una nueva lectura al sensor de forma inmediata (máximo 3 reintentos).
3.  **Logging de Calidad**: Si los errores de CRC superan el 5% de las lecturas, notificar al usuario: *"Posible interferencia eléctrica o cable dañado"*.

---

## 3. Beneficios Inmediatos
*   **Datos Profesionales**: Eliminación total de "outliers" (picos falsos) en las gráficas de analítica.
*   **Diagnóstico de Hardware**: Permite saber si el cable USB o el conversor RS485 está fallando antes de que deje de funcionar totalmente.
*   **Paridad Industrial**: Cumplimiento estricto con el estándar Modbus RTU.

---

> [!IMPORTANT]
> **Estado**: Pendiente de implementación por solicitud del usuario. Esta mejora es el pilar de la robustez de hardware para uso industrial.
