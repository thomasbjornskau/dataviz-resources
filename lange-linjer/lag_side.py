#!/usr/bin/env python3
"""
Lange linjer – byggeskript.

Leser alle .xlsx-filer i excel/ (ett faneark per figur, fanenavn = figurnummer),
slår dem sammen med data/katalog.json, data/figurer.json, data/emner.json og
data/epoker.json, validerer, og skriver index.html fra mal.html.

Krever Python 3.9+ og openpyxl (pip install openpyxl).
Kjør:  python3 lag_side.py
"""
import json, re, sys, glob, os
from pathlib import Path
import openpyxl

ROT = Path(__file__).parent
ÅR = re.compile(r"^\s*(1[6-9]\d\d|20\d\d)\s*$")
advarsler = []

def varsle(msg):
    advarsler.append(msg)

def les_ark(ws):
    rader = list(ws.iter_rows(values_only=True))
    første = next((i for i, r in enumerate(rader) if r and r[0] is not None and ÅR.match(str(r[0]))), None)
    if første is None or første == 0:
        varsle(f"{ws.title}: fant ingen årsrad")
        return None
    hode = rader[første - 1]
    kol = [j for j in range(1, len(hode)) if hode[j] not in (None, "")]
    år, verdier = [], {j: [] for j in kol}
    tittel = None
    for i, r in enumerate(rader):
        # løs tekstcelle som ser ut som tittel (lengste tekst utenfor datakolonnene)
        for j, v in enumerate(r):
            if isinstance(v, str) and len(v) > 25 and (j not in kol or i < første - 1):
                if tittel is None or len(v) > len(tittel):
                    tittel = v.strip()
        if i < første or not r or r[0] is None or not ÅR.match(str(r[0])):
            continue
        år.append(int(str(r[0]).strip()))
        for j in kol:
            v = r[j] if j < len(r) else None
            if v is not None and not isinstance(v, (int, float)):
                varsle(f"{ws.title}: ikke-tall «{v}» i {hode[j]!r} {år[-1]} – satt til tom")
                v = None
            verdier[j].append(None if v is None else round(float(v), 4))
        for j, v in enumerate(r):
            if j > 0 and j not in kol and v not in (None, "") and not (isinstance(v, str) and len(v) > 25):
                varsle(f"{ws.title}: løs celle «{v}» ved {år[-1]} ignorert")
    return {"år": år, "hode": {j: str(hode[j]) for j in kol}, "verdier": verdier, "arktittel": tittel}

def main():
    katalog = json.loads((ROT / "data/katalog.json").read_text("utf-8"))
    figurer = json.loads((ROT / "data/figurer.json").read_text("utf-8"))
    emner = json.loads((ROT / "data/emner.json").read_text("utf-8"))
    epoker = json.loads((ROT / "data/epoker.json").read_text("utf-8"))
    kat = {k["id"]: k for k in katalog}

    ark = {}
    for fil in sorted(glob.glob(str(ROT / "excel/*.xlsx"))):
        wb = openpyxl.load_workbook(fil, data_only=True)
        for ws in wb.worksheets:
            fid = ws.title.strip().rstrip(".")
            if fid in ark:
                varsle(f"{fid}: finnes i flere filer, bruker {os.path.basename(fil)}")
            d = les_ark(ws)
            if d:
                d["fil"] = os.path.basename(fil)
                ark[fid] = d

    indikatorer = []
    for k in katalog:
        fid = k["id"]
        cfg = figurer.get(fid, {})
        ind = {
            "id": fid, "emne": k["emne"], "tittel": k["tittel"], "side": k["side"],
            "kort": cfg.get("kort"), "enhet": cfg.get("enhet"),
            "fra": k["fra"], "til": k["til"], "periodekilde": k["periodekilde"],
            "harData": False,
        }
        if fid in ark:
            a = ark[fid]
            år = a["år"]
            steg = sorted(set(b - a_ for a_, b in zip(år, år[1:])))
            if steg == [1]:
                typ = "aar"
            elif re.search(r"5-år", k["tittel"]):
                typ = "periode"
            else:
                typ = "telling"
            navn = cfg.get("serier", {})
            samme = cfg.get("samme_farge", [])
            serier = []
            for j, h in a["hode"].items():
                v = a["verdier"][j]
                ikketom = [x for x in v if x is not None]
                if not ikketom:
                    varsle(f"{fid}: serien {h!r} er tom – utelatt")
                    continue
                if len(set(ikketom)) == 1 and len(ikketom) > 3:
                    rolle = "referanse"
                elif "trend" in h.lower() and len(a["hode"]) > 1:
                    rolle = "trend"
                else:
                    rolle = "serie"
                gruppe = next((g[0] for g in samme if h in g), h)
                serier.append({"id": h, "navn": navn.get(h, h.strip()[:1].upper() + h.strip()[1:]),
                               "rolle": rolle, "gruppe": gruppe, "v": v})
            # periodestart for femårsperioder: verdien for år t gjelder (forrige t) til t
            start = None
            if typ == "periode":
                start = [år[0] - 5] + år[:-1]
            ind.update({"harData": True, "type": typ, "år": år, "periodeStart": start,
                        "serier": serier, "fra": år[0], "til": år[-1], "periodekilde": "data",
                        "kilde": f"{a['fil']}, ark {fid}"})
            if not cfg:
                varsle(f"{fid}: har tall, men mangler redaksjonell konfig i figurer.json")
            # valider merknader
            ids = {s["id"] for s in serier}
            ok = []
            for m in cfg.get("merknader", []):
                if m["serie"] not in ids:
                    varsle(f"{fid}: merknad viser til ukjent serie {m['serie']!r}")
                    continue
                s = next(s for s in serier if s["id"] == m["serie"])
                if m["type"] == "punkt":
                    if m["ar"] not in år or s["v"][år.index(m["ar"])] is None:
                        varsle(f"{fid}: merknad-år {m['ar']} har ingen verdi i {m['serie']!r}")
                        continue
                ok.append(m)
            ind["merknader"] = ok
            ind["skjot"] = cfg.get("skjot", [])
            ind["fotnote"] = cfg.get("fotnote")
        else:
            if fid in figurer:
                varsle(f"{fid}: konfig finnes, men ingen Excel-ark")
        indikatorer.append(ind)

    for fid in ark:
        if fid not in kat:
            varsle(f"{fid}: Excel-ark uten motstykke i katalogen – ignorert")

    bunt = {"emner": emner, "epoker": epoker, "indikatorer": indikatorer}
    mal = (ROT / "mal.html").read_text("utf-8")
    js = json.dumps(bunt, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html = mal.replace("__DATA__", js)
    ut = ROT / "index.html"
    ut.write_text(html, "utf-8")

    med = sum(1 for i in indikatorer if i["harData"])
    print(f"Skrev {ut.name}: {len(indikatorer)} indikatorer, {med} med tall, {len(html)//1024} kB")
    if advarsler:
        print(f"\n{len(advarsler)} merknader fra valideringen:")
        for a in advarsler:
            print("  -", a)

if __name__ == "__main__":
    main()
