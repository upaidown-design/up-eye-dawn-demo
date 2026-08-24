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
  "Use administrator credentials. Production access requires MFA.":
    "Utiliza credenciales de administrador. El acceso de producción requiere MFA.",
  Email: "Correo electrónico",
  Password: "Contraseña",
  "Authenticator code": "Código del autenticador",
  "when enabled": "cuando esté habilitado",
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
  "ADMIN CONTROL ROOM": "CENTRO DE CONTROL ADMINISTRATIVO",
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
  "LEGAL REVIEW": "REVISIÓN LEGAL",
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
  "Spanish controlled translation · Español": "Traducción controlada al español",
  "Spanish title": "Título en español",
  "Spanish legal notice": "Aviso jurídico en español",
  "Spanish agreement text · separate paragraphs with a blank line": "Texto del acuerdo en español · separa los párrafos con una línea en blanco",
  "Spanish agreement text": "Texto del acuerdo en español",
  "Agreement text · separate paragraphs with a blank line": "Texto del acuerdo · separa los párrafos con una línea en blanco",
  "Visible legal notice": "Aviso jurídico visible",
  "Required revision note": "Nota de revisión obligatoria",
  "SAVE NEW REVISION": "GUARDAR NUEVA REVISIÓN",
  "Revision history": "Historial de revisiones",
  "Create a new independent NDA draft": "Crear un nuevo borrador de NDA independiente",
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
  "The temporary DEV control exists only when a private fragment is supplied and is removed from browser history immediately. It creates a normal, audited, time-limited session bound to this network and browser.":
    "El control DEV temporal solo existe cuando se proporciona un fragmento privado y se elimina inmediatamente del historial del navegador. Crea una sesión normal, auditada, de duración limitada y vinculada a esta red y navegador.",
};

const spanishTerms: Array<[string, string]> = [
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
