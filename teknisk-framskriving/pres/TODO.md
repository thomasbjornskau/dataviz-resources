# Arbeidsliste for presentasjonen

Skjelettet er ferdig. Punktene under gjelder innholdet vi skal fylle ut sammen.
Alle 37 data-slot-ID-er i index.html er med, gruppert per side. Felter merket
«Fungerer» har allerede kode eller beregnede verdier; det som gjenstår er
innholdsvalg eller visuell utforming. Motoren skal fortsatt beholdes uendret.

## Side 1 – Premisset · 0:00–1:00

- [ ] `s1.headline` — Skriv én stor påstandsoverskrift om at tallene allerede finnes, maks to linjer.
- [ ] `s1.pipeline` — Tegn produksjonslinjen rådata → RegARIMA → framskriving → sesongjustering → publisert tall, med gren fra framskriving til papirkurv.
- [ ] `s1.team` — Fyll inn lagnavn og oppgavenummer.

## Side 2 – Hva objektet faktisk er · 1:00–2:15

- [ ] `s2.headline` — Skriv én påstand som flytter forståelsen fra prognose til referansebane, maks åtte ord.
- [ ] `s2.claim1` — Forklar univariat modell i to korte setninger: hva ser den ikke?
- [ ] `s2.support1` — Velg og lag en liten støttefigur eller et kildebelagt nøkkeltall om modellens bruk av seriens egen historikk.
- [ ] `s2.claim2` — Forklar referansebanen og hva nullmodellen kan brukes til, i to korte setninger.
- [ ] `s2.support2` — Lag en liten støttefigur eller velg et kildebelagt nøkkeltall som viser rollen som sammenligningsgrunnlag.
- [ ] `s2.claim3` — Forklar det betingede intervallet og forutsetningene om modell, outliere og revisjoner, i to korte setninger.
- [ ] `s2.support3` — Velg en liten figur eller et kildebelagt nøkkeltall som gjør intervallets forutsetninger forståelige.
- [ ] `s2.scope` — Skriv én kort avgrensning mot Konjunkturtendensene.

## Side 3 – Demo · 2:15–4:30

- [ ] `s3.headline` — Skriv én påstand som rammer inn demoen, maks åtte ord.
- [ ] `s3.controls` — Fungerer: avklar endelig gruppering og ordlyd for serievalg, hurtigknapper og valgfri live-henting.
- [ ] `s3.series` — Fungerer med to lokale serier: bekreft endelig demo-utvalg og navn i nedtrekket.
- [ ] `s3.calm` — Fungerer for januar 2018: bekreft startpunkt og knappetekst; hotellserien gir nå 12 av 12 utfall innenfor intervallet.
- [ ] `s3.shock` — Fungerer for januar 2020: bekreft knappetekst og bruk av hotellserien, som nå gir 1 av 12 utfall innenfor intervallet.
- [ ] `s3.live` — Fungerer med lokal fallback: avgjør om live-knappen skal vises under framføringen eller skjules.
- [ ] `s3.chart` — Fungerer med motorberegnet bane og intervall: ferdigstill figurtekst, akseformat og visuell prioritering av historikk og utfall.
- [ ] `s3.origin` — Fungerer og reestimerer ved flytting: avklar endelig etikett og relevant spenn for skyvekontrollen.
- [ ] `s3.readout` — Fungerer: velg endelig presisjon og ordlyd for parametre, 12-månedersbane, intervall og fasit uten å endre beregningene.
- [ ] `s3.scope` — Faglig avgrensning finnes: gjennomgå ordlyden om avkortet, lagret historikk og manglende rekonstruksjon av revisjoner.

## Side 4 – Funnet · 4:30–6:00

- [ ] `s4.headline` — Skriv én påstand om hvordan svaret endrer seg med etterprøvingsvinduet.
- [ ] `s4.controls` — Fungerer: ferdigstill kontrollradens etiketter og angivelsen av den faste reservekopien.
- [ ] `s4.window` — Fungerer med 24 / 48 / 72 / 120 startpunkt: bekreft valgt startvindu og planlagt rekkefølge i framføringen.
- [ ] `s4.chart` — Fungerer med dekningsgrad per horisont og 95 %-linje: ferdigstill figurtittel, akseetiketter og prosentformat.
- [ ] `s4.readout` — Fungerer med testperiode og gjennomsnittlig dekning: avklar endelig ordlyd og hvilke detaljer som skal stå synlig.
- [ ] `s4.consequence` — Skriv én setning om at etterprøvingsvinduet må fastsettes på forhånd og være likt på tvers av serier.

## Side 5 – Hva vi foreslår · 6:00–7:30

- [ ] `s5.headline` — Skriv én påstand som lander forslaget, maks åtte ord.
- [ ] `s5.name` — Fyll inn valgt betegnelse for publiseringsobjektet.
- [ ] `s5.reason` — Begrunn hvorfor «framskriving» og «prognose» kan gi feil forventninger, maks tre linjer.
- [ ] `s5.line` — Lag figur A med stiplet linje som viser hvordan presentasjonsformen påvirker forventningen.
- [ ] `s5.band` — Lag figur B med samme bane og målestokk som A, vist som gradert flate.
- [ ] `s5.decisionsTitle` — Skriv en kort innledning til avgjørelsene vi ber om.
- [ ] `s5.decision1` — Formuler første avgjørelse i én linje.
- [ ] `s5.decision2` — Formuler andre avgjørelse i én linje.
- [ ] `s5.decision3` — Formuler tredje avgjørelse i én linje.
- [ ] `s5.decision4` — Formuler en eventuell fjerde avgjørelse i én linje, eller fjern feltet.

## Når innholdet er fylt inn

- Gjennomfør en prøveframføring på 7:30, med 30 sekunder buffer.
- Kontroller lesbarhet på projektor og at nye tekster og figurer passer i flatene.
- Behold skillet mellom referansebane og SSBs vurdering av framtiden; ikke erstatt vindusfunnet med en påstand om systematisk for smale intervaller.
- Kjør beregningstesten hvis motorens oppkobling eller datagrunnlaget endres, og gjenta offline-prøven før framføring.
- Fjern `show-placeholders` fra body når rammene skal skjules; behold merkingen som hackathon-arbeid.
