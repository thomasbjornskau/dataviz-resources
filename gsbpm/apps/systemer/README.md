# Systemer

Toveis utforsker som viser hvilke systemer som støtter de ulike delprosessene i GSBPM, og motsatt: hvilke delprosesser et gitt system inngår i.

## Hva appen viser

- Klikk på en **systemknapp** øverst for å se hvor det plasseres i diagrammet (som fargede ikoner på delprosessene)
- Klikk på en **delprosess-boks** for å se hvilke systemer som støtter den (i info-panelet under, og markert med rød ring på systemknappene over)
- Brukstype: **Helt** vises som fylt ikon, **Delvis** som dempet ikon med stripe-overlay
- Farge på ikoner og knapper følger systemkategori (Metadata = blå, Formidling = orange)
- Mouseover på et ikon i diagrammet viser alle detaljer: system, delprosess, fase, brukstype og merknad

## Datakilder

- `../../data/gsbpm.json` (kanonisk modell – kun lesing)
- `./data.json` (appspesifikk – systemer og deres koblinger til delprosesser)

## `data.json`-strukturen

```json
{
  "kategorier": {
    "<kategorinavn>": { "farge": "#hexkode" }
  },
  "systemer": [
    {
      "navn": "<systemnavn>",
      "kategori": "<kategorinavn>",
      "ikon": "<codicon-navn>",
      "beskrivelse": "<kort tekst>"
    }
  ],
  "koblinger": [
    {
      "system": "<systemnavn>",
      "steg": "<GSBPM-kode, f.eks. 5.2>",
      "brukstype": "Helt" | "Delvis",
      "beskrivelse": "<merknad>"
    }
  ]
}
```

## Oppdatere data

For å legge til en kobling: åpne `data.json`, finn `"koblinger"`-lista, og kopier én av de eksisterende. Endre `system`, `steg`, `brukstype` og `beskrivelse`. Husk komma mellom hvert objekt, men ikke etter det siste.

For å legge til et nytt system: legg det inn både i `"systemer"`-lista og i eventuelle nye `"koblinger"`. Hvis systemet hører til en ny kategori, legg også til kategorien i `"kategorier"`-blokken med en farge.

## Ikoner

Ikoner kommer fra [codicons](https://github.com/microsoft/vscode-codicons) (CC-BY 4.0, Microsoft) via [Iconify](https://iconify.design). Finn flere ikonnavn på [iconify.design/codicon](https://icon-sets.iconify.design/codicon/).

## Bruk

Åpne `index.html` via GitHub Pages, eller kjør lokalt med `python3 -m http.server` og besøk `localhost:8000/apps/systemer/`.
