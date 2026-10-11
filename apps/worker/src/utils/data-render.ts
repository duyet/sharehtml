/**
 * Server-side renderer for `data` documents (CSV and JSON).
 *
 * Output is a static, script-free HTML page: summary stat cards, an inline
 * SVG chart for the first numeric column, and a table. Every value taken from
 * the uploaded file is HTML-escaped, so the result passes through the viewer's
 * sanitizer and sandbox="" iframe unchanged.
 */

export const DATA_ROW_LIMIT = 5000;

export type DataFormat = "csv" | "json";

export interface DataTable {
  columns: string[];
  rows: string[][];
}

export function getDataFormat(filename: string): DataFormat | null {
  if (/\.csv$/i.test(filename)) return "csv";
  if (/\.json$/i.test(filename)) return "json";
  return null;
}

/** Format from the extension, else sniff: JSON starts with `[` or `{`. */
export function detectDataFormat(filename: string, text: string): DataFormat {
  const byName = getDataFormat(filename);
  if (byName) return byName;
  const first = text.trimStart()[0];
  return first === "[" || first === "{" ? "json" : "csv";
}

export function isDataFilename(filename: string): boolean {
  return getDataFormat(filename) !== null;
}

/** Parse CSV per RFC 4180: quoted fields, "" escapes, CRLF/LF, newlines in quotes. */
export function parseCsv(text: string): string[][] {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < input.length) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"' && field === "") {
      inQuotes = true;
    } else if (ch === ",") {
      record.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      record.push(field);
      records.push(record);
      record = [];
      field = "";
      if (ch === "\r" && input[i + 1] === "\n") i++;
    } else {
      field += ch;
    }
    i++;
  }

  if (field !== "" || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  // Drop blank lines (a lone empty field), which are not data rows.
  return records.filter((r) => !(r.length === 1 && r[0] === ""));
}

export function csvToTable(text: string): DataTable {
  const records = parseCsv(text);
  if (records.length === 0) return { columns: [], rows: [] };
  const [header, ...body] = records;
  const width = body.reduce((w, r) => Math.max(w, r.length), header.length);
  const columns = Array.from({ length: width }, (_, i) => header[i] || `column_${i + 1}`);
  const rows = body.map((r) => Array.from({ length: width }, (_, i) => r[i] ?? ""));
  return { columns, rows };
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Accepts an array of objects, an array of arrays (first row is the header),
 * or `{ columns: string[], rows: unknown[][] | object[] }`. Returns null for
 * any other shape so the caller can fall back to a pretty-printed view.
 */
export function jsonToTable(value: unknown): DataTable | null {
  if (isPlainObject(value) && Array.isArray(value.columns) && Array.isArray(value.rows)) {
    const columns = value.columns.map(cellToString);
    const rows = value.rows.map((row) =>
      Array.isArray(row)
        ? columns.map((_, i) => cellToString(row[i]))
        : isPlainObject(row)
          ? columns.map((col) => cellToString(row[col]))
          : columns.map((_, i) => (i === 0 ? cellToString(row) : "")),
    );
    return { columns, rows };
  }

  if (!Array.isArray(value)) return null;
  if (value.length === 0) return { columns: [], rows: [] };

  if (value.every(isPlainObject)) {
    const columns: string[] = [];
    const seen = new Set<string>();
    for (const row of value as Record<string, unknown>[]) {
      for (const key of Object.keys(row)) {
        if (!seen.has(key)) {
          seen.add(key);
          columns.push(key);
        }
      }
    }
    const rows = (value as Record<string, unknown>[]).map((row) =>
      columns.map((col) => cellToString(row[col])),
    );
    return { columns, rows };
  }

  if (value.every(Array.isArray)) {
    return csvLikeToTable(value as unknown[][]);
  }

  return null;
}

function csvLikeToTable(records: unknown[][]): DataTable {
  const [header, ...body] = records;
  const width = body.reduce((w, r) => Math.max(w, r.length), header.length);
  const columns = Array.from({ length: width }, (_, i) => cellToString(header[i]) || `column_${i + 1}`);
  const rows = body.map((r) => Array.from({ length: width }, (_, i) => cellToString(r[i])));
  return { columns, rows };
}

export interface ColumnStats {
  column: string;
  index: number;
  count: number;
  min: number;
  max: number;
  sum: number;
  mean: number;
}

const NUMERIC_RE = /^[-+]?(\d+(\.\d*)?|\.\d+)([eE][-+]?\d+)?$/;

function toNumber(cell: string): number | null {
  const trimmed = cell.trim();
  if (!NUMERIC_RE.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/** A column is numeric when every non-empty cell parses as a number. */
export function computeNumericStats(table: DataTable): ColumnStats[] {
  const stats: ColumnStats[] = [];
  table.columns.forEach((column, index) => {
    let count = 0;
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    for (const row of table.rows) {
      const cell = row[index];
      if (cell.trim() === "") continue;
      const n = toNumber(cell);
      if (n === null) return;
      count++;
      sum += n;
      if (n < min) min = n;
      if (n > max) max = n;
    }
    if (count > 0) stats.push({ column, index, count, min, max, sum, mean: sum / count });
  });
  return stats;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString("en-US");
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

const CHART_WIDTH = 800;
const CHART_HEIGHT = 160;
const CHART_BAR_LIMIT = 60;

function renderChart(table: DataTable, stat: ColumnStats): string {
  const values = table.rows
    .map((row) => toNumber(row[stat.index]))
    .filter((n): n is number => n !== null);
  if (values.length === 0) return "";

  const lo = Math.min(0, stat.min);
  const hi = Math.max(0, stat.max);
  const span = hi - lo || 1;
  const y = (v: number) => CHART_HEIGHT - ((v - lo) / span) * CHART_HEIGHT;
  const label = `${escapeHtml(stat.column)} across ${values.length.toLocaleString("en-US")} rows`;

  let marks: string;
  if (values.length <= CHART_BAR_LIMIT) {
    const slot = CHART_WIDTH / values.length;
    const barWidth = Math.max(1, slot * 0.7);
    const zero = y(0);
    marks = values
      .map((v, i) => {
        const top = Math.min(y(v), zero);
        const height = Math.max(1, Math.abs(zero - y(v)));
        return `<rect x="${(i * slot + (slot - barWidth) / 2).toFixed(2)}" y="${top.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${height.toFixed(2)}" rx="1"/>`;
      })
      .join("");
  } else {
    const step = CHART_WIDTH / (values.length - 1);
    const points = values.map((v, i) => `${(i * step).toFixed(2)},${y(v).toFixed(2)}`).join(" ");
    marks = `<polyline points="${points}" fill="none" stroke-width="1.5" stroke-linejoin="round"/>`;
  }

  return `<figure class="chart">
<figcaption>${label}</figcaption>
<svg viewBox="0 0 ${CHART_WIDTH} ${CHART_HEIGHT}" preserveAspectRatio="none" role="img" aria-label="${label}">${marks}</svg>
</figure>`;
}

function renderStatCards(stats: ColumnStats[]): string {
  if (stats.length === 0) return "";
  const cards = stats
    .map(
      (s) => `<div class="card">
<div class="card-title">${escapeHtml(s.column)}</div>
<dl>
<div><dt>min</dt><dd>${formatNumber(s.min)}</dd></div>
<div><dt>max</dt><dd>${formatNumber(s.max)}</dd></div>
<div><dt>mean</dt><dd>${formatNumber(s.mean)}</dd></div>
<div><dt>sum</dt><dd>${formatNumber(s.sum)}</dd></div>
</dl>
</div>`,
    )
    .join("\n");
  return `<section class="cards">\n${cards}\n</section>`;
}

function renderTable(table: DataTable, numeric: Set<number>): string {
  const head = table.columns
    .map((c, i) => `<th${numeric.has(i) ? ' class="num"' : ""}>${escapeHtml(c)}</th>`)
    .join("");
  const body = table.rows
    .map(
      (row) =>
        `<tr>${row.map((cell, i) => `<td${numeric.has(i) ? ' class="num"' : ""}>${escapeHtml(cell)}</td>`).join("")}</tr>`,
    )
    .join("\n");
  return `<div class="table-wrap"><table>
<thead><tr>${head}</tr></thead>
<tbody>
${body}
</tbody>
</table></div>`;
}

const STYLE = `
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 32px 24px;
  background: #fff;
  color: #171717;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
}
main { max-width: 1100px; margin: 0 auto; }
h1 { font-size: 20px; font-weight: 600; margin: 0 0 4px; }
.meta { color: #6b6b6b; font-size: 13px; margin: 0 0 24px; }
.note { color: #6b6b6b; font-size: 13px; margin: 8px 0; }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin: 0 0 24px; }
.card { border: 1px solid #ededed; border-radius: 8px; padding: 12px 14px; }
.card-title { font-weight: 600; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card dl { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; margin: 0; }
.card dt { color: #6b6b6b; font-size: 12px; }
.card dd { margin: 0; font-variant-numeric: tabular-nums; }
.chart { margin: 0 0 24px; border: 1px solid #ededed; border-radius: 8px; padding: 12px 14px; }
.chart figcaption { color: #6b6b6b; font-size: 12px; margin-bottom: 8px; }
.chart svg { display: block; width: 100%; height: 160px; fill: #2563eb; stroke: #2563eb; }
.table-wrap { border: 1px solid #ededed; border-radius: 8px; overflow: auto; max-height: 75vh; }
table { border-collapse: collapse; width: 100%; font-size: 13px; }
th, td { padding: 6px 10px; text-align: left; border-bottom: 1px solid #ededed; white-space: nowrap; }
th { position: sticky; top: 0; background: #fff; font-weight: 600; box-shadow: inset 0 -1px 0 #ededed; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
pre { border: 1px solid #ededed; border-radius: 8px; padding: 12px; overflow: auto; font-size: 13px; }
@media (max-width: 600px) { body { padding: 16px; } }
`;

function renderPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
</head>
<body>
<main>
<h1>${escapeHtml(title)}</h1>
${body}
</main>
</body>
</html>`;
}

export function renderTableToHtml(table: DataTable, title: string, limit = DATA_ROW_LIMIT): string {
  const total = table.rows.length;
  const shown: DataTable = { columns: table.columns, rows: table.rows.slice(0, limit) };
  const stats = computeNumericStats(shown);
  const numeric = new Set(stats.map((s) => s.index));
  const plural = (n: number, word: string) => `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;

  const parts = [
    `<p class="meta">${plural(total, "row")} · ${plural(table.columns.length, "column")}</p>`,
  ];
  if (total > shown.rows.length) {
    parts.push(
      `<p class="note">Showing first ${shown.rows.length.toLocaleString("en-US")} of ${total.toLocaleString("en-US")} rows. Stats and chart cover the rows shown. Download the source for the full data.</p>`,
    );
  }
  parts.push(renderStatCards(stats));
  if (stats.length > 0) parts.push(renderChart(shown, stats[0]));
  if (table.columns.length > 0) {
    parts.push(renderTable(shown, numeric));
  } else {
    parts.push(`<p class="note">No data.</p>`);
  }
  return renderPage(title, parts.filter(Boolean).join("\n"));
}

/** Render a CSV or JSON file to a self-contained static HTML page. */
export function renderDataToHtml(text: string, title: string, format: DataFormat): string {
  if (format === "csv") {
    return renderTableToHtml(csvToTable(text), title);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "invalid JSON";
    return renderPage(
      title,
      `<p class="note">Could not parse JSON: ${escapeHtml(reason)}</p>\n<pre>${escapeHtml(text)}</pre>`,
    );
  }

  const table = jsonToTable(parsed);
  if (table) return renderTableToHtml(table, title);
  return renderPage(
    title,
    `<p class="note">JSON is not tabular (expected an array of objects or {columns, rows}).</p>\n<pre>${escapeHtml(JSON.stringify(parsed, null, 2))}</pre>`,
  );
}
