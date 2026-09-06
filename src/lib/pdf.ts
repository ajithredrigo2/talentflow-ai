/**
 * Minimal, dependency-free PDF writer.
 *
 * Used to render a stored résumé back to the recruiter as a real PDF for the
 * "View CV" / "Download CV" actions. It only ever *writes* PDFs from text that
 * is already in the store — nothing uploaded is ever executed or re-emitted.
 */

const ESCAPE = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const PAGE_W = 595.28; // A4 points
const PAGE_H = 841.89;
const MARGIN = 54;
const LEADING = 13.2;
const LINES_PER_PAGE = Math.floor((PAGE_H - MARGIN * 2) / LEADING);
const MAX_CHARS = 92;

function wrap(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split('\n')) {
    if (raw.length <= MAX_CHARS) {
      out.push(raw);
      continue;
    }
    let line = '';
    for (const word of raw.split(' ')) {
      if ((line + ' ' + word).trim().length > MAX_CHARS) {
        out.push(line.trim());
        line = word;
      } else {
        line = (line + ' ' + word).trim();
      }
    }
    if (line) out.push(line);
  }
  return out;
}

export function textToPdf(text: string, title = 'Document'): Buffer {
  const lines = wrap(text);
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += LINES_PER_PAGE) pages.push(lines.slice(i, i + LINES_PER_PAGE));
  if (!pages.length) pages.push(['']);

  const objects: string[] = [];
  const pageObjIds: number[] = [];

  // 1 catalog, 2 pages, 3 font — content/page objects start at 4
  let next = 4;
  const contentIds: number[] = [];
  pages.forEach(() => {
    contentIds.push(next++);
    pageObjIds.push(next++);
  });

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>';

  pages.forEach((pageLines, pi) => {
    const isHeading = (l: string) => /^[A-Z][A-Z \-&/]{3,}$/.test(l.trim());
    const body = pageLines
      .map((l, i) => {
        const y = PAGE_H - MARGIN - i * LEADING;
        const size = isHeading(l) ? 10.5 : 9.5;
        return `BT /F1 ${size} Tf 1 Tr 0.06 w ${MARGIN} ${y.toFixed(2)} Td (${ESCAPE(l)}) Tj ET`;
      })
      .join('\n');
    const stream = `q 0 0 0 rg\n${body}\nQ`;
    objects[contentIds[pi]] = `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`;
    objects[pageObjIds[pi]] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentIds[pi]} 0 R >>`;
  });

  const infoId = next++;
  objects[infoId] = `<< /Title (${ESCAPE(title)}) /Producer (TalentFlow AI) /Creator (TalentFlow AI Zero-Touch Candidate Intake) >>`;

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let i = 1; i < objects.length; i++) {
    if (!objects[i]) continue;
    offsets[i] = Buffer.byteLength(pdf);
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf);
  const maxId = objects.length;
  pdf += `xref\n0 ${maxId}\n0000000000 65535 f \n`;
  for (let i = 1; i < maxId; i++) {
    pdf += offsets[i] !== undefined ? `${String(offsets[i]).padStart(10, '0')} 00000 n \n` : `0000000000 65535 f \n`;
  }
  pdf += `trailer\n<< /Size ${maxId} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
}
