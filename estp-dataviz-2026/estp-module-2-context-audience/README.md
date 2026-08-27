# ESTP Data Visualization — Module 2

A standalone static teaching page for **Module 2 — Contextualization and Audience**.

The page builds directly on Module 1. Module 1 asks what relationship the visualization should reveal; Module 2 asks **to whom, for what purpose, and with what context** that relationship should be revealed.

Its central interaction is **“Same statistics. Different audience.”** The underlying topic remains Norwegian consumer prices while the presentation is reframed for a general reader, a journalist/communication professional and a statistical analyst.

## Run locally

No build step is required. Because the page loads a local JSON data file, use a small local web server rather than opening `index.html` through `file://`:

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

There is no server-side component, API key, build pipeline or proprietary dependency.

## Statistical sources

### SSB StatBank table 14700

**Consumer price index (CPI), by goods and services (2025=100), 2000M01–2026M07**

- Source: Statistics Norway (SSB)
- Table updated: 10 August 2026, 08:00
- Metadata and teaching extract checked: 27 August 2026
- Base: 2025=100
- Units: index; monthly change in per cent; 12-month change in per cent; weights in per mille
- StatBank: <https://www.ssb.no/en/statbank/table/14700>

### SSB StatBank table 14706

**Derived series from the Consumer Price Index (2025=100), 1995M01–2026M07**

Used for CPI-ATE where an analytically informed audience benefits from the additional measure.

- Source: Statistics Norway (SSB)
- Table updated: 10 August 2026, 08:00
- Base: 2025=100
- Units: index; monthly change in per cent; 12-month change in per cent
- StatBank: <https://www.ssb.no/en/statbank/table/14706>

CPI-ATE is CPI adjusted for tax changes and excluding energy products.

## Current reference values used

Reference period: **July 2026**.

- CPI index: **103.8** (2025=100)
- CPI monthly change: **+1.0%**
- CPI 12-month change: **+3.0%**
- CPI-ATE index: **103.8** (2025=100)
- CPI-ATE monthly change: **+0.8%**
- CPI-ATE 12-month change: **+2.7%**

The category examples are also real July 2026 main-group observations from SSB. They are described as **category-specific rates of change**, not contributions to overall CPI.

## Transformations

`data/cpi.json` stores source index values and a short extract of published recent rates. For the longer CPI 12-month time series, the browser calculates:

```text
(index in month t / index in month t-12 - 1) × 100
```

SSB notes that rates calculated from the rebased historical index may differ slightly from published historical rates because of rounding. Therefore exact recent comparisons in the teaching text use SSB's published rates rather than a rate reconstructed from rounded index values.

No synthetic statistical observations are included.

## File structure

```text
index.html
styles.css
script.js
data/
  cpi.json
  cpi-index-2020-2026.csv
README.md
```

The implementation uses semantic HTML, CSS, vanilla JavaScript and SVG. No framework or chart library is required.

## Accessibility

The page includes semantic headings, keyboard-operable tab controls, native form controls, visible focus states, non-hover exact-value access, text explanations alongside charts, sufficient contrast, responsive layouts and `prefers-reduced-motion` support inherited from the Module 1 visual system.
