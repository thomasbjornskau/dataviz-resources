# GSBPM-visualiseringer

Samling av interaktive visualiseringer som bruker GSBPM (Generic Statistical Business Process Model) som strukturell ramme. Modellen identifiserer åtte faser og 44 delprosesser som inngår i å produsere offisiell statistikk.

Hver app i denne mappen bruker GSBPM som rygg og legger på sin egen dimensjon – f.eks. hvilke delprosesser et statistikkprodukt bruker, hvilke systemer som støtter hvilke delprosesser, hvem som har ansvaret, osv.

## Apper

| App | Hva den viser | URL |
|---|---|---|
| [Delprosesser](./apps/delprosesser/) | Konfigurator hvor en statistikkprodusent kan huke av de delprosessene som inngår i sitt eget løp. | `apps/delprosesser/` |
| [Systemer](./apps/systemer/) | Hvilke systemer (Kudoc, RespReg, DaplaLab osv.) som støtter hvilke delprosesser, med kategori, brukstype og forklaring. | `apps/systemer/` |

## Mappestruktur

```
gsbpm/
├── README.md                      ← denne fila
├── data/
│   └── gsbpm.json                 ← kanonisk modell – brukes av alle apper
└── apps/
    ├── delprosesser/
    │   ├── index.html
    │   └── README.md
    └── systemer/
        ├── index.html
        ├── data.json              ← appspesifikk data (systemer, koblinger)
        └── README.md
```

## Datakilder

**`data/gsbpm.json`** er den kanoniske beskrivelsen av GSBPM-modellen i norsk SSB-oversettelse (versjon 5.1). Inneholder de åtte fasene og alle 44 delprosesser med kode, navn og forklaring. Alle apper i denne mappen leser denne filen.

Forklaringer er tilpasset fra UNECEs GSBPM v5.1/5.2 og fra SSBs egen prosessmodell. Hvis den offisielle norske oversettelsen oppdateres, oppdateres denne filen tilsvarende – og endringen slår igjennom i alle apper.

**Appspesifikk data** (f.eks. `apps/systemer/data.json`) ligger inne i den enkelte appens mappe og heter alltid `data.json`. Den inneholder det som er unikt for appen.

## Konvensjoner for nye apper

Når du legger til en ny app i denne samlingen:

1. **Lag en undermappe** under `apps/` med et kort, beskrivende navn på norsk i små bokstaver. F.eks. `apps/ansvar/`, `apps/metoder/`. Ikke prefiks med "gsbpm-" – det er underforstått fra konteksten.

2. **Fila skal hete `index.html`**, slik at GitHub Pages serverer den automatisk når man besøker mappen. URL-en blir da `…/gsbpm/apps/<appnavn>/` uten filnavn.

3. **Appspesifikk data heter `data.json`** og ligger i samme mappe som `index.html`. Leses med `fetch('./data.json')`.

4. **Den kanoniske GSBPM-fila leses med relativ sti**: `fetch('../../data/gsbpm.json')`.

5. **Legg en `README.md` i app-mappen** som forklarer hva appen viser, hvilke data den bruker, og hvordan dataene oppdateres.

6. **Ingen felles CSS/JS-fil ennå.** Inntil vi har flere apper og ser hva som faktisk gjentar seg, holder hver app sin egen styling inline i HTML-fila. Premature abstraksjoner er vanskeligere å reversere enn duplisering.

## Vedlikehold av gsbpm.json

`data/gsbpm.json` skal oppdateres når:

- UNECE slipper en ny GSBPM-versjon (sist: 5.2 i mai 2025)
- SSB justerer sin norske oversettelse av delprosessnavn eller forklaringer
- Det avdekkes feil i de norske beskrivelsene

Alle apper henter samme fil, så én oppdatering = synlig i alle apper umiddelbart.

## Versjonering

Vi holder oss til **én levende `gsbpm.json`** i stedet for versjonerte filer (`gsbpm-v5.1.json`, `gsbpm-v5.2.json`). Hvis vi får et reelt behov for å fryse en app på en spesifikk versjon, kan vi gå over til versjonerte filer da. Inntil videre: én sannhet, én fil.
