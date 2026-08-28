# ESTP Data Visualization — Module 5: Common Mistakes and Pitfalls

Standalone static teaching page for an ESTP course aimed at employees of European National Statistical Institutes.

The central diagnostic question is:

> **What impression does this design create, and is that impression justified by the data?**

The page demonstrates five pitfalls using real Statistics Norway Labour Force Survey data: **scale → clutter → context → emphasis → uncertainty**. In every problem/fix comparison, the underlying observations remain unchanged unless the page explicitly says that the visible time window or series selection is changing.

## Run and publish

The project contains only ordinary front-end files and can be published directly with GitHub Pages:

```text
index.html
styles.css
script.js
data/
  data.js
  unemployment_08518.csv
  source-metadata.json
README.md
```

No build step, server-side component, authentication, API key, framework or proprietary service is required. `data/data.js` contains the same local teaching extract as the CSV in browser-ready form, so the page works when `index.html` is opened directly from disk.

## Design system

Module 5 reuses the complete stylesheet foundation from the latest ESTP Module 4 package and appends only Module 5-specific rules. It preserves the established:

- CSS variables and SSB-inspired palette;
- Arial/Helvetica typography and heading hierarchy;
- 1180 px page shell;
- 8 px SSB-green top stripe and header treatment;
- generous section spacing;
- rectangular controls and surfaces;
- segmented/toggle control treatment;
- chart gridline, axis, annotation and focus conventions;
- source area and dark footer;
- responsive breakpoints at 900 px and 620 px;
- visible focus states and `prefers-reduced-motion` behaviour.

No new framework, shadow system, gradient, typography or colour family has been introduced.

## Statistical source

**Statistics Norway, StatBank table 08518 — Unemployed persons, by age and sex**

- Source: Statistics Norway
- Table updated: 13 August 2026, 08:00
- Local extract created and verified: 28 August 2026
- Reference time: continuous survey
- Sex: both sexes
- Quarters: 2025Q1–2026Q2
- Ages: 15–74 total, 15–24, 25–54, 55–74
- Measures: unemployed persons (1,000) and unemployed as per cent of the labour force
- Transformations: none beyond display formatting
- Seasonal adjustment: none applied on this page
- StatBank: https://www.ssb.no/en/statbank/table/08518

The recent quarterly values were cross-checked against the Statistics Norway Labour Force Survey release updated 25 August 2026, Table 4.

### Teaching extract: both sexes

| Quarter | Total count (1,000) | Total rate | 15–24 rate | 25–54 rate | 55–74 rate |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2025Q1 | 124 | 4.1% | 12.8% | 3.0% | 1.5% |
| 2025Q2 | 153 | 5.0% | 15.4% | 3.2% | 2.8% |
| 2025Q3 | 141 | 4.6% | 14.5% | 3.4% | 1.3% |
| 2025Q4 | 127 | 4.2% | 13.3% | 3.2% | 1.2% |
| 2026Q1 | 146 | 4.8% | 14.7% | 3.5% | 2.1% |
| 2026Q2 | 147 | 4.8% | 14.3% | 3.5% | 2.0% |

The unemployment rate denominator is the **labour force**, not the total population.

## Uncertainty and comparability

The LFS is sample-based. Statistics Norway explains that sampling errors arise because results come from a sample rather than the full population, and that standard errors are substantially lower for annual averages than for quarterly averages. SSB advises caution when assessing changes from one survey to another.

No confidence interval is fabricated for this page because the selected table extract does not provide one.

SSB documents a major LFS redesign from 2021Q1. The estimated break in the number of unemployed persons is about **5,400**, and SSB states that this break estimate was **not statistically significant**. SSB also reports the unemployment rate in the new LFS as **0.1 percentage points higher** than in the old LFS.

## Accessibility

- semantic HTML and visible heading hierarchy
- native keyboard-operable buttons
- visible focus states inherited from the shared design system
- touch-friendly controls
- important information available without hover
- textual explanations alongside every chart
- SVG charts with `viewBox` and mobile overflow behaviour consistent with earlier modules
- colour reinforced by direct labels, position and explicit focus text
- `prefers-reduced-motion` respected by the shared stylesheet

## Statistical integrity choices

- counts and rates remain distinct;
- percentages and percentage-point statements are kept distinct;
- the rate denominator is explicit;
- quarterly figures are not presented as seasonally adjusted;
- no statistical significance claim is made from ordinary point-to-point movements;
- no uncertainty interval is invented;
- the documented 2021 break is surfaced;
- intentionally misleading states are clearly labelled as course examples, not SSB publications;
- problem/fix states do not alter the underlying observations.
