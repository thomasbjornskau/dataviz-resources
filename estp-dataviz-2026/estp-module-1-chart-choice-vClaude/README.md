# Choosing the right chart

Teaching page for **Module 1 — In-depth review of different chart types** of the
ESTP course in Data Visualisation. Audience: staff of European National
Statistical Institutes working with official statistics, dissemination,
analysis or data visualisation.

The module is not a chart catalogue. It teaches a way of reasoning: a chart is
a combination of visual encodings, chosen to make one particular comparison
easy, and the analytical question has to come before the chart type.

## What is on the page

| Section | What it does |
|---|---|
| Hero | The same numbers in two structures, side by side |
| Five takeaways | The principles, each with an illustration where one helps |
| **Same data. Different question. Different chart.** | Six analytical questions against one SSB table, each with a chart that fits and at least one alternative, with the reasoning written out |
| The encoding lens | Select an encoding and every mark on the page that uses it is highlighted |
| From encoding to chart | Chart forms written as recipes rather than definitions |
| Closing | One sentence, and the five takeaways as a recap |
| Data and definitions | Source, units, and every transformation made for the visualisations |

The encoding lens is the piece worth demonstrating live: selecting *position*
highlights the axes, points and gridlines across every chart at once; selecting
*area* highlights nothing, because nothing on the page encodes quantity by area,
which is the point of the note about treemaps.

## Data

Statistics Norway, StatBank table **06913**, *Population 1 January and
population changes during the calendar year*, whole country, 1951 onwards.
Full provenance, definitions and the list of transformations are in
[`data/README.md`](data/README.md) and repeated at the bottom of the page.

No figure on this page is invented. Everything is read from that table or
computed from it using Statistics Norway's own definitions, and the arithmetic
is listed on the page.

## Running it

It is a static site. Any web server works:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

Opening `index.html` straight from the file system mostly works, but browsers
block `fetch()` on `file://` URLs, so the page will not be able to read the
local extract. Use a server.

### Optional: freeze the figures

By default the page calls Statistics Norway's PxWebApi v2 from the browser with
a single HTTP GET. That endpoint sends permissive CORS headers, so it works
from GitHub Pages without a proxy or an API key.

If you would rather not depend on a live call — during a course, on a
restricted network, or to guarantee that the numbers do not move between
sessions — produce a local extract:

```bash
bash data/fetch-data.sh
```

This writes `data/06913-norway.json`. The page prefers that file when it
exists. Commit it if you want the site to be fully self-contained.

## Publishing to GitHub Pages

1. Push the repository to GitHub.
2. Settings → Pages → Build and deployment → *Deploy from a branch*.
3. Branch `main`, folder `/ (root)`. Save.

No build step, no bundler, no server-side component.

## Implementation notes

* Semantic HTML, hand-written CSS, vanilla JavaScript. No framework and no
  chart library — every chart is SVG generated in `script.js`. D3 would not
  have earned its weight here: the charts need scales, paths and rectangles,
  which is about eighty lines of arithmetic.
* The only external request besides the data is the web font (Roboto Condensed
  and Open Sans, matching Statistics Norway's design system). Remove the
  `<link>` tags in `index.html` if your institute serves fonts locally or
  disallows third-party requests; the fallback stacks are already in the CSS.
* Charts re-render on resize rather than scaling a fixed viewBox, so label
  sizes stay legible from mobile widths up to a wide desktop.
* Contents codes are resolved from the English labels the API returns, not
  hard-coded, and the resolution is printed at the bottom of the page. If
  Statistics Norway revises the table, a mismatch is visible rather than silent.

## Accessibility

* Semantic landmarks and headings, skip link, visible focus states.
* Every chart is an `<img>`-role SVG with a description, has explanatory text
  beside it, and has its numbers available in a table under the chart.
* Charts are keyboard operable: focus a chart and use the arrow keys, `Home`
  and `End` to move through the years. The readout under the chart updates, so
  exact values are available without a pointer and without hover.
* Sign is never carried by colour alone — negative columns sit below the zero
  line and are labelled in the readout.
* Colour comes from Statistics Norway's palette, checked for contrast against
  white.
* `prefers-reduced-motion` is respected.

## Licence and attribution

Figures are the property of Statistics Norway and are used under their
[terms of use](https://www.ssb.no/en/diverse/lisens). Colours and typography
follow Statistics Norway's public design system. This page is course material,
not a Statistics Norway publication.
