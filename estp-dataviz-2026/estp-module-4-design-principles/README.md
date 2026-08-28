# ESTP Data Visualization — Module 4: Design Principles

Standalone static teaching page for an ESTP course aimed at employees of European National Statistical Institutes.

The conceptual centre is:

> **Design creates order in complex information.**

The page uses the same statistical information throughout one five-step transformation: **Hierarchy → Emphasis → Comparison → Interaction → Structure**.

## Run and publish

No build step, server-side component, authentication, API key or JavaScript framework is required.

Project structure:

```text
index.html
styles.css
script.js
data/
  data.js
  population_07459.csv
  population_2021_one_year_07459.csv
  source-metadata.json
README.md
```

Open `index.html` directly, or publish the folder through GitHub Pages. `data/data.js` contains the browser-ready teaching extract, so the page does not depend on a live API call.

## Existing ESTP design system

`styles.css` starts with the established Module 1–3 stylesheet foundation and retains its:

- CSS variables and SSB-inspired palette;
- Arial/Helvetica typography and heading hierarchy;
- 1180 px page shell;
- 8 px SSB-green top stripe and header treatment;
- section rhythm and generous white space;
- rectangular controls with minimal rounding and no shadow system;
- stepper, toggle, explanatory-note and chart conventions;
- restrained gridlines and chart labels;
- source area and dark footer;
- responsive breakpoints at 900 px and 620 px;
- visible focus states and `prefers-reduced-motion` behaviour.

Module 4-specific rules are appended after the shared stylesheet. No framework, new typography, gradient or new colour family is introduced.

## Statistical source

**Statistics Norway, StatBank table 07459 — Population, by sex and one-year age groups (M), 1986–2026**

- Source: Statistics Norway
- Unit: persons (number)
- Reference time: 1 January
- Table updated: 25 February 2026, 08:00
- Data and metadata checked for this page: 28 August 2026
- Region: The whole country (code `0`)
- Main years: 2021 and 2023
- Sex: females and males
- Ages: 20–54
- Table: https://www.ssb.no/en/statbank/table/07459

### 2021 source slice

Saved query `10054226` contains one-year ages and both sexes for the whole country in 2021:

https://www.ssb.no/en/statbank1/sq/10054226

For the teaching visualization, one-year ages are summed into seven five-year groups:

- 20–24
- 25–29
- 30–34
- 35–39
- 40–44
- 45–49
- 50–54

No weighting or interpolation is used. `data/population_2021_one_year_07459.csv` preserves the source observations used in the aggregation.

### 2023 source slice

Saved query `10103858` contains SSB's published five-year groups for females and males in the whole country in 2023:

https://www.ssb.no/en/statbank1/table/07459/tableViewLayout1/?loadedQueryId=10103858&timeType=item

The teaching page uses the seven groups from 20–24 through 50–54 directly.

## Main verified teaching values

| Age group | 2021 women | 2021 men | 2023 women | 2023 men | Combined change 2021→2023 |
|---|---:|---:|---:|---:|---:|
| 20–24 | 163,240 | 175,181 | 162,029 | 171,937 | -1.3% |
| 25–29 | 178,586 | 188,300 | 179,424 | 188,774 | +0.4% |
| 30–34 | 186,717 | 194,118 | 193,166 | 201,179 | +3.5% |
| 35–39 | 174,068 | 184,221 | 181,397 | 189,576 | +3.5% |
| 40–44 | 168,819 | 178,970 | 174,403 | 182,857 | +2.7% |
| 45–49 | 181,392 | 190,410 | 175,545 | 183,024 | -3.6% |
| 50–54 | 182,852 | 191,985 | 186,875 | 194,532 | +1.8% |

No smoothing, interpolation, modelling or synthetic observations are used.

## Interaction and accessibility

- semantic landmarks and headings;
- native buttons for controls;
- step navigation supports left/right arrow keys plus Home/End;
- visible focus states;
- minimum 44 px shared control targets;
- chart rows can be selected with mouse, touch, Enter or Space in the interactive steps;
- exact values are presented in a persistent readout, not hover-only;
- colour is reinforced by position, labels and muting;
- responsive SVG with horizontal access on narrow screens where needed;
- shared `prefers-reduced-motion` handling.
