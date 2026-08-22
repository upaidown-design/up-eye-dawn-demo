# Auditoría integral de workflows y preparación de release

Fecha: 22 de agosto de 2026
Rama: `infra/gcp-production`
Clasificación: INTERNAL / ADMIN CONFIDENTIAL

## Veredicto ejecutivo

El runtime local de demostración y los flujos privados principales están implementados y verificados en un entorno Docker aislado desde una base de datos vacía. La suite ejecuta 58 pruebas unitarias/modelo y 4 escenarios E2E de navegador. No se detectaron vulnerabilidades conocidas en las dependencias.

El portal **no está autorizado todavía para una apertura externa real de NDA**. El propio runtime mantiene el cierre de seguridad porque los textos NDA EU/EEA y US y el aviso de privacidad siguen en borrador, no existe evidencia de validación del proveedor real de verificación de correo, y falta demostrar MFA y entrega SMTP archivada con la configuración final de producción.

La visualización avanzada sigue siendo una demostración honesta: mapa, ECharts, Motion y WebGL funcionan, pero Rover y Sentinel continúan siendo geometría 3D procedural. No existen aún los GLB aprobados y articulados ni un pipeline NDVI real.

## Evidencia ejecutada

| Capa | Resultado | Evidencia |
|---|---:|---|
| Unitarias de workspace | PASS · 47 | API 34, motor 4, configuración 3, contratos 3, web 2, worker 1 |
| Modelo financiero | PASS · 11 | conciliación, runway, dilución, guardrails y estados controlados |
| E2E navegador | PASS · 4 | Chromium, 1600×900, base de datos y correo vacíos/aislados |
| Truth freeze | PASS | 32 superficies activas versionadas; términos de ronda no aprobados siguen nulos |
| Dependencias | PASS | `pnpm audit --audit-level high`: sin vulnerabilidades conocidas |
| Build productivo | PASS en Docker | Node exacto 24.18.0; API, web, worker y paquetes compilados |
| Migraciones | PASS | 001–007 aplicadas en orden sobre PostgreSQL/PostGIS vacío |
| Portal local | PASS | `PRIVATE_PORTAL_READY_FOR_LOCAL_TESTING` con el `.env` local existente |
| Consola/navegación | PASS | sin errores en las vistas auditadas; el worker MapLibre se entrega como JavaScript |

La máquina anfitriona tiene Node 25.4.0, por lo que el build local falla deliberadamente el control de runtime. Docker y CI usan Node 24.18.0, que es el runtime soportado.

## Workflows comprobados

### Público y navegación

- Home `/demo/` pública y renderizada sin errores de consola.
- Preflight, demo, analytics, fleet y rutas internas protegidas.
- `/investor/` ya no depende de una carpeta externa al repositorio; redirige a `/demo/investor`.
- Redirects relativos para que Docker, HTTPS y reverse proxies no filtren el puerto interno `8088`.

### Administradores y equipo

- Login de propietario y consulta de sesión sin ruido 401 en la pantalla de acceso.
- CSRF obligatorio en mutaciones.
- Roles OWNER/ADMIN/EDITOR/VIEWER; un EDITOR no puede invitar equipo.
- Invitación de miembro de un solo uso, contraseña fuerte y TOTP individual.
- Rechazo de reutilización de invitación.
- Recuperación que rota contraseña y MFA e invalida sesiones anteriores.
- Enrolamiento TOTP, login MFA y recuperación MFA de un miembro del equipo; el propietario compartido de la suite permanece sin mutar para que cada spec sea independiente.
- Logout e invalidación comprobados.

### Panel de operaciones

- Agenda con validación de intervalos también en actualizaciones parciales.
- Tareas, notas, decisiones, comentarios e historial.
- Versiones inmutables de notas y decisiones, con índices únicos por entidad/versión.
- Meeting kit editable, ordenación y archivado.
- CRM de organizaciones/contactos y detalle relacionado.
- Registro de materiales y bloqueo `REVIEW_REQUIRED → DISTRIBUTED` sin nota de aprobación.

### Inversores, NDA y sesiones

- Invitación multivisitante con límite real de registros.
- Cada visitante crea identidad y aceptación propias; compartir cookies o enlace no hereda acceso.
- Registro con textos legal/privacy clasificados como borrador de workflow.
- Verificación de correo falla cerrada cuando el proveedor no está activo.
- Aprobación manual por administrador.
- PDF de evidencia generado, descargable por visitante y administrador.
- Entrega SMTP y copia de archivo probadas contra Mailpit, no contra el proveedor final.
- Exportación CSV del ledger.
- Cambio de IP y cambio de cliente invalidan la sesión.
- Revocación explícita de sesión, NDA, visitante e invitación disponible; revocación de sesión probada.
- IDs de sesión inválidos devuelven 400 y no alcanzan PostgreSQL como UUID defectuoso.

### Demo y datos

- Reset inicial, seek por 10 fases y snapshots sincronizados.
- Tres ejecuciones completas consecutivas a 20× vuelven al mismo estado determinista.
- Sentinel, dron, Rover, probe, NDVI, anomalía, fusión y reporte aparecen en sus fases.
- Vistas financieras, NDVI, anomaly, fleet, Rover, Sentinel, ground truth, data engine y system health sin overflow en 1440, 1920 y 2560 px.
- El NDVI y las lecturas de suelo permanecen etiquetados como SYNTHETIC/SIMULATED.

## Defectos corregidos durante la auditoría

1. La inicialización del propietario sobrescribía su contraseña recuperada en cada reinicio. El seed ahora conserva credenciales existentes.
2. La API podía arrancar durante el reinicio interno de PostgreSQL y caer con `ECONNREFUSED`. Las migraciones reintentan la conexión con backoff acotado.
3. Las pruebas E2E no compartían la sesión del navegador con la API y daban falsos 401.
4. Nginx generaba redirects absolutos con el puerto interno; ahora son relativos.
5. El endpoint de sesión del login generaba un 401 visible aunque la ausencia de sesión fuese normal.
6. Las actualizaciones parciales de agenda podían producir `ends_at < starts_at`.
7. Las notas y decisiones carecían de snapshots de versión consultables.
8. El decodificador Base32 aceptaba secretos malformados.
9. Los contratos de escenario aceptaban fases invertidas, solapadas o fuera de duración.
10. El endpoint de revocación de sesión permitía que un ID inválido provocase un 500 de PostgreSQL.
11. El repositorio dependía de una web Investor no versionada situada fuera de Git.
12. Los E2E sobrescribían assets fallback versionados; ahora escriben evidencia temporal salvo opt-in explícito.
13. No existía un quality gate de GitHub Actions; se añadió unit/build/truth/audit y E2E Docker.
14. El worker de MapLibre se publicaba sin `maplibre-gl-shared.mjs`; Vite ahora incorpora explícitamente esa dependencia y el navegador carga ambos módulos con MIME JavaScript correcto.
15. Los comandos de la misión dependían solo del siguiente mensaje WebSocket para refrescar la UI; ahora también aplican el snapshot confirmado por la respuesta HTTP, eliminando carreras de reset.

## Bloqueos P0 antes de acceso externo

1. Aprobación por counsel de los NDA EU/EEA y US, privacidad, retención, ley aplicable y perfil de firma. No convertir borradores en contratos por una variable de entorno.
2. Configurar y probar Google Identity Platform/Firebase con dominio autorizado, email-link real, caducidad y recovery.
3. Configurar proveedor SMTP transaccional final, SPF/DKIM/DMARC, remitente, buzón de archivo y prueba de entrega completa.
4. Exigir MFA y comprobar que todos los administradores activos están enrolados; desactivar el acceso DEV temporal y eliminar la invitación por defecto.
5. Ejecutar un smoke remoto desde dos redes/dispositivos reales contra el dominio HTTPS para validar la cadena `Caddy/GCP → Nginx → Fastify` y la IP efectiva.
6. Definir y ensayar procedimiento de derechos de privacidad, retención/borrado y preservación de evidencia contractual.

## Backlog P1 de producto/ingeniería

- Completar OpenAPI: existen aproximadamente 63 rutas registradas y el documento actual describe solo dos.
- Sustituir `demo-memory` y el worker `deterministic-fallback` por jobs persistentes, idempotentes y observables cuando exista procesamiento real.
- Implementar pipeline NDVI con raster/bandas Red-NIR reales, georreferenciación, versionado y provenance; hoy solo existe fallback sintético.
- Producir y validar GLB Rover/Sentinel con jerarquías, pivotes, clips y PBR; hoy la geometría es procedural y no reproduce el hardware aprobado.
- Reducir bundles: el chunk principal ronda 2.09 MB y OrbitControls/Three ronda 0.90 MB minificado; aplicar lazy loading por ruta y separación de vendor/3D.
- Resolver el warning de build del fallback `ecosystem-3d-fallback-v2.png` mediante import/manifest verificable.
- Añadir almacenamiento de objetos versionado para materiales y evidencias grandes, con antivirus, checksum y política de acceso.
- Añadir observabilidad productiva: métricas, tracing, alertas, SLO, auditoría de fallos SMTP/Identity y panel de jobs.
- Probar restauración de backup, no solo existencia de snapshots; documentar RPO/RTO.
- Añadir accesibilidad automatizada y regresión visual con baseline aprobado.

## Riesgos operativos y del entorno

- La carpeta original de Desktop fue marcada `dataless` por macOS durante la ejecución y bloqueó lecturas. Se recuperó el snapshot desde la imagen Docker y GitHub en `/Users/chris/Developer/up-eye-dawn-demo-audit` sin borrar el original. El repositorio canónico no debería vivir en una carpeta optimizada/sincronizada que pueda descargar archivos bajo demanda.
- `graphify-out` existente corresponde a una versión anterior centrada en la presentación financiera y no debe citarse como cobertura del portal actual hasta regenerarlo.
- Los materiales y claims visuales siguen sujetos a ownership/licencias y truth-review.
- La disponibilidad física y especificaciones de Rover/Sentinel no están validadas por este software.

## Comandos de verificación

```bash
pnpm -r test
pnpm financial:test
pnpm truth:check
pnpm audit --audit-level high
pnpm demo:test
PORTAL_ENV_FILE=/ruta/segura/app.env pnpm portal:security-check
```

`pnpm demo:test` levanta PostgreSQL/PostGIS, Redis, Mailpit, API, worker y gateway aislados, ejecuta Chromium y destruye el entorno y volumen al terminar.

## Criterio de salida

La demo local puede utilizarse para ensayo interno. El acceso externo queda bloqueado hasta cerrar todos los P0 y completar un smoke del dominio de producción. “Funciona” significa aquí que los flujos implementados son reproducibles; no significa que el NDA sea asesoramiento legal, que el hardware sea un prototipo físico, que el NDVI sea real ni que los modelos 3D estén terminados.
