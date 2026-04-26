import PDFDocument from 'pdfkit';

type PdfValue = string | number | Date | null | undefined;

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
}

export interface HospitalPdfOptions {
  title: string;
  subtitle?: string;
  reference?: string;
  facility?: HospitalPdfParty | null;
  branch?: HospitalPdfParty | null;
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
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 48,
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

    drawLetterhead(doc, options);
    renderBody(doc);
    drawFooter(doc);
    doc.end();
  });
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
  const pageWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const columnGap = 14;
  const columnWidth = (pageWidth - columnGap * (columns - 1)) / columns;

  for (let index = 0; index < items.length; index += columns) {
    const row = items.slice(index, index + columns);
    const y = doc.y;
    const heights = row.map((item) => {
      doc.font('Helvetica').fontSize(9);
      return (
        25 +
        doc.heightOfString(textOrDash(item.value), {
          width: columnWidth - 20,
        })
      );
    });
    const height = Math.max(42, ...heights);

    ensureRoom(doc, height + 8);

    row.forEach((item, offset) => {
      const x = doc.page.margins.left + offset * (columnWidth + columnGap);
      doc
        .roundedRect(x, y, columnWidth, height, 4)
        .fillAndStroke('#f8fafc', '#e2e8f0');
      doc
        .fillColor('#64748b')
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .text(item.label.toUpperCase(), x + 10, y + 9, {
          width: columnWidth - 20,
        });
      doc
        .fillColor('#0f172a')
        .font('Helvetica')
        .fontSize(9.5)
        .text(textOrDash(item.value), x + 10, y + 23, {
          width: columnWidth - 20,
        });
    });

    doc.y = y + height + 8;
  }
}

export function addCompactKeyValueGrid(
  doc: PDFKit.PDFDocument,
  items: PdfKeyValue[],
  columns = 3,
) {
  const pageWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const columnGap = 8;
  const columnWidth = (pageWidth - columnGap * (columns - 1)) / columns;

  for (let index = 0; index < items.length; index += columns) {
    const row = items.slice(index, index + columns);
    const y = doc.y;
    const height = 30;

    ensureRoom(doc, height + 5);

    row.forEach((item, offset) => {
      const x = doc.page.margins.left + offset * (columnWidth + columnGap);
      doc.rect(x, y, columnWidth, height).fillAndStroke('#ffffff', '#e2e8f0');
      doc
        .fillColor('#64748b')
        .font('Helvetica-Bold')
        .fontSize(6.8)
        .text(item.label.toUpperCase(), x + 7, y + 6, {
          width: columnWidth - 14,
        });
      doc
        .fillColor('#0f172a')
        .font('Helvetica')
        .fontSize(8.3)
        .text(textOrDash(item.value), x + 7, y + 17, {
          width: columnWidth - 14,
          ellipsis: true,
        });
    });

    doc.y = y + height + 5;
  }
}

export function addParagraph(
  doc: PDFKit.PDFDocument,
  label: string,
  value?: PdfValue,
) {
  const text = textOrDash(value);
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const height = doc.heightOfString(text, { width: width - 24 }) + 42;

  ensureRoom(doc, Math.max(height, 58));
  const y = doc.y;
  doc
    .roundedRect(doc.page.margins.left, y, width, Math.max(height, 58), 4)
    .fillAndStroke('#ffffff', '#e2e8f0');
  doc
    .fillColor('#64748b')
    .font('Helvetica-Bold')
    .fontSize(8)
    .text(label.toUpperCase(), doc.page.margins.left + 12, y + 10, {
      width: width - 24,
    });
  doc
    .fillColor('#0f172a')
    .font('Helvetica')
    .fontSize(10)
    .text(text, doc.page.margins.left + 12, y + 27, {
      width: width - 24,
      lineGap: 2,
    });
  doc.y = y + Math.max(height, 58) + 8;
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

  doc.rect(startX, y, tableWidth, 24).fillAndStroke('#0f766e', '#0f766e');
  let x = startX;
  columns.forEach((column) => {
    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text(column.header, x + 6, y + 8, {
        width: column.width - 12,
      });
    x += column.width;
  });

  doc.y = y + 24;

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

  doc.rect(startX, y, tableWidth, 18).fillAndStroke('#0f766e', '#0f766e');
  let x = startX;
  columns.forEach((column) => {
    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(7.2)
      .text(column.header, x + 4, y + 6, {
        width: column.width - 8,
      });
    x += column.width;
  });

  doc.y = y + 18;

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

export function ensureRoom(doc: PDFKit.PDFDocument, requiredHeight: number) {
  const bottom = doc.page.height - doc.page.margins.bottom - 42;

  if (doc.y + requiredHeight > bottom) {
    doc.addPage();
    doc.y = 48;
  }
}

function drawLetterhead(doc: PDFKit.PDFDocument, options: HospitalPdfOptions) {
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
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

  doc.rect(left, 36, width, 90).fillAndStroke('#ecfeff', '#0f766e');
  doc.rect(left, 36, 10, 90).fill('#0f766e');
  doc
    .fillColor('#0f172a')
    .font('Helvetica-Bold')
    .fontSize(16)
    .text(facilityName, left + 24, 52, { width: 285 });
  doc
    .fillColor('#0f766e')
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(branchLine || 'Official Hospital Document', left + 24, 75, {
      width: 285,
    });
  doc
    .fillColor('#334155')
    .font('Helvetica')
    .fontSize(8)
    .text(contact || 'Facility contact details not recorded', left + 24, 92, {
      width: 300,
      lineGap: 2,
    });

  doc
    .fillColor('#0f172a')
    .font('Helvetica-Bold')
    .fontSize(17)
    .text(options.title, left + 330, 52, {
      width: width - 350,
      align: 'right',
    });

  if (options.subtitle) {
    doc
      .fillColor('#334155')
      .font('Helvetica')
      .fontSize(9)
      .text(options.subtitle, left + 330, 78, {
        width: width - 350,
        align: 'right',
      });
  }

  if (options.reference) {
    doc
      .fillColor('#0f766e')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text(options.reference, left + 330, 98, {
        width: width - 350,
        align: 'right',
      });
  }

  doc.y = 148;
}

function drawFooter(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  const generatedAt = formatPdfDate(new Date());

  for (let pageIndex = 0; pageIndex < range.count; pageIndex += 1) {
    doc.switchToPage(range.start + pageIndex);

    const footerY = doc.page.height - 42;
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
