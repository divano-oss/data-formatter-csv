# CSV Table Preview

This is the inital version. We are going to upgrade it soon.

A small browser-only tool for previewing CSV data as a table.

It runs locally, has no backend, and does not send pasted data anywhere. This means no data collection. Everything is on your computer.

## Features

- Paste CSV or open a local file.
- Auto-detect comma, semicolon, tab, and pipe delimiters.
- Preview the CSV in a scrollable table.
- Toggle header-row handling and cell trimming.
- Search visible rows.
- Copy the visible table as TSV.
- Download a normalized CSV.

## Run Locally

```bash
npm run start
```

Then open:

```text
http://localhost:4173
```

No install step is required because the project has no runtime dependencies.

## Test

```bash
npm test
```

If you prefer `make`:

```bash
make test
```

## Project Structure

```text
.
├── index.html
├── styles.css
├── src
│   ├── app.js
│   └── csv.js
└── tests
    └── csv.test.mjs
```

## Deploy

This is a static site. On GitHub Pages, choose the repository root as the Pages source.

## License

MIT
