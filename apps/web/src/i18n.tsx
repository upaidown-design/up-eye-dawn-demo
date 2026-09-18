import i18next from "i18next";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AppLanguage = "en" | "es";
const STORAGE_KEY = "ued-language";

export const spanishExact: Record<string, string> = {
  "Demo transparency": "Transparencia de la demo",
  "Team access": "Acceso del equipo",
  "Administrator sign in": "Acceso de administrador",
  "AUTONOMOUS FIELD INTELLIGENCE": "INTELIGENCIA AUTÓNOMA DE CAMPO",
  "Observe from the air.": "Observa desde el aire.",
  "Verify on the ground.": "Verifica sobre el terreno.",
  "UP AI DOWN is developing an integrated agritech system that connects fixed sensing, aerial observation, autonomous ground investigation and a common data layer.":
    "UP AI DOWN desarrolla un sistema agritech integrado que conecta sensórica fija, observación aérea, investigación terrestre autónoma y una capa común de datos.",
  "PRIVATE INVESTOR ROOM": "SALA PRIVADA PARA INVERSORES",
  "Investor materials are invitation-only. Open the personal secure link sent by the project team; every recipient must create an individual record and complete the assigned NDA.":
    "Los materiales para inversores requieren invitación. Abre el enlace seguro personal enviado por el equipo del proyecto; cada destinatario debe crear un registro individual y completar el NDA asignado.",
  "Sentinel field node": "Nodo de campo Sentinel",
  "Persistent field presence and environmental context.":
    "Presencia permanente en campo y contexto ambiental.",
  "Autonomous survey": "Inspección autónoma",
  "Structured observation across the agricultural site.":
    "Observación estructurada de toda la explotación agrícola.",
  "Rover investigation": "Investigación con rover",
  "Terrestrial inspection and soil ground truth.":
    "Inspección terrestre y verificación directa del suelo.",
  "Field intelligence": "Inteligencia de campo",
  "A versioned evidence layer for analysis and decisions.":
    "Una capa versionada de evidencias para análisis y decisiones.",
  "CONCEPT-LED PRODUCT DEVELOPMENT":
    "DESARROLLO DE PRODUCTO BASADO EN CONCEPTOS",
  "Public product overview. Hardware imagery is concept visualization; private demo data and mission outputs are simulated unless expressly identified otherwise.":
    "Resumen público del producto. Las imágenes del hardware son visualizaciones conceptuales; los datos privados de la demo y los resultados de misión son simulados salvo indicación expresa.",
  "Investor demo": "Demo para inversores",
  "Mission control": "Control de misión",
  "System health": "Estado del sistema",
  CONNECTED: "CONECTADO",
  RECONNECTING: "RECONECTANDO",
  "START INVESTOR DEMO": "INICIAR DEMO PARA INVERSORES",
  "NEW YORK · PRESENTATION SYSTEM": "NUEVA YORK · SISTEMA DE PRESENTACIÓN",
  "Autonomous Field Intelligence": "Inteligencia autónoma de campo",
  "Synthetic farm": "Explotación sintética",
  "Procedural models": "Modelos procedurales",
  "Local assets": "Recursos locales",
  "Browser renderer": "Renderizador del navegador",
  READY: "LISTO",
  "FALLBACK READY": "ALTERNATIVA LISTA",
  "All telemetry, farm data, imagery, NDVI and agronomic outputs in this environment are synthetic or simulated.":
    "Toda la telemetría, los datos de campo, las imágenes, el NDVI y los resultados agronómicos de este entorno son sintéticos o simulados.",
  "Mission telemetry": "Telemetría de misión",
  "Drone state": "Estado del dron",
  Altitude: "Altitud",
  "Drone battery": "Batería del dron",
  Coverage: "Cobertura",
  "Rover state": "Estado del rover",
  "Rover battery": "Batería del rover",
  "SYNTHETIC SOIL SAMPLE": "MUESTRA DE SUELO SINTÉTICA",
  Moisture: "Humedad",
  "SIMULATED MISSION REPORT": "INFORME DE MISIÓN SIMULADO",
  "REPORT READY": "INFORME LISTO",
  "EVENT STREAM": "FLUJO DE EVENTOS",
  PLAY: "REPRODUCIR",
  PAUSE: "PAUSA",
  RESET: "REINICIAR",
  FULLSCREEN: "PANTALLA COMPLETA",
  "Sentinel Ready": "Sentinel listo",
  "Mast Deploy": "Despliegue del mástil",
  "Drone Launch": "Despegue del dron",
  Survey: "Inspección",
  "Capture Complete": "Captura completada",
  Anomaly: "Anomalía",
  "Rover Dispatch": "Envío del rover",
  "Ground Truth": "Verificación terrestre",
  "Data Fusion": "Fusión de datos",
  Report: "Informe",
  "OPERATOR MODE · DETERMINISTIC SIMULATION":
    "MODO OPERADOR · SIMULACIÓN DETERMINISTA",
  Overview: "Vista general",
  Drone: "Dron",
  Rover: "Rover",
  Sentinel: "Sentinel",
  "MISSION COVERAGE": "COBERTURA DE MISIÓN",
  "INTELLIGENCE RAIL": "PANEL DE INTELIGENCIA",
  "Fixed node · simulated state": "Nodo fijo · estado simulado",
  "AERIAL CAPTURES": "CAPTURAS AÉREAS",
  "COORDINATED RESPONSE": "RESPUESTA COORDINADA",
  "GROUND INSPECTION REQUIRED": "SE REQUIERE INSPECCIÓN TERRESTRE",
  "DISPATCH ROVER": "ENVIAR ROVER",
  CLASSIFICATION: "CLASIFICACIÓN",
  SIMULATED: "SIMULADO",
  "Farm, telemetry, NDVI and evidence chain":
    "Explotación, telemetría, NDVI y cadena de evidencias",
  TRANSPARENCY: "TRANSPARENCIA",
  "About this demo": "Acerca de esta demo",
  "DEVELOPMENT ONLY · CANONICAL SOURCE": "SOLO DESARROLLO · FUENTE CANÓNICA",
  "WHAT EXISTS TODAY": "QUÉ EXISTE HOY",
  "CURRENT CLAIMS": "AFIRMACIONES ACTUALES",
  "UNRESOLVED P0": "P0 SIN RESOLVER",
  "Concept asset registry": "Registro de recursos conceptuales",
  "All imagery is concept-only: not prototype evidence, CAD, manufacturing geometry or a validated technical claim.":
    "Todas las imágenes son exclusivamente conceptuales: no constituyen evidencia de prototipo, CAD, geometría de fabricación ni una afirmación técnica validada.",
  "Verifying confidential access…": "Verificando el acceso confidencial…",
  "UP AI DOWN · PRIVATE OPERATIONS": "UP AI DOWN · OPERACIONES PRIVADAS",
  "Investor access,": "Acceso de inversores,",
  "under control.": "bajo control.",
  "Invitations, individual visitors, NDA evidence, active sessions and meeting materials are managed in one auditable workspace.":
    "Las invitaciones, los visitantes individuales, las evidencias de NDA, las sesiones activas y los materiales de reunión se gestionan en un espacio de trabajo auditable.",
  "ADMINISTRATOR ACCESS": "ACCESO DE ADMINISTRADOR",
  "Sign in": "Iniciar sesión",
  "Use administrator credentials. Enter an authenticator code only if MFA is enabled on your account.":
    "Utiliza tus credenciales de administrador. Introduce el código del autenticador solo si tu cuenta tiene MFA activado.",
  Email: "Correo electrónico",
  Password: "Contraseña",
  "Authenticator code": "Código del autenticador",
  "TEST ACCESS · TEMPORARY": "ACCESO DE PRUEBAS · TEMPORAL",
  "Enter with one click — no password or code":
    "Entra con un clic, sin contraseña ni código",
  "optional unless MFA is enabled": "opcional salvo que MFA esté activado",
  "VERIFYING…": "VERIFICANDO…",
  "ENTER PRIVATE PORTAL": "ENTRAR AL PORTAL PRIVADO",
  "The credentials or verification code are incorrect.":
    "Las credenciales o el código de verificación son incorrectos.",
  "Invitation required": "Invitación necesaria",
  "SESSION EXPIRED": "SESIÓN CADUCADA",
  "Your secure session has expired.": "Tu sesión segura ha caducado.",
  "ACCESS REVOKED": "ACCESO REVOCADO",
  "This access is no longer active.": "Este acceso ya no está activo.",
  "NETWORK CONTEXT CHANGED": "EL CONTEXTO DE RED HA CAMBIADO",
  "Please verify your access again.": "Verifica de nuevo tu acceso.",
  "PENDING APPROVAL": "PENDIENTE DE APROBACIÓN",
  "Your request has been recorded.": "Tu solicitud se ha registrado.",
  "Return to public overview": "Volver al resumen público",
  "ACCESS VERIFIED": "ACCESO VERIFICADO",
  "Individual access is active.": "El acceso individual está activo.",
  "ENTER PRIVATE INVESTOR ROOM": "ENTRAR A LA SALA PRIVADA DE INVERSORES",
  "Download NDA evidence": "Descargar evidencia del NDA",
  "PRIVATE INVESTOR ACCESS · EMAIL OWNERSHIP":
    "ACCESO PRIVADO PARA INVERSORES · TITULARIDAD DEL CORREO",
  "Verify your business email before signing.":
    "Verifica tu correo profesional antes de firmar.",
  "INDIVIDUAL VERIFICATION": "VERIFICACIÓN INDIVIDUAL",
  "Check your inbox": "Revisa tu bandeja de entrada",
  "Confirm email ownership": "Confirmar la titularidad del correo",
  "Business email": "Correo profesional",
  "SEND SECURE EMAIL LINK": "ENVIAR ENLACE SEGURO POR CORREO",
  "SENDING…": "ENVIANDO…",
  "SEND ANOTHER LINK": "ENVIAR OTRO ENLACE",
  "PRIVATE INVESTOR ACCESS": "ACCESO PRIVADO PARA INVERSORES",
  "SECURE RE-VERIFICATION": "REVERIFICACIÓN SEGURA",
  "Confidential materials begin with an individual record.":
    "Los materiales confidenciales comienzan con un registro individual.",
  "Your network changed. Verify the individual record again.":
    "Tu red ha cambiado. Verifica de nuevo el registro individual.",
  "RECIPIENT & SIGNATORY DETAILS": "DATOS DEL DESTINATARIO Y FIRMANTE",
  "Create and sign your record": "Crear y firmar tu registro",
  "Verify again": "Verificar de nuevo",
  "Full legal name": "Nombre legal completo",
  "Legal organisation / entity": "Organización o entidad legal",
  "Registered address": "Domicilio social",
  "Role / signatory title": "Cargo del firmante",
  Country: "País",
  "Electronic signature — type your full legal name":
    "Firma electrónica — escribe tu nombre legal completo",
  "Must exactly match the full legal name above.":
    "Debe coincidir exactamente con el nombre legal completo indicado arriba.",
  "I have read and agree to the NDA displayed on this page.":
    "He leído y acepto el NDA mostrado en esta página.",
  "I acknowledge the privacy notice and processing of technical identifiers for access security.":
    "Reconozco el aviso de privacidad y el tratamiento de identificadores técnicos para la seguridad de acceso.",
  "CREATE INDIVIDUAL RECORD & SIGN": "CREAR REGISTRO INDIVIDUAL Y FIRMAR",
  "SIGNING & VERIFYING…": "FIRMANDO Y VERIFICANDO…",
  "Disclosing party:": "Parte divulgadora:",
  "Governing law:": "Ley aplicable:",
  "Privacy and access record": "Registro de privacidad y acceso",
  "The invitation may be shared, but every person receives an independent record. Access is never inherited from another visitor’s password, cookie or email address.":
    "La invitación puede compartirse, pero cada persona recibe un registro independiente. El acceso nunca se hereda de la contraseña, las cookies o el correo de otro visitante.",
  "DRAFT FOR WORKFLOW TESTING": "BORRADOR PARA PRUEBAS DEL FLUJO",
  "WORKFLOW TEST ONLY — this draft has not been approved by legal counsel and must be replaced before external use.":
    "SOLO PRUEBA DEL FLUJO — este borrador no ha sido aprobado por un abogado y debe sustituirse antes de cualquier uso externo.",
  "A single-use sign-in link was sent. Open it in this same browser to continue to the assigned NDA.":
    "Se ha enviado un enlace de acceso de un solo uso. Ábrelo en este mismo navegador para continuar con el NDA asignado.",
  "The link expires and does not replace the NDA, administrator approval or the client-bound portal session.":
    "El enlace caduca y no sustituye el NDA, la aprobación del administrador ni la sesión del portal vinculada al dispositivo.",
  "Review the assigned agreement, provide your business identity and apply your typed legal name as an electronic signature.":
    "Revisa el acuerdo asignado, facilita tu identidad profesional y utiliza tu nombre legal escrito como firma electrónica.",
  "I intend my typed name to be my electronic signature and consent to receive and retain this agreement and its evidence record electronically.":
    "Declaro que mi nombre escrito constituye mi firma electrónica y consiento recibir y conservar electrónicamente este acuerdo y su registro de evidencias.",
  "SIGNING & RECORDING…": "FIRMANDO Y REGISTRANDO…",
  "SIGN NDA & CONTINUE": "FIRMAR EL NDA Y CONTINUAR",
  "The system stores the assigned document version and hash, signatory data, affirmative intent, UTC timestamp, security evidence and an exact PDF copy. This is a simple electronic-signature workflow, not an advanced or qualified electronic signature.":
    "El sistema conserva la versión y el hash del documento asignado, los datos del firmante, su consentimiento expreso, la marca temporal UTC, la evidencia de seguridad y una copia PDF exacta. Es un flujo de firma electrónica simple, no una firma avanzada ni cualificada.",
  "Your acknowledgement and independent secure session have been recorded. Email delivery:":
    "Tu reconocimiento y tu sesión segura independiente han quedado registrados. Entrega por correo:",
  "Access remains bound to this browser session and network context. IP alone is never treated as identity.":
    "El acceso permanece vinculado a esta sesión del navegador y a su contexto de red. La IP nunca se considera por sí sola una identidad.",
  "ADMIN CONTROL ROOM": "CENTRO DE CONTROL ADMINISTRATIVO",
  "PRIVATE CONTROL ROOM": "CENTRO DE CONTROL PRIVADO",
  "ADMINISTRATOR WORKSPACE": "ESPACIO DE ADMINISTRACIÓN",
  "Administrator workspace": "Espacio de administración",
  "UP AI DOWN · ADMIN CONFIDENTIAL": "UP AI DOWN · ADMINISTRACIÓN CONFIDENCIAL",
  "Project & Investor Operations": "Operaciones del proyecto y de inversores",
  "UP AI DOWN": "UP AI DOWN",
  "Private operations": "Operaciones privadas",
  "Project management": "Gestión del proyecto",
  "Investor operations": "Operaciones con inversores",
  "Access and legal": "Acceso y área legal",
  "Meeting and system": "Reunión y sistema",
  "Control room": "Centro de control",
  "Investor CRM": "CRM de inversores",
  "Reference kit": "Kit de referencia",
  "Authenticated workspace": "Espacio autenticado",
  "Sign out": "Cerrar sesión",
  "Expand menu": "Ampliar menú",
  "Collapse menu": "Contraer menú",
  "Open menu": "Abrir menú",
  "View investor portal": "Ver portal de inversores",
  "Prepare meeting": "Preparar reunión",
  "Project status, priorities and recent activity.":
    "Estado del proyecto, prioridades y actividad reciente.",
  "Plan meetings, visits, travel and deadlines.":
    "Planifica reuniones, visitas, viajes y plazos.",
  "Assign work, priorities, owners and due dates.":
    "Asigna trabajo, prioridades, responsables y vencimientos.",
  "Capture project knowledge and investor context.":
    "Conserva conocimiento del proyecto y contexto de inversores.",
  "Record decisions, rationale and follow-up.":
    "Registra decisiones, motivos y seguimiento.",
  "Manage organisations, contacts and follow-up.":
    "Gestiona organizaciones, contactos y seguimiento.",
  "Review conversations and schedule follow-up.":
    "Revisa conversaciones y programa seguimientos.",
  "Control investor documents and distribution.":
    "Controla documentos para inversores y su distribución.",
  "Prepare agenda, presentation, speech and questions.":
    "Prepara agenda, presentación, discurso y preguntas.",
  "Manage partners, roles and secure access.":
    "Gestiona socios, roles y accesos seguros.",
  "Create controlled links for investor registration.":
    "Crea enlaces controlados para registrar inversores.",
  "Review identities, approvals and active access.":
    "Revisa identidades, aprobaciones y accesos activos.",
  "Create, edit and version NDA templates.":
    "Crea, edita y versiona plantillas de NDA.",
  "Inspect signed agreements and immutable evidence.":
    "Consulta acuerdos firmados y evidencias inmutables.",
  "Use the approved meeting run-of-show.":
    "Utiliza el guion operativo aprobado para la reunión.",
  "Review release gates, sessions and security events.":
    "Revisa bloqueos de publicación, sesiones y eventos de seguridad.",
  "The project, meeting and private investor flow in one place.":
    "El proyecto, la reunión y el flujo privado de inversores en un solo lugar.",
  "Project control": "Control del proyecto",
  Agenda: "Agenda",
  Tasks: "Tareas",
  Notes: "Notas",
  Decisions: "Decisiones",
  Materials: "Materiales",
  "Meeting kit": "Kit de reunión",
  Team: "Equipo",
  Invitations: "Invitaciones",
  Visitors: "Visitantes",
  "NDA library": "Biblioteca de NDA",
  "NDA ledger": "Registro de NDA",
  Meeting: "Reunión",
  Security: "Seguridad",
  "Mail center": "Centro de correo",
  "CONTROL ROOM · LIVE DATA": "CENTRO DE CONTROL · DATOS EN DIRECTO",
  "CONTROLLED RELEASE": "PUBLICACIÓN CONTROLADA",
  "Investor release:": "Publicación para inversores:",
  "Legal gates remain authoritative.":
    "Los controles jurídicos siguen siendo obligatorios.",
  "Open tasks": "Tareas abiertas",
  Overdue: "Vencidas",
  Upcoming: "Próximos eventos",
  "Pinned notes": "Notas destacadas",
  "Active invitations": "Invitaciones activas",
  Approvals: "Aprobaciones",
  "NDA accepted": "NDA aceptados",
  TODO: "POR HACER",
  BLOCKED: "BLOQUEADA",
  CRITICAL: "CRÍTICA",
  HIGH: "ALTA",
  MEDIUM: "MEDIA",
  LOW: "BAJA",
  NOTICE: "AVISO",
  WARNING: "ADVERTENCIA",
  ADMIN: "ADMINISTRADOR",
  "Portal owner": "Responsable del portal",
  "Legal owner": "Responsable jurídico",
  "Founding team": "Equipo fundador",
  "Product owner": "Responsable de producto",
  "Platform owner": "Responsable de plataforma",
  "ADMIN DEV LOGIN SUCCESS": "ACCESO TEMPORAL DE ADMINISTRACIÓN CORRECTO",
  "ADMIN LOGIN SUCCESS": "ACCESO DE ADMINISTRACIÓN CORRECTO",
  "ADMIN NETWORK CHANGED": "CAMBIO DE RED DE ADMINISTRACIÓN",
  "ADMIN LOGOUT": "CIERRE DE SESIÓN DE ADMINISTRACIÓN",
  "PROJECT TASK UPDATED": "TAREA DEL PROYECTO ACTUALIZADA",
  "EMAIL VERIFICATION SENT": "VERIFICACIÓN DE CORREO ENVIADA",
  "INVITATION OPENED": "INVITACIÓN ABIERTA",
  "INVITATION REVOKED": "INVITACIÓN REVOCADA",
  "NDA ACCEPTANCE REVOKED": "ACEPTACIÓN DEL NDA REVOCADA",
  "REPORT DOWNLOADED": "INFORME DESCARGADO",
  "SESSION CREATED": "SESIÓN CREADA",
  "NDA ACCEPTED": "NDA ACEPTADO",
  "REGISTRATION COMPLETED": "REGISTRO COMPLETADO",
  "EMAIL VERIFIED": "CORREO VERIFICADO",
  INFO: "INFORMACIÓN",
  NEXT: "PRÓXIMO",
  EXECUTION: "EJECUCIÓN",
  MEMORY: "MEMORIA",
  "Priority tasks": "Tareas prioritarias",
  Manage: "Gestionar",
  "No upcoming events. Add the meeting, travel or deadline.":
    "No hay próximos eventos. Añade una reunión, un viaje o un plazo.",
  "No open tasks. Add the next project action.":
    "No hay tareas abiertas. Añade la siguiente acción del proyecto.",
  "Pin the notes that must stay visible to the team.":
    "Destaca las notas que el equipo debe mantener visibles.",
  "AUDIT LEDGER": "REGISTRO DE AUDITORÍA",
  "Recent activity": "Actividad reciente",
  events: "eventos",
  "Enroll owner MFA before external release":
    "Activar el MFA del propietario antes de la publicación externa",
  "Approve NDA and privacy notice with counsel":
    "Aprobar el NDA y el aviso de privacidad con asesoría jurídica",
  "Run the full presentation rehearsal":
    "Realizar el ensayo completo de la presentación",
  "Truth-review the Spanish and English visual decks":
    "Revisar la veracidad de las presentaciones visuales en español e inglés",
  "Configure SMTP delivery and NDA archive":
    "Configurar el envío SMTP y el archivo de NDA",
  "Confirm New York meeting date, room and attendees":
    "Confirmar la fecha, la sala y los asistentes de la reunión de Nueva York",
  "New visual decks are reference material":
    "Las nuevas presentaciones visuales son material de referencia",
  "The two 10-page PDFs and overview JPEG contain useful narrative ideas, but include unverified specifications, autonomy claims and product geometries. Do not distribute them as validated evidence without review.":
    "Los dos PDF de 10 páginas y el JPEG de resumen contienen ideas narrativas útiles, pero incluyen especificaciones, afirmaciones de autonomía y geometrías de producto no verificadas. No deben distribuirse como evidencia validada sin revisión.",
  "External investor access remains gated":
    "El acceso externo de inversores continúa restringido",
  "The registration and NDA workflow is implemented, but external release stays disabled until legal/privacy approval, owner MFA and SMTP evidence delivery are complete.":
    "El flujo de registro y NDA está implementado, pero la publicación externa seguirá desactivada hasta completar la aprobación legal y de privacidad, el MFA del propietario y la entrega de evidencias por SMTP.",
  "01 · AGENDA": "01 · AGENDA",
  "02 · VISIT": "02 · VISITA",
  "04 · SPEECH": "04 · DISCURSO",
  "05 · REFERENCE MATERIALS": "05 · MATERIALES DE REFERENCIA",
  ACCEPTED: "ACEPTADO",
  "Allowed domain": "Dominio permitido",
  Any: "Cualquiera",
  CANCELLED: "CANCELADO",
  "COPY SECURE LINK": "COPIAR ENLACE SEGURO",
  DONE: "COMPLETADA",
  FINANCE: "FINANZAS",
  GENERAL: "GENERAL",
  Invitation: "Invitación",
  "Invitation ≠ identity ≠ session": "Invitación ≠ identidad ≠ sesión",
  LEGAL: "JURÍDICO",
  "Loading private control room…": "Cargando el centro de control privado…",
  "No additional detail.": "Sin detalles adicionales.",
  "No invalidation reason": "Sin motivo de invalidación",
  OTHER: "OTRO",
  OWNER: "PROPIETARIO",
  "Open the private invitation sent to you. Possessing another visitor’s browser session never grants access.":
    "Abre la invitación privada que te enviaron. Disponer de la sesión del navegador de otro visitante nunca concede acceso.",
  PIN: "DESTACAR",
  PRODUCT: "PRODUCTO",
  "Private control data could not be loaded.":
    "No se pudieron cargar los datos del centro de control privado.",
  RECENT: "RECIENTE",
  RECORDED: "REGISTRADO",
  REVERIFY: "REVERIFICAR",
  REVOKE: "REVOCAR",
  REVOKED: "REVOCADO",
  "Reason for revoking this NDA acceptance":
    "Motivo para revocar esta aceptación del NDA",
  "Reason for revoking this invitation": "Motivo para revocar esta invitación",
  "Reason for revoking this visitor": "Motivo para revocar este visitante",
  Recipient: "Destinatario",
  "Registration is not available for the details supplied.":
    "El registro no está disponible para los datos facilitados.",
  "Review every field. The typed acknowledgement must exactly match your full name.":
    "Revisa todos los campos. La aceptación escrita debe coincidir exactamente con tu nombre completo.",
  SCHEDULED: "PROGRAMADO",
  "SECURE LINK · SHOWN ONCE": "ENLACE SEGURO · SE MUESTRA UNA SOLA VEZ",
  SECURITY: "SEGURIDAD",
  SENT: "ENVIADO",
  TECHNICAL: "TÉCNICO",
  "The email verification link is invalid or expired. Reopen the invitation and request a new link.":
    "El enlace de verificación del correo no es válido o ha caducado. Vuelve a abrir la invitación y solicita otro enlace.",
  "This email is not permitted by the invitation.":
    "Este correo no está permitido por la invitación.",
  UNKNOWN: "DESCONOCIDO",
  UNPIN: "QUITAR DE DESTACADOS",
  VIEWER: "LECTOR",
  Version: "Versión",
  Visitor: "Visitante",
  "ACTIVATE INDIVIDUAL ACCOUNT": "ACTIVAR CUENTA INDIVIDUAL",
  "ACTIVATING…": "ACTIVANDO…",
  "ADD ITEM": "AÑADIR ELEMENTO",
  "ADD ORGANISATION": "AÑADIR ORGANIZACIÓN",
  "ADVANCE TO": "AVANZAR A",
  ALTERNATIVES: "ALTERNATIVAS",
  "Activate your account.": "Activa tu cuenta.",
  "Add item": "Añadir elemento",
  "Add organisation": "Añadir organización",
  "Agenda, speech cues, questions and materials. Plain text only.":
    "Agenda, indicaciones del discurso, preguntas y materiales. Solo texto sin formato.",
  "Archive this item?": "¿Archivar este elemento?",
  "Ask the portal owner for a new one-time recovery link.":
    "Solicita al responsable del portal un nuevo enlace de recuperación de un solo uso.",
  "Ask the portal owner for a new private team invitation.":
    "Solicita al responsable del portal una nueva invitación privada para el equipo.",
  "At least 14 characters with uppercase, lowercase, number and symbol.":
    "Al menos 14 caracteres con mayúsculas, minúsculas, números y símbolos.",
  "Body (plain text)": "Contenido (texto sin formato)",
  Both: "Ambos",
  "CONFIRM MFA": "CONFIRMAR MFA",
  CONSEQUENCES: "CONSECUENCIAS",
  CONTEXT: "CONTEXTO",
  "COPY RECOVERY LINK": "COPIAR ENLACE DE RECUPERACIÓN",
  "Checking invitation…": "Comprobando la invitación…",
  "Checking recovery link…": "Comprobando el enlace de recuperación…",
  Checklist: "Lista de comprobación",
  Classification: "Clasificación",
  "Concept render": "Render conceptual",
  Contacts: "Contactos",
  "Context, alternatives, outcome and consequences remain visible to every partner.":
    "El contexto, las alternativas, el resultado y las consecuencias permanecen visibles para todos los socios.",
  Corporate: "Corporativo",
  "Create new credentials.": "Crea nuevas credenciales.",
  DECIDED: "DECIDIDA",
  DECISION: "DECISIÓN",
  DILIGENCE: "DILIGENCIA",
  DISABLE: "DESACTIVAR",
  DISTRIBUTED: "DISTRIBUIDO",
  Dataset: "Conjunto de datos",
  Document: "Documento",
  EDITOR: "EDITOR",
  ENABLE: "ACTIVAR",
  "Enroll your owner account before enabling external production access.":
    "Activa la protección de tu cuenta de propietario antes de habilitar el acceso externo de producción.",
  "Every partner receives an independent identity, MFA factor, permissions and audit trail.":
    "Cada socio recibe una identidad, un factor MFA, permisos y un registro de auditoría independientes.",
  "External URL (optional)": "URL externa (opcional)",
  "Family office": "Family office",
  Government: "Administración pública",
  "INDIVIDUAL ACCOUNTS & ROLES": "CUENTAS Y ROLES INDIVIDUALES",
  INTRO: "INTRODUCCIÓN",
  Image: "Imagen",
  "Individual account activation.": "Activación de cuenta individual.",
  Language: "Idioma",
  "Legal review": "Revisión jurídica",
  "MARK DECIDED": "MARCAR COMO DECIDIDA",
  "MATERIAL REGISTRY": "REGISTRO DE MATERIALES",
  "MFA MISSING": "FALTA MFA",
  "Material reference": "Referencia del material",
  "New authenticator code": "Nuevo código del autenticador",
  "New strong password": "Nueva contraseña segura",
  "No country": "País no indicado",
  "No items yet. Add agenda points, speech cues or questions.":
    "Todavía no hay elementos. Añade puntos de agenda, indicaciones del discurso o preguntas.",
  "No owner": "Sin responsable",
  "No title": "Sin título",
  "One identity, password, MFA factor and audit trail per person.":
    "Una identidad, contraseña, factor MFA y registro de auditoría por persona.",
  "Open document ↗": "Abrir documento ↗",
  Order: "Orden",
  "Organisations & Contacts": "Organizaciones y contactos",
  Other: "Otro",
  "PASSWORD + INDIVIDUAL MFA": "CONTRASEÑA + MFA INDIVIDUAL",
  "PASSWORD + NEW MFA FACTOR": "CONTRASEÑA + NUEVO FACTOR MFA",
  "PRIVATE TEAM LINK · SHOWN ONCE":
    "ENLACE PRIVADO DEL EQUIPO · SE MUESTRA UNA SOLA VEZ",
  PROPOSAL: "PROPUESTA",
  PROPOSED: "PROPUESTA",
  PROSPECT: "PROSPECTO",
  Question: "Pregunta",
  "RECOVERY LINK · SHOWN ONCE":
    "ENLACE DE RECUPERACIÓN · SE MUESTRA UNA SOLA VEZ",
  "REGISTER MATERIAL": "REGISTRAR MATERIAL",
  "RESET ACCESS": "RESTABLECER ACCESO",
  RETIRE: "RETIRAR",
  RETIRED: "RETIRADO",
  REVISIT: "REVISAR DE NUEVO",
  "ROTATE PASSWORD & MFA": "CAMBIAR CONTRASEÑA Y MFA",
  "ROTATING…": "CAMBIANDO…",
  "Recover your identity": "Recupera tu identidad",
  "Register material": "Registrar material",
  "Retire this material?": "¿Retirar este material?",
  "Rotate credentials securely.": "Cambia las credenciales de forma segura.",
  "SAVING…": "GUARDANDO…",
  "Scan this code in your authenticator app before submitting the form.":
    "Escanea este código en tu aplicación de autenticación antes de enviar el formulario.",
  "Scan this replacement factor in your authenticator app.":
    "Escanea este factor de sustitución en tu aplicación de autenticación.",
  "Scan with your authenticator app":
    "Escanea con tu aplicación de autenticación",
  "Secure your identity": "Protege tu identidad",
  "Sort order": "Orden de clasificación",
  "Speech cue": "Indicación del discurso",
  Spreadsheet: "Hoja de cálculo",
  Stage: "Fase",
  "Strong password": "Contraseña segura",
  "The owner-issued link is single-use and replaces both the password and authenticator factor.":
    "El enlace emitido por el propietario es de un solo uso y sustituye tanto la contraseña como el factor de autenticación.",
  "The previous sessions and MFA factor will be invalidated.":
    "Las sesiones anteriores y el factor MFA quedarán invalidados.",
  "The recipient creates a strong password and enrolls a unique TOTP factor before the account is activated.":
    "El destinatario crea una contraseña segura y registra un factor TOTP único antes de activar la cuenta.",
  "The secure recovery context is being validated.":
    "Se está validando el contexto seguro de recuperación.",
  "This invitation is being validated.": "Se está validando esta invitación.",
  "Then enter the current six-digit code. The secret is not shown again after confirmation.":
    "Después introduce el código actual de seis dígitos. El secreto no volverá a mostrarse tras la confirmación.",
  Video: "Vídeo",
  "Your account uses an individual authenticator factor.":
    "Tu cuenta utiliza un factor de autenticación individual.",
  "ADD FOLLOW-UP": "AÑADIR SEGUIMIENTO",
  "ADD NOTE": "AÑADIR NOTA",
  "Add email follow-up": "Añadir seguimiento por correo",
  "Agreement text": "Texto del acuerdo",
  "CLONE VARIANT": "CLONAR VARIANTE",
  CLOSE: "CERRAR",
  CLOSED: "CERRADO",
  "COMMUNICATION & FOLLOW-UP": "COMUNICACIÓN Y SEGUIMIENTO",
  CONFIGURED: "CONFIGURADO",
  CONVERSATION: "CONVERSACIÓN",
  CUSTOM: "PERSONALIZADO",
  "Confirm that you are the OWNER and counsel has approved this exact text and hash.":
    "Confirma que eres el PROPIETARIO y que la asesoría jurídica ha aprobado este texto y hash exactos.",
  "Contact email": "Correo del contacto",
  Documents: "Documentos",
  "Due now": "Vence ahora",
  "Follow-up queue": "Cola de seguimientos",
  "IN PROGRESS": "EN CURSO",
  "Independent draft cloned.": "Borrador independiente clonado.",
  "Loading mail center…": "Cargando el centro de correo…",
  "MAILBOX NOT COMMISSIONED": "BUZÓN NO HABILITADO",
  MUTUAL: "MUTUO",
  "NDA library & editor": "Biblioteca y editor de NDA",
  "New immutable revision saved.": "Nueva revisión inmutable guardada.",
  "New unique version identifier": "Nuevo identificador único de versión",
  "No NDA documents found.": "No se encontraron documentos NDA.",
  "No contact email": "Sin correo de contacto",
  "No email follow-ups yet.": "Todavía no hay seguimientos por correo.",
  "No organisation": "Sin organización",
  "No text body was synchronized.": "No se sincronizó contenido de texto.",
  "Not set": "Sin configurar",
  "OPEN CONVERSATION": "ABRIR CONVERSACIÓN",
  "OPEN PRIVATE WEBMAIL": "ABRIR WEBMAIL PRIVADO",
  "Open follow-ups": "Seguimientos abiertos",
  "Provider ID": "ID del proveedor",
  "RETURN TO DRAFT": "DEVOLVER A BORRADOR",
  "Reason for this legal workflow change":
    "Motivo de este cambio en el flujo jurídico",
  "Related record": "Registro relacionado",
  "SEND TO LEGAL REVIEW": "ENVIAR A REVISIÓN JURÍDICA",
  "SYNC MAILBOX": "SINCRONIZAR BUZÓN",
  "SYNCING…": "SINCRONIZANDO…",
  "SYSTEM MESSAGES": "MENSAJES DEL SISTEMA",
  System: "Sistema",
  "This follow-up has no synchronized messages yet. Use the private webmail for composition.":
    "Este seguimiento todavía no tiene mensajes sincronizados. Utiliza el webmail privado para redactar.",
  UNSPECIFIED: "SIN ESPECIFICAR",
  "Unique version": "Versión única",
  "Unknown sender": "Remitente desconocido",
  "VERSIONED LEGAL CONTENT": "CONTENIDO JURÍDICO VERSIONADO",
  WAITING: "EN ESPERA",
  "Waiting reply": "Esperando respuesta",
  Webmail: "Webmail",
  "PROJECT CALENDAR": "CALENDARIO DEL PROYECTO",
  "Meetings, visits, presentations, travel and deadlines.":
    "Reuniones, visitas, presentaciones, viajes y plazos.",
  "Add agenda item": "Añadir elemento a la agenda",
  Title: "Título",
  Starts: "Comienza",
  Ends: "Finaliza",
  Type: "Tipo",
  Priority: "Prioridad",
  Location: "Ubicación",
  Owner: "Responsable",
  Context: "Contexto",
  "ADD TO AGENDA": "AÑADIR A LA AGENDA",
  "No additional context.": "Sin contexto adicional.",
  "Location not set": "Ubicación no indicada",
  Unassigned: "Sin asignar",
  CANCEL: "CANCELAR",
  ARCHIVE: "ARCHIVAR",
  "PROJECT EXECUTION": "EJECUCIÓN DEL PROYECTO",
  "Every commitment has an owner, priority and state.":
    "Cada compromiso tiene responsable, prioridad y estado.",
  Task: "Tarea",
  Due: "Vencimiento",
  "Related agenda item": "Elemento de agenda relacionado",
  None: "Ninguno",
  Detail: "Detalle",
  "ADD TASK": "AÑADIR TAREA",
  "TO DO": "POR HACER",
  START: "INICIAR",
  BLOCK: "BLOQUEAR",
  "PROJECT MEMORY": "MEMORIA DEL PROYECTO",
  "Decisions, investor signals and preparation context.":
    "Decisiones, señales de inversores y contexto de preparación.",
  "Add note": "Añadir nota",
  Category: "Categoría",
  Note: "Nota",
  "Keep visible in the control room.":
    "Mantener visible en el centro de control.",
  "SAVE NOTE": "GUARDAR NOTA",
  "CONTROLLED DISTRIBUTION": "DISTRIBUCIÓN CONTROLADA",
  "Create private invitation": "Crear invitación privada",
  Organisation: "Organización",
  Description: "Descripción",
  "Specific recipient email": "Correo del destinatario específico",
  "Allowed email domain": "Dominio de correo permitido",
  Policy: "Política",
  "Maximum registrations": "Máximo de registros",
  "Assigned NDA / jurisdiction": "NDA y jurisdicción asignados",
  "Require administrator approval before session activation.":
    "Requerir aprobación del administrador antes de activar la sesión.",
  "Internal notes": "Notas internas",
  "CREATE PRIVATE INVITATION": "CREAR INVITACIÓN PRIVADA",
  Registrations: "Registros",
  Expires: "Caduca",
  Status: "Estado",
  "Manual approval": "Aprobación manual",
  Automatic: "Automático",
  "Individual registrations": "Registros individuales",
  "REVOKE INVITATION": "REVOCAR INVITACIÓN",
  "INDIVIDUAL IDENTITY LEDGER": "REGISTRO DE IDENTIDAD INDIVIDUAL",
  "EXPORT MASKED CSV": "EXPORTAR CSV ENMASCARADO",
  Name: "Nombre",
  "Last access": "Último acceso",
  Network: "Red",
  APPROVE: "APROBAR",
  "REQUIRE RE-VERIFICATION": "EXIGIR REVERIFICACIÓN",
  "REVOKE ACCESS": "REVOCAR ACCESO",
  "NDA evidence": "Evidencia del NDA",
  Sessions: "Sesiones",
  "Audit activity": "Actividad de auditoría",
  "DOWNLOAD PDF": "DESCARGAR PDF",
  "IMMUTABLE ACCEPTANCE RECORDS": "REGISTROS INMUTABLES DE ACEPTACIÓN",
  "Accepted UTC": "Aceptado en UTC",
  "Evidence hash": "Hash de evidencia",
  Action: "Acción",
  "TODAY’S MEETING": "REUNIÓN DE HOY",
  VISIT: "VISITA",
  PRESENTATION: "PRESENTACIÓN",
  SPEECH: "DISCURSO",
  "REFERENCE MATERIALS": "MATERIALES DE REFERENCIA",
  "Questions to ask": "Preguntas que debemos formular",
  COPY: "COPIAR",
  "FAIL-CLOSED CONFIGURATION": "CONFIGURACIÓN DE FALLO SEGURO",
  "Security center": "Centro de seguridad",
  "PRODUCTION READY": "LISTO PARA PRODUCCIÓN",
  "LOCAL TESTING ONLY": "SOLO PRUEBAS LOCALES",
  "External portal": "Portal externo",
  "NDA legal status": "Estado legal del NDA",
  "Privacy legal status": "Estado legal de privacidad",
  "Email verification": "Verificación del correo",
  "Admin MFA": "MFA de administración",
  "Temporary DEV access": "Acceso DEV temporal",
  "Trusted proxy": "Proxy de confianza",
  "Active sessions": "Sesiones activas",
  "EXTERNAL RELEASE GATE": "BLOQUEO DE PUBLICACIÓN EXTERNA",
  "Security-relevant activity": "Actividad relevante para la seguridad",
  "CONTROL RECORD": "REGISTRO DE CONTROL",
  "Close detail": "Cerrar detalle",
  "MFA ACTIVE": "MFA ACTIVO",
  "MFA ENROLLMENT REQUIRED": "SE REQUIERE ACTIVAR MFA",
  "ENROLL MFA": "ACTIVAR MFA",
  "Active team": "Equipo activo",
  "Pending invitations": "Invitaciones pendientes",
  "Invite a partner": "Invitar a un socio",
  Role: "Rol",
  "CREATE ONE-TIME INVITATION": "CREAR INVITACIÓN DE UN SOLO USO",
  "COPY PRIVATE LINK": "COPIAR ENLACE PRIVADO",
  "DECISION LOG": "REGISTRO DE DECISIONES",
  "Record a decision": "Registrar una decisión",
  "Decision / proposal": "Decisión o propuesta",
  "Alternatives considered": "Alternativas consideradas",
  "Consequences & follow-up": "Consecuencias y seguimiento",
  "SAVE DECISION": "GUARDAR DECISIÓN",
  COMMENT: "COMENTAR",
  "Add context or follow-up…": "Añadir contexto o seguimiento…",
  "NDA DOCUMENT LIBRARY": "BIBLIOTECA DE DOCUMENTOS NDA",
  "Create NDA draft": "Crear borrador de NDA",
  "Governing law": "Ley aplicable",
  Jurisdiction: "Jurisdicción",
  Purpose: "Finalidad",
  "Disclosing party": "Parte divulgadora",
  Notice: "Aviso",
  Paragraphs: "Cláusulas",
  "CREATE DRAFT": "CREAR BORRADOR",
  "LEGAL REVIEW": "REVISIÓN JURÍDICA",
  APPROVED: "APROBADO",
  DRAFT: "BORRADOR",
  "Mail server": "Servidor de correo",
  "SYNC INBOX": "SINCRONIZAR BANDEJA",
  "OPEN WEBMAIL": "ABRIR WEBMAIL",
  Inbox: "Bandeja de entrada",
  Subject: "Asunto",
  Contact: "Contacto",
  "Next follow-up": "Próximo seguimiento",
  "ADD THREAD": "AÑADIR CONVERSACIÓN",
  "Spanish controlled translation · Español":
    "Traducción controlada al español",
  "Spanish title": "Título en español",
  "Spanish legal notice": "Aviso jurídico en español",
  "Spanish agreement text · separate paragraphs with a blank line":
    "Texto del acuerdo en español · separa los párrafos con una línea en blanco",
  "Spanish agreement text": "Texto del acuerdo en español",
  "Agreement text · separate paragraphs with a blank line":
    "Texto del acuerdo · separa los párrafos con una línea en blanco",
  "Visible legal notice": "Aviso jurídico visible",
  "Required revision note": "Nota de revisión obligatoria",
  "SAVE NEW REVISION": "GUARDAR NUEVA REVISIÓN",
  "Revision history": "Historial de revisiones",
  "Create a new independent NDA draft":
    "Crear un nuevo borrador de NDA independiente",
  "CREATE CONTROLLED DRAFT": "CREAR BORRADOR CONTROLADO",
  "Public navigation": "Navegación pública",
  FIXED: "FIJO",
  AERIAL: "AÉREO",
  GROUND: "TERRESTRE",
  DATA: "DATOS",
  "DEMO ENVIRONMENT": "ENTORNO DE DEMOSTRACIÓN",
  Analytics: "Analítica",
  "A deterministic digital prototype of the operating system we are building.":
    "Un prototipo digital determinista del sistema operativo que estamos construyendo.",
  "Deterministic clock, replayable state, route interpolation, telemetry invariants, API and WebSocket transport.":
    "Reloj determinista, estado reproducible, interpolación de rutas, invariantes de telemetría y transporte mediante API y WebSocket.",
  "Deterministic NDVI demonstration using synthetic data. Farm, anomaly, soil readings and mission report are also synthetic or simulated.":
    "Demostración determinista de NDVI con datos sintéticos. La explotación, la anomalía, las lecturas del suelo y el informe de misión también son sintéticos o simulados.",
  "SENTINEL and ROVER_001 procedural representations are not evidence of physical prototypes.":
    "Las representaciones procedurales de SENTINEL y ROVER_001 no constituyen evidencia de prototipos físicos.",
  "NDVI processing capability exists in related technology; UP AI DOWN integration is planned, subject to reuse rights and technical integration.":
    "Existe capacidad de procesamiento NDVI en tecnología relacionada; la integración en UP AI DOWN está planificada y sujeta a derechos de reutilización e integración técnica.",
  SOFTWARE_WORKING: "SOFTWARE OPERATIVO",
  DEMO_SIMULATION: "SIMULACIÓN DE DEMOSTRACIÓN",
  CONCEPT: "CONCEPTO",
  "RELATED TECHNOLOGY": "TECNOLOGÍA RELACIONADA",
  "While temporary test mode is enabled, this button creates a normal, audited, time-limited session bound to this network and browser. No password is stored in the page.":
    "Mientras el modo temporal de pruebas esté activo, este botón crea una sesión normal, auditada, de duración limitada y vinculada a esta red y navegador. La página no almacena ninguna contraseña.",
  "Deterministic NDVI demonstration using synthetic data.":
    "Demostración determinista de NDVI con datos sintéticos.",
  "Farm, anomaly, soil readings and mission report are also synthetic or simulated.":
    "La explotación, la anomalía, las lecturas del suelo y el informe de misión también son sintéticos o simulados.",
  "System layers": "Capas del sistema",
  "UP AI DOWN autonomous agricultural field intelligence concept":
    "Concepto de inteligencia agrícola autónoma de campo de UP AI DOWN",
  "Concept visualization of the Sentinel, rover and drone system in an agricultural field":
    "Visualización conceptual del sistema Sentinel, rover y dron en una explotación agrícola",
};

const spanishTerms: Array<[string, string]> = [
  ["WORKFLOW_TESTING_CONTROLLED_ACCESS", "ACCESO CONTROLADO DE PRUEBAS"],
  ["events", "eventos"],
  ["No decisions yet", "Aún no hay decisiones"],
  ["No notes yet", "Aún no hay notas"],
  ["No visitors registered yet", "Aún no hay visitantes registrados"],
  ["No registrations yet", "Aún no hay registros"],
  [
    "No NDA acceptances recorded yet",
    "Aún no hay aceptaciones de NDA registradas",
  ],
  ["Create and sign", "Crear y firmar"],
  ["secure session", "sesión segura"],
  ["individual record", "registro individual"],
  ["privacy notice", "aviso de privacidad"],
  ["business email", "correo profesional"],
  ["administrator", "administrador"],
  ["investor", "inversor"],
  ["meeting", "reunión"],
  ["presentation", "presentación"],
  ["deadline", "plazo"],
  ["travel", "viaje"],
  ["project", "proyecto"],
  ["workspace", "espacio de trabajo"],
  ["evidence", "evidencia"],
  ["created", "creado"],
  ["updated", "actualizado"],
  ["expires", "caduca"],
  ["last activity", "última actividad"],
  ["last login", "último acceso"],
  ["approval", "aprobación"],
  ["required", "necesario"],
  ["enabled", "habilitado"],
  ["disabled", "deshabilitado"],
  ["read only", "solo lectura"],
  ["public", "público"],
  ["internal", "interno"],
  ["confidential", "confidencial"],
  ["synthetic", "sintético"],
  ["warning", "aviso"],
  ["ready", "listo"],
  ["failed", "fallido"],
  ["active", "activo"],
  ["pending", "pendiente"],
  ["archived", "archivado"],
];

i18next.init({
  lng: "en",
  fallbackLng: "en",
  keySeparator: false,
  interpolation: { escapeValue: false },
  resources: { en: { translation: {} }, es: { translation: spanishExact } },
});

const languageFromEnvironment = (): AppLanguage => {
  const query = new URLSearchParams(window.location.search).get("lang");
  if (query === "es" || query === "en") return query;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "es" || stored === "en") return stored;
  return window.navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
};

export const translateText = (text: string, language: AppLanguage): string => {
  if (language === "en" || !/[A-Za-z]/.test(text)) return text;
  const leading = text.match(/^\s*/)?.[0] ?? "";
  const trailing = text.match(/\s*$/)?.[0] ?? "";
  const source = text.trim();
  if (
    /^(?:NDA|SHA|IP|ID)-[A-Za-z0-9_-]+$/.test(source) ||
    /^(?:https?:\/\/|mailto:)/i.test(source) ||
    /^\S+@\S+\.\S+$/.test(source)
  )
    return text;
  const exact = spanishExact[source];
  if (exact) return `${leading}${exact}${trailing}`;
  let translated = source;
  for (const [english, spanish] of spanishTerms.sort(
    (a, b) => b[0].length - a[0].length,
  )) {
    const escaped = english.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    translated = translated.replace(new RegExp(escaped, "gi"), spanish);
  }
  return `${leading}${translated}${trailing}`;
};

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (value: AppLanguage) => void;
};
const LanguageContext = createContext<LanguageContextValue | null>(null);
const originalText = new WeakMap<Text, string>();
const appliedText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const translatedAttributes = ["aria-label", "title", "placeholder", "alt"];
const excluded = (node: Node) =>
  node.parentElement?.closest(
    "script,style,pre,code,textarea,[data-i18n-skip]",
  ) != null;

const localizeTextNode = (node: Text, language: AppLanguage) => {
  if (excluded(node)) return;
  const current = node.data;
  if (appliedText.get(node) !== current) originalText.set(node, current);
  const source = originalText.get(node) ?? current;
  const next = translateText(source, language);
  appliedText.set(node, next);
  if (current !== next) node.data = next;
};
const localizeElement = (element: Element, language: AppLanguage) => {
  if (element.closest("script,style,pre,code,textarea,[data-i18n-skip]"))
    return;
  const originals =
    originalAttributes.get(element) ?? new Map<string, string>();
  for (const attribute of translatedAttributes) {
    const current = element.getAttribute(attribute);
    if (current == null) continue;
    const previous = originals.get(attribute);
    if (previous == null || current !== translateText(previous, language))
      originals.set(attribute, current);
    const next = translateText(originals.get(attribute)!, language);
    if (next !== current) element.setAttribute(attribute, next);
  }
  originalAttributes.set(element, originals);
};
const localizeTree = (root: Node, language: AppLanguage) => {
  if (root.nodeType === Node.TEXT_NODE)
    return localizeTextNode(root as Text, language);
  if (
    root.nodeType !== Node.ELEMENT_NODE &&
    root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE
  )
    return;
  if (root.nodeType === Node.ELEMENT_NODE)
    localizeElement(root as Element, language);
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
  );
  let current = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE)
      localizeTextNode(current as Text, language);
    else localizeElement(current as Element, language);
    current = walker.nextNode();
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(
    languageFromEnvironment,
  );
  const setLanguage = (value: AppLanguage) => {
    window.localStorage.setItem(STORAGE_KEY, value);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", value);
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    setLanguageState(value);
  };
  useLayoutEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    void i18next.changeLanguage(language);
    document.documentElement.lang = language;
    document.documentElement.dataset.language = language;
    localizeTree(document.body, language);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "characterData")
          localizeTextNode(record.target as Text, language);
        for (const node of record.addedNodes) localizeTree(node, language);
        if (record.type === "attributes")
          localizeElement(record.target as Element, language);
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: translatedAttributes,
    });
    return () => observer.disconnect();
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage }), [language]);
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const value = useContext(LanguageContext);
  if (!value)
    throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
};
export const currentLocale = () =>
  typeof document !== "undefined" && document.documentElement.lang === "es"
    ? "es-ES"
    : "en-US";
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage();
  return (
    <div
      className={`language-switcher ${compact ? "compact" : ""}`}
      role="group"
      aria-label="Language selector"
      data-i18n-skip
    >
      <button
        type="button"
        aria-pressed={language === "es"}
        onClick={() => setLanguage("es")}
      >
        ES
      </button>
      <button
        type="button"
        aria-pressed={language === "en"}
        onClick={() => setLanguage("en")}
      >
        EN
      </button>
    </div>
  );
}
