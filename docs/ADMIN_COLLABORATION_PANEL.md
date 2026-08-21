# Panel Administrativo Colaborativo — UP AI DOWN

> **Rama:** `infra/gcp-production`  
> **Migración:** `infra/migrations/006_collaborative_admin_panel.sql`  
> **Acceso:** `/admin/*` — sólo personal interno autenticado con sesión activa

---

## Arquitectura general

El panel extiende el sistema existente sin sustituir ninguna pieza. Comparte:

- La misma instancia Fastify (`apps/api/src/server.ts`)  
- El mismo mecanismo de sesión `__Host-` cookie + HMAC-SHA256  
- El mismo RBAC interno (`requireAdmin` / `requireAdminMutation`) que ya protege agenda, tareas y notas  
- El pool PostgreSQL compartido (`private_portal` schema)

Los tres nuevos módulos se registran con una sola línea en `private-access.ts`:

```typescript
registerMeetingKitRoutes(app, {pool, requireAdmin, requireAdminMutation, audit});
registerCrmRoutes(app,        {pool, requireAdmin, requireAdminMutation, audit});
registerMaterialsRoutes(app,  {pool, requireAdmin, requireAdminMutation, audit});
```

---

## Matriz de permisos (RBAC)

| Operación | OWNER | ADMIN | EDITOR | VIEWER |
|---|:---:|:---:|:---:|:---:|
| Leer todo | ✅ | ✅ | ✅ | ✅ |
| Crear / editar Meeting Kit | ✅ | ✅ | ✅ | ❌ |
| Archivar Meeting Kit | ✅ | ✅ | ❌ | ❌ |
| Crear / editar CRM orgs + contactos | ✅ | ✅ | ✅ | ❌ |
| Registrar / editar Material | ✅ | ✅ | ✅ | ❌ |
| Cambiar estado de Material | ✅ | ✅ | ❌ | ❌ |
| Distribuir Material (`REVIEW_REQUIRED→DISTRIBUTED`) | ✅ | ✅ | ❌ | ❌ |

> El cambio de estado de Materials requiere `approvalNote` cuando `classification = REVIEW_REQUIRED` y `status → DISTRIBUTED`. La regla se aplica en el route handler, no sólo en el schema Zod.

---

## Módulo 1 — Meeting Kit (`/admin/meeting-kit`)

### Propósito
Repositorio editable de elementos de reunión: agenda, cues de discurso, preguntas a inversores, referencias a materiales, checklists y notas. Sirve de guía viva para el equipo durante la preparación de reuniones.

### Endpoints

| Método | Ruta | Acción | Roles mínimos |
|---|---|---|---|
| `GET` | `/api/v1/admin/meeting-kit` | Lista activos ordenados por `sort_order ASC` | Todos |
| `POST` | `/api/v1/admin/meeting-kit` | Crea ítem | EDITOR+ |
| `PATCH` | `/api/v1/admin/meeting-kit/:id` | Edita ítem | EDITOR+ |
| `POST` | `/api/v1/admin/meeting-kit/:id/reorder` | Cambia posición (↑/↓ UI) | EDITOR+ |
| `POST` | `/api/v1/admin/meeting-kit/:id/archive` | Archiva | ADMIN+ |

### Schema SQL (tabla principal)

```sql
private_portal.meeting_kit_items
  id, item_type (AGENDA|SPEECH|QUESTION|MATERIAL|CHECKLIST|NOTE),
  language (ES|EN|BOTH), title, body,
  classification (PUBLIC|INTERNAL|CONFIDENTIAL|SYNTHETIC|CONCEPT_RENDER|LEGAL_REVIEW),
  sort_order, status (ACTIVE|ARCHIVED),
  linked_event_id → project_events(id), created_by, updated_by
```

### Nota de diseño
El reordenado usa `sort_order` (entero) gestionado por botones ↑/↓ en la UI. El frontend incrementa/decrementa en saltos de 10 para dejar espacio entre ítems sin renumerar toda la lista.

---

## Módulo 2 — Investor CRM (`/admin/crm`)

### Propósito
Gestión del pipeline de inversores: organizaciones con etapas de negociación y contactos individuales con vinculación opcional a `visitors` (visitantes reales del portal).

### Endpoints

| Método | Ruta | Acción | Roles mínimos |
|---|---|---|---|
| `GET` | `/api/v1/admin/crm/organisations` | Lista orgs con conteo de contactos | Todos |
| `GET` | `/api/v1/admin/crm/organisations/:id` | Org + contactos | Todos |
| `POST` | `/api/v1/admin/crm/organisations` | Crea org | EDITOR+ |
| `PATCH` | `/api/v1/admin/crm/organisations/:id` | Actualiza org / avanza etapa | EDITOR+ |
| `GET` | `/api/v1/admin/crm/contacts` | Lista contactos con org y visitor info | Todos |
| `POST` | `/api/v1/admin/crm/contacts` | Crea contacto | EDITOR+ |
| `PATCH` | `/api/v1/admin/crm/contacts/:id` | Edita contacto | EDITOR+ |

### Pipeline de etapas

```
PROSPECT → INTRO → MEETING → DILIGENCE → TERM_SHEET → CLOSED_WON / CLOSED_LOST / ON_HOLD
```

### Schema SQL

```sql
private_portal.crm_organisations
  id, name, org_type (INVESTOR|FAMILY_OFFICE|VC|CORPORATE|GOVERNMENT|OTHER),
  country, stage, owner_id → admin_users(id),
  last_interaction_at, next_action, next_action_at, notes,
  status (ACTIVE|ARCHIVED), created_by, updated_by

private_portal.crm_contacts
  id, organisation_id → crm_organisations(id),
  visitor_id → visitors(id) NULLABLE,  ← vincula con NDA/sesión del portal
  first_name, last_name, email, role_title, phone, is_primary,
  notes, status (ACTIVE|ARCHIVED), created_by, updated_by
```

---

## Módulo 3 — Material Registry (`/admin/materials`)

### Propósito
Registro centralizado de documentos y assets con ciclo de vida controlado. Impide la distribución de materiales marcados como `REVIEW_REQUIRED` sin aprobación explícita de OWNER/ADMIN.

### Endpoints

| Método | Ruta | Acción | Roles mínimos |
|---|---|---|---|
| `GET` | `/api/v1/admin/materials` | Lista con filtros | Todos |
| `GET` | `/api/v1/admin/materials/:id` | Material con historial de aprobación | Todos |
| `POST` | `/api/v1/admin/materials` | Registra (estado inicial: DRAFT) | EDITOR+ |
| `PATCH` | `/api/v1/admin/materials/:id` | Actualiza / avanza estado | EDITOR+ (escritura), ADMIN+ (estado) |

### Ciclo de vida de estados

```
DRAFT → APPROVED → DISTRIBUTED → RETIRED
                                  ↑
         REVIEW_REQUIRED + → DISTRIBUTED requiere approvalNote + ADMIN/OWNER
```

### Schema SQL

```sql
private_portal.material_registry
  id, title, material_type (DOCUMENT|PRESENTATION|SPREADSHEET|IMAGE|VIDEO|DATASET|OTHER),
  version, language (ES|EN|BOTH|OTHER),
  classification (PUBLIC|INTERNAL|CONFIDENTIAL|REVIEW_REQUIRED|SYNTHETIC|CONCEPT_RENDER),
  status (DRAFT|APPROVED|DISTRIBUTED|RETIRED),
  provenance, owner_id → admin_users(id),
  gcs_object (GCS path opcional), external_url (URL externo opcional),
  approval_note, approved_by → admin_users(id), approved_at,
  notes, metadata jsonb, created_by, updated_by
```

---

## Archivos modificados / creados

### Backend

| Archivo | Tipo | Descripción |
|---|---|---|
| `infra/migrations/006_collaborative_admin_panel.sql` | Migración SQL | Tablas CRM, Meeting Kit, Material Registry + índices |
| `apps/api/src/workspace-schema.ts` | Reescrito | Schemas Zod para los 3 nuevos módulos |
| `apps/api/src/workspace-meeting-kit.ts` | Nuevo plugin | 5 endpoints Meeting Kit |
| `apps/api/src/workspace-crm.ts` | Nuevo plugin | 7 endpoints CRM |
| `apps/api/src/workspace-materials.ts` | Nuevo plugin | 4 endpoints Materials con guardia REVIEW_REQUIRED |
| `apps/api/src/private-access.ts` | Modificado | Importa y registra los 3 plugins + imports de schemas |
| `apps/api/src/workspace-schema.test.ts` | Extendido | Schemas de colaboración cubiertos con `node:test` |

### Frontend

| Archivo | Tipo | Descripción |
|---|---|---|
| `apps/web/src/admin-collaboration.tsx` | Extendido | `MeetingKitView`, `InvestorCrmView`, `MaterialsView` con RBAC client-side |
| `apps/web/src/access-control.tsx` | Modificado | Import + 3 renders en AdminPortal + 3 links en AdminNav |
| `apps/web/src/app.tsx` | Modificado | Rutas React Router: `/admin/meeting-kit`, `/admin/crm`, `/admin/materials` |

---

## Tests

```bash
# API y schemas de colaboración
pnpm --filter @ued/api test

# TypeScript — sin errores
pnpm --filter @ued/api build
pnpm --filter @ued/web build
```

---

## Despliegue

La migración `006` se aplica automáticamente en el arranque del servidor vía `portal-migrations.ts`. Es idempotente (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).

No se requiere ningún cambio en `docker-compose.yml` ni en la configuración Nginx.
