# 📊 Auditoría y Resumen del Manual Visual de INSECE

Este documento sirve como reporte de Product Manager y QA Visual, resumiendo el estado actual del frontend web tras la generación del manual de usuario.

## 🎯 Objetivos Cumplidos
1. Se ha analizado la estructura real del proyecto (Panel en `backend_cloud/dashboard/public/`).
2. Se ha levantado el servidor web en local para capturar el estado fidedigno de la plataforma.
3. Se han generado las imágenes solicitadas utilizando automatización headless (Playwright) para evitar simulaciones artificiales.
4. Se ha documentado exhaustivamente el funcionamiento arquitectónico y de interfaz para perfiles mixtos (Técnicos y Clientes).

## ⚠️ Pantallas Faltantes / Funcionalidades Pendientes
Durante la auditoría visual se ha detectado que varias de las 15 pantallas solicitadas **aún no están implementadas** en el código o dependen de una integración de datos no existente en este entorno. 

Se han omitido las siguientes capturas y se han documentado en el manual como *"Pantalla pendiente de implementación"*:
- **05-crear-finca.png:** No existe UI de creación de fincas aislada para el cliente; depende del registro por el Súper Admin.
- **06-mapa-parcelas.png:** La separación lógica por parcelas y capas NDVI no se ha completado en el HTML.
- **07-lecturas-sonda.png:** Gráficas en tiempo real no disponibles (falta inyección WebSocket en UI).
- **08-historial-lecturas.png:** La tabla de histórico existe en HTML pero vacía sin datos.
- **10-configurar-alertas.png:** UI de configuración de umbrales no desarrollada.
- **13-ajustes-cuenta.png:** Botón de "cerrar sesión" disponible, pero falta panel de ajustes personales.
- **14-exportar-datos.png:** Diseño de botón existe, pero falta el exportador CSV real.

## 🛠️ Notas de QA e Infraestructura
1. **Base de Datos Postgres:** El contenedor presentó corrupción en el WAL debido a un apagado brusco. Se solucionó reseteando el WAL, pero el servidor API aún presenta inestabilidad de conexión con la DB. Esto limita la captura de datos dinámicos.
2. **Dashboard SPA:** La arquitectura basada en Vanilla JS para manipular la UI (Tabs y vistas) funciona correctamente.
3. **Módulo de Notificaciones:** Interfaz muy completa para el Súper Admin; lista para conectar vía API a Firebase Cloud Messaging.

**Firma:** *Documentalista Técnico Senior / Product Manager AI*
