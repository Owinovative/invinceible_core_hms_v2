// Renders docs/master/MASTER_SYSTEM_DOCUMENTATION.md into:
//   - Invinceible-Core-HMS-System-Documentation.pdf (cover, clickable TOC
//     with page numbers, headers/footers, page numbers, highlighted code)
//   - MASTER_SYSTEM_DOCUMENTATION.html (self-contained, live Mermaid)
// Usage: cd backend && node scripts/render-master-doc.mjs
import { createWriteStream, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const masterDir = join(repoRoot, 'docs', 'master');
const srcPath = join(masterDir, 'MASTER_SYSTEM_DOCUMENTATION.md');
const pdfPath = join(
  masterDir,
  'Invinceible-Core-HMS-System-Documentation.pdf',
);
const htmlPath = join(masterDir, 'MASTER_SYSTEM_DOCUMENTATION.html');

const ACCENT = '#0f4c81';
const GRAY = '#555555';
const CODE_BG = '#f4f6f8';
const A4 = [595.28, 841.89];
const MARGIN = 56;
const CONTENT_W = A4[0] - MARGIN * 2;
const BOTTOM = A4[1] - MARGIN - 24;

// --- text sanitation for WinAnsi (built-in PDF fonts) ---------------------
const CHAR_MAP = {
  '→': '->', '←': '<-', '↓': 'v', '↑': '^',
  '✅': '[OK]', '⚠️': '[!]', '⚠': '[!]', '🔌': '[ext]', '❌': '[x]',
  '✕': 'x', '✓': 'ok', '●': '*', '📘': '', '🏗': '', '🔐': '', '🔒': '',
  '⚙️': '', '👩‍💻': '', '🎨': '', '📚': '', '🤖': '',
  '├': '|', '└': '`', '│': '|', '─': '-', '┬': '-', '┴': '-', '┼': '+',
  '≈': '~', '≤': '<=', '≥': '>=', '…': '...', '™': '(TM)',
  ' ': ' ', '​': '',
};
function sanitize(text) {
  let out = '';
  for (const ch of String(text)) {
    if (ch in CHAR_MAP) {
      out += CHAR_MAP[ch];
      continue;
    }
    const code = ch.codePointAt(0);
    if (code <= 0xff || '–—··•§°éèêàçüöä'.includes(ch)) out += ch;
    // silently drop anything else outside WinAnsi
  }
  return out;
}

// --- markdown block parser -------------------------------------------------
function parseBlocks(markdown) {
  const lines = markdown.split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      const lang = line.trim().slice(3).trim();
      const code = [];
      i += 1;
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ type: 'code', lang, code });
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        text: heading[2].trim(),
      });
      i += 1;
      continue;
    }
    if (/^ *\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /^ *\|/.test(lines[i])) {
        const cells = lines[i]
          .trim()
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((cell) => cell.trim());
        if (!cells.every((cell) => /^:?-{3,}:?$/.test(cell))) rows.push(cells);
        i += 1;
      }
      blocks.push({ type: 'table', rows });
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        const m = lines[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
        let text = m[3];
        // absorb wrapped continuation lines
        while (
          i + 1 < lines.length &&
          lines[i + 1].trim() &&
          !/^\s*([-*]|\d+\.|\||#|```)/.test(lines[i + 1])
        ) {
          text += ' ' + lines[i + 1].trim();
          i += 1;
        }
        items.push({
          indent: Math.floor(m[1].length / 2),
          ordered: /\d/.test(m[2]),
          marker: m[2],
          text,
        });
        i += 1;
      }
      blocks.push({ type: 'list', items });
      continue;
    }
    if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }
    if (/^\s*>/.test(line)) {
      const quote = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      blocks.push({ type: 'quote', text: quote.join(' ') });
      continue;
    }
    if (!line.trim()) {
      i += 1;
      continue;
    }
    let para = line.trim();
    while (
      i + 1 < lines.length &&
      lines[i + 1].trim() &&
      !/^\s*([-*]\s|\d+\.\s|\||#|```|>|---)/.test(lines[i + 1])
    ) {
      para += ' ' + lines[i + 1].trim();
      i += 1;
    }
    blocks.push({ type: 'para', text: para });
    i += 1;
  }
  return blocks;
}

// --- inline formatting → spans ---------------------------------------------
function inlineSpans(text) {
  const spans = [];
  // links → keep label (+ external URL annotation)
  const withLinks = [];
  let rest = text;
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/;
  while (true) {
    const m = rest.match(linkRe);
    if (!m) {
      withLinks.push({ text: rest });
      break;
    }
    if (m.index > 0) withLinks.push({ text: rest.slice(0, m.index) });
    withLinks.push({
      text: m[1],
      link: /^https?:\/\//.test(m[2]) ? m[2] : undefined,
      internal: !/^https?:\/\//.test(m[2]),
    });
    rest = rest.slice(m.index + m[0].length);
  }
  for (const piece of withLinks) {
    // split by bold / code
    const tokens = piece.text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    for (const token of tokens) {
      if (!token) continue;
      if (/^\*\*[^*]+\*\*$/.test(token)) {
        spans.push({ text: token.slice(2, -2), bold: true, ...piece.linkProps });
      } else if (/^`[^`]+`$/.test(token)) {
        spans.push({ text: token.slice(1, -1), code: true });
      } else {
        spans.push({
          text: token.replace(/\*([^*]+)\*/g, '$1'),
          link: piece.link,
          colored: piece.internal || Boolean(piece.link),
        });
      }
    }
  }
  return spans.filter((s) => s.text.length > 0);
}

// --- syntax highlighting (minimal) ------------------------------------------
const KEYWORDS = new Set(
  ('const let var function return if else for while class new import from ' +
    'export async await try catch throw interface type extends implements ' +
    'public private readonly enum true false null undefined this select ' +
    'from where and or not create table alter').split(' '),
);
function codeLineSegments(line) {
  const segments = [];
  const re = /("[^"]*"|'[^']*'|`[^`]*`|\/\/.*$|#.*$|--.*$|\b\w+\b|\s+|.)/g;
  let match;
  while ((match = re.exec(line)) !== null) {
    const token = match[0];
    if (/^["'`]/.test(token)) segments.push({ text: token, color: '#9a3412' });
    else if (/^(\/\/|#|--)/.test(token))
      segments.push({ text: token, color: '#15803d' });
    else if (KEYWORDS.has(token))
      segments.push({ text: token, color: ACCENT });
    else segments.push({ text: token, color: '#111827' });
  }
  return segments;
}

// ============================ PDF RENDER =====================================
const markdown = readFileSync(srcPath, 'utf8');
const blocks = parseBlocks(markdown);

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: MARGIN, bottom: MARGIN + 24, left: MARGIN, right: MARGIN },
  bufferPages: true,
  info: {
    Title: 'Invinceible Core HMS — Complete System Documentation',
    Author: 'Owinovative',
    Subject: 'Hospital Management Information System — technical documentation',
  },
});
doc.pipe(createWriteStream(pdfPath));

const tocEntries = []; // { level, text, page, destName }
const pageSections = {}; // pageIndex -> running section title
let currentSection = '';
let figureCount = 0;
let destCount = 0;

function currentPageIndex() {
  return doc.bufferedPageRange().count - 1;
}
function noteSection() {
  pageSections[currentPageIndex()] = currentSection;
}
function ensureRoom(height) {
  if (doc.y + height > BOTTOM) {
    doc.addPage();
    noteSection();
  }
}

// ---- cover page ----
doc.rect(0, 0, A4[0], 8).fill(ACCENT);
doc.moveDown(8);
doc
  .fillColor(ACCENT)
  .font('Helvetica-Bold')
  .fontSize(30)
  .text('Invinceible Core HMS', { align: 'center' });
doc
  .moveDown(0.3)
  .fillColor('#111827')
  .fontSize(19)
  .text('Complete System Documentation', { align: 'center' });
doc
  .moveDown(0.8)
  .font('Helvetica')
  .fontSize(11.5)
  .fillColor(GRAY)
  .text(
    'Enterprise Hospital Management Information System\n' +
      'Multi-tenant  |  NestJS + Next.js + Prisma  |  KRA eTIMS & DHA ready',
    { align: 'center' },
  );
doc.moveDown(3);
const coverMeta = [
  ['Repository', 'Owinovative / invinceible_core_hms_v2'],
  ['Version', '2.x'],
  ['Generated', new Date().toISOString().slice(0, 10)],
  ['Audience', 'Clients, administrators, engineers, auditors, certification bodies'],
  ['Source of truth', 'Repository code (regenerate: backend/scripts/render-master-doc.mjs)'],
];
let metaY = doc.y;
for (const [k, v] of coverMeta) {
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827');
  doc.text(k, MARGIN + 60, metaY, { width: 110 });
  doc.font('Helvetica').fillColor(GRAY);
  doc.text(sanitize(v), MARGIN + 180, metaY, { width: 300 });
  metaY = Math.max(doc.y, metaY + 16) + 6;
}
doc
  .fontSize(9)
  .fillColor(GRAY)
  .text(
    'Confidential — for evaluation, operations, audit, and development use.',
    MARGIN,
    A4[1] - 90,
    { width: CONTENT_W, align: 'center' },
  );

// ---- reserved TOC page ----
doc.addPage();
const tocPageIndex = currentPageIndex();
doc.addPage(); // second reserved TOC page (index tocPageIndex+1)
const tocPageIndex2 = currentPageIndex();
doc.addPage(); // content starts here
noteSection();

// ---- body rendering ----
function renderSpans(spans, options = {}) {
  const size = options.size ?? 10;
  const baseFont = options.font ?? 'Helvetica';
  spans.forEach((span, index) => {
    const last = index === spans.length - 1;
    const font = span.code
      ? 'Courier'
      : span.bold
        ? 'Helvetica-Bold'
        : baseFont;
    doc
      .font(font)
      .fontSize(span.code ? size - 0.5 : size)
      .fillColor(span.colored ? ACCENT : options.color ?? '#111827');
    doc.text(sanitize(span.text), {
      continued: !last,
      link: span.link,
      underline: false,
      width: CONTENT_W,
      align: options.align,
      lineGap: options.lineGap ?? 2.5,
    });
  });
  doc.fillColor('#111827');
}

for (const block of blocks) {
  if (block.type === 'heading') {
    const text = sanitize(block.text.replace(/\*\*/g, ''));
    if (block.level === 1) {
      // new part → new page with banner
      doc.addPage();
      currentSection = text;
      noteSection();
      const destName = `dest${destCount++}`;
      doc.addNamedDestination(destName);
      tocEntries.push({ level: 1, text, page: currentPageIndex(), destName });
      doc.moveDown(2);
      doc.rect(MARGIN, doc.y, 44, 5).fill(ACCENT);
      doc.moveDown(0.8);
      doc.font('Helvetica-Bold').fontSize(23).fillColor('#111827');
      doc.text(text, MARGIN, doc.y, { width: CONTENT_W });
      doc.moveDown(0.6);
    } else if (block.level === 2) {
      ensureRoom(70);
      currentSection = text;
      noteSection();
      const destName = `dest${destCount++}`;
      doc.moveDown(1.1);
      doc.addNamedDestination(destName);
      tocEntries.push({ level: 2, text, page: currentPageIndex(), destName });
      doc.font('Helvetica-Bold').fontSize(16.5).fillColor(ACCENT);
      doc.text(text, MARGIN, doc.y, { width: CONTENT_W });
      doc
        .moveTo(MARGIN, doc.y + 2)
        .lineTo(MARGIN + CONTENT_W, doc.y + 2)
        .lineWidth(0.7)
        .strokeColor('#d1d5db')
        .stroke();
      doc.moveDown(0.55);
    } else if (block.level === 3) {
      ensureRoom(50);
      doc.moveDown(0.8);
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#111827');
      doc.text(text, MARGIN, doc.y, { width: CONTENT_W });
      doc.moveDown(0.3);
    } else {
      ensureRoom(40);
      doc.moveDown(0.6);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#374151');
      doc.text(text, MARGIN, doc.y, { width: CONTENT_W });
      doc.moveDown(0.25);
    }
    continue;
  }

  if (block.type === 'para') {
    ensureRoom(30);
    doc.x = MARGIN;
    renderSpans(inlineSpans(block.text), { size: 10 });
    doc.moveDown(0.55);
    continue;
  }

  if (block.type === 'quote') {
    ensureRoom(36);
    const y0 = doc.y;
    doc.x = MARGIN + 12;
    doc.font('Helvetica-Oblique').fontSize(9.5).fillColor(GRAY);
    doc.text(sanitize(block.text.replace(/\*\*/g, '').replace(/`/g, '')), {
      width: CONTENT_W - 18,
      lineGap: 2,
    });
    doc
      .rect(MARGIN + 2, y0 - 1, 3, doc.y - y0 + 2)
      .fill('#cbd5e1');
    doc.x = MARGIN;
    doc.moveDown(0.5);
    continue;
  }

  if (block.type === 'list') {
    for (const item of block.items) {
      ensureRoom(24);
      const indent = MARGIN + 10 + item.indent * 14;
      const bulletX = indent;
      doc.x = indent + 12;
      const yBefore = doc.y;
      renderSpans(inlineSpans(item.text), { size: 10, lineGap: 2 });
      doc.font('Helvetica').fontSize(10).fillColor('#111827');
      const marker = item.ordered ? item.marker : '-';
      doc.text(marker, bulletX, yBefore, { lineBreak: false, width: 12 });
      doc.x = MARGIN;
      doc.moveDown(0.28);
    }
    doc.moveDown(0.35);
    continue;
  }

  if (block.type === 'hr') {
    ensureRoom(20);
    doc
      .moveTo(MARGIN, doc.y + 4)
      .lineTo(MARGIN + CONTENT_W, doc.y + 4)
      .lineWidth(0.5)
      .strokeColor('#e5e7eb')
      .stroke();
    doc.moveDown(0.9);
    continue;
  }

  if (block.type === 'code') {
    const isMermaid = block.lang === 'mermaid';
    const lineHeight = 10.2;
    if (isMermaid) {
      figureCount += 1;
      ensureRoom(30);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(ACCENT);
      doc.text(
        `Figure ${figureCount}. Diagram (Mermaid source - renders in the ` +
          'Markdown/HTML editions)',
        MARGIN,
        doc.y,
        { width: CONTENT_W },
      );
      doc.moveDown(0.25);
    }
    doc.moveDown(0.15);
    for (const rawLine of block.code) {
      ensureRoom(lineHeight + 2);
      const y = doc.y;
      doc
        .rect(MARGIN, y - 1.5, CONTENT_W, lineHeight + 1.5)
        .fill(CODE_BG);
      let x = MARGIN + 6;
      const segments = isMermaid
        ? [{ text: rawLine, color: '#334155' }]
        : codeLineSegments(rawLine);
      doc.fontSize(7.8).font('Courier');
      for (const segment of segments) {
        const text = sanitize(segment.text);
        if (!text) continue;
        doc.fillColor(segment.color);
        doc.text(text, x, y, { lineBreak: false });
        x += doc.widthOfString(text);
        if (x > MARGIN + CONTENT_W - 8) break; // clip overlong lines
      }
      doc.y = y + lineHeight;
      doc.x = MARGIN;
    }
    doc.fillColor('#111827');
    doc.moveDown(0.7);
    continue;
  }

  if (block.type === 'table') {
    const rows = block.rows;
    if (rows.length === 0) continue;
    const colCount = Math.max(...rows.map((r) => r.length));
    // proportional widths by content size, bounded
    const maxLens = Array.from({ length: colCount }, (_, c) =>
      Math.max(...rows.map((r) => (r[c] ?? '').length), 4),
    );
    const totalLen = maxLens.reduce((a, b) => a + b, 0);
    const widths = maxLens.map((len) =>
      Math.max(52, (len / totalLen) * CONTENT_W),
    );
    const scale = CONTENT_W / widths.reduce((a, b) => a + b, 0);
    const colWidths = widths.map((w) => w * scale);
    const fontSize = 8.4;
    const pad = 4;

    const drawRow = (cells, header) => {
      doc.fontSize(fontSize).font(header ? 'Helvetica-Bold' : 'Helvetica');
      const cellTexts = Array.from({ length: colCount }, (_, c) =>
        sanitize((cells[c] ?? '').replace(/\*\*/g, '').replace(/`/g, '')),
      );
      const heights = cellTexts.map((text, c) =>
        doc.heightOfString(text || ' ', {
          width: colWidths[c] - pad * 2,
          lineGap: 1,
        }),
      );
      const rowH = Math.max(...heights) + pad * 2;
      if (doc.y + rowH > BOTTOM) {
        doc.addPage();
        noteSection();
        if (!header) drawRow(rows[0], true); // repeat header
      }
      const y = doc.y;
      let x = MARGIN;
      if (header) {
        doc.rect(MARGIN, y, CONTENT_W, rowH).fill('#e8eef5');
      }
      doc.fillColor('#111827');
      for (let c = 0; c < colCount; c += 1) {
        doc.font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);
        doc.text(cellTexts[c], x + pad, y + pad, {
          width: colWidths[c] - pad * 2,
          lineGap: 1,
        });
        x += colWidths[c];
      }
      doc
        .moveTo(MARGIN, y + rowH)
        .lineTo(MARGIN + CONTENT_W, y + rowH)
        .lineWidth(0.4)
        .strokeColor('#d1d5db')
        .stroke();
      doc.y = y + rowH;
      doc.x = MARGIN;
    };

    ensureRoom(46);
    drawRow(rows[0], true);
    for (const row of rows.slice(1)) drawRow(row, false);
    doc.moveDown(0.6);
    continue;
  }
}

// ---- write the TOC into the reserved pages ----
doc.switchToPage(tocPageIndex);
doc.y = MARGIN + 10;
doc.x = MARGIN;
doc.font('Helvetica-Bold').fontSize(20).fillColor('#111827');
doc.text('Table of Contents', MARGIN, doc.y);
doc.moveDown(0.8);
let tocPage = tocPageIndex;
for (const entry of tocEntries) {
  const isPart = entry.level === 1;
  const lineH = isPart ? 20 : 15;
  if (doc.y + lineH > BOTTOM && tocPage === tocPageIndex) {
    doc.switchToPage(tocPageIndex2);
    doc.y = MARGIN + 10;
    doc.x = MARGIN;
    tocPage = tocPageIndex2;
  }
  const label = entry.text.length > 78 ? `${entry.text.slice(0, 75)}...` : entry.text;
  const pageLabel = String(entry.page + 1);
  const y = doc.y;
  doc
    .font(isPart ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(isPart ? 11 : 9.6)
    .fillColor(isPart ? ACCENT : '#111827');
  doc.text(label, MARGIN + (isPart ? 0 : 16), y, {
    lineBreak: false,
  });
  const labelW =
    MARGIN + (isPart ? 0 : 16) + doc.widthOfString(label) + 6;
  const pageW = doc.widthOfString(pageLabel);
  // dot leaders
  doc.fillColor('#9ca3af').fontSize(9);
  const dotsWidth = MARGIN + CONTENT_W - pageW - 8 - labelW;
  if (dotsWidth > 10) {
    const dots = '.'.repeat(Math.floor(dotsWidth / doc.widthOfString('.')));
    doc.text(dots, labelW, y + (isPart ? 2 : 1), { lineBreak: false });
  }
  doc
    .font('Helvetica')
    .fontSize(isPart ? 10.5 : 9.6)
    .fillColor('#111827')
    .text(pageLabel, MARGIN + CONTENT_W - pageW, y, { lineBreak: false });
  // clickable region → named destination
  doc.goTo(MARGIN, y - 2, CONTENT_W, lineH, entry.destName);
  doc.y = y + lineH;
  doc.x = MARGIN;
}

// ---- headers, footers, page numbers ----
const range = doc.bufferedPageRange();
for (let i = 1; i < range.count; i += 1) {
  doc.switchToPage(i);
  // header
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#6b7280')
    .text('Invinceible Core HMS - System Documentation', MARGIN, 24, {
      lineBreak: false,
    });
  const section = sanitize(pageSections[i] ?? '');
  if (section) {
    const w = doc.widthOfString(section);
    doc.text(section, A4[0] - MARGIN - w, 24, { lineBreak: false });
  }
  doc
    .moveTo(MARGIN, 36)
    .lineTo(A4[0] - MARGIN, 36)
    .lineWidth(0.4)
    .strokeColor('#e5e7eb')
    .stroke();
  // footer
  const footY = A4[1] - 34;
  doc
    .moveTo(MARGIN, footY - 6)
    .lineTo(A4[0] - MARGIN, footY - 6)
    .lineWidth(0.4)
    .strokeColor('#e5e7eb')
    .stroke();
  doc
    .fontSize(8)
    .fillColor('#6b7280')
    .text('Owinovative - Confidential', MARGIN, footY, { lineBreak: false });
  const pageLabel = `Page ${i + 1} of ${range.count}`;
  const pw = doc.widthOfString(pageLabel);
  doc.text(pageLabel, A4[0] - MARGIN - pw, footY, { lineBreak: false });
}

doc.end();

// ============================ HTML RENDER ====================================
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function inlineHtml(text) {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (m, label, href) =>
        `<a href="${href.startsWith('http') ? href : href.startsWith('#') ? href : '#'}">${label}</a>`,
    );
}
let html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invinceible Core HMS - Complete System Documentation</title>
<script type="module">
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
mermaid.initialize({ startOnLoad: true, theme: 'neutral' });
</script>
<style>
:root{--accent:#0f4c81;--muted:#556}
body{font-family:'Segoe UI',system-ui,sans-serif;max-width:960px;margin:2rem auto;
padding:0 1.2rem;color:#1a202c;line-height:1.55}
h1{color:var(--accent);border-bottom:3px solid var(--accent);padding-bottom:.3rem}
h2{color:var(--accent);margin-top:2.2rem;border-bottom:1px solid #d8dee6;padding-bottom:.2rem}
h3{margin-top:1.6rem}
table{border-collapse:collapse;width:100%;margin:1rem 0;font-size:.9rem}
th{background:#e8eef5;text-align:left}
th,td{border:1px solid #cbd5e1;padding:.45rem .6rem;vertical-align:top}
code{background:#f1f5f9;padding:.1rem .3rem;border-radius:3px;font-size:.88em}
pre{background:#f4f6f8;border:1px solid #e2e8f0;border-radius:6px;
padding: .8rem;overflow-x:auto;font-size:.82rem;line-height:1.4}
pre code{background:none;padding:0}
pre.mermaid{background:#fff;text-align:center}
blockquote{border-left:4px solid #cbd5e1;margin:1rem 0;padding:.2rem 1rem;color:var(--muted)}
hr{border:none;border-top:1px solid #e2e8f0;margin:2rem 0}
.figure-caption{color:var(--accent);font-weight:600;font-size:.85rem;margin-bottom:.2rem}
</style></head><body>
`;
let htmlFigure = 0;
for (const block of blocks) {
  if (block.type === 'heading') {
    const level = Math.min(block.level, 6);
    html += `<h${level}>${inlineHtml(block.text)}</h${level}>\n`;
  } else if (block.type === 'para') {
    html += `<p>${inlineHtml(block.text)}</p>\n`;
  } else if (block.type === 'quote') {
    html += `<blockquote>${inlineHtml(block.text)}</blockquote>\n`;
  } else if (block.type === 'hr') {
    html += '<hr>\n';
  } else if (block.type === 'list') {
    html += '<ul>\n';
    for (const item of block.items) {
      html += `<li>${inlineHtml(item.text)}</li>\n`;
    }
    html += '</ul>\n';
  } else if (block.type === 'code') {
    if (block.lang === 'mermaid') {
      htmlFigure += 1;
      html += `<div class="figure-caption">Figure ${htmlFigure}</div>\n`;
      html += `<pre class="mermaid">${escapeHtml(block.code.join('\n'))}</pre>\n`;
    } else {
      html += `<pre><code>${escapeHtml(block.code.join('\n'))}</code></pre>\n`;
    }
  } else if (block.type === 'table') {
    html += '<table>\n<tr>';
    for (const cell of block.rows[0]) html += `<th>${inlineHtml(cell)}</th>`;
    html += '</tr>\n';
    for (const row of block.rows.slice(1)) {
      html += '<tr>';
      for (let c = 0; c < block.rows[0].length; c += 1) {
        html += `<td>${inlineHtml(row[c] ?? '')}</td>`;
      }
      html += '</tr>\n';
    }
    html += '</table>\n';
  }
}
html += '</body></html>\n';
writeFileSync(htmlPath, html, 'utf8');

console.log(`Wrote ${pdfPath}`);
console.log(`Wrote ${htmlPath} (${Math.round(html.length / 1024)} KB)`);
console.log(
  `TOC entries: ${tocEntries.length}, figures: ${figureCount}, pages: ${range.count}`,
);
