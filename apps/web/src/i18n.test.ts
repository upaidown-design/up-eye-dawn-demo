import assert from "node:assert/strict";
import test from "node:test";
import { translateText } from "./i18n";

test("translates exact interface copy while preserving whitespace", () => {
  assert.equal(
    translateText("  Mission control  ", "es"),
    "  Control de misión  ",
  );
  assert.equal(translateText("Mission control", "en"), "Mission control");
});

test("translates safe fallback terms in dynamic interface messages", () => {
  assert.equal(
    translateText("No visitors registered yet", "es"),
    "Aún no hay visitantes registrados",
  );
  assert.equal(
    translateText("Public project workspace", "es"),
    "público proyecto espacio de trabajo",
  );
});

test("does not alter identifiers or numeric values", () => {
  assert.equal(translateText("NDA-US-INVESTOR-v1", "es"), "NDA-US-INVESTOR-v1");
  assert.equal(translateText("61.4%", "es"), "61.4%");
});

test("translates the complete investor email-verification instructions", () => {
  assert.equal(
    translateText(
      "The invitation may be shared, but every person receives an independent record. Access is never inherited from another visitor’s password, cookie or email address.",
      "es",
    ),
    "La invitación puede compartirse, pero cada persona recibe un registro independiente. El acceso nunca se hereda de la contraseña, las cookies o el correo de otro visitante.",
  );
  assert.equal(
    translateText("DRAFT FOR WORKFLOW TESTING", "es"),
    "BORRADOR PARA PRUEBAS DEL FLUJO",
  );
});

test("translates administrator navigation, collaboration and legal workflows", () => {
  const cases = [
    ["Project management", "Gestión del proyecto"],
    [
      "Prepare agenda, presentation, speech and questions.",
      "Prepara agenda, presentación, discurso y preguntas.",
    ],
    ["ACTIVATE INDIVIDUAL ACCOUNT", "ACTIVAR CUENTA INDIVIDUAL"],
    ["MATERIAL REGISTRY", "REGISTRO DE MATERIALES"],
    ["NDA library & editor", "Biblioteca y editor de NDA"],
    ["OPEN PRIVATE WEBMAIL", "ABRIR WEBMAIL PRIVADO"],
    ["PROJECT TASK UPDATED", "TAREA DEL PROYECTO ACTUALIZADA"],
    [
      "Confirm New York meeting date, room and attendees",
      "Confirmar la fecha, la sala y los asistentes de la reunión de Nueva York",
    ],
    ["WORKFLOW_TESTING_CONTROLLED_ACCESS", "ACCESO CONTROLADO DE PRUEBAS"],
  ] as const;
  for (const [english, spanish] of cases)
    assert.equal(translateText(english, "es"), spanish);
});
