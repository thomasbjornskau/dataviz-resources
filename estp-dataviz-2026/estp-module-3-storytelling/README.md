# ESTP Data Visualization — Module 3: Storytelling with Visuals

Standalone static teaching page for an ESTP course aimed at employees of European National Statistical Institutes.

## Run

The project contains only ordinary front-end files and can be published directly with GitHub Pages.

- `index.html`
- `styles.css`
- `script.js`
- `data/data.js` — local browser-ready data
- `data/fertility_04232.csv` — auditable extract
- `data/first_birth_age_07872.csv` — auditable extract

No build step, API key, server-side component or JavaScript framework is required. The page also works when `index.html` is opened directly from disk because the plotted data is loaded as a local JavaScript file rather than fetched at runtime.

## Statistical sources

**Statistics Norway (SSB)**

1. StatBank table **04232 — Total fertility rate, women (C), 1968–2025**  
   https://www.ssb.no/en/statbank1/table/04232

2. StatBank table **07872 — Mean age of parent at first child's birth, 1961–2025**  
   https://www.ssb.no/en/statbank1/table/07872

Current table metadata checked 2026-08-27. Both tables report an update time of 2026-03-12 08:00, with 2025 as the latest complete annual observation.

Supporting SSB material used to verify interpretation and historical values includes SSB's Births statistics page and its methodological article on how fertility is measured.

## Variables and transformations

### Table 04232

- Geography: Norway total
- Contents: `Total fertility rate, women`
- Period: 1968–2025
- Unit: fertility rate / period total fertility rate
- Transformation: filter to national total and required years; parse numeric values; no smoothing or interpolation
- Display: some labels are rounded to two decimals, while plotted values retain the precision in the local extract

SSB describes the indicator as the sum of one-year age-specific fertility rates for ages 15–49: the average number of live-born children a woman would have if the year's fertility pattern applied throughout the childbearing period and she were not exposed to mortality. It is not the completed number of children actually born to a cohort of women.

### Table 07872

- Contents: `Mothers age at first birth`
- Period in local extract: 1961–2025
- Period used in coordinated chart: 1968–2025, aligned with table 04232
- Unit: years
- Transformation: select mothers only; parse numeric values; no smoothing or interpolation

SSB footnote: values for 1961–1985 were recalculated with new data in 2009.

## Main statistical message

> Norway's total fertility rate moved through distinct phases: a steep fall in the 1970s, a partial recovery that culminated in 2009, then a long decline to a record low in 2023 followed by a modest rise in 2024–2025.

The context chart shows that mean age at first birth increased over the broad period. The page explicitly treats this as contextual evidence, not as proof that later first births caused the fertility trend.

## Data integrity choices

- The broad pattern is established with the full 1968–2025 fertility series.
- The page does not cherry-pick a short interval to define the main message.
- Turning points are limited to a few values that structure the reading.
- The 2024–2025 increase is described as modest rather than as a full recovery.
- No external historical events are annotated, so no unsourced historical explanation is introduced.
- The over-storytelling demo intentionally shows how a short time window and loaded headline can distort interpretation, while marking that version as a teaching example.

## Accessibility

- semantic HTML and visible headings
- keyboard-accessible step navigation (including left/right arrow keys)
- visible focus states
- native buttons for all interactions
- touch-friendly target sizes
- text equivalents for important chart findings
- no essential information available only on hover
- responsive SVG charts using `viewBox`
- `prefers-reduced-motion` respected
- colour is reinforced with labels, line weight and position

## Visual design

The page uses SSB's published visual identity as inspiration:

- SSB dark 5: `#274247`
- SSB dark 1: `#F0F8F9`
- SSB green 4: `#00824D`
- SSB purple 3 (sparingly): `#7E5EE8`
- generous white space and restrained supporting elements
- Roboto/Open Sans when available, with Arial fallback

Reference: https://profil.ssb.no/
