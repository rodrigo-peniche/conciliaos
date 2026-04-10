export const PLANTILLA_NDA = `
Genera un ACUERDO DE CONFIDENCIALIDAD (NDA) bilateral completo conforme a la legislación mexicana.

Estructura obligatoria:
1. DECLARACIONES
2. CLÁUSULA PRIMERA — Definición de información confidencial
3. CLÁUSULA SEGUNDA — Obligaciones de confidencialidad
4. CLÁUSULA TERCERA — Excepciones a la confidencialidad
5. CLÁUSULA CUARTA — Duración de la obligación de confidencialidad
6. CLÁUSULA QUINTA — Uso permitido de la información
7. CLÁUSULA SEXTA — Devolución o destrucción de información
8. CLÁUSULA SÉPTIMA — Propiedad de la información
9. CLÁUSULA OCTAVA — Remedios ante incumplimiento (pena convencional)
10. CLÁUSULA NOVENA — Ley aplicable y jurisdicción
11. FIRMAS

Legislación: Código Civil Federal, Ley de Propiedad Industrial, Código de Comercio.
`;

export const CAMPOS_NDA = [
  { id: "objeto", label: "Propósito del intercambio de información", tipo: "textarea", requerido: true },
  { id: "duracion", label: "Duración de confidencialidad (años)", tipo: "number", requerido: true },
  { id: "penalizacion", label: "Pena convencional por incumplimiento (MXN)", tipo: "number", requerido: false },
];
