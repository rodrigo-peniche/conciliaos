export const PLANTILLA_SUMINISTRO = `
Genera un CONTRATO DE SUMINISTRO DE BIENES completo conforme a la legislación mexicana.

Estructura obligatoria:
1. DECLARACIONES
2. CLÁUSULA PRIMERA — Objeto (bienes a suministrar, especificaciones)
3. CLÁUSULA SEGUNDA — Precio, condiciones y forma de pago
4. CLÁUSULA TERCERA — Plazos y lugar de entrega
5. CLÁUSULA CUARTA — Calidad y especificaciones técnicas
6. CLÁUSULA QUINTA — Inspección y recepción de mercancías
7. CLÁUSULA SEXTA — Garantías sobre los bienes
8. CLÁUSULA SÉPTIMA — Obligaciones del proveedor
9. CLÁUSULA OCTAVA — Obligaciones del comprador
10. CLÁUSULA NOVENA — Propiedad y riesgo (transferencia)
11. CLÁUSULA DÉCIMA — Facturación CFDI e impuestos
12. CLÁUSULA DÉCIMA PRIMERA — Incumplimiento y penas convencionales
13. CLÁUSULA DÉCIMA SEGUNDA — Rescisión
14. CLÁUSULA DÉCIMA TERCERA — Jurisdicción
15. FIRMAS

Legislación: Código de Comercio, Código Civil Federal, LISR, LIVA.
`;

export const CAMPOS_SUMINISTRO = [
  { id: "objeto", label: "Descripción de los bienes", tipo: "textarea", requerido: true },
  { id: "cantidad", label: "Cantidad / unidades", tipo: "text", requerido: true },
  { id: "lugarEntrega", label: "Lugar de entrega", tipo: "text", requerido: true },
  { id: "plazoEntrega", label: "Plazo de entrega (días)", tipo: "number", requerido: false },
];
