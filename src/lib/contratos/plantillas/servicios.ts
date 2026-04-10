export const PLANTILLA_SERVICIOS = `
Genera un CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES completo conforme a la legislación mexicana.

Estructura obligatoria:
1. DECLARACIONES — capacidad legal, representación, RFC, domicilio fiscal
2. CLÁUSULA PRIMERA — Objeto del contrato (descripción detallada del servicio)
3. CLÁUSULA SEGUNDA — Vigencia y duración
4. CLÁUSULA TERCERA — Contraprestación y forma de pago
5. CLÁUSULA CUARTA — Obligaciones del prestador de servicios
6. CLÁUSULA QUINTA — Obligaciones del cliente
7. CLÁUSULA SEXTA — Confidencialidad
8. CLÁUSULA SÉPTIMA — Propiedad intelectual
9. CLÁUSULA OCTAVA — Responsabilidad e indemnización
10. CLÁUSULA NOVENA — Terminación anticipada
11. CLÁUSULA DÉCIMA — Impuestos (cada parte responsable de los propios, CFDI por cada pago)
12. CLÁUSULA DÉCIMA PRIMERA — Relación entre las partes (no subordinación laboral)
13. CLÁUSULA DÉCIMA SEGUNDA — Jurisdicción y legislación aplicable
14. FIRMAS

Legislación: Código Civil Federal, Código de Comercio, LISR art. 27 y 28, LIVA.
`;

export const CAMPOS_SERVICIOS = [
  { id: "objeto", label: "Descripción del servicio", tipo: "textarea", requerido: true },
  { id: "entregables", label: "Entregables", tipo: "textarea", requerido: false },
  { id: "penalizaciones", label: "Penalizaciones por incumplimiento", tipo: "textarea", requerido: false },
];
