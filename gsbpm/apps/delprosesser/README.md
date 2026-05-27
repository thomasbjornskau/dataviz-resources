# Delprosesser

Interaktiv konfigurator som lar en statistikkprodusent huke av hvilke delprosesser som inngår i sitt eget produksjonsløp – og bygge sitt eget GSBPM-kart.

## Hva appen viser

- De åtte fasene i GSBPM som kolonner, med tilhørende delprosesser som klikkbare bokser
- Klikk på en boks (utenom avkrysningsruten) for å åpne forklaring i info-panelet under
- Klikk på avkrysningsruten for å huke prosessen av eller på
- To visningsmodi: **Alle delprosesser** (oversikt) og **Bare mine** (rent diagram over eget løp)
- URL oppdateres når du huker av – kopier delbar lenke fra knappen, så får mottakeren samme oppsett

## Datakilder

- `../../data/gsbpm.json` (kanonisk modell – kun lesing)

Appen har ingen egen `data.json` fordi den ikke har appspesifikke data.
Avkrysninger lagres i URL-en (`?valgt=…`), ikke i en fil.

## Bruk

Åpne `index.html` via GitHub Pages, eller kjør lokalt med `python3 -m http.server` og besøk `localhost:8000/apps/delprosesser/`.
