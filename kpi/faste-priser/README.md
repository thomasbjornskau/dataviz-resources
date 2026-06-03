# Kalkulator: Mellom løpende og faste priser

Et lite, pedagogisk webverktøy som konverterer en hel tidsserie fra **løpende
(nominelle) priser** til **faste (reelle) priser** ved hjelp av
Konsumprisindeksen (KPI) som deflator – og omvendt.

Inspirert av SSBs prisomregner, men utvidet til å håndtere hele tidsserier
over mange perioder, slik memoet bak prosjektet beskrev.

## Funksjoner

- **Lim inn eller last opp** data (TSV/CSV ved innliming, `.csv`/`.xlsx`/`.xls` ved opplasting).
- **Automatisk tidsdeteksjon** for år (`2024`), kvartal (`2024K1`) og måned (`2024M03`).
- **Deflatering begge veier** – løpende → faste, eller faste → løpende.
- **Valg av basisår** – første eller siste tidsperiode i serien.
- **Figur og tabell** – egentegnet SVG-graf uten eksterne avhengigheter, og en
  tabell som også viser KPI-verdien per periode (så beregningen er etterprøvbar).
- **Eksport** til semikolon- eller kommaseparert CSV, eller JSON.

## Metode

Hver verdi regnes om til prisnivået i et valgt basisår:

```
faste_priser(t) = løpende_verdi(t) × ( KPI(basisår) / KPI(t) )
```

KPI-tallene er **årsgjennomsnitt** (samt kvartals- og månedssnitt) av
totalindeksen, og ligger innebygd i `index.html`. Dekker årene **1979–2026**.

Kilden er SSB tabell **14700** (2025 = 100), som dekker 2000–2026. Årene
**1979–1999** er kjedet på fra den utgåtte tabellen 03013 og reskalert til
2025 = 100 ved hjelp av overlappsåret 2000. Skjøten er glatt (desember 1999
går jevnt over i januar 2000), så hele serien kan brukes som én sammenhengende
indeks.

## Publisere på GitHub Pages

1. Opprett et nytt repo og legg inn `index.html`, `README.md` og `.nojekyll`.
2. Push til `main`.
3. Gå til **Settings → Pages**, velg `main` som kilde og `/ (root)` som mappe.
4. Siden blir tilgjengelig på `https://<brukernavn>.github.io/<repo>/`.

Hele appen er én selvstendig HTML-fil. Den kan også bare åpnes lokalt i en
nettleser – ingen server kreves.

## Oppdatere KPI-tallene

KPI ligger i en `const KPI_DATA = { ... }` øverst i `index.html`. Når SSB
publiserer nye tall, kan objektet oppdateres direkte – nøklene er `"2026"`
(år), `"2026K1"` (kvartal) og `"2026M04"` (måned). Verktøyets feilmelding og
kildehenvisning leser årsspennet dynamisk, så de oppdaterer seg selv.

## Datakilde

Statistisk sentralbyrå, tabell 14700 – Konsumprisindeks, totalindeks (2025=100), kjedet med tabell 03013 for årene før 2000.
