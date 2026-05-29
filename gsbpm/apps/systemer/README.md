# Systemer

Toveis utforsker som viser hvilke systemer som støtter de ulike delprosessene i GSBPM, og motsatt: hvilke delprosesser et gitt system inngår i.

## Hva appen viser

- Klikk på en **systemknapp** øverst for å se hvor det plasseres i diagrammet (som fargede ikoner på delprosessene)
- Klikk på en **delprosess-boks** for å se hvilke systemer som støtter den (i info-panelet under, og markert med rød ring på systemknappene over)
- Brukstype: **Helt** vises som fylt ikon, **Delvis** som dempet ikon med stripe-overlay
- Farge på ikoner og knapper følger systemkategori (Metadata = blå, Formidling = orange)
- Mouseover på et ikon i diagrammet viser alle detaljer: system, delprosess, fase, brukstype og merknad

## Datakilder

- `../../data/gsbpm.json` – kanonisk modell, kun lesing
- `./data.json` – kategorier og systemer (sjelden endring)
- `./koblinger.xlsx` – koblinger mellom systemer og delprosesser (ofte endring)

## Vedlikehold

### Legge til en kobling

Åpne `koblinger.xlsx` i Excel og legg til en ny rad. Lagre. Commit til GitHub. Ferdig.

Kolonner i Excel-fila:

| Kolonne | Innhold | Eksempel |
|---|---|---|
| SYSTEMNAVN | Må matche et navn fra `data.json` | `Kudoc` |
| GSBPM_STEG | Kode for delprosess, f.eks. 5.2 | `5.2` |
| BRUKSTYPE | `Helt` eller `Delvis` | `Delvis` |
| BESKRIVELSE | Fri tekst, vises i mouseover og info-panel | `Brukes til metadatauttak` |

Rader hvor SYSTEMNAVN ikke finnes i `data.json` ignoreres ved lasting og logges som advarsel i nettleserens konsoll.

### Legge til et nytt system

Et nytt system må først legges inn i `data.json` (med navn, kategori, ikon og beskrivelse) før det kan brukes i Excel-fila. Hvis systemet hører til en ny kategori, legg også til kategorien i `data.json` med en farge.

### Endre kategori eller farge

Skjer i `data.json`. Gjelder med en gang appen lastes på nytt.

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
  ]
}
```

Koblinger ligger ikke her – de leses fra `koblinger.xlsx`.

## Ikoner

Ikoner kommer fra [codicons](https://github.com/microsoft/vscode-codicons) (CC-BY 4.0, Microsoft) via [Iconify](https://iconify.design). Finn flere ikonnavn på [iconify.design/codicon](https://icon-sets.iconify.design/codicon/).

## Bruk

Åpne via GitHub Pages, eller kjør lokalt med `python3 -m http.server` og besøk `localhost:8000/apps/systemer/`.

**Merk:** Excel-lesing krever en HTTP-server – nettlesere blokkerer `fetch()` fra `file://`-URL-er. Lokal testing direkte fra filsystem fungerer ikke.
