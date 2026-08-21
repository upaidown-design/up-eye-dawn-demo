# PROMPT MAESTRO — PANEL ADMINISTRATIVO COLABORATIVO UP-EYE-DAWN

Actúa como principal engineer de producto, seguridad y frontend. Trabaja directamente sobre el repositorio privado `upaidown-design/up-eye-dawn-demo`, rama actual `infra/gcp-production`. No crees una aplicación paralela ni sustituyas el portal existente. Extiende el sistema actual y conserva su arquitectura React + TypeScript, Fastify + TypeScript, PostgreSQL, Nginx y despliegue Docker Compose en Google Cloud.

## Objetivo

Convertir `/demo/admin/*` en el panel operativo privado donde el fundador y sus socios puedan trabajar diariamente: agenda, tareas, notas, decisiones, reuniones, materiales, inversores, invitaciones, NDA, sesiones y auditoría. Debe ser un producto serio, colaborativo, responsive y auditable; no un dashboard decorativo.

## Contexto que debes inspeccionar antes de editar

- `apps/web/src/access-control.tsx` y sus CSS.
- `apps/api/src/private-access.ts`.
- `apps/api/src/workspace-schema.ts`.
- `infra/migrations/001_private_investor_portal.sql` a la migración más reciente.
- `docs/PRIVATE_INVESTOR_PORTAL.md`.
- `data/admin/new-york-private-briefing.json`.
- `infra/production/` y `scripts/gcp/`.

No confíes en documentación sin contrastarla con el código y la base de datos. Conserva los avisos `LEGAL_REVIEW`, `CONCEPT_RENDER`, `SYNTHETIC` y cualquier clasificación de verdad existente.

## Seguridad y usuarios internos

Implementa cuentas separadas; nunca credenciales compartidas.

- Roles: `OWNER`, `ADMIN`, `EDITOR`, `VIEWER`.
- El `OWNER` invita, desactiva, cambia roles y consulta toda la auditoría.
- `ADMIN` administra proyecto e inversores, pero no puede transferir propiedad ni rebajar la seguridad del owner.
- `EDITOR` crea y edita agenda, tareas, notas y materiales; no gestiona NDA, sesiones ni usuarios.
- `VIEWER` es solo lectura.
- Invitación de socio mediante token opaco de un solo uso y caducidad corta.
- Alta de contraseña robusta y MFA TOTP obligatorio antes de activar una cuenta interna en producción.
- Cookies HttpOnly/Secure/SameSite, CSRF, rotación de sesión, expiración absoluta e inactiva, vínculo a navegador/red y auditoría.
- El acceso DEV temporal existente no es autenticación definitiva: debe poder desactivarse y eliminarse tras crear las cuentas reales.
- No uses Firebase como base de datos principal. PostgreSQL es la fuente de verdad. Google Identity Platform/Firebase Auth puede utilizarse como proveedor de identidad si se integra con verificación backend de ID tokens y sin debilitar RBAC.

## Módulos obligatorios

### 1. Inicio / Control Room

- KPIs operativos útiles, no vanity metrics.
- Próximas reuniones, tareas críticas/vencidas, decisiones pendientes, notas fijadas, nuevas altas de inversores, NDA pendientes y alertas de seguridad.
- Feed de actividad con autor, entidad, acción y fecha.
- Acciones rápidas con permisos.

### 2. Agenda y visitas

- Vistas lista, semana y mes.
- Eventos: reunión, visita, presentación, ensayo, deadline, viaje y recordatorio.
- Zona horaria, ubicación/enlace, asistentes internos, inversor relacionado, responsable, prioridad, estado y notas.
- Adjuntar checklist y materiales.
- Filtros, búsqueda y exportación `.ics`.

### 3. Tareas

- Lista y Kanban por estado.
- Responsable interno por `admin_user_id`, seguidores, vencimiento, prioridad, etiquetas, subtareas, dependencias y relación con evento/inversor/material.
- Comentarios, historial y @menciones.
- No borrar físicamente: archivar con auditoría.

### 4. Notas y decisiones

- Notas ricas en texto seguro, categorías, etiquetas, fijadas, privadas o compartidas por equipo.
- Registro de decisiones separado: decisión, contexto, alternativas, responsable, fecha, estado y consecuencias.
- Versionado e historial de cambios.
- Sanitizar contenido; no permitir HTML/script arbitrario.

### 5. Meeting Kit

- Agenda, visita, guion/speech, preguntas, presentación y materiales editables desde el panel.
- Orden por drag-and-drop accesible, modo ensayo y vista limpia para presentar.
- ES/EN cuando exista contenido en ambos idiomas.
- Toda afirmación técnica o financiera debe conservar clasificación/procedencia y nunca promocionarse automáticamente de borrador a hecho.

### 6. Investor CRM y acceso

- Organizaciones, contactos, etapa, propietario interno, última interacción, próxima acción y notas.
- Invitaciones individuales o multi-visitante con NDA exacto, caducidad, límites y aprobación manual.
- Visitante, aceptación NDA, PDF/evidence hash, sesiones y auditoría relacionados.
- El enlace compartido siempre crea una identidad independiente. Un correo ya registrado no puede reutilizar el enlace para crear otra sesión: recuperación solo mediante verificación de correo.
- Acciones: aprobar, exigir reverificación, revocar sesión, revocar visitante, revocar invitación y exportar registro enmascarado.

### 7. Documentos y materiales

- Registro de materiales con título, tipo, versión, idioma, clasificación, estado, propietario, procedencia y enlace/objeto de almacenamiento.
- No copiar archivos con licencia `REVIEW_REQUIRED` a distribución pública.
- Preparar interfaz de Google Cloud Storage con URLs firmadas cortas; metadatos en PostgreSQL.

### 8. Seguridad y auditoría

- Usuarios internos, sesiones activas, intentos fallidos, cambios de navegador/red, revocaciones y cambios sensibles.
- Filtros y exportación sin exponer IP completa ni secretos.
- Estado de MFA, correo verificado, SMTP, HTTPS, NDA/privacy legal status y modo externo.
- Ningún control visual puede sustituir autorización backend.

## Modelo de datos y API

Crea migraciones incrementales, idempotentes y revisables. No edites migraciones ya aplicadas para cambiar producción. Añade las tablas necesarias para miembros, invitaciones internas, participantes, comentarios, etiquetas, decisiones, materiales y relaciones. Usa claves foráneas, índices, constraints y timestamps UTC.

Implementa endpoints Fastify con Zod, RBAC por endpoint, CSRF en mutaciones, paginación, búsqueda y respuestas de error estables. Todas las mutaciones relevantes deben escribir en `private_portal.audit_events` dentro de una estrategia transaccional coherente.

## Frontend

- React implementable y accesible; navegación clara y responsive.
- Diseño enterprise sobrio, alineado con el lenguaje visual actual.
- Estados loading/empty/error/success, formularios con validación, confirmación de acciones destructivas y tablas utilizables en portátil.
- No glassmorphism excesivo, neón, emojis ni gráficos ficticios.
- Divide `access-control.tsx` en módulos mantenibles; no continúes ampliando un único archivo monolítico.
- Mantén rutas públicas, inversor y admin estrictamente separadas.

## Pruebas y aceptación

Incluye como mínimo:

1. Matriz RBAC por endpoint y pruebas de denegación.
2. Alta de socio, consumo único, expiración y MFA.
3. CRUD, archivo e historial de agenda/tareas/notas/decisiones.
4. CSRF, cookie copiada a otro user-agent, cambio de red y revocación.
5. Enlace de inversor compartido: dos identidades separadas.
6. Intento de reutilizar el correo del primer visitante: denegado.
7. Build, typecheck, unit tests y E2E en navegador.
8. Migración sobre una copia de la base existente sin pérdida de datos.

Entrega un informe final con archivos modificados, migraciones, decisiones, riesgos abiertos, pruebas ejecutadas, capturas de las pantallas principales y procedimiento exacto de despliegue/rollback. No habilites producción externa ni declares el NDA legalmente aprobado sin autorización documental explícita.

