# ESTP Data Visualization — Module 1

A standalone static teaching page for **Module 1 — In-depth Review of Different Chart Types**.

The page is designed for employees of European National Statistical Institutes. Its central idea is that chart choice should begin with the analytical question and the visual encoding, not with a catalogue of named chart types.

## Run locally

No build step is required.

You can open `index.html` directly, but a small local web server is recommended because browsers apply different restrictions to `file://` pages:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Publish with GitHub Pages

1. Put the files in a GitHub repository.
2. Open **Settings → Pages**.
3. Choose **Deploy from a branch**.
4. Select the branch and repository root.
5. Save.

No server-side component, API key or build pipeline is required.

## Statistical source

The interactive examples use **Statistics Norway (SSB), StatBank table 06913**:

> Population 1 January and population changes during the calendar year (M) 1951–2026

- Source: Statistics Norway
- Unit: persons
- Table updated: 15 April 2026, 08:00
- Metadata checked for this teaching page: 27 August 2026
- StatBank: <https://www.ssb.no/en/statbank/table/06913>
- PxWebApi v2 guide: <https://www.ssb.no/en/api/pxwebapiv2>

SSB adds a historical qualification to the table: population figures for **1951, 1956, 1961, 1962 and 1966–1970** do not match population figures in some other tables. The teaching page surfaces this note alongside the source information.

The site requests current data directly from SSB's PxWebApi v2 with a browser GET request. Successful responses are cached in `localStorage`, so a later temporary API interruption can fall back to the user's last successful retrieval.

No invented statistical fallback data is included. If neither the live API nor a browser cache is available, the page keeps the explanatory material visible and explicitly reports that the chart data could not be loaded.

## Transformations used for teaching

The source values are not altered in the stored response. Two display transformations are made in the browser:

1. **Contribution view:** deaths and emigration receive a negative plotting sign so outflows appear on the opposite side of zero. Their source counts remain positive and are shown as such in readouts.
2. **Heatmap:** each flow series is converted to a within-series percentile for pattern detection. Exact source counts remain available when a cell is selected.

Population 1 January is treated as a stock. Births, deaths, immigration, emigration and population increase are treated as annual flows.

## File structure

```text
index.html
styles.css
script.js
data/
  source-metadata.json
README.md
```

The project deliberately uses vanilla HTML, CSS, JavaScript and SVG rather than a framework or visualization library.

## Accessibility

The page includes semantic headings, keyboard-operable tabs and controls, visible focus states, text explanations alongside charts, accessible chart marks, non-hover readouts, responsive layouts and reduced-motion support.

Colour is not the only cue in the heatmap: the in-cell length marker carries the same high/low ordering, and exact values are available through keyboard/touch selection.
