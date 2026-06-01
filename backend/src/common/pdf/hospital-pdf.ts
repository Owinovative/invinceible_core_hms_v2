import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

type PdfValue = string | number | Date | null | undefined;
const MAX_PDF_IMAGE_BYTES = Number(process.env.PDF_IMAGE_MAX_BYTES ?? 512_000);

export interface HospitalPdfParty {
  name?: string | null;
  code?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  postalAddress?: string | null;
  town?: string | null;
  county?: string | null;
  country?: string | null;
  registrationNo?: string | null;
  licenseNumber?: string | null;
  taxPin?: string | null;
  logoUrl?: string | null;
}

export interface HospitalPdfOptions {
  title: string;
  subtitle?: string;
  reference?: string;
  verificationCode?: string;
  qrPayload?: unknown;
  facility?: HospitalPdfParty | null;
  branch?: HospitalPdfParty | null;
  compact?: boolean;
}

export interface PdfKeyValue {
  label: string;
  value?: PdfValue;
}

export interface PdfTableColumn<T> {
  header: string;
  width: number;
  render: (row: T, index: number) => PdfValue;
}

const PDF_COLORS = {
  navy: '#073b63',
  blue: '#0b79bf',
  sky: '#e8f6ff',
  paleBlue: '#f4fbff',
  green: '#047857',
  slate: '#0f172a',
  muted: '#64748b',
  line: '#cbd5e1',
  softLine: '#dbeafe',
  tableAlt: '#f8fafc',
  white: '#ffffff',
};

function contentWidth(doc: PDFKit.PDFDocument) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

export function textOrDash(value?: PdfValue) {
  if (value instanceof Date) return formatPdfDate(value);
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

export function formatPdfDate(value?: string | Date | null) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatPdfMoney(value?: number | null, currency = 'KES') {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function staffName(
  staff?: {
    firstName?: string | null;
    lastName?: string | null;
    staffCode?: string | null;
  } | null,
) {
  if (!staff) return '-';
  const name = [staff.firstName, staff.lastName].filter(Boolean).join(' ');
  return name || staff.staffCode || '-';
}

export function patientName(
  patient?: {
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
    patientNumber?: string | null;
  } | null,
) {
  if (!patient) return 'Unknown patient';
  const name = [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(' ');
  return name || patient.patientNumber || 'Unknown patient';
}

export async function createHospitalPdfBuffer(
  options: HospitalPdfOptions,
  renderBody: (doc: PDFKit.PDFDocument) => void,
) {
  const logoBuffer = await loadLogoBuffer(
    options.facility?.logoUrl || options.branch?.logoUrl,
  );
  const qrBuffer = await createDocumentQr(options);

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margin: options.compact ? 34 : 48,
      bufferPages: true,
      info: {
        Title: options.title,
        Producer: 'Invinceible Core HMS',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawLetterhead(doc, options, logoBuffer, qrBuffer);
    renderBody(doc);
    drawFooter(doc);
    doc.end();
  });
}

export async function loadLogoBuffer(logoUrl?: string | null) {
  if (!logoUrl) return undefined;

  try {
    if (logoUrl.startsWith('data:image/')) {
      const [, payload] = logoUrl.split(',', 2);
      if (!payload) return undefined;
      const buffer = Buffer.from(payload, 'base64');
      return buffer.length <= MAX_PDF_IMAGE_BYTES ? buffer : undefined;
    }

    if (!/^https?:\/\//i.test(logoUrl)) {
      return undefined;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(logoUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return undefined;

    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > MAX_PDF_IMAGE_BYTES) {
      return undefined;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().startsWith('image/')) {
      return undefined;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.length <= MAX_PDF_IMAGE_BYTES ? buffer : undefined;
  } catch {
    return undefined;
  }
}

export function addSectionTitle(doc: PDFKit.PDFDocument, title: string) {
  ensureRoom(doc, 32);
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const y = doc.y + 4;

  doc
    .roundedRect(left, y, width, 18, 2)
    .fillAndStroke(PDF_COLORS.paleBlue, '#bfdbfe');
  doc
    .rect(left, y, 4, 18)
    .fill(PDF_COLORS.blue);
  doc
    .font('Helvetica-Bold')
    .fontSize(7.8)
    .fillColor(PDF_COLORS.navy)
    .text(title.toUpperCase(), left + 10, y + 5.2, {
      width: width - 20,
      characterSpacing: 0.25,
    });
  doc
    .moveTo(left, y + 21)
    .lineTo(left + width, y + 21)
    .lineWidth(0.35)
    .strokeColor(PDF_COLORS.line)
    .stroke();
  doc.y = y + 27;
}

export function addKeyValueGrid(
  doc: PDFKit.PDFDocument,
  items: PdfKeyValue[],
  columns = 2,
) {
  return addCompactDefinitionList(doc, items, columns);
}

export function addCompactDefinitionList(
  doc: PDFKit.PDFDocument,
  items: PdfKeyValue[],
  columns = 2,
) {
  const pageWidth = contentWidth(doc);
  const columnGap = 10;
  const columnWidth = (pageWidth - columnGap * (columns - 1)) / columns;

  for (let index = 0; index < items.length; index += columns) {
    const row = items.slice(index, index + columns);
    const heights = row.map((item) => {
      const labelWidth = Math.min(78, columnWidth * 0.42);
      doc.font('Helvetica').fontSize(8);
      return Math.max(
        18,
        doc.heightOfString(textOrDash(item.value), {
          width: columnWidth - labelWidth - 10,
          lineGap: 1,
        }) + 6,
      );
    });
    const height = Math.max(20, ...heights);

    ensureRoom(doc, height + 3);
    const y = doc.y;

    row.forEach((item, offset) => {
      const x = doc.page.margins.left + offset * (columnWidth + columnGap);
      const labelWidth = Math.min(78, columnWidth * 0.42);
      doc
        .roundedRect(x, y, columnWidth, height, 2)
        .fillAndStroke(
          Math.floor(index / columns) % 2 === 0
            ? PDF_COLORS.white
            : PDF_COLORS.paleBlue,
          PDF_COLORS.softLine,
        );
      doc
        .rect(x, y, 2.2, height)
        .fill(offset % 2 === 0 ? PDF_COLORS.blue : '#38bdf8');
      doc
        .fillColor(PDF_COLORS.muted)
        .font('Helvetica-Bold')
        .fontSize(6.8)
        .text(`${item.label}:`, x + 7, y + 5, {
          width: labelWidth - 4,
          ellipsis: true,
        });
      doc
        .fillColor(PDF_COLORS.slate)
        .font('Helvetica')
        .fontSize(8.2)
        .text(textOrDash(item.value), x + labelWidth + 7, y + 5, {
          width: columnWidth - labelWidth - 12,
          lineGap: 1,
        });
    });

    doc.y = y + height + 4;
  }
}

export function addCompactKeyValueGrid(
  doc: PDFKit.PDFDocument,
  items: PdfKeyValue[],
  columns = 3,
) {
  return addCompactDefinitionList(doc, items, columns);
}

export function addMiniKeyValueGrid(
  doc: PDFKit.PDFDocument,
  items: PdfKeyValue[],
  columns = 4,
) {
  return addCompactDefinitionList(doc, items, columns);
}

export function addParagraph(
  doc: PDFKit.PDFDocument,
  label: string,
  value?: PdfValue,
) {
  const text = textOrDash(value);
  const width = contentWidth(doc);
  const bodyHeight = doc.heightOfString(text, {
    width: width - 18,
    lineGap: 1.4,
  });
  const height = Math.max(34, bodyHeight + 22);

  ensureRoom(doc, height + 6);
  const y = doc.y;
  doc
    .roundedRect(doc.page.margins.left, y, width, height, 3)
    .fillAndStroke(PDF_COLORS.white, PDF_COLORS.softLine);
  doc.rect(doc.page.margins.left, y, 3, height).fill(PDF_COLORS.blue);
  doc
    .fillColor(PDF_COLORS.navy)
    .font('Helvetica-Bold')
    .fontSize(8)
    .text(`${label}:`, doc.page.margins.left + 10, y + 7, {
      width: width - 18,
    });
  doc
    .fillColor(PDF_COLORS.slate)
    .font('Helvetica')
    .fontSize(8.7)
    .text(text, doc.page.margins.left + 10, y + 19, {
      width: width - 18,
      lineGap: 1.4,
    });
  doc.y = y + height + 3;
}

export function addCompactParagraph(
  doc: PDFKit.PDFDocument,
  label: string,
  value?: PdfValue,
) {
  const text = textOrDash(value);
  const width = contentWidth(doc);
  const bodyHeight = doc.heightOfString(text, {
    width: width - 16,
    lineGap: 1,
  });
  const height = Math.max(25, bodyHeight + 17);

  ensureRoom(doc, height + 5);
  const y = doc.y;
  doc
    .roundedRect(doc.page.margins.left, y, width, height, 2)
    .fillAndStroke(PDF_COLORS.white, '#e0f2fe');
  doc.rect(doc.page.margins.left, y, 2, height).fill(PDF_COLORS.blue);
  doc
    .fillColor(PDF_COLORS.navy)
    .font('Helvetica-Bold')
    .fontSize(7.8)
    .text(`${label}:`, doc.page.margins.left + 8, y + 5, {
      width: width - 16,
    });
  doc
    .fillColor(PDF_COLORS.slate)
    .font('Helvetica')
    .fontSize(8.4)
    .text(text, doc.page.margins.left + 8, y + 15, {
      width: width - 16,
      lineGap: 1,
    });
  doc.y = y + height + 2;
}

export function addTable<T>(
  doc: PDFKit.PDFDocument,
  columns: PdfTableColumn<T>[],
  rows: T[],
  emptyMessage = 'No records found.',
) {
  const startX = doc.page.margins.left;
  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);

  ensureRoom(doc, 34);
  let y = doc.y;

  doc.rect(startX, y, tableWidth, 22).fillAndStroke('#f1f5f9', '#cbd5e1');
  let x = startX;
  columns.forEach((column) => {
    doc
      .fillColor('#0f172a')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text(column.header, x + 6, y + 7, {
        width: column.width - 12,
      });
    x += column.width;
  });

  doc.y = y + 22;

  if (rows.length === 0) {
    ensureRoom(doc, 36);
    doc.rect(startX, doc.y, tableWidth, 34).fillAndStroke('#ffffff', '#e2e8f0');
    doc
      .fillColor('#64748b')
      .font('Helvetica')
      .fontSize(9)
      .text(emptyMessage, startX + 8, doc.y + 11, {
        width: tableWidth - 16,
      });
    doc.y += 42;
    return;
  }

  rows.forEach((row, rowIndex) => {
    const values = columns.map((column) =>
      textOrDash(column.render(row, rowIndex)),
    );
    const rowHeight = Math.max(
      30,
      ...columns.map((column, columnIndex) => {
        doc.font('Helvetica').fontSize(8.5);
        return (
          14 +
          doc.heightOfString(values[columnIndex], {
            width: column.width - 12,
          })
        );
      }),
    );

    ensureRoom(doc, rowHeight + 8);
    y = doc.y;
    doc
      .rect(startX, y, tableWidth, rowHeight)
      .fillAndStroke(rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc', '#e2e8f0');

    x = startX;
    values.forEach((value, columnIndex) => {
      doc
        .fillColor('#0f172a')
        .font('Helvetica')
        .fontSize(8.5)
        .text(value, x + 6, y + 8, {
          width: columns[columnIndex].width - 12,
          lineGap: 1.5,
        });
      x += columns[columnIndex].width;
    });

    doc.y = y + rowHeight;
  });

  doc.moveDown(0.7);
}

export function addCompactTable<T>(
  doc: PDFKit.PDFDocument,
  columns: PdfTableColumn<T>[],
  rows: T[],
  emptyMessage = 'No records found.',
) {
  const startX = doc.page.margins.left;
  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);

  ensureRoom(doc, 28);
  let y = doc.y;

  doc
    .roundedRect(startX, y, tableWidth, 18, 2)
    .fillAndStroke(PDF_COLORS.navy, PDF_COLORS.navy);
  let x = startX;
  columns.forEach((column) => {
    doc
      .fillColor(PDF_COLORS.white)
      .font('Helvetica-Bold')
      .fontSize(7.2)
      .text(column.header, x + 4, y + 5.8, {
        width: column.width - 8,
      });
    x += column.width;
  });

  doc.y = y + 18;

  if (rows.length === 0) {
    ensureRoom(doc, 28);
    doc
      .roundedRect(startX, doc.y, tableWidth, 25, 2)
      .fillAndStroke(PDF_COLORS.paleBlue, '#bfdbfe');
    doc
      .fillColor(PDF_COLORS.muted)
      .font('Helvetica')
      .fontSize(8)
      .text(emptyMessage, startX + 7, doc.y + 8.5, {
        width: tableWidth - 12,
      });
    doc.y += 30;
    return;
  }

  rows.forEach((row, rowIndex) => {
    const values = columns.map((column) =>
      textOrDash(column.render(row, rowIndex)),
    );
    const rowHeight = Math.max(
      22,
      ...columns.map((column, columnIndex) => {
        doc.font('Helvetica').fontSize(7.8);
        return (
          9 +
          doc.heightOfString(values[columnIndex], {
            width: column.width - 8,
          })
        );
      }),
    );

    ensureRoom(doc, rowHeight + 4);
    y = doc.y;
    doc
      .rect(startX, y, tableWidth, rowHeight)
      .fillAndStroke(
        rowIndex % 2 === 0 ? PDF_COLORS.white : PDF_COLORS.tableAlt,
        '#e2e8f0',
      );

    x = startX;
    values.forEach((value, columnIndex) => {
      if (columnIndex > 0) {
        doc
          .moveTo(x, y)
          .lineTo(x, y + rowHeight)
          .lineWidth(0.2)
          .strokeColor('#e2e8f0')
          .stroke();
      }
      doc
        .fillColor(PDF_COLORS.slate)
        .font('Helvetica')
        .fontSize(7.8)
        .text(value, x + 4, y + 6, {
          width: columns[columnIndex].width - 8,
          lineGap: 0.5,
        });
      x += columns[columnIndex].width;
    });

    doc.y = y + rowHeight;
  });

  doc.moveDown(0.35);
}

export function addTotalsPanel(
  doc: PDFKit.PDFDocument,
  items: PdfKeyValue[],
  title = 'Totals',
) {
  const width = 210;
  const left = doc.page.width - doc.page.margins.right - width;
  const rowHeight = 18;
  const height = 26 + items.length * rowHeight;

  ensureRoom(doc, height + 6);
  const y = doc.y;
  doc
    .roundedRect(left, y, width, height, 3)
    .fillAndStroke(PDF_COLORS.white, '#bfdbfe');
  doc
    .roundedRect(left, y, width, 22, 3)
    .fillAndStroke(PDF_COLORS.sky, '#bfdbfe');
  doc
    .fillColor(PDF_COLORS.navy)
    .font('Helvetica-Bold')
    .fontSize(8)
    .text(title.toUpperCase(), left + 8, y + 7, {
      width: width - 16,
      characterSpacing: 0.2,
    });

  let rowY = y + 24;
  items.forEach((item, index) => {
    const isFinal = index === items.length - 1;
    if (index > 0) {
      doc
        .moveTo(left + 8, rowY - 2)
        .lineTo(left + width - 8, rowY - 2)
        .lineWidth(0.25)
        .strokeColor('#dbeafe')
        .stroke();
    }
    doc
      .fillColor(isFinal ? PDF_COLORS.navy : PDF_COLORS.muted)
      .font(isFinal ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(isFinal ? 8.8 : 7.8)
      .text(item.label, left + 8, rowY + 2, { width: 88 });
    doc
      .fillColor(isFinal ? PDF_COLORS.navy : PDF_COLORS.slate)
      .font(isFinal ? 'Helvetica-Bold' : 'Helvetica-Bold')
      .fontSize(isFinal ? 9 : 8)
      .text(textOrDash(item.value), left + 98, rowY + 2, {
        width: width - 106,
        align: 'right',
      });
    rowY += rowHeight;
  });

  doc.y = y + height + 6;
}

export function addSignatureBlock(
  doc: PDFKit.PDFDocument,
  items: PdfKeyValue[],
  title = 'Clinician sign off',
) {
  const width = contentWidth(doc);
  const height = 62;

  ensureRoom(doc, height + 8);
  const y = doc.y;
  doc
    .roundedRect(doc.page.margins.left, y, width, height, 3)
    .fillAndStroke(PDF_COLORS.white, '#bfdbfe');
  doc
    .fillColor(PDF_COLORS.navy)
    .font('Helvetica-Bold')
    .fontSize(8)
    .text(title.toUpperCase(), doc.page.margins.left + 9, y + 7, {
      width: width - 18,
      characterSpacing: 0.2,
    });

  const columns = Math.max(1, Math.min(3, items.length));
  const colGap = 12;
  const colWidth = (width - 18 - colGap * (columns - 1)) / columns;
  items.slice(0, 3).forEach((item, index) => {
    const x = doc.page.margins.left + 9 + index * (colWidth + colGap);
    doc
      .fillColor(PDF_COLORS.muted)
      .font('Helvetica-Bold')
      .fontSize(6.8)
      .text(item.label, x, y + 25, { width: colWidth });
    doc
      .fillColor(PDF_COLORS.slate)
      .font('Helvetica')
      .fontSize(8.2)
      .text(textOrDash(item.value), x, y + 36, {
        width: colWidth,
        ellipsis: true,
      });
    doc
      .moveTo(x, y + 52)
      .lineTo(x + colWidth, y + 52)
      .lineWidth(0.4)
      .strokeColor(PDF_COLORS.line)
      .stroke();
  });

  doc.y = y + height + 6;
}

export function drawVerificationBarcode(
  doc: PDFKit.PDFDocument,
  code: string,
  x: number,
  y: number,
  width = 138,
  height = 34,
) {
  const payload = code || 'UNVERIFIED';
  const bits: number[] = [];

  for (const char of payload) {
    const value = char.charCodeAt(0);
    for (let bit = 6; bit >= 0; bit -= 1) {
      bits.push((value >> bit) & 1);
    }
    bits.push(0);
  }

  const barAreaWidth = width - 10;
  const unit = barAreaWidth / Math.max(bits.length, 1);

  doc.save();
  doc.roundedRect(x, y, width, height, 2).fillAndStroke('#ffffff', '#cbd5e1');

  let cursor = x + 5;
  bits.forEach((bit, index) => {
    if (bit) {
      const barWidth = Math.max(0.7, unit * (index % 3 === 0 ? 1.7 : 1.05));
      doc.rect(cursor, y + 5, barWidth, height - 15).fill('#111827');
    }
    cursor += unit;
  });

  doc
    .fillColor('#111827')
    .font('Helvetica-Bold')
    .fontSize(5.8)
    .text(payload, x + 5, y + height - 9, {
      width: width - 10,
      align: 'center',
      characterSpacing: 0.3,
    });
  doc.restore();
}

export function ensureRoom(doc: PDFKit.PDFDocument, requiredHeight: number) {
  const bottom = doc.page.height - doc.page.margins.bottom - 42;

  if (doc.y + requiredHeight > bottom) {
    doc.addPage();
    doc.y = doc.page.margins.top;
  }
}

function drawLetterhead(
  doc: PDFKit.PDFDocument,
  options: HospitalPdfOptions,
  logoBuffer?: Buffer,
  qrBuffer?: Buffer,
) {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const compact = options.compact === true;
  const top = compact ? 24 : 30;
  const height = compact ? 66 : 80;
  const logoSize = compact ? 35 : 44;
  const titleWidth = compact ? 156 : 176;
  const titleX = doc.page.width - doc.page.margins.right - titleWidth;
  const facilityName = options.facility?.name || 'Hospital Facility';
  const branchLine = options.branch?.name
    ? `${options.branch.name} Branch`
    : '';
  const contact = [
    options.facility?.address || options.branch?.address,
    options.facility?.phone || options.branch?.phone,
    options.facility?.email || options.branch?.email,
    options.facility?.website,
  ]
    .filter(Boolean)
    .join(' | ');

  doc.save();
  doc
    .rect(0, 0, doc.page.width, 6)
    .fill(PDF_COLORS.blue);
  doc
    .roundedRect(left, top, width, height, 5)
    .fillAndStroke(PDF_COLORS.paleBlue, '#bfdbfe');
  doc
    .rect(left, top, 5, height)
    .fill(PDF_COLORS.navy);
  doc
    .moveTo(left + width - titleWidth - 18, top + 9)
    .lineTo(left + width - titleWidth - 18, top + height - 9)
    .lineWidth(0.4)
    .strokeColor('#bfdbfe')
    .stroke();
  doc.restore();

  let textLeft = left + 13;
  if (logoBuffer) {
    try {
      doc
        .roundedRect(left + 13, top + 12, logoSize + 8, logoSize + 8, 4)
        .fillAndStroke(PDF_COLORS.white, '#bae6fd');
      doc.image(logoBuffer, left + 17, top + 16, {
        fit: [logoSize, logoSize],
      });
      textLeft = left + logoSize + 30;
    } catch {
      textLeft = left + 13;
    }
  } else {
    doc
      .roundedRect(left + 13, top + 12, logoSize + 8, logoSize + 8, 4)
      .fillAndStroke(PDF_COLORS.white, '#bae6fd');
    doc
      .fillColor(PDF_COLORS.blue)
      .font('Helvetica-Bold')
      .fontSize(compact ? 18 : 22)
      .text('+', left + 13, top + (compact ? 15 : 15), {
        width: logoSize + 8,
        align: 'center',
      });
    textLeft = left + logoSize + 30;
  }

  doc
    .fillColor(PDF_COLORS.navy)
    .font('Helvetica-Bold')
    .fontSize(compact ? 12.2 : 14.5)
    .text(facilityName.toUpperCase(), textLeft, top + 13, {
      width: titleX - textLeft - 18,
      lineGap: 0.5,
    });
  doc
    .fillColor(PDF_COLORS.blue)
    .font('Helvetica-Bold')
    .fontSize(compact ? 7.1 : 8.2)
    .text(branchLine || 'Official Hospital Document', textLeft, top + 33, {
      width: titleX - textLeft - 18,
    });
  doc
    .fillColor(PDF_COLORS.muted)
    .font('Helvetica')
    .fontSize(compact ? 6.7 : 7.6)
    .text(
      contact || 'Facility contact details not recorded',
      textLeft,
      top + 46,
      {
        width: titleX - textLeft - 18,
        lineGap: compact ? 1 : 2,
      },
    );

  doc
    .fillColor(PDF_COLORS.navy)
    .font('Helvetica-Bold')
    .fontSize(compact ? 12.4 : 15)
    .text(options.title.toUpperCase(), titleX, top + 14, {
      width: titleWidth,
      align: 'right',
    });

  if (options.subtitle) {
    doc
      .roundedRect(titleX + titleWidth - 118, top + 35, 118, 16, 2)
      .fillAndStroke(PDF_COLORS.white, '#bfdbfe');
    doc
      .fillColor(PDF_COLORS.blue)
      .font('Helvetica-Bold')
      .fontSize(compact ? 6.8 : 7.5)
      .text(options.subtitle, titleX + titleWidth - 113, top + 39.8, {
        width: 108,
        align: 'right',
        ellipsis: true,
      });
  }

  if (qrBuffer) {
    const qrSize = compact ? 29 : 35;
    const qrX = titleX - qrSize - 11;
    const qrY = top + (compact ? 27 : 31);
    doc
      .roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 14, 3)
      .fillAndStroke(PDF_COLORS.white, '#bfdbfe');
    doc.image(qrBuffer, qrX, qrY, {
      fit: [qrSize, qrSize],
    });
    doc
      .fillColor(PDF_COLORS.muted)
      .font('Helvetica-Bold')
      .fontSize(compact ? 5.2 : 5.8)
      .text('VERIFY', qrX - 4, qrY + qrSize + 2, {
        width: qrSize + 8,
        align: 'center',
      });
    doc
      .fillColor(PDF_COLORS.muted)
      .font('Helvetica-Bold')
      .fontSize(compact ? 5.8 : 6.5)
      .text(options.verificationCode || options.reference || 'VERIFY', titleX, top + height - 14, {
        width: titleWidth,
        align: 'right',
        ellipsis: true,
      });
  } else if (options.reference) {
    doc
      .fillColor(PDF_COLORS.blue)
      .font('Helvetica-Bold')
      .fontSize(compact ? 7 : 8)
      .text(options.reference, titleX, top + height - 27, {
        width: titleWidth,
        align: 'right',
      });
  }

  doc
    .moveTo(left, top + height)
    .lineTo(left + width, top + height)
    .lineWidth(1.2)
    .strokeColor(PDF_COLORS.blue)
    .stroke();

  doc.y = top + height + (compact ? 10 : 13);
}

async function createDocumentQr(options: HospitalPdfOptions) {
  const payload = normalizeQrPayload(
    options.qrPayload ??
      ({
        title: options.title,
        subtitle: options.subtitle,
        reference: options.reference,
        verificationCode: options.verificationCode,
        facility: options.facility?.name,
        branch: options.branch?.name,
      } satisfies Record<string, unknown>),
  );

  try {
    return QRCode.toBuffer(payload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      scale: 3,
    });
  } catch {
    return undefined;
  }
}

function normalizeQrPayload(payload: unknown) {
  if (typeof payload !== 'string') {
    return JSON.stringify(payload);
  }

  if (/^https?:\/\//i.test(payload)) {
    return payload;
  }

  if (payload.startsWith('/')) {
    return `${publicDocumentBaseUrl()}${payload}`;
  }

  return payload;
}

function publicDocumentBaseUrl() {
  const configured =
    process.env.PUBLIC_API_BASE_URL ||
    process.env.API_PUBLIC_URL ||
    process.env.BACKEND_PUBLIC_URL ||
    process.env.SERVER_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : undefined) ||
    'http://localhost:3000';

  return configured.replace(/\/+$/, '');
}

function drawFooter(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  const generatedAt = formatPdfDate(new Date());

  for (let pageIndex = 0; pageIndex < range.count; pageIndex += 1) {
    doc.switchToPage(range.start + pageIndex);

    const footerY = doc.page.height - doc.page.margins.bottom - 24;
    const left = doc.page.margins.left;
    const width = contentWidth(doc);
    doc
      .roundedRect(left, footerY - 13, width, 24, 2)
      .fillAndStroke('#f8fbff', '#dbeafe');
    doc.rect(left, footerY - 13, 4, 24).fill(PDF_COLORS.blue);
    doc
      .fillColor(PDF_COLORS.muted)
      .font('Helvetica')
      .fontSize(7.5)
      .text(
        `Generated ${generatedAt} by Invinceible Core HMS`,
        left + 9,
        footerY - 4,
        {
          width: 280,
        },
      );
    doc
      .fillColor(PDF_COLORS.navy)
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .text(
        `Page ${pageIndex + 1} of ${range.count}`,
        doc.page.width - 140,
        footerY - 4,
        {
          width: 92,
          align: 'right',
        },
      );
  }
}
