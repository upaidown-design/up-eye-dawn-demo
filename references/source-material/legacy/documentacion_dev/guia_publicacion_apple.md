# Guía de Publicación Automática en App Store Connect

Esta guía documenta los pasos necesarios para compilar y automatizar la subida y el envío a revisión de la app iOS de INSECE.

---

## 🔑 1. Credenciales y Archivos de Firma

Para realizar operaciones automatizadas sin pasar por el portal web, la app utiliza el API de App Store Connect. Las claves se encuentran localizadas en el directorio del proyecto:

*   **Ruta de la Llave Privada de Apple:** `API APPLE/AuthKey_C22X7JS8DR.p8`
*   **Key ID (ID de Llave):** `C22X7JS8DR`
*   **Issuer ID (ID de Emisor):** `2b1a74d9-22da-429c-8271-7d7b8d7dc056`
*   **App ID de INSECE:** `6770504327`

*Nota de seguridad:* No muevas ni renombres la clave `.p8` fuera del directorio `API APPLE/`, ya que los scripts locales dependen de su ruta relativa.

---

## ⚙️ 2. Script de Automatización de Lanzamientos

El script ubicado en [scratch/appstore_release.js](file:///Users/chris/Desktop/insece/scratch/appstore_release.js) realiza las siguientes operaciones en orden:

1.  **Firma del Token JWT:** Genera un token firmado con algoritmo `ES256` válido durante 20 minutos usando las credenciales del API.
2.  **Búsqueda de la Compilación:** Consulta los últimos builds subidos filtrando por el App ID. Identifica cuál de ellos corresponde a la versión actual (ej: `1.3.1`) y verifica que su estado en los servidores de Apple sea `VALID` (haya terminado el procesamiento automático).
3.  **Creación de Versión:** Si la versión `1.3.1` no está creada en la tienda, el script realiza un `POST /v1/appStoreVersions` para inicializarla en estado `PREPARE_FOR_SUBMISSION`.
4.  **Actualización de Localizaciones ("Novedades de la Versión"):** Apple exige rellenar el campo de novedades (`whatsNew`) para poder enviar a revisión. El script obtiene las localizaciones configuradas de la versión y las actualiza mediante un `PATCH /v1/appStoreVersionLocalizations/{id}` (añadiendo los textos en español e inglés automáticamente).
5.  **Enlace de Build:** Vincula el identificador único del build procesado a la versión de la tienda.
6.  **Envío a Revisión por Review Submissions:** Crea un contenedor de revisión (`reviewSubmissions`), añade la versión (`reviewSubmissionItems`) y envía la solicitud para revisión humana (`submitted: true`), dejando la app en cola de evaluación automáticamente.

### Cómo ejecutar el script
Para ejecutar el script usando las dependencias de node configuradas:
```bash
node scratch/appstore_release.js
```

---

## 🇪🇺 3. Cumplimiento de la DSA (Reglamento de Servicios Digitales de la UE)

Apple requiere obligatoriamente declarar si el desarrollador opera comercialmente (Trader) o no (Non-Trader) para permitir las descargas e inyecciones de nuevas actualizaciones en la Unión Europea.

*   **Estado de Cumplimiento actual:** **`Activo` / Verificado** (Última actualización: 29 de mayo de 2026).
*   Esta confirmación se puede comprobar visualmente en el panel web de **App Store Connect -> Negocio -> Cumplimiento** (donde figura como activo y en regla). Al estar activo, los envíos a revisión automatizados no experimentan bloqueos legales por parte de Apple.
