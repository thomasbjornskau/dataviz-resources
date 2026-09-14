# Hackathon – presentasjonsskjelett, punkt 5

Pakk ut hele ZIP-filen og åpne index.html. Ingen installasjon, byggesteg
eller nettilgang er nødvendig. Mappen kan publiseres direkte på GitHub Pages.

## Prøv demoen

- Trykk 3. Hotellovernattinger er valgt som foreløpig demonstrasjonsserie.
- Rolig · jan 2018 viser 12 av 12 utfall innenfor intervallet.
- Brudd · jan 2020 viser 1 av 12. Skyvekontrollen reestimerer på avkortet historikk.
- Trykk 4 og velg 24 / 48 / 72 / 120 startpunkt. Side 4 bruker alltid
  prototypens faste reservekopi av byggekostnadsindeksen.
- Piltaster og mellomrom går fram. Venstre/opp og Shift+mellomrom går tilbake.
  Tall 1–5 hopper direkte. Skjemakontroller beholder vanlige tastaturfunksjoner.
- N viser notater på samme skjerm, også på projektoren. ? viser hjelp.
- Fjern show-placeholders fra body for å skjule de stiplede rammene.

Sidebytte beholder demotilstanden. Omlasting beholder sidenummeret via hash,
men tilbakestiller demoen til lokale data og planlagt startposisjon.

## Beregninger

engine.js er hele motorblokken kopiert ordrett fra originalprototypen.
Original datablokk med PRESETS, FALLBACK, API og loadTable er kopiert ordrett
før tilleggene i data.js. evaluation.js er en separat adapter for etterprøving,
med identiske startpunkt og intervallregler som originalens runCoverage.

| Startpunkt | Første–siste startmåned | Innenfor / testede utfall | Gjennomsnittlig dekning |
|---|---|---|---|
| 24 | aug 2023–jul 2025 | 277 / 288 | 96,18 % |
| 48 | aug 2021–jul 2025 | 491 / 576 | 85,24 % |
| 72 | aug 2019–jul 2025 | 642 / 864 | 74,31 % |
| 120 | aug 2015–jul 2025 | 1217 / 1440 | 84,51 % |

Alle startpunkt har tolv observerte utfall. Dekning beregnes per horisont,
deretter som gjennomsnitt over de tolv horisontene, som i prototypen.

## Datagrunnlag og avgrensning

Originalprototype:
https://thomasbjornskau.github.io/dataviz-resources/teknisk-framskriving/index.html
Den nedlastede HTML-kilden ligger i sources/original-prototype.html, kun som
referanse for ordrett sammenligning. Åpne rotens index.html for presentasjonen.

Byggekostnadsindeksen er prototypens uendrede reserveserie, jan 2005–jul 2026.
Den er kontrollgrunnlaget for gjenskaping av prototypens resultater. Vi har
ikke byttet den ut med dagens API-uttrekk eller revalidert alle observasjoner
mot SSBs kilde i dette steget.

Hotellserien er lastet ned fra PxWebApi v2, tabell 08403, 14. september 2026.
Utvalg: Region=0 (Hele landet), HotellFormal=00 (Overnattingar i alt),
ContentsCode=Overnattinger, Tid=*. Serien dekker jan 1986–des 2023.
Metadata og JSON-stat-uttrekk ligger i sources/hotel-meta.json og hotel-data.json.
Metadata: https://data.ssb.no/api/pxwebapi/v2/tables/08403/metadata?lang=no&outputFormat=json-stat2
Verdiene i data.js er kontrollert mot dette uttrekket. Ingen syntetiske tall.

Demoen avkorter den lagrede historikken ved valgt måned, og bruker ingen
senere observasjoner i estimeringen. Den rekonstruerer ikke historiske
publiseringsversjoner, publiseringsforsinkelser eller revisjoner. Den viser
heller ikke en full X-13/TRAMO/SEATS-kjøring, men prototypens airline-modell.

Hent live er valgfritt og gjelder bare side 3. Ingen automatisk netthenting.
Ved feil eller etter fire sekunder brukes lokal kopi med en diskret etikett.
Live-uttrekk kan ha annen historikk, noe som kan endre modellresultatene.
Side 4 er låst til reservekopien for et reproduserbart publikumseksempel.

## Kontroll

Kjør `node tests/verify.cjs` for beregningstesten. Node trengs bare for testen,
aldri for presentasjonen. Lagret resultat finnes i tests/result.json.
Testen sammenligner motor og original datablokk ordrett, kontrollerer alle
horisonter mot originalens runCoverage, gjenskaper 96 % / 74 %, og kontrollerer
hotellverdiene mot JSON-stat-uttrekket samt de to demoøyeblikkene.
Den tidligere statsmodels-valideringen er ikke kjørt på nytt.

Nettleserkontroll gjennomført i Chromium: file:// med offline aktivert,
ingen eksterne forespørsler ved oppstart, lokal Roboto, seriebytte, slider,
hurtigknapper, vinduvalg, sidebytte uten tap av tilstand, hash ved omlasting,
notater og hjelp, fallback etter mislykket live-henting. Skjermflater kontrollert
ved 1920×1080, 1280×720 og 1024×768 uten overlapp med bunnlinjen.
Kjøring over lokal HTTP er også testet. GitHub Pages er ikke publisert.

## Layout – punkt 4

Alle fem sider har layout og navngitte plassholdere:

- Side 1: stor påstandsoverskrift, bred figurflate for produksjonslinjen,
  liten etikett for lag og oppgavenummer.
- Side 2: tre påstander med hver sin støttefigur, avgrensning nederst.
- Side 3: fungerende serievalg, to hurtigknapper, figur, skyvekontroll og
  modellutlesning. Figur og utlesning har samme plassering i begge demoøyeblikk.
- Side 4: fungerende vinduvalg, dekningsdiagram, faktisk testperiode og
  plass til én konsekvenssetning.
- Side 5: navnevalg og begrunnelse til venstre med to figurflater;
  fire nummererte beslutningsfelt til høyre (det fjerde er valgfritt).

37 unike data-slot-ID-er. Ingen endelig brødtekst eller endelige figurer
på side 1, 2 og 5. Figurene på side 3 og 4 viser ekte motorresultater
med foreløpig utforming. Serieutvalget er fortsatt et demo-utvalg.

Plassholderrammer og grå bakgrunner styres av én klasse:
`show-placeholders` på body. Fjern klassen for å se layouten uten dem.
Feltbeskrivelsene blir stående til de erstattes av innhold.

Layouten er inspisert i Chromium. Alle fem sider er kontrollert ved
1920×1080, 1280×720 og 1024×768. Ingen tekstoverløp i data-slot-feltene,
ingen overlapp med bunnlinjen og ingen forskyvning av demoens figur,
kontroller eller utlesning mellom januar 2018 og januar 2020.

## Videre utfylling

Alle fem leveransesteg er gjennomført. TODO.md inneholder samtlige 37
data-slot-ID-er, gruppert per side med én linje om hva som gjenstår.
Listen skiller fungerende kontroller og beregninger fra tomme innholdsfelt.
Neste arbeid er å fylle tekst og figurer sammen, med henvisning til felt-ID.
