# 📱 Diferenciación de Dispositivos (Android/iOS) en Dashboard de Notificaciones

Este documento detalla la implementación técnica realizada para poder visualizar en el listado de destinatarios del panel de administración qué usuarios tienen dispositivos Android o iPhone (iOS) vinculados, facilitando el envío selectivo y control visual de las notificaciones.

---

## 1. Cambios en el Backend (API Server)

Se ha modificado el endpoint de obtención de usuarios para administradores (`GET /api/admin/users`) en [routes/admin.js](file:///Users/chris/Desktop/insece/backend_cloud/server/routes/admin.js).

* **Subconsulta de Plataformas Activas:**
  Se agregó una subconsulta SQL que busca en la tabla `device_tokens` todos los registros activos (`is_active = true`) asociados al usuario, concatenando las plataformas únicas mediante `string_agg(DISTINCT platform, ',')`.
  
* **Mapeo de Datos:**
  El endpoint ahora devuelve un array de strings bajo la clave `notificationPlatforms`:
  ```json
  "notificationPlatforms": ["android", "ios"]
  ```

---

## 2. Cambios en el Frontend (Web Dashboard)

Se modificó el módulo de gestión de notificaciones en el dashboard: [notifications.js](file:///Users/chris/Desktop/insece/backend_cloud/dashboard/public/js/modules/notifications.js).

* **Renderizado de Badges:**
  En la función `renderUserList()`, se extraen las plataformas registradas del usuario y se añaden badges visuales premium:
  * **Android:** Etiqueta verde con icono de smartphone (`smartphones`).
  * **iPhone (iOS):** Etiqueta azul con icono de smartphone (`smartphones`).
  
* **Refresco de Iconos:**
  Se ejecuta `lucide.createIcons()` al terminar de pintar la lista para asegurar que los iconos vectoriales de Lucide se rendericen correctamente en el HTML dinámico.

---

## 3. Guía de Pruebas de Notificaciones con Simulador iOS

Para realizar una prueba real de extremo a extremo:

### Paso A: Crear el Usuario de Pruebas "iPhone"
Puedes crear el usuario directamente desde la sección **Clientes** en el dashboard web, o ejecutar el script de utilidades en el servidor de producción:
```bash
node backend_cloud/server/create_test_user.js
```
* **Email:** `iphone_test@insece.com`
* **Contraseña:** `password123`
* **Nombre:** `iPhone Tester`

### Paso B: Vincular el Simulador iOS al Usuario
1. Abre el **Simulador iOS** en tu Mac (`iPhone 17 Pro` recomendado).
2. Abre la app `InseceSondApp` e inicia sesión con las credenciales creadas:
   * **Usuario:** `iphone_test@insece.com`
   * **Contraseña:** `password123`
3. Al iniciar sesión con éxito, la app en el simulador solicitará los permisos de notificaciones de iOS. Haz clic en **Permitir**.
4. La app enviará automáticamente el token FCM real del simulador al backend (`/api/notifications/register-token`) indicando `platform: "ios"`.

### Paso C: Comprobar y Enviar Push desde el Dashboard
1. Entra a tu dashboard de administración (`https://app.insece.pro/app.html#/notifications`).
2. En la lista de usuarios para el envío selectivo, verás aparecer a **iPhone Tester** con la píldora azul **iPhone (iOS)** indicando que tiene un dispositivo activo registrado.
3. Escribe un título y cuerpo de mensaje, selecciona únicamente a **iPhone Tester** y pulsa **Enviar Notificación Push**.
4. ¡El simulador recibirá inmediatamente la notificación y mostrará el banner de alerta!

---

## 4. Archivos Modificados en el Repositorio

* [backend_cloud/server/routes/admin.js](file:///Users/chris/Desktop/insece/backend_cloud/server/routes/admin.js) (API Endpoint `/api/admin/users`)
* [backend_cloud/dashboard/public/js/modules/notifications.js](file:///Users/chris/Desktop/insece/backend_cloud/dashboard/public/js/modules/notifications.js) (Modulo JS del Dashboard)
* [backend_cloud/server/create_test_user.js](file:///Users/chris/Desktop/insece/backend_cloud/server/create_test_user.js) (Script helper para crear usuario en la BD de PostgreSQL)
* [docs/NOTIFICACIONES_DIFERENCIADAS.md](file:///Users/chris/Desktop/insece/docs/NOTIFICACIONES_DIFERENCIADAS.md) (Este archivo de documentación)
