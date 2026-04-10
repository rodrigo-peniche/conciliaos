export const PLANTILLA_ARRENDAMIENTO = `
Genera un CONTRATO DE ARRENDAMIENTO completo conforme a la legislación mexicana.

Estructura obligatoria:
1. DECLARACIONES
2. CLÁUSULA PRIMERA — Objeto (descripción del bien arrendado)
3. CLÁUSULA SEGUNDA — Destino del bien arrendado
4. CLÁUSULA TERCERA — Plazo del arrendamiento
5. CLÁUSULA CUARTA — Renta y forma de pago
6. CLÁUSULA QUINTA — Depósito en garantía
7. CLÁUSULA SEXTA — Obligaciones del arrendador
8. CLÁUSULA SÉPTIMA — Obligaciones del arrendatario
9. CLÁUSULA OCTAVA — Mantenimiento y reparaciones
10. CLÁUSULA NOVENA — Subarrendamiento (prohibido salvo autorización)
11. CLÁUSULA DÉCIMA — Terminación anticipada
12. CLÁUSULA DÉCIMA PRIMERA — Devolución del bien
13. CLÁUSULA DÉCIMA SEGUNDA — Facturación CFDI e impuestos
14. CLÁUSULA DÉCIMA TERCERA — Jurisdicción
15. FIRMAS

Legislación: Código Civil Federal art. 2398-2496, LISR art. 28, LIVA.
`;

export const CAMPOS_ARRENDAMIENTO = [
  { id: "objeto", label: "Descripción del bien arrendado", tipo: "textarea", requerido: true },
  { id: "ubicacion", label: "Ubicación / dirección", tipo: "text", requerido: true },
  { id: "destino", label: "Destino / uso del inmueble", tipo: "text", requerido: true },
  { id: "deposito", label: "Meses de depósito en garantía", tipo: "number", requerido: false },
];
