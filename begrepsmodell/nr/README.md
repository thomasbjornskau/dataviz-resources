# Begrepsmodell for makrostatistikker

Interaktiv begrepsmodell bygget for onboarding og felles språk i nasjonalregnskapsmiljøet ved SSB.

Denne mappen er også ment som mal for framtidige spissede begrepsmodeller. Samme struktur, samme byggeskript — kun data skiller modellene fra hverandre.

## Filene

    index.html         # Ferdig bygget modell — dette er filen som publiseres
    build.js           # Byggeskript (Node.js 18+, ingen npm-dependencies)
    README.md          # Denne filen
    data/
      begreper.json    # De 117 begrepene med definisjoner
      lag.json         # De 9 hovedkategoriene
      faser.json       # De 6 produksjonsfasene
      metadata.json    # Versjon, tittel, ingress, kilder, footer-tekst

**Ansvarsfordelingen:** En NR-ekspert redigerer `data/*.json` og kjører `node build.js`. En designer eller utvikler kan endre CSS/JavaScript inne i `index.html` uten å røre dataene.

## Slik gjør du en endring

**Endre en definisjon:**
1. Åpne `data/begreper.json`
2. Finn raden med riktig `id`, endre `d`-feltet
3. Kjør `node build.js`
4. Åpne `index.html` i nettleser for å se resultatet

**Legge til et nytt begrep:**
1. Åpne `data/begreper.json`
2. Legg til en ny rad med alle feltene (se format under)
3. `id`-feltet må være unikt — bruk en URL-vennlig streng
4. `lag`-feltet må matche en id i `lag.json`
5. Kjør `node build.js` — den validerer og forteller deg om noe er galt

**Endre versjon eller oppdateringsdato:**
1. Åpne `data/metadata.json`, endre `versjon` eller `oppdatert`
2. Kjør `node build.js`

**Endre farger:**
Fargene ligger som CSS-variabler øverst i `index.html`, søk etter `--l-system`. Bytt hex-koden. Ingen bygg trengs — bare last inn siden på nytt.

## Format på begreper.json

Én rad per linje, JSON-array. Feltene:

    id       — unik URL-vennlig id
    t        — termen som vises til brukeren
    lag      — id fra lag.json (system, delregnskap, struktur, ...)
    gruppe   — undergruppe innen laget (fritt tekstfelt, samler termer)
    k        — 1 = kjerne (synlig som standard), 0 = utvidet (skjult inntil brukeren velger «Alle»)
    f        — fase (1–6, fra faser.json) — semantisk merking
    d        — definisjonen som vises i detaljfeltet
    par      — array av id-er som dette begrepet forveksles med (tegnes som lilla «forvirringskanter»)
    hvor     — valgfritt: hvor definisjonen forvaltes (f.eks. «KLASS», «Fastsatt av Eurostat»)

## Byggeregler

`build.js` gjør fire ting hver kjøring:

1. **Leser og validerer** de fire datafilene. Feiler tidlig hvis id-er er duplikate, par-referanser peker på ukjente begreper, eller lag-referanser er feil.
2. **Bygger kanter automatisk** — du skal aldri redigere kanter for hånd:
   - `par` (vekt 2.5) — direkte fra `par:[]`-lister
   - `ref` (vekt 0.6) — tekstsøk: term X nevnt i definisjonen til Y
   - `gruppe` (vekt 0.35) — svake bånd som holder rader i samme (lag, gruppe) sammen i grafen
3. **Injiserer JSON** i `<script id="data" type="application/json">` i index.html
4. **Oppdaterer tekstfelt** merket `data-meta="X"` med verdier fra metadata.json (eller beregnede felt som `omfang`)

Skriptet er idempotent — kjør så mange ganger du vil, samme resultat.

## Publisering

`index.html` er selvstendig — én fil, ingen eksterne avhengigheter. Kopier til GitHub Pages, en intern webserver eller send den som vedlegg. Det som ligger i `data/` og `build.js` trengs kun for vedlikehold, ikke for å vise siden.

## Krav

- **For å bruke modellen:** en moderne nettleser. Ingenting annet.
- **For å bygge:** Node.js 18 eller nyere. Ingen npm-pakker.

## Framtidige modeller

Denne mappen kan brukes som mal:

1. Kopier hele mappen til nytt navn (f.eks. `begrepsmodell-priser/`)
2. Bytt ut innholdet i `data/*.json` med det nye vokabularet
3. Endre modul-navn, ingress og kilder i `data/metadata.json`
4. Kjør `node build.js`
5. Publisér

CSS-en, JavaScript-en og byggeskriptet trenger ingen endringer. Fargeoppsettet (Okabe-Ito) fungerer for opptil 8 fargede lag pluss ett nøytralt.
