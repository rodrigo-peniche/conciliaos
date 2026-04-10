/**
 * Generador de PDF para contratos usando pdf-lib
 * Convierte HTML de contrato a PDF con membrete profesional
 */

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

interface DatosPDF {
  html: string;
  empresaNombre: string;
  empresaRfc: string;
  empresaDomicilio: string;
  logoUrl?: string;
  titulo: string;
  numeroContrato?: string;
}

/**
 * Genera un PDF profesional a partir del HTML del contrato
 */
export async function generarPDF(datos: DatosPDF): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_WIDTH = 612; // Letter
  const PAGE_HEIGHT = 792;
  const MARGIN = 72; // 1 inch
  const LINE_HEIGHT = 14;
  const FONT_SIZE = 10;
  const TITLE_SIZE = 14;

  // Extraer texto plano del HTML (simplificado)
  const lines = htmlToLines(datos.html);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let pageNum = 1;
  let y = PAGE_HEIGHT - MARGIN;

  // Función para agregar nueva página
  const newPage = () => {
    // Pie de página en la página actual
    addFooter(page, font, datos.empresaRfc, pageNum, PAGE_WIDTH, MARGIN);
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pageNum++;
    y = PAGE_HEIGHT - MARGIN;
    // Membrete en cada página
    addHeader(page, fontBold, datos.empresaNombre, datos.empresaRfc, PAGE_WIDTH, MARGIN);
    y -= 40;
  };

  // Membrete primera página
  addHeader(page, fontBold, datos.empresaNombre, datos.empresaRfc, PAGE_WIDTH, MARGIN);
  y -= 40;

  // Título del contrato
  const titleWidth = fontBold.widthOfTextAtSize(datos.titulo, TITLE_SIZE);
  page.drawText(datos.titulo, {
    x: (PAGE_WIDTH - titleWidth) / 2,
    y,
    size: TITLE_SIZE,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= LINE_HEIGHT * 2;

  if (datos.numeroContrato) {
    const numText = `No. ${datos.numeroContrato}`;
    const numWidth = font.widthOfTextAtSize(numText, 9);
    page.drawText(numText, {
      x: (PAGE_WIDTH - numWidth) / 2,
      y,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= LINE_HEIGHT * 2;
  }

  // Renderizar contenido
  for (const line of lines) {
    if (y < MARGIN + 40) {
      newPage();
    }

    if (line.type === "heading") {
      y -= LINE_HEIGHT; // espacio extra antes del heading
      const wrappedLines = wrapText(line.text, fontBold, 11, PAGE_WIDTH - MARGIN * 2);
      for (const wl of wrappedLines) {
        if (y < MARGIN + 40) newPage();
        page.drawText(wl, {
          x: MARGIN,
          y,
          size: 11,
          font: fontBold,
          color: rgb(0, 0, 0),
        });
        y -= LINE_HEIGHT;
      }
      y -= 4;
    } else if (line.type === "empty") {
      y -= LINE_HEIGHT * 0.5;
    } else {
      const wrappedLines = wrapText(line.text, font, FONT_SIZE, PAGE_WIDTH - MARGIN * 2);
      for (const wl of wrappedLines) {
        if (y < MARGIN + 40) newPage();
        page.drawText(wl, {
          x: MARGIN,
          y,
          size: FONT_SIZE,
          font,
          color: rgb(0, 0, 0),
        });
        y -= LINE_HEIGHT;
      }
    }
  }

  // Pie de la última página
  addFooter(page, font, datos.empresaRfc, pageNum, PAGE_WIDTH, MARGIN);

  return pdfDoc.save();
}

function addHeader(
  page: ReturnType<PDFDocument["addPage"]>,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  empresaNombre: string,
  empresaRfc: string,
  pageWidth: number,
  margin: number
) {
  // Línea decorativa
  page.drawRectangle({
    x: margin,
    y: 792 - margin + 10,
    width: pageWidth - margin * 2,
    height: 2,
    color: rgb(0.2, 0.4, 0.8),
  });

  page.drawText(empresaNombre, {
    x: margin,
    y: 792 - margin - 5,
    size: 9,
    font,
    color: rgb(0.2, 0.4, 0.8),
  });

  const rfcText = `RFC: ${empresaRfc}`;
  const rfcWidth = font.widthOfTextAtSize(rfcText, 8);
  page.drawText(rfcText, {
    x: pageWidth - margin - rfcWidth,
    y: 792 - margin - 5,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
}

function addFooter(
  page: ReturnType<PDFDocument["addPage"]>,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  empresaRfc: string,
  pageNum: number,
  pageWidth: number,
  margin: number
) {
  // Línea
  page.drawRectangle({
    x: margin,
    y: margin - 15,
    width: pageWidth - margin * 2,
    height: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });

  page.drawText(`RFC: ${empresaRfc}`, {
    x: margin,
    y: margin - 28,
    size: 7,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  const dateStr = new Date().toLocaleDateString("es-MX");
  page.drawText(dateStr, {
    x: pageWidth / 2 - 30,
    y: margin - 28,
    size: 7,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pageText = `Página ${pageNum}`;
  const pageWidth2 = font.widthOfTextAtSize(pageText, 7);
  page.drawText(pageText, {
    x: pageWidth - margin - pageWidth2,
    y: margin - 28,
    size: 7,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
}

interface ParsedLine {
  type: "heading" | "paragraph" | "empty";
  text: string;
}

function htmlToLines(html: string): ParsedLine[] {
  const lines: ParsedLine[] = [];

  // Strip HTML tags but preserve structure
  const cleaned = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[12345]>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n");

  // Extract headings
  const parts = cleaned.split(/(<h[12345][^>]*>)/gi);

  let inHeading = false;
  for (const part of parts) {
    if (/<h[12345]/i.test(part)) {
      inHeading = true;
      continue;
    }

    const text = part
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"');

    const textLines = text.split("\n");
    for (const line of textLines) {
      const trimmed = line.trim();
      if (!trimmed) {
        lines.push({ type: "empty", text: "" });
      } else if (inHeading) {
        lines.push({ type: "heading", text: trimmed });
        inHeading = false;
      } else {
        lines.push({ type: "paragraph", text: trimmed });
      }
    }
  }

  return lines;
}

function wrapText(
  text: string,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(test, fontSize);
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  return lines;
}
