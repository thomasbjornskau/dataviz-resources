# ESTP Data Visualization — Module 4: Design Principles

Standalone static teaching page for an ESTP course aimed at employees of European National Statistical Institutes.

The central teaching idea is:

> **Good design creates order before it creates emphasis.**

The page uses real population data from Statistics Norway to show how hierarchy, comparison, selective emphasis, progressive disclosure and purposeful interaction can reduce the cognitive work required to understand the same statistical information.

## Run and publish

No build step, server-side component, authentication, API key or JavaScript framework is required.

Project structure:

```text
index.html
styles.css
script.js
data/
  data.js
  population_teaching_extract_07459.csv
  population_2021_one_year_07459.csv
  source-metadata.json
README.md
```

You can open `index.html` directly. The project can also be published directly with GitHub Pages.

`data/data.js` contains the same teaching extract as the CSV files in browser-ready form so the page works reliably from both `file://` and GitHub Pages without a live API dependency.

## Design system

Module 4 deliberately reuses the established ESTP Module 1–3 design system rather than creating a new visual identity.

`styles.css` begins with the complete Module 3 stylesheet foundation and preserves the existing:

- CSS variables and SSB-inspired palette;
- Arial/Helvetica typography and heading hierarchy;
- `1180px` page shell;
- 8px SSB-green top stripe and header treatment;
- generous section spacing;
- rectangular surfaces and controls;
- segmented/toggle control treatment;
- chart gridline, axis, annotation and tooltip conventions;
- source area and dark footer;
- responsive breakpoints at 900px and 620px;
- visible focus states and `prefers-reduced-motion` behaviour.

Module 4-specific rules are appended after that shared stylesheet. No framework, shadow system, gradient, new typography or new colour family has been introduced.

## Statistical source

**Statistics Norway, StatBank table 07459**  
**Population, by sex and one-year age groups (M), 1986–2026**

- Source: Statistics Norway
- Unit: persons (number)
- Reference time: 1 January
- Table updated: 25 February 2026, 08:00
- Data and metadata checked for this page: 27 August 2026
- Region in the teaching extract: The whole country (code `0`)
- StatBank: https://www.ssb.no/en/statbank/table/07459

The table contains the dimensions year, region, age and sex, with population as the measured value.

The main analytical question on the page is:

> **How did the population distribution among ages 20–54 change between 2021 and 2023, and where do women and men differ?**

The region is deliberately held constant at the whole country. This avoids municipal-boundary comparability issues and demonstrates an important design choice: a data dimension does not automatically need to become a user control.

## Local teaching extract and transformations

### 2021 — one-year ages aggregated locally

The file `population_2021_one_year_07459.csv` preserves the 70 source observations used for 2021: ages 20–54 for women and men.

Source selection corresponds to SSB saved query `10054226`:

- Region: The whole country
- Sex: Females, Males
- Age: one-year ages 20–54 (the saved query also displays ages 18–19, which are not used here)
- Year: 2021
- Measure: Persons

For the teaching visualization, consecutive one-year ages are summed into seven five-year groups:

- 20–24
- 25–29
- 30–34
- 35–39
- 40–44
- 45–49
- 50–54

For example, the 2021 value for women aged 20–24 is the sum of the five published counts for ages 20, 21, 22, 23 and 24. No weighting or interpolation is used.

### 2023 — SSB five-year aggregation

The 2023 values come directly from SSB saved query `10103858`, which uses StatBank's five-year age aggregation:

- Region: The whole country
- Sex: Females, Males
- Age groups: 20–24 through 50–54
- Year: 2023
- Measure: Persons

The 15–19 group available in that query is not used because the comparable 2021 extract begins at age 20.

### 2026 — broad age overview

The hero uses SSB's published 2026 broad age groups from the Population statistics page, sourced from table 07459:

| Age group | Persons |
| --- | ---: |
| 0 | 55,578 |
| 1–5 | 276,475 |
| 6–12 | 429,001 |
| 13–15 | 200,930 |
| 16–19 | 276,650 |
| 20–44 | 1,865,473 |
| 45–66 | 1,563,660 |
| 67–79 | 674,694 |
| 80–89 | 239,357 |
| 90+ | 45,582 |

These sum to the published total population of **5,627,400** on 1 January 2026.

No smoothing, interpolation, modelling or synthetic observations are used anywhere on the page.

## Teaching structure

The central interaction moves through:

1. **Structure** — grouping, spacing, ordering and common scales before strong colour;
2. **Hierarchy** — a clear reading order for message, chart, controls, metadata and source;
3. **Emphasis** — one analytically relevant age group is highlighted while context remains visible;
4. **Comparison** — aligned years, common scales and identical age ordering reduce mental calculation;
5. **Interaction** — exact values, sex selection and age highlighting are added only after the static information structure works.

Additional demonstrations cover visual hierarchy, typography, gridlines, data labels, annotations, categorical versus highlight colour, progressive disclosure, multidimensional data and accessibility.

## Accessibility

The page includes:

- semantic headings and landmarks;
- keyboard-operable buttons, segmented controls and selectors;
- keyboard-selectable chart rows in the main interactive view;
- visible focus states;
- minimum 44px control targets in the shared control system;
- chart descriptions and non-hover detail readouts;
- direct labels and position cues in addition to colour;
- responsive layouts at the same breakpoints as the previous modules;
- horizontal chart access on narrow screens where necessary;
- `prefers-reduced-motion` support inherited from the shared design system.

Important statistical information is never available only on hover.
