# 📋 MANUAL INTEGRAL DE USUARIO, OPERADOR Y ARQUITECTURA TÉCNICA — INSECE

Este documento es una guía exhaustiva y detallada para el cliente final y operadores del ecosistema **INSECE**. Ha sido redactado combinando explicaciones sencillas y comprensibles para personas sin formación informática, junto con guías paso a paso y descripciones de arquitectura para que los operadores técnicos puedan administrar el servidor, Firebase y la base de datos sin contratiempos.

---

## 🗺️ ÍNDICE DEL MANUAL
1. **Introducción y Arquitectura General del Ecosistema**
2. **La Sonda Física (Hardware) y Parámetros del Suelo**
3. **Manual de Operario: Aplicaciones Móviles (Android e iOS)**
4. **El Servidor Cloud: Arquitectura de la API y Base de Datos (PostgreSQL)**
5. **Firebase Cloud Messaging (FCM): Gestión y Envío de Notificaciones**
6. **Manual del Administrador: Panel Web Dashboard y SCADA**
7. **Pasarela de Pagos Stripe y Planes de Suscripción**

---

## 🏛️ 1. INTRODUCCIÓN Y ARQUITECTURA GENERAL

El ecosistema de **INSECE** está estructurado en tres capas independientes pero perfectamente sincronizadas. A esto se le conoce como una **arquitectura cliente-servidor de tres niveles**:

```mermaid
graph TD
    A["Sonda Física (Suelo)"] -->|Bluetooth BLE| B["Aplicaciones Móviles (Android / iOS)"]
    B -->|API REST (HTTPS + JWT)| C["Servidor Cloud (Node.js/Express)"]
    C -->|Consultas SQL| D["Base de Datos (PostgreSQL)"]
    E["Panel Web Dashboard (Administrador)"] -->|API REST (HTTPS)| C
    C -->|Notificaciones Push| F["Firebase Cloud Messaging (FCM)"]
    F -->|Entrega Inmediata| B
```

### Flujo de Trabajo Simplificado:
1. **Captura:** La sonda clava sus electrodos en la tierra y toma lecturas eléctricas directas del suelo.
2. **Transmisión Local:** La app móvil recibe las lecturas por ondas de Bluetooth y las muestra en la pantalla del smartphone del agricultor.
3. **Sincronización:** La app empaqueta las lecturas y, usando la conexión a Internet del teléfono (Datos o Wi-Fi), las envía al Servidor Cloud de INSECE.
4. **Almacenamiento:** El servidor verifica que el usuario es válido y guarda la información en la Base de Datos.
5. **Visualización y Alertas:** El Administrador ve estas lecturas geoposicionadas en los mapas y gráficos del Panel Web. Si los valores son críticos, puede enviar una Notificación Push de aviso a través de Firebase que llegará de inmediato a los teléfonos de los agricultores.

---

## 🧪 2. LA SONDA FÍSICA (HARDWARE) Y PARÁMETROS DEL SUELO

La sonda INSECE es un dispositivo electromecánico de alta precisión. Consta de una varilla de acero inoxidable con sensores múltiples y una carcasa superior estanca que alberga la batería y la placa electrónica Bluetooth (basada en el chip ESP32).

### 📊 ¿Qué mide la sonda y por qué es vital para el cultivo?

| Parámetro | ¿Qué mide? | Unidad | Rango Óptimo General | Importancia Agronómica |
|---|---|---|---|---|
| **Humedad** | Contenido de agua en la tierra | % | 20% - 60% (según tipo de suelo) | Evita la asfixia de las raíces por exceso de agua o el estrés hídrico por falta de ella. |
| **Temperatura** | Calor a nivel de raíz | °C | 15°C - 28°C | Influye directamente en la absorción de agua y la actividad de los microorganismos beneficiosos. |
| **Conductividad (EC)**| Salinidad del terreno | µS/cm o dS/m| 0.5 - 2.5 dS/m | Indica la cantidad de fertilizantes disueltos. Si es muy baja, falta abono; si es muy alta, puede quemar la raíz. |
| **pH** | Acidez o alcalinidad | Escala pH | 6.0 - 7.5 (neutro-ligeramente ácido)| Determina si la planta puede absorber los nutrientes. Un pH incorrecto bloquea el fósforo y el hierro. |
| **Nitrógeno (N)** | Nutriente de crecimiento | mg/kg | 50 - 150 mg/kg | Responsable del color verde y del desarrollo de hojas y tallos. |
| **Fósforo (P)** | Nutriente de raíces | mg/kg | 20 - 80 mg/kg | Clave para el enraizamiento, la floración y el cuajado de frutos. |
| **Potasio (K)** | Nutriente de calidad | mg/kg | 100 - 300 mg/kg | Regula la apertura de poros (estomas) y aumenta la resistencia a sequías y plagas. |

---

## 📱 3. MANUAL DE OPERARIO: APLICACIONES MÓVILES

Las aplicaciones móviles de INSECE están diseñadas para funcionar en el campo de forma sencilla y directa.

### 📥 Paso 1: Instalación y Primer Inicio
1. Descarga la aplicación desde la Google Play Store (Android) o la Apple App Store (iOS/iPhone).
2. Al abrir la app por primera vez, te solicitará **permisos de Ubicación (GPS)** y **Bluetooth**. 
   > [!IMPORTANT]
   > Debes pulsar **"Permitir siempre"** o **"Permitir al usar la app"**. Si deniegas estos permisos, el teléfono no podrá buscar dispositivos Bluetooth cercanos ni asociar las coordenadas geográficas a tus lecturas del suelo.

### 👤 Paso 2: Crear una Cuenta
1. En la pantalla de bienvenida, pulsa en **"Crear Cuenta"**.
2. Rellena los campos: **Nombre Completo**, **Email**, y elige una contraseña de al menos 6 caracteres.
3. Tras pulsar "Crear Cuenta", el sistema enviará un **correo electrónico de verificación** a tu bandeja. Abre tu correo y haz clic en el enlace para activar tu cuenta.
4. Vuelve a la app e inicia sesión con tu email y contraseña.

### 🔌 Paso 3: Conectar la Sonda y Tomar Lecturas
1. Asegúrate de estar cerca de la sonda física (a menos de 10 metros).
2. Clava la sonda en el terreno hasta la profundidad recomendada.
3. En la pestaña principal de la aplicación, el teléfono buscará el dispositivo.
4. Aparecerá en la lista con el nombre `INSECE_PROBE` o similar. Pulsa **"Conectar"**.
5. Los valores de humedad, pH, etc., comenzarán a actualizarse en la pantalla segundo a segundo.
6. Pulsa el botón **"Guardar Lectura"**. La lectura se guardará con la posición GPS del teléfono y se subirá al servidor automáticamente en segundo plano.

### 📂 Paso 4: Exportación de Datos
Si necesitas entregar un reporte al dueño de la finca o a un ingeniero agrónomo directamente desde el campo:
1. Ve a la pestaña **"Historial"** dentro de la app.
2. Verás el listado de todas tus mediciones ordenadas por fecha.
3. Pulsa el icono de **Compartir/Exportar** (esquina superior derecha).
4. Elige el formato:
   *   **CSV:** Archivo de hoja de cálculo para abrir en Excel.
   *   **PDF:** Un reporte visual con diseño limpio y listo para imprimir.
5. Elige el medio de envío: WhatsApp, Email, Telegram o guardar en la memoria del teléfono.

### 🗑️ Paso 5: Eliminar Cuenta (Privacidad y Normativa Apple)
Si dejas de trabajar en la finca o deseas borrar toda tu información:
1. Ve a la pestaña **"Ajustes"** (Configuración).
2. En la sección "CUENTA", pulsa el botón rojo **"Eliminar Cuenta"**.
3. El sistema te pedirá introducir tu contraseña para confirmar.
4. Una vez confirmada, se enviará una orden de borrado inmediato: tu usuario y todos sus datos serán eliminados permanentemente del servidor, y la app cerrará tu sesión borrando los datos locales para garantizar tu privacidad.

---

## ☁️ 4. EL SERVIDOR CLOUD Y LA BASE DE DATOS

El servidor de INSECE es el motor central del sistema. Funciona ininterrumpidamente en la nube (Cloud) gestionando las peticiones y almacenando la información.

### 🏗️ ¿Cómo está construido el servidor?
El código del servidor está desarrollado utilizando **Node.js** con el framework **Express**. Es lo que se conoce como una **API RESTful**.
*   **Seguridad JWT:** Cuando un usuario inicia sesión en la aplicación móvil o en la web, el servidor le entrega un token de seguridad firmado electrónicamente (JWT - JSON Web Token). La aplicación guarda este token y lo adjunta en cada lectura que envía. Así, el servidor sabe con total seguridad quién envía los datos sin que el usuario tenga que introducir su contraseña constantemente.
*   **Base de Datos PostgreSQL:** A diferencia de las bases de datos de juguete (como SQLite), INSECE utiliza **PostgreSQL**, un motor de base de datos relacional de nivel industrial y gran rendimiento, idóneo para manejar miles de lecturas simultáneas de sensores.

### 🗄️ Estructura Simplificada de la Base de Datos (Tablas principales)

```
[Tabla: users]
- id (Identificador único)
- email (Correo electrónico)
- password_hash (Contraseña cifrada con algoritmo de seguridad bcrypt)
- full_name (Nombre del usuario)
- role (admin, client, worker)

[Tabla: fincas]
- id (Identificador de la finca)
- name (Nombre, ej: Finca Poniente)
- owner_id (Propietario de la finca)
- bounds (Polígono de coordenadas GPS)

[Tabla: readings]
- id (Identificador de lectura)
- user_id (Quién tomó la lectura)
- finca_id (A qué finca pertenece)
- temperature, moisture, conductivity, ph, nitrogen, phosphorus, potassium
- latitude, longitude (Coordenadas exactas del GPS)
- created_at (Fecha y hora exacta de la lectura)
```

### 🛠️ Tutorial para no informáticos: Cómo consultar la Base de Datos
Para gestionar la base de datos, el administrador puede usar una herramienta visual gratuita como **pgAdmin** o **DBeaver**.

#### Conexión a la Base de Datos:
1. Descarga e instala **DBeaver**.
2. Crea una nueva conexión seleccionando **PostgreSQL**.
3. Introduce las credenciales del servidor (estarán en tu archivo de configuración `.env` del servidor):
   *   **Host:** Dirección IP del servidor (ej: `api.insece.pro` o similar).
   *   **Puerto:** `5432` (puerto por defecto de PostgreSQL).
   *   **Database:** `insece_db`
   *   **User:** `insece_admin`
   *   **Password:** *[Contraseña de base de datos]*
4. Pulsa "Probar Conexión" y finaliza.

#### Consultas SQL útiles de administración:
Una vez conectado, puedes abrir una pestaña de consola (SQL Editor) y ejecutar estos comandos para auditar el sistema:

*   **Ver todos los usuarios registrados:**
    ```sql
    SELECT id, email, full_name, role FROM users ORDER BY id DESC;
    ```
*   **Buscar las lecturas más recientes de una finca específica:**
    ```sql
    SELECT r.created_at, u.full_name, r.moisture, r.ph, r.conductivity 
    FROM readings r
    JOIN users u ON r.user_id = u.id
    WHERE r.finca_id = 1 
    ORDER BY r.created_at DESC LIMIT 50;
    ```
*   **Contar cuántas lecturas ha tomado cada trabajador:**
    ```sql
    SELECT u.full_name, COUNT(r.id) as total_lecturas
    FROM readings r
    JOIN users u ON r.user_id = u.id
    GROUP BY u.full_name
    ORDER BY total_lecturas DESC;
    ```

---

## 🔔 5. FIREBASE CLUID MESSAGING (FCM): NOTIFICACIONES PUSH

Las notificaciones push (las alertas que aparecen en la barra de notificaciones del teléfono cuando la app está cerrada) no se pueden enviar directamente desde nuestro servidor al móvil porque los sistemas operativos Android e iOS bloquean las conexiones constantes para ahorrar batería. En su lugar, se utiliza **Firebase Cloud Messaging (FCM)** de Google como intermediario homologado.

### 🔄 Flujo de Envío de Notificaciones

```
[ Panel Web ] 
     │
     ▼ (Petición HTTPS de envío con título e imagen)
[ Servidor Cloud ]
     │
     ▼ (Petición firmada con clave secreta de Firebase)
[ Servidor Firebase (FCM) ]
     │
     ├─► [ Red APNs de Apple ] ──► (Alerta instantánea) ──► [ iPhone del agricultor ]
     └─► [ Red Google Play ] ────► (Alerta instantánea) ──► [ Móvil Android ]
```

### 📱 Registro de Dispositivos (Cómo sabe Firebase a quién enviar)
1. Al iniciar la app móvil, el código del software solicita a Firebase un **Token de Dispositivo** (un identificador largo único para ese móvil).
2. La app móvil le envía este token a nuestro Servidor Cloud, el cual lo guarda en la base de datos asociado a la cuenta de ese usuario y especificando su plataforma (Android o iOS).
3. Cuando enviamos una notificación, el servidor recupera los tokens del destinatario y se los envía a Firebase para la entrega.

---

### ✍️ Tutorial 1: Cómo enviar notificaciones desde el Panel Web (Pasos de Operador)
Este es el método normal que utilizará tu cliente en el día a día:

1. Inicia sesión en el Panel Web Dashboard (`https://app.insece.pro`) con credenciales de **Administrador**.
2. En la barra de navegación lateral, haz clic en la sección **"Notificaciones"** o **"Marketing y Mensajes"**.
3. Rellena el formulario:
   *   **Título:** Un texto corto y llamativo (ej: *¡Alerta de Riego en Parcela B!*).
   *   **Mensaje:** Detalle de la alerta (ej: *La humedad ha caído por debajo del 25% en el sector de cítricos. Por favor, verificar las válvulas.*).
   *   **Plataforma (Segmentación):** Puedes seleccionar:
       *   `Todos` (Envía a todos los dispositivos).
       *   `Android` (Solo a usuarios de teléfonos Samsung, Xiaomi, etc.).
       *   `iOS` (Solo a usuarios de iPhone).
4. Haz clic en **"Enviar Notificación"**.
5. El sistema procesará el envío y mostrará una alerta de confirmación con el número de dispositivos alcanzados.

---

### ⚙️ Tutorial 2: Enviar notificaciones desde la Consola de Firebase (Uso Técnico)
Si por alguna razón el Panel Web no está disponible, o necesitas realizar una prueba de infraestructura técnica directamente desde la consola oficial de Google:

1. Ve a la web oficial: **[Firebase Console](https://console.firebase.google.com/)**.
2. Inicia sesión con la cuenta de Google asociada al proyecto de INSECE.
3. Haz clic en el proyecto **INSECE**.
4. En el menú lateral izquierdo, despliega la sección **Participación** (Engage) y selecciona **Cloud Messaging**.
5. Haz clic en el botón **"Crear tu primera campaña"** (o "Nueva campaña") y selecciona **Notificaciones de Firebase**.
6. **Paso 1: Redactar la notificación:**
   *   Introduce el **Título de la notificación** y el **Texto de la notificación**.
   *   Puedes subir una URL de imagen si quieres incluir una foto en la alerta.
7. Haz clic en **Siguiente**.
8. **Paso 2: Segmentación (A quién va dirigida):**
   *   En el desplegable, selecciona la aplicación móvil de destino (por ejemplo, `com.insece.InseceSondApp` para iOS o `com.insece.usbserialreader` para Android).
   *   Si deseas enviar a ambos sistemas, puedes añadir una regla haciendo clic en "Y" y seleccionando la otra aplicación.
9. Haz clic en **Siguiente**.
10. **Paso 3: Programación:**
    *   Selecciona **Ahora** (para envío inmediato) o programa una fecha y hora específicas.
11. Haz clic en **Siguiente** (puedes omitir los pasos opcionales de Eventos de Conversión).
12. Pulsa en **Revisar** y luego en **Publicar**. Firebase distribuirá la notificación de inmediato.

---

## 💻 6. EL PANEL WEB DASHBOARD Y PANTALLAS SCADA

El Panel Web de INSECE consolidado está construido con tecnologías web modernas, ofreciendo una experiencia interactiva para la toma de decisiones en tiempo real desde la oficina de la explotación agrícola.

### 🗺️ Gestión de Fincas y Parcelas
Para organizar los datos recopilados por los operarios:
1. En el menú principal, ve a **"Fincas"**.
2. Pulsa en **"Nueva Finca"**. Introduce el nombre y la localización general.
3. Haz clic en **"Dibujar Parcela"**. Podrás hacer clics sobre el mapa interactivo (basado en satélite) para delimitar de forma exacta los bordes de la parcela.
4. Guarda los cambios. A partir de ese momento, cualquier lectura tomada dentro de ese perímetro del mapa satelital se auto-clasificará dentro de esa parcela en los informes.

### 📊 Tutorial: Cómo configurar Alertas y Pantallas SCADA
Las pantallas SCADA permiten simular el estado hidráulico e higrométrico de la finca de un vistazo:

1. Ve a la sección **"SCADA"** del panel.
2. Verás los diagramas interactivos que representan los tanques de agua, bombas de riego y los indicadores de suelo.
3. **Configurar rangos de alarma:**
   *   Haz clic en la rueda dentada de ajustes de cualquier sensor del panel.
   *   Establece el **Límite Mínimo de Humedad** (ej: 25%) y el **Límite Máximo** (ej: 75%).
   *   Si una lectura enviada por un operario cae por debajo del 25%, el indicador en la pantalla SCADA empezará a parpadear en **Rojo** y el sistema registrará una alerta crítica.

---

## 💳 7. PASARELA DE PAGOS STRIPE Y SUSCRIPCIONES

Para rentabilizar el ecosistema o cobrar a distintos clientes por el uso del almacenamiento en la nube y las herramientas de análisis SCADA:

### ⚙️ Integración de Stripe
El sistema web incluye un módulo de suscripciones integrado con **Stripe**, la plataforma de pasarela de pago más segura de internet.
*   **¿Cómo funciona?:** El servidor de INSECE nunca almacena los números de las tarjetas de crédito ni datos bancarios. Cuando el cliente introduce su tarjeta, los datos viajan directamente a los servidores de Stripe de forma encriptada. Stripe nos devuelve un "Token" que representa la suscripción activa.
*   **Seguridad:** Cumple con la estricta normativa bancaria PCI-DSS, garantizando que el sistema sea inmune al robo de tarjetas de crédito.

### 🔄 Flujo de Gestión de Suscripciones
1. El Administrador accede a **"Suscripciones"** en el Panel Web.
2. Puede crear distintos planes (ejemplo: *Plan Básico - 50€/mes* para 1 finca; *Plan Premium - 150€/mes* para fincas ilimitadas y alertas push automáticas).
3. Los clientes finales, al iniciar sesión en el panel web, verán su estado de cuenta. Si su plan ha caducado, el sistema web les redirigirá automáticamente al formulario de pago seguro de Stripe para renovar su servicio.
4. Una vez completado el pago, Stripe envía una señal silenciosa (Webhook) a nuestro Servidor Cloud para reactivar instantáneamente los accesos del cliente.
