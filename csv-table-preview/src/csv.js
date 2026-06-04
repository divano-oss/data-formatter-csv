const DELIMITER_NAMES = new Map([
  [",", "Comma"],
  [";", "Semicolon"],
  ["\t", "Tab"],
  ["|", "Pipe"],
]);

export function delimiterName(delimiter) {
  return DELIMITER_NAMES.get(delimiter) ?? delimiter;
}

export function parseCsv(input, options = {}) {
  const text = String(input ?? "");
  const trimCells = options.trimCells ?? false;
  const delimiter =
    options.delimiter && options.delimiter !== "auto"
      ? normalizeDelimiter(options.delimiter)
      : detectDelimiter(text);

  const result = parseRows(text, delimiter);
  const rows = normalizeRows(result.rows, trimCells);
  const visibleRows = rows.filter((row) => row.some((cell) => cell.length > 0));
  const columnCount = visibleRows.reduce(
    (max, row) => Math.max(max, row.length),
    0,
  );
  const emptyCellCount = countEmptyCells(visibleRows, columnCount);
  const warnings = findWarnings(visibleRows, columnCount);

  return {
    delimiter,
    errors: result.errors,
    warnings,
    rows: visibleRows,
    stats: {
      rowCount: visibleRows.length,
      columnCount,
      emptyCellCount,
    },
  };
}

export function normalizeDelimiter(value) {
  return value === "tab" ? "\t" : value;
}

export function detectDelimiter(text) {
  const candidates = [",", ";", "\t", "|"];
  const scores = candidates.map((delimiter) => ({
    delimiter,
    score: scoreDelimiter(text, delimiter),
  }));

  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.score > 0 ? scores[0].delimiter : ",";
}

export function toCsv(rows, delimiter = ",") {
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);

  return rows
    .map((row) =>
      Array.from({ length: width }, (_, index) =>
        escapeCell(row[index] ?? "", delimiter),
      ).join(delimiter),
    )
    .join("\n");
}

export function toTsv(rows) {
  return rows
    .map((row) =>
      row
        .map((cell) => String(cell ?? "").replaceAll("\t", " ").trim())
        .join("\t"),
    )
    .join("\n");
}

function parseRows(text, delimiter) {
  const rows = [];
  const errors = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  let lastWasLineBreak = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      lastWasLineBreak = false;
      continue;
    }

    if (char === '"') {
      if (cell.length === 0) {
        inQuotes = true;
      } else {
        cell += char;
      }
      lastWasLineBreak = false;
      continue;
    }

    if (char === delimiter) {
      row.push(cell);
      cell = "";
      lastWasLineBreak = false;
      continue;
    }

    if (char === "\n" || char === "\r") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
      lastWasLineBreak = true;
      continue;
    }

    cell += char;
    lastWasLineBreak = false;
  }

  if (inQuotes) {
    errors.push("A quoted field is not closed.");
  }

  if (cell.length > 0 || row.length > 0 || (!lastWasLineBreak && text.length > 0)) {
    row.push(cell);
    rows.push(row);
  }

  return { rows, errors };
}

function normalizeRows(rows, trimCells) {
  return rows.map((row) =>
    row.map((cell) => (trimCells ? cell.trim() : cell)),
  );
}

function countEmptyCells(rows, columnCount) {
  return rows.reduce((total, row) => {
    let count = total;
    for (let index = 0; index < columnCount; index += 1) {
      if ((row[index] ?? "").length === 0) {
        count += 1;
      }
    }
    return count;
  }, 0);
}

function findWarnings(rows, columnCount) {
  const warnings = [];
  const unevenRows = rows.filter((row) => row.length !== columnCount).length;

  if (unevenRows > 0) {
    warnings.push(
      `${unevenRows} row${unevenRows === 1 ? " has" : "s have"} fewer or more cells than the widest row.`,
    );
  }

  if (rows.length > 1000) {
    warnings.push("Only the first 1000 matching rows are rendered in the table.");
  }

  return warnings;
}

function scoreDelimiter(text, delimiter) {
  const rows = parseRows(text, delimiter)
    .rows.filter((row) => row.some((cell) => cell.trim().length > 0))
    .slice(0, 25);

  if (rows.length === 0) {
    return 0;
  }

  const widths = rows.map((row) => row.length);
  const widest = Math.max(...widths);

  if (widest <= 1) {
    return 0;
  }

  const widthCounts = new Map();
  for (const width of widths) {
    widthCounts.set(width, (widthCounts.get(width) ?? 0) + 1);
  }

  const consistentRows = Math.max(...widthCounts.values());
  const variance = widths.reduce(
    (sum, width) => sum + Math.abs(width - widest),
    0,
  );

  return widest * 12 + consistentRows * 4 - variance;
}

function escapeCell(value, delimiter) {
  const text = String(value ?? "");
  const needsQuotes =
    text.includes(delimiter) ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r");

  if (!needsQuotes) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
