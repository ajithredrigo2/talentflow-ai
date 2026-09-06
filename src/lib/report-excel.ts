import ExcelJS from 'exceljs';
import type { ReportResult } from './reports';

/**
 * Excel export for HR reports.
 *
 * Produces a formatted workbook rather than a renamed CSV: a cover sheet
 * carrying the provenance an HR pack needs (which agent produced it, when, for
 * whom), one sheet per section, and a method-and-caveats sheet so the figures
 * cannot travel without the qualifications attached to them.
 *
 * Sheets are print-ready — landscape, fitted to page width, with the header row
 * repeated on every printed page and frozen on screen.
 */

const BRAND = 'FF7C3AED';       // brand-600, the platform violet
const BRAND_DEEP = 'FF4C1D95';  // brand-800, cover banner
const INK = 'FF1A0E2C';
const MUTED = 'FF71697D';
const RULE = 'FFE7E3EC';
const ZEBRA = 'FFFAF9FC';

const thin = { style: 'thin' as const, color: { argb: RULE } };
const BORDER = { top: thin, left: thin, bottom: thin, right: thin };

/** Excel caps sheet names at 31 chars and forbids : \ / ? * [ ] */
function sheetName(raw: string, taken: Set<string>): string {
  const cleaned = raw.replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31) || 'Sheet';
  let name = cleaned;
  let n = 2;
  while (taken.has(name.toLowerCase())) {
    const suffix = ` (${n++})`;
    name = cleaned.slice(0, 31 - suffix.length) + suffix;
  }
  taken.add(name.toLowerCase());
  return name;
}

/** Widths from content, clamped so one long sentence cannot blow out a column. */
function autoFit(sheet: ExcelJS.Worksheet, min = 12, max = 62) {
  sheet.columns.forEach((col) => {
    let longest = min;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const lines = String(cell.value ?? '').split('\n');
      lines.forEach((l) => (longest = Math.max(longest, l.length + 2)));
    });
    col.width = Math.min(max, longest);
  });
}

function titleBlock(sheet: ExcelJS.Worksheet, text: string, span: number, row: number) {
  sheet.mergeCells(row, 1, row, Math.max(span, 2));
  const cell = sheet.getCell(row, 1);
  cell.value = text;
  cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: INK } };
  cell.alignment = { vertical: 'middle' };
  sheet.getRow(row).height = 22;
}

function headerRow(sheet: ExcelJS.Worksheet, values: string[], row: number) {
  const r = sheet.getRow(row);
  r.values = values;
  r.height = 20;
  r.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = BORDER;
  });
  return r;
}

function bodyCell(cell: ExcelJS.Cell, striped: boolean) {
  cell.font = { name: 'Calibri', size: 10, color: { argb: INK } };
  cell.alignment = { vertical: 'top', wrapText: true };
  cell.border = BORDER;
  if (striped) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
}

/**
 * Values arriving as strings are written as numbers where they genuinely are
 * numbers, so Excel can sort, sum and chart them. Percentages keep their unit
 * by being stored as a number with a % format rather than as text.
 */
function writeValue(cell: ExcelJS.Cell, raw: string | number) {
  if (typeof raw === 'number') {
    cell.value = raw;
    cell.numFmt = Number.isInteger(raw) ? '#,##0' : '#,##0.00';
    cell.alignment = { ...cell.alignment, horizontal: 'right' };
    return;
  }
  const pctMatch = /^(-?\d+(?:\.\d+)?)%$/.exec(raw.trim());
  if (pctMatch) {
    cell.value = Number(pctMatch[1]) / 100;
    cell.numFmt = '0%';
    cell.alignment = { ...cell.alignment, horizontal: 'right' };
    return;
  }
  const numMatch = /^-?\d+(?:\.\d+)?$/.exec(raw.trim());
  if (numMatch) {
    const n = Number(raw);
    cell.value = n;
    cell.numFmt = Number.isInteger(n) ? '#,##0' : '#,##0.00';
    cell.alignment = { ...cell.alignment, horizontal: 'right' };
    return;
  }
  cell.value = raw;
}

function printSetup(sheet: ExcelJS.Worksheet, headerRowNumber?: number) {
  sheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
  };
  if (headerRowNumber) {
    sheet.pageSetup.printTitlesRow = `${headerRowNumber}:${headerRowNumber}`;
    sheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];
  }
  sheet.headerFooter = { oddFooter: '&L&"Calibri"&8TalentFlow AI&C&"Calibri"&8Page &P of &N&R&"Calibri"&8&D' };
}

export async function reportToXlsx(report: ReportResult, generatedBy: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'TalentFlow AI';
  wb.lastModifiedBy = generatedBy;
  wb.created = new Date(report.generatedAt);
  wb.modified = new Date(report.generatedAt);
  wb.title = report.name;
  wb.company = 'TalentFlow AI';

  const taken = new Set<string>();

  /* ---------------------------- Cover sheet ---------------------------- */
  const cover = wb.addWorksheet(sheetName('Summary', taken), {
    properties: { defaultRowHeight: 16 },
  });
  cover.columns = [{ width: 38 }, { width: 26 }, { width: 52 }];

  cover.mergeCells('A1:C3');
  const banner = cover.getCell('A1');
  banner.value = report.name;
  banner.font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
  banner.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  banner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_DEEP } };

  const meta: [string, string][] = [
    ['Produced by', report.agentLabel],
    ['Reporting period', report.period],
    ['Generated at', new Date(report.generatedAt).toLocaleString('en-GB', { timeZone: 'Asia/Dubai', dateStyle: 'full', timeStyle: 'short' })],
    ['Generated for', generatedBy],
    ['Source', 'Live TalentFlow AI platform data'],
    ['Status', 'Recommendation for human interpretation — not an automated decision'],
  ];
  let row = 5;
  meta.forEach(([k, v]) => {
    const label = cover.getCell(row, 1);
    label.value = k;
    label.font = { name: 'Calibri', size: 10, bold: true, color: { argb: MUTED } };
    cover.mergeCells(row, 2, row, 3);
    const value = cover.getCell(row, 2);
    value.value = v;
    value.font = { name: 'Calibri', size: 10, color: { argb: INK } };
    value.alignment = { wrapText: true, vertical: 'top' };
    row++;
  });

  row++;
  titleBlock(cover, 'Headline measures', 3, row++);
  headerRow(cover, ['Measure', 'Value', 'Note'], row++);
  report.kpis.forEach((k, i) => {
    const r = cover.getRow(row++);
    r.getCell(1).value = k.label;
    writeValue(r.getCell(2), k.value);
    r.getCell(3).value = k.hint ?? '';
    [1, 2, 3].forEach((c) => bodyCell(r.getCell(c), i % 2 === 1));
    r.getCell(2).font = { name: 'Calibri', size: 10, bold: true, color: { argb: BRAND } };
  });

  row++;
  titleBlock(cover, 'Summary', 3, row++);
  cover.mergeCells(row, 1, row + 4, 3);
  const narrative = cover.getCell(row, 1);
  narrative.value = report.narrative;
  narrative.font = { name: 'Calibri', size: 10, color: { argb: INK } };
  narrative.alignment = { wrapText: true, vertical: 'top' };
  narrative.border = BORDER;
  printSetup(cover);

  /* --------------------------- Section sheets --------------------------- */
  report.sections.forEach((section) => {
    const ws = wb.addWorksheet(sheetName(section.title, taken), { properties: { defaultRowHeight: 16 } });
    titleBlock(ws, section.title, section.kind === 'table' ? section.head.length : 2, 1);

    if (section.kind === 'table') {
      headerRow(ws, section.head, 3);
      section.rows.forEach((r, i) => {
        const excelRow = ws.getRow(4 + i);
        r.forEach((cellValue, c) => {
          const cell = excelRow.getCell(c + 1);
          bodyCell(cell, i % 2 === 1);
          writeValue(cell, cellValue);
        });
      });
      if (section.rows.length) {
        ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: section.head.length } };
      }
      autoFit(ws);
      printSetup(ws, 3);
    } else if (section.kind === 'bars') {
      headerRow(ws, ['Category', 'Value', 'Share of largest'], 3);
      const max = Math.max(...section.data.map((d) => Math.abs(d.value)), 1);
      section.data.forEach((d, i) => {
        const r = ws.getRow(4 + i);
        r.getCell(1).value = d.label;
        r.getCell(2).value = d.value;
        r.getCell(2).numFmt = '#,##0';
        r.getCell(3).value = Math.abs(d.value) / max;
        r.getCell(3).numFmt = '0%';
        [1, 2, 3].forEach((c) => bodyCell(r.getCell(c), i % 2 === 1));
        r.getCell(2).alignment = { vertical: 'top', horizontal: 'right' };
        r.getCell(3).alignment = { vertical: 'top', horizontal: 'right' };
      });
      // In-cell data bars keep the visual reading without embedding a chart
      // object. exceljs accepts `color` on a dataBar rule at runtime but omits
      // it from the published type, so it is declared here rather than cast away.
      if (section.data.length) {
        const dataBar: ExcelJS.DataBarRuleType & { color?: { argb: string } } = {
          type: 'dataBar',
          priority: 1,
          minLength: 0,
          maxLength: 100,
          gradient: false,
          showValue: true,
          color: { argb: BRAND },
          // Required: exceljs iterates cfvo when serialising the rule.
          cfvo: [{ type: 'num', value: 0 }, { type: 'num', value: 1 }],
        };
        ws.addConditionalFormatting({ ref: `C4:C${3 + section.data.length}`, rules: [dataBar] });
        ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: 3 } };
      }
      autoFit(ws);
      printSetup(ws, 3);
    } else {
      headerRow(ws, ['#', 'Item'], 3);
      section.items.forEach((item, i) => {
        const r = ws.getRow(4 + i);
        r.getCell(1).value = i + 1;
        r.getCell(2).value = item;
        [1, 2].forEach((c) => bodyCell(r.getCell(c), i % 2 === 1));
        r.getCell(1).alignment = { vertical: 'top', horizontal: 'center' };
      });
      ws.getColumn(1).width = 6;
      ws.getColumn(2).width = 110;
      printSetup(ws, 3);
    }
  });

  /* ----------------------- Method & caveats sheet ----------------------- */
  const notes = wb.addWorksheet(sheetName('Method & caveats', taken), { properties: { defaultRowHeight: 16 } });
  notes.columns = [{ width: 22 }, { width: 108 }];
  titleBlock(notes, 'How this report was produced', 2, 1);
  headerRow(notes, ['Section', 'Detail'], 3);

  let nRow = 4;
  const noteBlock = (heading: string, items: string[], tone: string) => {
    items.forEach((item, i) => {
      const r = notes.getRow(nRow++);
      r.getCell(1).value = i === 0 ? heading : '';
      r.getCell(2).value = item;
      [1, 2].forEach((c) => bodyCell(r.getCell(c), false));
      r.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: tone } };
    });
  };
  noteBlock('Method', report.methodology, BRAND);
  noteBlock('Caveats', report.caveats, 'FFB4530A');
  noteBlock('Governance', [
    'No report segments people by gender, race, ethnicity, religion, nationality, disability, marital status or age. Those attributes are not held on the employee record and are not a permitted analysis dimension.',
    'Figures are a recommendation for human interpretation. No employment decision is made automatically by the platform.',
    `This export was generated by ${generatedBy} and written to the platform audit log.`,
  ], INK);
  printSetup(notes, 3);

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
