# Det tekniske valget som ble politisk

Interaktiv forklaringsartikkel om konfidensialitetsmetoder, bygget som **én selvstendig `index.html`**. Ingen byggesteg, ingen npm, ingen rammeverk. Legg fila i rota av et repo, slå på GitHub Pages, ferdig.

Basert på Hege M. Bøvelstads kommentar på Byrånettet (20.8.2026) og den tilhørende kildesamlingen.

---

## Byggevalg

**Statisk, ikke API-drevet.** GitHub Pages serverer bare filer. Artikkelen kunne kalt SSBs API fra klienten, men da blir en publisert forklaring avhengig av at API-et svarer, og du mister kontroll på hvilke tall leseren faktisk ser. Tallene ligger derfor i fila, med oppgitt kilde og forutsetninger.

**Metoden er ekte, cellestørrelsene er størrelsesordener.** Det viktigste designvalget. Widget 2 bruker SSBs egen dokumenterte regel fra tabell 04362 — ett-tall og to-tall endres til 0 eller 3, altså en maksimal endring på to personer. Alt annet i widgeten er ren divisjon fra publiserte størrelsesordener, vist i klartekst under figuren så leseren kan regne etter selv.

Hero-rutenettet bruker konstruerte celleverdier. Det står i bildeteksten.

---

## Må verifiseres før dette går videre

1. **Motstriden om summering.** Tabellmerknaden til 04362 sier at aggregering av kretstall til kommunenivå kan gi avvik. SSB-artikkelen fra 2018 sier at metoden er laget slik at summering fortsatt blir riktig. Begge kan være riktige hvis de beskriver ulike tabeller eller ulike årganger, men slik det står nå trekker de i hver sin retning. Avklares med Seksjon for befolkningsstatistikk. Ligger som et markert avsnitt i artikkelen.

2. **«I bruk i SSB»-merkingen** i verktøykassa bygger på Bøvelstads oppramsing, ikke på et eget uttrekk. Særlig statusen for syntetiske data bør bekreftes.

3. **Styringsstigen** er en analytisk modell, ikke en gjengivelse av statistikkloven. Plasseringen av grensen for «Norsk utgangspunkt» bør sjekkes mot lovteksten og mot Finansdepartementets styringsdokumenter før figuren brukes utenfor huset.

4. **Folketallet** er avrundet til 5,6 mill. Bytt til faktisk tall per 1.1.2026 med dato.

5. **Antall fylker og kommuner** er satt til 15 og «drøyt 350». Sjekk mot gjeldende inndeling.

---

## Bytte inn ekte grunnkretstall

Hvis du vil at hero-rutenettet skal vise et faktisk utsnitt av tabell 04362:

1. Åpne `https://www.ssb.no/statbank/table/04362` og velg én kommune, begge kjønn, alle femårsgrupper, siste år.
2. Kopier lenken nederst under «API-spørring for denne tabellen».
3. Kjør spørringen, hent 48 celleverdier.
4. I `index.html`, erstatt innholdet i `truth`-arrayet i hero-blokka.

Merk at tallene du får ut **allerede er behandlet**. Du får de publiserte verdiene, ikke de sanne. For å demonstrere regelen må du enten (a) bruke publiserte tall og forklare at rutenettet viser resultatet uten et før-bilde, eller (b) beholde konstruerte tall for før/etter og si det tydelig. Utkastet gjør det siste.

---

## Struktur

| Del | Innhold |
|---|---|
| Hero | 48 celler går fra sant til publisert tall under SSBs egen regel |
| Widget 01 | Verktøykassa — seks metoder, bryter for juni-instruksen |
| Widget 02 | Samme regel, ulik konsekvens — utslag etter publiseringsnivå |
| Widget 03 | Styringsstigen — hvor går grensen mellom politisk mandat og faglig skjønn |

---

## Design

Skriftene er `Archivo`, `Source Serif 4` og `IBM Plex Mono` via Google Fonts, med systemfallback. Fargene er valgt for prototypen og skal erstattes av SSBs visuelle identitet. Rutenettet av celler er gjennomgangsmotivet — det er sakens materiale, ikke dekor.

Responsivt ned til mobil. Tastaturnavigerbart. Respekterer `prefers-reduced-motion`.


---

## To versjoner

| Fil | Målgruppe | Spørsmålet den svarer på |
|---|---|---|
| `index.html` | Ledere og beslutningstakere | Hva *koster* beskyttelse, og hvem bestemmer prisen? |
| `index-folkelig.html` | Allmennheten | Hvorfor beskytter vi i det hele tatt? |

Den folkelige versjonen lar leseren utføre re-identifiseringen selv, først ved å snevre inn en kommune på 214 innbyggere til én person, deretter ved et differanseangrep på to lovlig publiserte tabeller. Visuelt bygger den på isotype-tradisjonen: én prikk er én person.

Begge bruker den samme ekte metoderegelen fra tabell 04362. Alle andre tall i den folkelige versjonen er konstruerte, og det står i teksten.

**Å ta stilling til i den folkelige versjonen:** den viser hvor lett re-identifisering er. Det er hele poenget pedagogisk, men det er også en oppskrift. Vurder om differanseangrepet skal stå så eksplisitt hvis dette skal ut på ssb.no.
