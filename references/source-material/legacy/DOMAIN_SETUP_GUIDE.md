# Guía de Configuración de Dominios y Subdominios (Nginx Proxy Manager)

Esta guía explica paso a paso cómo enlazar un nuevo dominio o subdominio (como `doc.insece.pro`, `app.insece.pro`, etc.) a un servicio que está corriendo en tu servidor VPS (`217.154.191.3`).

Actualmente, el servidor utiliza **Nginx Proxy Manager (NPM)**, que es un sistema visual basado en Docker para gestionar los dominios, los puertos y los certificados de seguridad (SSL/HTTPS) de forma muy sencilla.

---

## Paso 1: Configurar las DNS (En tu proveedor de dominio)

Antes de hacer nada en el servidor, necesitas decirle a Internet que tu subdominio apunta a tu servidor.

1. Entra al panel de control de tu proveedor de dominios (Hostinger, GoDaddy, Cloudflare, etc.) donde compraste `insece.pro`.
2. Ve a la sección de **Gestión de DNS** o **Zonas DNS**.
3. Añade un nuevo **Registro A** (A Record):
   - **Nombre / Host / Alias:** El subdominio que quieras. Por ejemplo, escribe `doc` (para doc.insece.pro). Si quieres el dominio principal, suele ser `@`.
   - **Apunta a (Destino / IP):** `217.154.191.3`
   - **TTL:** Automático o el valor por defecto.
4. Guarda los cambios. *Ojo: Esto puede tardar unos minutos en propagarse por Internet.*

---

## Paso 2: Configurar Nginx Proxy Manager (En tu servidor)

Una vez que el dominio ya apunta a la IP, debemos decirle al servidor a qué puerto interno debe enviar el tráfico de ese dominio.

1. Abre tu navegador y entra al panel de Nginx Proxy Manager:
   👉 **http://217.154.191.3:81**
2. Inicia sesión con tus credenciales de administrador.
3. En el menú superior, ve a **Hosts** > **Proxy Hosts**.
4. Haz clic en el botón verde **"Add Proxy Host"**.

### Pestaña "Details" (Detalles)
Rellena los siguientes campos:
- **Domain Names:** Escribe tu subdominio completo y presiona Enter. Ejemplo: `doc.insece.pro`
- **Scheme:** `http`
- **Forward Hostname / IP:** Aquí pones la IP pública de tu servidor: `217.154.191.3` (también suele funcionar la IP interna de Docker si están en la misma red, pero usar la IP pública es más seguro si el puerto está expuesto).
- **Forward Port:** El puerto en el que corre tu aplicación. 
  - *Ejemplo:* Para la wiki (`doc.insece.pro`), el puerto es **`3035`** (ya que en tu `docker-compose.yml` tienes mapeado `3035:3000`).
- **Opciones adicionales:** Activa "Block Common Exploits" y "Websockets Support" (recomendado para apps modernas).

### Pestaña "SSL" (Certificado de Seguridad)
Para que tu web salga como "Sitio Seguro" (HTTPS) con el candadito:
- **SSL Certificate:** Despliega el menú y selecciona **"Request a new SSL Certificate"**.
- Activa **"Force SSL"** (para obligar a usar HTTPS).
- Activa **"HTTP/2 Support"**.
- Escribe tu correo electrónico en "Email Address for Let's Encrypt".
- Acepta los términos ("I Agree...").

5. Haz clic en **Save** (Guardar).

---

## ¡Listo!

Nginx Proxy Manager se encargará de pedir el certificado a Let's Encrypt y de generar la configuración automáticamente. 

A partir de este momento, si entras a `https://doc.insece.pro`, Nginx recibirá la petición y la enviará de forma transparente al puerto `3035` donde está alojada tu Wiki.

### Resumen de puertos actuales del ecosistema:
- **API Backend:** `3004` (Insece Cloud)
- **Documentación / Wiki:** `3035`
- **Dashboard App:** Está gestionado por PM2 y un servidor de estáticos, apuntando internamente a los puertos de PM2.
