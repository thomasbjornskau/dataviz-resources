# ESTP Data Visualization — Module 0: One indicator, many views

A lightweight static introduction for the ESTP Data Visualization course. It uses a single labour-market topic — the employment rate — to show how different chart forms answer different questions.

## Run

The site contains ordinary front-end files only:

```text
index.html
styles.css
script.js
data/source-metadata.json
README.md
```

For local development, use a small web server:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

The page can be published directly through GitHub Pages.

## Design system

The page reuses the established ESTP / SSB-inspired system from Modules 1–5:

- maximum page width: 1180 px;
- 8 px green top stripe;
- Arial / Helvetica typography;
- dark green-blue `#274247`;
- SSB green `#00824D`;
- light background `#F0F8F9`;
- mid-tone `#C3DCDC`;
- purple accent `#7E5EE8`;
- dark text `#1B2E32`;
- rectangular controls, no gradients, no drop shadows;
- colour used mainly for selected data, hierarchy and state.

## Eurostat data

Metadata checked: **2 September 2026**.

### `lfsi_emp_a`

Employment and labour force by sex and age — annual data.

Main series:

- `freq=A`
- `indic_em=EMP_LFS`
- `sex=T` (plus `F` and `M` in the annual gender view)
- `age=Y20-64`
- `unit=PC_POP`

Eurostat's dataset page reports data coverage from 2003 to 2025 and a last update on 11 June 2026. The site determines the latest common complete year from the returned data rather than hard-coding it in chart logic.

The composition view also requests `indic_em=ACT` with the same `PC_POP` unit. It derives:

```text
unemployed as share of population = labour-force share − employment share
outside labour force = 100 − labour-force share
```

This keeps a common denominator across the 100% composition.

The age view uses available standard Eurostat groups `Y15-24`, `Y25-54`, and `Y55-64`. Because the youngest group extends below the main 20–64 indicator, the chart states this explicitly rather than presenting it as the same age definition.

### `lfsi_emp_q`

Quarterly employment and labour force by sex and age.

Requested series:

- `freq=Q`
- `indic_em=EMP_LFS`
- `sex=T`
- `age=Y20-64`
- `unit=PC_POP`
- `s_adj=SA`

If this exact seasonally adjusted series is unavailable for a country, the page displays an unavailable message instead of silently switching to unadjusted data.

### `lfsi_long_q`

Quarterly labour-market transitions.

Requested flow data:

- `freq=Q`
- `sex=T`
- `unit=THS_PER`
- `s_adj=SA`

The flow statistics refer to the population aged **15–74** and use a different methodology from the main 20–64 employment-rate indicator. The page states this directly. If country-level flow data are unavailable, it does not substitute EU-level data.

## Runtime data strategy

The generated site requests compact filtered JSON-stat responses directly from Eurostat's Statistics API and caches successful responses in `localStorage`. There are no invented fallback values and no interpolation. This keeps the GitHub Pages project small while preserving traceability to the current Eurostat source.

API base:

`https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/`

A production deployment can replace the runtime requests with archived local JSON extracts using the same filters. `data/source-metadata.json` records the filters and verification date for that purpose.

## Map

The Europe choropleth uses D3, TopoJSON Client and `world-atlas` from jsDelivr at runtime. If the map geometry cannot be loaded, only the map view reports an availability message; the statistical views remain usable.

## Deliberate omission: relationship view

The specification allowed the scatter plot to be omitted when coverage is unreliable. It is omitted here because the natural job-vacancy comparison introduces uneven country coverage and different seasonal-adjustment conventions. The introductory sequence therefore keeps nine statistically cleaner views.

## Accessibility

- semantic headings and controls;
- native keyboard-accessible country and view selectors;
- visible focus states;
- direct labels and textual chart summaries;
- colour-independent selected-country labels and outlines;
- touch-friendly controls;
- responsive layout;
- `prefers-reduced-motion` support;
- important information does not depend on hover.
