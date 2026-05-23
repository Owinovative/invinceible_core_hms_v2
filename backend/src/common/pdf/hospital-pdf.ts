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
  ensureRoom(doc, 42);
  doc.moveDown(0.6);
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#0f766e')
    .text(title.toUpperCase(), { continued: false });
  doc
    .moveTo(doc.page.margins.left, doc.y + 5)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y + 5)
    .lineWidth(0.7)
    .strokeColor('#cbd5e1')
    .stroke();
  doc.moveDown(0.8);
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
  const pageWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const columnGap = 12;
  const columnWidth = (pageWidth - columnGap * (columns - 1)) / columns;

  for (let index = 0; index < items.length; index += columns) {
    const row = items.slice(index, index + columns);
    const heights = row.map((item) => {
      const labelWidth = Math.min(82, columnWidth * 0.42);
      doc.font('Helvetica').fontSize(8);
      return Math.max(
        16,
        doc.heightOfString(textOrDash(item.value), {
          width: columnWidth - labelWidth - 8,
          lineGap: 1,
        }) + 4,
      );
    });
    const height = Math.max(18, ...heights);

    ensureRoom(doc, height + 3);
    const y = doc.y;

    row.forEach((item, offset) => {
      const x = doc.page.margins.left + offset * (columnWidth + columnGap);
      const labelWidth = Math.min(82, columnWidth * 0.42);
      doc
        .moveTo(x, y + height + 1)
        .lineTo(x + columnWidth, y + height + 1)
        .lineWidth(0.35)
        .strokeColor('#dbeafe')
        .stroke();
      doc
        .fillColor('#64748b')
        .font('Helvetica-Bold')
        .fontSize(7)
        .text(`${item.label}:`, x, y + 3, {
          width: labelWidth,
          ellipsis: true,
        });
      doc
        .fillColor('#0f172a')
        .font('Helvetica')
        .fontSize(8.2)
        .text(textOrDash(item.value), x + labelWidth + 6, y + 3, {
          width: columnWidth - labelWidth - 6,
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
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const bodyHeight = doc.heightOfString(text, {
    width,
    lineGap: 1.4,
  });
  const height = Math.max(31, bodyHeight + 18);

  ensureRoom(doc, height + 6);
  const y = doc.y;
  doc
    .fillColor('#0f172a')
    .font('Helvetica-Bold')
    .fontSize(8.5)
    .text(`${label}:`, doc.page.margins.left, y, {
      width,
    });
  doc
    .fillColor('#0f172a')
    .font('Helvetica')
    .fontSize(9)
    .text(text, doc.page.margins.left, y + 12, {
      width,
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
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const bodyHeight = doc.heightOfString(text, {
    width,
    lineGap: 1,
  });
  const height = Math.max(24, bodyHeight + 16);

  ensureRoom(doc, height + 5);
  const y = doc.y;
  doc
    .fillColor('#0f172a')
    .font('Helvetica-Bold')
    .fontSize(7.8)
    .text(`${label}:`, doc.page.margins.left, y, {
      width,
    });
  doc
    .fillColor('#0f172a')
    .font('Helvetica')
    .fontSize(8.4)
    .text(text, doc.page.margins.left, y + 10, {
      width,
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

  doc.rect(startX, y, tableWidth, 17).fillAndStroke('#f1f5f9', '#cbd5e1');
  let x = startX;
  columns.forEach((column) => {
    doc
      .fillColor('#0f172a')
      .font('Helvetica-Bold')
      .fontSize(7.2)
      .text(column.header, x + 4, y + 5.5, {
        width: column.width - 8,
      });
    x += column.width;
  });

  doc.y = y + 17;

  if (rows.length === 0) {
    ensureRoom(doc, 28);
    doc.rect(startX, doc.y, tableWidth, 24).fillAndStroke('#ffffff', '#e2e8f0');
    doc
      .fillColor('#64748b')
      .font('Helvetica')
      .fontSize(8)
      .text(emptyMessage, startX + 6, doc.y + 8, {
        width: tableWidth - 12,
      });
    doc.y += 29;
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
      .fillAndStroke(rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc', '#e2e8f0');

    x = startX;
    values.forEach((value, columnIndex) => {
      doc
        .fillColor('#0f172a')
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
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const compact = options.compact === true;
  const top = compact ? 28 : 34;
  const height = compact ? 58 : 72;
  const logoSize = compact ? 32 : 40;
  const titleWidth = compact ? 148 : 170;
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

  let textLeft = left;
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, left, top + 4, {
        fit: [logoSize, logoSize],
      });
      textLeft = left + logoSize + 10;
    } catch {
      textLeft = left;
    }
  }

  doc
    .fillColor('#0f172a')
    .font('Helvetica-Bold')
    .fontSize(compact ? 12.5 : 15)
    .text(facilityName.toUpperCase(), textLeft, top + 2, {
      width: titleX - textLeft - 12,
      lineGap: 0.5,
    });
  doc
    .fillColor('#005da8')
    .font('Helvetica-Bold')
    .fontSize(compact ? 7.1 : 8.2)
    .text(branchLine || 'Official Hospital Document', textLeft, top + 22, {
      width: titleX - textLeft - 12,
    });
  doc
    .fillColor('#334155')
    .font('Helvetica')
    .fontSize(compact ? 6.7 : 7.6)
    .text(contact || 'Facility contact details not recorded', textLeft, top + 35, {
      width: titleX - textLeft - 12,
      lineGap: compact ? 1 : 2,
    });

  doc
    .fillColor('#0f172a')
    .font('Helvetica-Bold')
    .fontSize(compact ? 12.8 : 15.5)
    .text(options.title, titleX, top + 14, {
      width: titleWidth,
      align: 'right',
    });

  if (options.subtitle) {
    doc
      .fillColor('#334155')
      .font('Helvetica')
      .fontSize(compact ? 7.5 : 9)
      .text(options.subtitle, titleX, top + (compact ? 34 : 38), {
        width: titleWidth,
        align: 'right',
      });
  }

  if (qrBuffer) {
    const qrSize = compact ? 30 : 36;
    doc.image(qrBuffer, titleX - qrSize - 10, top + 18, {
      fit: [qrSize, qrSize],
    });
    doc
      .fillColor('#334155')
      .font('Helvetica-Bold')
      .fontSize(compact ? 5.8 : 6.5)
      .text(options.verificationCode || options.reference || 'VERIFY', titleX, top + height - 13, {
        width: titleWidth,
        align: 'right',
      });
  } else if (options.reference) {
    doc
      .fillColor('#005da8')
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
    .lineWidth(1)
    .strokeColor('#0b5f9e')
    .stroke();

  doc.y = top + height + (compact ? 10 : 13);
}

async function createDocumentQr(options: HospitalPdfOptions) {
  const payload =
    options.qrPayload ??
    ({
      title: options.title,
      subtitle: options.subtitle,
      reference: options.reference,
      verificationCode: options.verificationCode,
      facility: options.facility?.name,
      branch: options.branch?.name,
    } satisfies Record<string, unknown>);

  try {
    return QRCode.toBuffer(
      typeof payload === 'string' ? payload : JSON.stringify(payload),
      {
        errorCorrectionLevel: 'M',
        margin: 1,
        scale: 3,
      },
    );
  } catch {
    return undefined;
  }
}

function drawFooter(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  const generatedAt = formatPdfDate(new Date());

  for (let pageIndex = 0; pageIndex < range.count; pageIndex += 1) {
    doc.switchToPage(range.start + pageIndex);

    const footerY = doc.page.height - doc.page.margins.bottom - 24;
    doc
      .moveTo(doc.page.margins.left, footerY - 10)
      .lineTo(doc.page.width - doc.page.margins.right, footerY - 10)
      .lineWidth(0.5)
      .strokeColor('#cbd5e1')
      .stroke();
    doc
      .fillColor('#64748b')
      .font('Helvetica')
      .fontSize(7.5)
      .text(
        `Generated ${generatedAt} by Invinceible Core HMS`,
        doc.page.margins.left,
        footerY,
        {
          width: 280,
        },
      );
    doc.text(
      `Page ${pageIndex + 1} of ${range.count}`,
      doc.page.width - 140,
      footerY,
      {
        width: 92,
        align: 'right',
      },
    );
  }
}
