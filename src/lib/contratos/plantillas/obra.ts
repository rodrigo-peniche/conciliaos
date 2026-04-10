export const PLANTILLA_OBRA = `
Genera un CONTRATO DE OBRA A PRECIO ALZADO completo conforme a la legislación mexicana.

Estructura obligatoria:
1. DECLARACIONES — capacidad legal, representación, RFC, domicilio
2. CLÁUSULA PRIMERA — Objeto (descripción de la obra)
3. CLÁUSULA SEGUNDA — Precio alzado y forma de pago (anticipo, avances, finiquito)
4. CLÁUSULA TERCERA — Plazo de ejecución y calendario
5. CLÁUSULA CUARTA — Obligaciones del contratista
6. CLÁUSULA QUINTA — Obligaciones del propietario
7. CLÁUSULA SEXTA — Supervisión y control de calidad
8. CLÁUSULA SÉPTIMA — Garantía de la obra
9. CLÁUSULA OCTAVA — Modificaciones y trabajos extraordinarios
10. CLÁUSULA NOVENA — Recepción y entrega de la obra
11. CLÁUSULA DÉCIMA — Penas convencionales
12. CLÁUSULA DÉCIMA PRIMERA — Rescisión y terminación anticipada
13. CLÁUSULA DÉCIMA SEGUNDA — Impuestos y facturación CFDI
14. CLÁUSULA DÉCIMA TERCERA — Jurisdicción
15. FIRMAS

Legislación: Código Civil Federal art. 2616-2645, Código de Comercio, LISR, LIVA.
`;

export const CAMPOS_OBRA = [
  { id: "objeto", label: "Descripción de la obra", tipo: "textarea", requerido: true },
  { id: "ubicacion", label: "Ubicación de la obra", tipo: "text", requerido: true },
  { id: "plazo", label: "Plazo de ejecución (días)", tipo: "number", requerido: true },
  { id: "anticipo", label: "% de anticipo", tipo: "number", requerido: false },
  { id: "garantia", label: "Periodo de garantía (meses)", tipo: "number", requerido: false },
];
