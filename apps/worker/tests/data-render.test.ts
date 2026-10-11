import {
  DATA_ROW_LIMIT,
  computeNumericStats,
  csvToTable,
  detectDataFormat,
  jsonToTable,
  parseCsv,
  renderDataToHtml,
} from "../src/utils/data-render.js";

describe("parseCsv", () => {
  it("handles quoted fields with commas, escaped quotes and newlines", () => {
    // Real exports quote any field containing a delimiter; splitting on ","
    // or "\n" would shift every following column.
    const csv = 'name,note\n"Smith, J","said ""hi""\nthen left"\nplain,x\n';
    expect(parseCsv(csv)).toEqual([
      ["name", "note"],
      ["Smith, J", 'said "hi"\nthen left'],
      ["plain", "x"],
    ]);
  });

  it("accepts CRLF line endings and a UTF-8 BOM", () => {
    expect(parseCsv("﻿a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps empty fields and skips blank lines", () => {
    expect(parseCsv("a,b,c\n1,,3\n\n,,\n")).toEqual([
      ["a", "b", "c"],
      ["1", "", "3"],
      ["", "", ""],
    ]);
  });

  it("returns no records for empty input", () => {
    expect(parseCsv("")).toEqual([]);
    expect(csvToTable("")).toEqual({ columns: [], rows: [] });
  });

  it("pads ragged rows to the widest row", () => {
    expect(csvToTable("a\n1,2")).toEqual({ columns: ["a", "column_2"], rows: [["1", "2"]] });
  });
});

describe("jsonToTable", () => {
  it("reads an array of objects, unioning keys in first-seen order", () => {
    expect(jsonToTable([{ a: 1, b: "x" }, { b: "y", c: true }])).toEqual({
      columns: ["a", "b", "c"],
      rows: [
        ["1", "x", ""],
        ["", "y", "true"],
      ],
    });
  });

  it("reads {columns, rows} with array or object rows", () => {
    expect(jsonToTable({ columns: ["a", "b"], rows: [[1, 2], { a: 3, b: null }] })).toEqual({
      columns: ["a", "b"],
      rows: [
        ["1", "2"],
        ["3", ""],
      ],
    });
  });

  it("serializes nested values as JSON text", () => {
    expect(jsonToTable([{ a: { x: 1 } }])?.rows).toEqual([['{"x":1}']]);
  });

  it("rejects non-tabular shapes", () => {
    expect(jsonToTable({ hello: "world" })).toBeNull();
    expect(jsonToTable([1, 2, 3])).toBeNull();
    expect(jsonToTable("text")).toBeNull();
  });
});

describe("detectDataFormat", () => {
  it("prefers the extension, else sniffs the content", () => {
    expect(detectDataFormat("a.csv", "[1]")).toBe("csv");
    expect(detectDataFormat("a.json", "x,y")).toBe("json");
    expect(detectDataFormat("stdin", "  [{}]")).toBe("json");
    expect(detectDataFormat("stdin", "x,y")).toBe("csv");
  });
});

describe("computeNumericStats", () => {
  it("treats a column as numeric only when every non-empty cell is a number", () => {
    const stats = computeNumericStats(csvToTable("n,mixed,label\n1,1,a\n,2,b\n3,x,c\n"));
    expect(stats).toEqual([{ column: "n", index: 0, count: 2, min: 1, max: 3, sum: 4, mean: 2 }]);
  });
});

describe("renderDataToHtml", () => {
  it("escapes cell values and headers so uploaded data cannot inject markup", () => {
    const csv = '"<script>alert(1)</script>","<img src=x onerror=alert(1)>"\n"<b>x</b>",1\n';
    const html = renderDataToHtml(csv, "<title>", "csv");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<b>x</b>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("<title>&lt;title&gt;</title>");
  });

  it("renders title, counts, stat cards, an SVG chart and a sticky-header table", () => {
    const html = renderDataToHtml(
      JSON.stringify([
        { month: "Jan", sales: 10 },
        { month: "Feb", sales: 30 },
      ]),
      "Sales",
      "json",
    );
    expect(html).toContain("<h1>Sales</h1>");
    expect(html).toContain("2 rows · 2 columns");
    expect(html).toContain('<div class="card-title">sales</div>');
    expect(html).toContain("<dt>sum</dt><dd>40</dd>");
    expect(html).toContain("<dt>mean</dt><dd>20</dd>");
    expect(html).toMatch(/<svg[^>]*role="img"/);
    expect(html).toContain("position: sticky");
    expect(html).not.toMatch(/<script/i);
  });

  it(`caps the table at ${DATA_ROW_LIMIT} rows and says so`, () => {
    const total = DATA_ROW_LIMIT + 25;
    const csv = `i\n${Array.from({ length: total }, (_, i) => String(i)).join("\n")}\n`;
    const html = renderDataToHtml(csv, "Big", "csv");
    expect(html).toContain(`${total.toLocaleString("en-US")} rows`);
    expect(html).toContain(`Showing first ${DATA_ROW_LIMIT.toLocaleString("en-US")} of`);
    expect(html.match(/<tr>/g)?.length).toBe(DATA_ROW_LIMIT + 1); // + header row
    expect(html).not.toContain(`<td class="num">${DATA_ROW_LIMIT}</td>`);
  });

  it("falls back to an escaped pretty-print for invalid or non-tabular JSON", () => {
    const invalid = renderDataToHtml("{oops <b>", "Bad", "json");
    expect(invalid).toContain("Could not parse JSON");
    expect(invalid).toContain("{oops &lt;b&gt;");
    expect(renderDataToHtml('{"a":1}', "Obj", "json")).toContain("JSON is not tabular");
  });
});
