# Data

Everything on the page comes from one table.

| | |
|---|---|
| **Source** | Statistics Norway (SSB), StatBank |
| **Table** | 06913 — *Population 1 January and population changes during the calendar year* |
| **Table page** | <https://www.ssb.no/en/statbank/table/06913> |
| **Selection** | Region `0` (the whole country), all contents, all years |
| **Coverage** | Population 1 January 1951 onwards; change components for each calendar year |
| **Unit** | Persons |
| **Format** | JSON-stat 2, retrieved over HTTP GET from PxWebApi v2 |

## How the page gets the figures

1. It looks for `data/06913-norway.json`. If the file is there, it is used.
2. If not, it calls the same query live from the browser.

Both paths use the identical query, so the figures are the same. The local
extract exists for two reasons: it freezes a known set of numbers for the
duration of a course, and it keeps the page working on networks that block
outbound calls to `data.ssb.no`.

To produce the extract, from the repository root:

```bash
bash data/fetch-data.sh
```

That writes `06913-norway.json` next to this file and records the retrieval
time in `RETRIEVED.txt`. Commit both if you want the page to be reproducible.

## Definitions that matter for the visualisations

* **Population** — persons registered as resident in Norway on 1 January.
  A *stock*, measured at an instant.
* **Births, deaths, immigration, emigration** — persons, counted over the
  calendar year. *Flows*, measured over a period.
* **Excess of births** — births minus deaths; negative means more deaths than
  births.
* **Net migration** — immigration minus emigration; negative means net
  outward migration.
* **Population growth** — from 2005 onwards, the population on 1 January of
  the following year minus the population on 1 January of the current year.
* **Statistical adjustments** — the difference between population growth
  measured that way and the sum of excess of births and net migration.
  SSB publishes this as a separate item because delayed reports, annulments
  and revisions mean the two calculations never agree exactly.

Full definitions and quality notes:
<https://www.ssb.no/en/befolkning/folketall/statistikk/befolkning>

## Transformations made in the browser

None of these change the published figures; they are documented on the page
itself as well.

| Transformation | Where | Why |
|---|---|---|
| Excess of births, net migration and population growth are computed from their components if the table does not return them directly | data model | Keeps the page working across table revisions; the arithmetic is SSB's own definition |
| Statistical adjustments = population growth − (excess of births + net migration) | data model | SSB's published definition of the item |
| Heatmap colour scaled to each row's own minimum and maximum | pattern view | The four series differ by nearly an order of magnitude; the question asked is about relative extremes. Colours are therefore *not* comparable between rows, which is stated on the chart |
| Population stock excluded from the flow diagram | flow view | The stock is roughly a hundred times larger than the annual flows and would compress them to nothing |
| Missing values rendered as gaps | all views | The change components for the most recent year are not yet published. Nothing is interpolated or carried forward |

## Reproducing the figures by hand

Open the table page, choose region *The whole country*, select all contents
and all years, and compare. For a quick check, StatBank table 06913 gives
population 1 January 2026 = 5 627 400 and population growth in 2025 = 33 060,
which are also published on the
[Population statistics page](https://www.ssb.no/en/befolkning/folketall/statistikk/befolkning).
