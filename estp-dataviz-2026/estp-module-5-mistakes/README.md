# ESTP Data Visualization — Module 5: Common Mistakes and Pitfalls

Standalone static teaching page for an ESTP course aimed at employees of European National Statistical Institutes.

## Run

The project contains only ordinary front-end files and can be published directly with GitHub Pages:

- `index.html`
- `styles.css`
- `script.js`
- `data/unemployment_snapshot.js` — browser-ready verified recent teaching snapshot
- `data/unemployment_recent_08518.csv` — auditable total unemployment extract
- `data/unemployment_age_08518.csv` — auditable age-group extract
- `data/latest_trend_13760.csv` — latest verified monthly trend observation
- `data/source-metadata.json` — source and transformation notes

No build step, API key, server-side component or JavaScript framework is required.

The core recent examples work from the bundled local snapshot. Longer quarterly context and the four monthly adjustment states are requested from Statistics Norway's public PxWebApi v2 when available and cached in `localStorage`. If those requests fail, the page reports the limitation and does not invent replacement values.

## Design system

Module 5 deliberately reuses the existing ESTP Modules 1–3 visual system. Its `styles.css` starts from the Module 3 stylesheet foundation and retains the same:

- CSS variables and SSB-inspired palette
- Arial/Helvetica typography and heading hierarchy
- 1180 px page shell
- 8 px SSB-green top stripe and header treatment
- rectangular controls with minimal rounding/shadow
- chart gridlines, axes and annotation style
- source area and dark footer
- breakpoints, focus states and reduced-motion behaviour

Module 5-specific rules are appended after the shared stylesheet. No red warning theme is used.

## Statistical sources

### SSB StatBank table 08518

**Unemployed persons, by age and sex, 1972Q1–2026Q2**  
https://www.ssb.no/en/statbank/table/08518

Metadata checked 27 August 2026. Table updated 13 August 2026 08:00.

Local extract variables:

- sex: both sexes
- age: 15–74 total and selected groups 15–24, 25–54, 55–74
- recent period: 2025Q1–2026Q2
- measures: unemployed persons (1,000) and unemployed as per cent of the labour force
- adjustment: quarterly observed / not seasonally adjusted
- transformations: none beyond display formatting

The current LFS release was used as an additional cross-check for the recent quarterly values.

### SSB StatBank table 13760

**Labour force, employment, unemployment and man-weeks worked, break and seasonally adjusted figures**  
https://www.ssb.no/en/statbank/table/13760

Metadata and current release checked 27 August 2026. The LFS release dated 25 August 2026 reports for July 2026:

- unemployed persons, trend: 138,000
- change from June to July: -1,000
- unemployment rate, trend: 4.5%
- change in rate from June to July: 0.0 percentage points

The “technically true” teaching chart therefore derives June's count as 139,000 from the published July level and the published month-to-month change. This arithmetic derivation is disclosed; it is not a separate StatBank extraction.

Table 13760 provides trend, seasonally adjusted 3-month moving average, seasonally adjusted, and not seasonally adjusted monthly series. The page does not calculate seasonal adjustment itself.

## Time-series breaks and revisions

SSB metadata documents several LFS changes relevant to interpretation. The page surfaces, in particular:

- 2006Q1: lower age limit changed from 16 to 15; SSB reports unemployment down by about 1,000 as a consequence of the production-system change.
- 2018: new estimation method introduced; StatBank series were revised back to 2006.
- 2021Q1: major redesign under the new EU LFS regulation. SSB estimates a break of about 5,400 unemployed persons; that break estimate is not statistically significant. SSB reports the unemployment rate in the new LFS as 0.1 percentage points higher than in the old LFS.

Table 13760 is break-adjusted across the 2020/2021 break. Table 08518 carries the break note, so the break demonstration uses that quarterly series when the API is available.

## Uncertainty

The LFS is sample-based. This project does **not** fabricate confidence intervals. The uncertainty section pairs the real July 2026 point estimate with a separate schematic illustration explicitly labelled conceptual and without numerical endpoints.

## Accessibility

- semantic headings and landmarks
- native keyboard-operable buttons
- visible focus states inherited from Modules 1–3
- touch-friendly controls
- textual equivalents for important chart messages
- no essential information available only on hover
- responsive SVG charts
- colour reinforced by labels and position
- `prefers-reduced-motion` respected

## Statistical integrity choices

- correct units are shown next to charts
- counts and rates remain distinct
- the unemployment-rate denominator is stated explicitly
- quarterly and monthly series are not silently mixed
- adjustment status is always visible in the monthly comparison
- no significance claim is made from ordinary point-to-point movement
- the 2021 break is documented from SSB metadata
- no invented uncertainty interval is shown
- intentionally misleading versions are labelled as teaching examples and are never attributed to SSB
