import {
  delimiterName,
  normalizeDelimiter,
  parseCsv,
  toCsv,
  toTsv,
} from "./csv.js";

const samples = {
  sales: `Region,Representative,Item,Units,Unit cost
East,Amanda Chen,Notebook,42,4.25
West,Marco Silva,Desk lamp,18,21.90
North,Iris Patel,Marker set,64,3.10
South,Noah Rossi,Chair mat,9,37.40`,
  people: `Name,Email,Role,Active
Ada Lovelace,ada@example.com,Analyst,true
Grace Hopper,grace@example.com,Engineer,true
Katherine Johnson,katherine@example.com,Researcher,false`,
  messy: `Name,Notes,Score
"Mina","Uses commas, quotes, and ""escaped text""",97
"Jon","Line one
Line two",84
"Lee","Needs review",`,
};

const state = {
  parsed: parseCsv(""),
  visibleRows: [],
};

const elements = {
  clearButton: document.querySelector("#clearButton"),
  copyButton: document.querySelector("#copyButton"),
  csvInput: document.querySelector("#csvInput"),
  delimiterName: document.querySelector("#delimiterName"),
  delimiterSelect: document.querySelector("#delimiterSelect"),
  downloadButton: document.querySelector("#downloadButton"),
  emptyCount: document.querySelector("#emptyCount"),
  emptyState: document.querySelector("#emptyState"),
  fileInput: document.querySelector("#fileInput"),
  headerToggle: document.querySelector("#headerToggle"),
  issuesList: document.querySelector("#issuesList"),
  previewTable: document.querySelector("#previewTable"),
  rowCount: document.querySelector("#rowCount"),
  columnCount: document.querySelector("#columnCount"),
  sampleSelect: document.querySelector("#sampleSelect"),
  searchInput: document.querySelector("#searchInput"),
  statusText: document.querySelector("#statusText"),
  tableWrap: document.querySelector("#tableWrap"),
  trimToggle: document.querySelector("#trimToggle"),
};

elements.csvInput.value = samples.sales;

elements.csvInput.addEventListener("input", () => {
  elements.sampleSelect.value = "";
  render();
});
elements.delimiterSelect.addEventListener("change", render);
elements.headerToggle.addEventListener("change", render);
elements.trimToggle.addEventListener("change", render);
elements.searchInput.addEventListener("input", renderTableOnly);
elements.clearButton.addEventListener("click", clearInput);
elements.copyButton.addEventListener("click", copyTable);
elements.downloadButton.addEventListener("click", downloadCsv);
elements.sampleSelect.addEventListener("change", applySample);
elements.fileInput.addEventListener("change", openFile);

render();

function render() {
  const delimiter = normalizeDelimiter(elements.delimiterSelect.value);
  state.parsed = parseCsv(elements.csvInput.value, {
    delimiter,
    trimCells: elements.trimToggle.checked,
  });

  updateStats();
  updateIssues();
  renderTableOnly();
}

function renderTableOnly() {
  const rows = state.parsed.rows;
  const query = elements.searchInput.value.trim().toLowerCase();
  const hasHeader = elements.headerToggle.checked && rows.length > 0;
  const headers = hasHeader
    ? makeHeaders(state.parsed.stats.columnCount, rows[0])
    : makeHeaders(state.parsed.stats.columnCount);
  const bodyRows = hasHeader ? rows.slice(1) : rows;
  const filteredRows = query
    ? bodyRows.filter((row) =>
        row.some((cell) => String(cell).toLowerCase().includes(query)),
      )
    : bodyRows;

  const renderedRows = filteredRows.slice(0, 1000);
  state.visibleRows = [headers, ...renderedRows];
  elements.previewTable.replaceChildren();

  if (rows.length === 0) {
    elements.previewTable.hidden = true;
    elements.emptyState.hidden = false;
    elements.statusText.textContent = "Waiting for CSV input.";
    return;
  }

  elements.previewTable.hidden = false;
  elements.emptyState.hidden = true;
  elements.statusText.textContent = `${renderedRows.length} of ${bodyRows.length} data rows shown.`;

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headers.forEach((header, index) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = header || `Column ${index + 1}`;
    headerRow.append(th);
  });
  thead.append(headerRow);

  const tbody = document.createElement("tbody");
  renderedRows.forEach((row) => {
    const tr = document.createElement("tr");
    headers.forEach((_, index) => {
      const td = document.createElement("td");
      td.textContent = row[index] ?? "";
      td.title = row[index] ?? "";
      tr.append(td);
    });
    tbody.append(tr);
  });

  elements.previewTable.append(thead, tbody);
}

function updateStats() {
  elements.rowCount.textContent = String(state.parsed.stats.rowCount);
  elements.columnCount.textContent = String(state.parsed.stats.columnCount);
  elements.emptyCount.textContent = String(state.parsed.stats.emptyCellCount);
  elements.delimiterName.textContent = delimiterName(state.parsed.delimiter);
}

function updateIssues() {
  const items = [
    ...state.parsed.errors.map((text) => ({ text, type: "error" })),
    ...state.parsed.warnings.map((text) => ({ text, type: "warning" })),
  ];

  elements.issuesList.replaceChildren();
  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = item.type === "error" ? "error" : "";
    li.textContent = item.text;
    elements.issuesList.append(li);
  });
}

function makeHeaders(count, source = []) {
  return Array.from(
    { length: count },
    (_, index) => source[index] || `Column ${index + 1}`,
  );
}

function clearInput() {
  elements.csvInput.value = "";
  elements.searchInput.value = "";
  elements.sampleSelect.value = "";
  render();
  elements.csvInput.focus();
}

async function copyTable() {
  if (state.visibleRows.length === 0) {
    return;
  }

  await navigator.clipboard.writeText(toTsv(state.visibleRows));
  flashStatus("Copied visible table.");
}

function downloadCsv() {
  if (state.parsed.rows.length === 0) {
    return;
  }

  const csv = toCsv(state.parsed.rows, ",");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "preview.csv";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  flashStatus("Downloaded preview.csv.");
}

function applySample() {
  const sample = samples[elements.sampleSelect.value];
  if (!sample) {
    return;
  }

  elements.csvInput.value = sample;
  elements.searchInput.value = "";
  render();
}

function openFile(event) {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    elements.csvInput.value = String(reader.result ?? "");
    elements.sampleSelect.value = "";
    elements.searchInput.value = "";
    render();
  });
  reader.readAsText(file);
}

function flashStatus(message) {
  const previous = elements.statusText.textContent;
  elements.statusText.textContent = message;
  window.setTimeout(() => {
    elements.statusText.textContent = previous;
  }, 1600);
}
