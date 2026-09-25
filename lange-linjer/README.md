# Lange linjer

En interaktiv forklaringsartikkel basert på SSB Notater 2026/34, *Noen sentrale tidsserier for norsk økonomi siden 1900*. Den har to deler:

- Et 3D-kart der hver figur er en strek fra første til siste år med tall, gruppert etter emne.
- Et signaturdiagram med epoker, zoom og merknader festet til dataene.

Siden er én selvstendig `index.html` uten byggeverktøy i nettleseren. Tallene er bakt inn i filen.

## Struktur

```
index.html            Ferdig side. Genereres – ikke rediger direkte
mal.html              Mal med stil og all JavaScript. __DATA__ erstattes ved bygging
lag_side.py           Byggeskript: Excel + JSON → index.html
excel/                Figurgrunnlag, ett faneark per figur (fanenavn = figurnummer, f.eks. «2.4»)
data/katalog.json     Alle 100 figurer fra PDF-en: tittel, side, tidsrom fra figurtittelen
data/figurer.json     Redaksjonelt lag: korttittel, enhet, serienavn, skjøter, merknader, fotnote
data/emner.json       De ni emnene (kapitlene)
data/epoker.json      Delperioder (zoomknapper og bakgrunnsbånd) og hendelser (skraverte bånd)
.nojekyll             Hindrer at GitHub Pages kjører Jekyll på repoet
```

## Bygge siden

Krever Python 3.9+ og openpyxl (`pip install openpyxl`).

```
python3 lag_side.py
```

Skriptet skriver `index.html` og lister valideringsmerknader, for eksempel løse celler, merknader som peker på serier eller år som ikke finnes, og figurer som har tall men mangler redaksjonell konfig.

## Legge til nye kapitler

1. Legg Excel-filen i `excel/`. Filnavnet er fritt. Hvert faneark må hete figurnummeret, og årstallene må stå i kolonne A.
2. Kjør `python3 lag_side.py`. Figurene får tall med én gang. Serienavn hentes fra kolonneoverskriftene.
3. Legg til en blokk per figur i `data/figurer.json` for korttittel, enhet, lesbare serienavn og merknader. Kjør skriptet på nytt.

Skriptet leser ting slik:

- En konstant kolonne, som «1910 = 100», blir en stiplet referanselinje.
- En kolonne med «trend» i navnet blir tegnet mørk og tykk når figuren også har vanlige serier.
- Figurer med «5-år» i tittelen tolkes som femårsperioder. Verdien for år *t* gjelder perioden fra forrige år i lista til *t*.
- Uregelmessige år, som folketellinger, tegnes med punkter.
- Tomme celler blir hull. Det interpoleres aldri.

## Merknader i figurer.json

```json
{"type":"punkt","serie":"vekst bnp","ar":1921,"tekst":"…","kilde":"tekst","niva":1,"plass":"u"}
{"type":"spenn","serie":"trendvekst fastlands-bnp","fra":1900,"til":1939,"tekst":"…","kilde":"tekst","niva":1,"plass":"o"}
```

- `serie` er kolonneoverskriften i Excel, nøyaktig slik den står, med eventuelle mellomrom.
- `kilde`: `tekst` betyr gjengitt fra publikasjonens tekst og tegnes med heltrukken strek. `data` betyr avlest i tallene og tegnes med stiplet strek.
- `niva`: 1 vises alltid. 2 vises først når brukeren har zoomet inn.
- `plass`: `o` for over, `u` for under. Dette er et hint. Plasseringen unngår kollisjoner selv.

Skjøter der en serie bytter definisjon markeres med `"skjot": [{"ar":1970,"tekst":"Fra 1970: Fastlands-Norge"}]`. Serier som er samme størrelse før og etter en skjøt, kan få samme farge med `"samme_farge": [["serie a","serie b"]]`.

## Publisere på GitHub Pages

1. Opprett et repo, for eksempel `lange-linjer`, og legg inn alle filene i roten.
2. Gå til Settings → Pages → Build and deployment og velg «Deploy from a branch», gren `main` og mappe `/ (root)`.
3. Siden blir liggende på `https://<bruker>.github.io/lange-linjer/`.

Du kan lenke direkte til en figur med `#figur-2.4`.

Legger du bare ut `index.html`, fungerer siden fullt ut. De andre filene trengs bare for å bygge den på nytt.

## Kilde

Anders Harildstad (2026): *Noen sentrale tidsserier for norsk økonomi siden 1900*. Notater 2026/34, Statistisk sentralbyrå. Dette er et formidlingseksperiment og ikke en offisiell SSB-publisering.
