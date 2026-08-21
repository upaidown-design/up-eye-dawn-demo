# 🍏 Manual de Publicación en App Store y Cumplimiento DSA (Digital Services Act)

¡Enhorabuena por conseguir que la aplicación sea **Aprobada** (Approved) por Apple! 🎉

Dado que la publicación y el cumplimiento normativo requieren acceder con tu Apple ID a la consola privada de App Store Connect, debes realizar estos pasos manualmente desde tu navegador web.

A continuación, tienes las instrucciones exactas, paso a paso, para publicar tu app y solucionar el aviso de la **Unión Europea (DSA)**.

---

## 🇪🇺 PARTE 1: Resolver el aviso DSA (Digital Services Act)

La Ley de Servicios Digitales (DSA) de la UE obliga a Apple a verificar si los desarrolladores que publican en Europa actúan como "Comerciantes" (Traders) o "No Comerciantes" (Non-Traders). **Debes completar esto para poder vender o distribuir tu app en Europa.**

### Paso a paso:
1. Inicia sesión en **[App Store Connect](https://appstoreconnect.apple.com/)**.
2. Ve a la sección **"Business"** (Empresa) o haz clic directamente en el aviso amarillo que aparece en la parte superior de tu pantalla sobre la *Digital Services Act*.
3. Accede a la pestaña **Compliance** (Cumplimiento).
4. Verás tu cuenta de desarrollador. Haz clic en **Provide DSA Compliance** (Proporcionar cumplimiento DSA).
5. Selecciona tu estatus:
   - **Trader (Comerciante):** Si la app de INSECE representa a una empresa que obtiene un beneficio económico (venta de sondas, servicios B2B, etc.). 
   - **Non-Trader (No comerciante):** Si lo haces puramente a título personal sin ánimo de lucro (no recomendado para INSECE).
6. **Si seleccionas Trader**, deberás rellenar:
   - Nombre legal de la empresa.
   - Dirección completa de la empresa.
   - Teléfono y correo electrónico de atención al cliente (puede ser el tuyo o el de soporte de INSECE).
7. Envía el formulario. Una vez enviado, Apple verificará la información y **el aviso amarillo desaparecerá**.

---

## 🚀 PARTE 2: Publicar la Versión Aprobada

Dado que tu versión ya está en estado "Aprobada" (Approved), el último paso es liberarla para que aparezca en la App Store.

### Paso a paso:
1. Entra en **[App Store Connect](https://appstoreconnect.apple.com/)** y ve a **Mis apps** (My Apps).
2. Haz clic en **INSECE**.
3. En el menú lateral izquierdo, bajo la sección de **iOS App**, selecciona la versión que tiene el indicador verde de **"Aprobada"** (Approved).
4. Desplázate hasta la parte inferior de la página, a la sección **Lanzamiento de versión** (Version Release).
5. Verás tres opciones (dependiendo de lo que hayas configurado previamente al enviar la app a revisión):
   - **Lanzar manualmente (Manually release this version):** Selecciona esta opción y pulsa el botón azul **"Release This Version"** (Lanzar esta versión) en la parte superior derecha.
   - *Lanzar automáticamente:* Si marcaste esta opción, la app ya debería estar procesándose para salir en la App Store (puede tardar de 1 a 24 horas en aparecer visible en los servidores de Apple).
   - *Lanzar en una fecha específica:* La app saldrá el día programado.
6. Si lo haces manualmente, una vez pulses **Lanzar**, el estado cambiará a **"Procesando para el App Store"** (Processing for App Store) y luego a **"Lista para la venta"** (Ready for Sale).

---

## 📈 PARTE 3: Siguientes pasos (Subir de versión para el futuro)

Para la próxima vez que hagamos cambios o mejoras en la app, la versión actual (`1.0.1` o la que tengas) quedará "quemada" en App Store Connect. 

Cuando tengamos que subir actualizaciones, yo me encargaré de:
1. Subir el *Version Number* en Xcode (ejemplo: de `1.0.1` a `1.0.2`).
2. Subir el *Build Number* (ejemplo: de `1` a `2`).
3. Volver a compilar y subir mediante Xcode u otra herramienta de CI/CD.

¡Felicidades por el lanzamiento en iOS! Si tienes alguna duda con el formulario de la DSA, indícamelo.
