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

PERIODE = re.compile(r"^\s*(1[6-9]\d\d|20\d\d)\s*[-–]\s*(1[6-9]\d\d|20\d\d)\s*$")

def er_tall(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)

def les_ark(ws):
    rader = [list(r) for r in ws.iter_rows(values_only=True)]
    etikett = lambda r: (str(r[0]).strip() if r and r[0] is not None else "")
    første = next((i for i, r in enumerate(rader) if ÅR.match(etikett(r)) or PERIODE.match(etikett(r))), None)
    if første is None:
        varsle(f"{ws.title}: fant ingen rad med årstall eller periode i kolonne A")
        return None
    # datakolonner: kolonner med tall i dataradene
    bredde = max(len(r) for r in rader)
    for r in rader: r.extend([None] * (bredde - len(r)))
    hode = rader[første - 1] if første > 0 else [None] * bredde
    tittel, løse = None, 0
    for i, r in enumerate(rader):
        for j, v in enumerate(r):
            if isinstance(v, str) and len(v) > 25 and (tittel is None or len(v) > len(tittel)):
                tittel = v.strip()
    # finn siste datarad: rader etter første med tall i kolonne 1..
    datarader = []
    for i in range(første, len(rader)):
        r = rader[i]
        e = etikett(r)
        harTall = any(er_tall(v) for v in r[1:])
        if ÅR.match(e) or PERIODE.match(e) or (e == "" and harTall):
            datarader.append(i)
        elif e and not harTall:
            continue
    kol = [j for j in range(1, bredde)
           if any(er_tall(rader[i][j]) for i in datarader)
           and (hode[j] not in (None, "") or sum(er_tall(rader[i][j]) for i in datarader) > len(datarader) * 0.5)]
    # hopp over hjelpekolonner uten overskrift som bare inneholder 0
    kol = [j for j in kol if hode[j] not in (None, "") or any(er_tall(rader[i][j]) and rader[i][j] != 0 for i in datarader)]
    # etiketter: år, perioder, eller tomme (fylles ut mellom kjente år)
    år, start, verdier = [], [], {j: [] for j in kol}
    for i in datarader:
        e = etikett(rader[i])
        m = PERIODE.match(e)
        if m:
            år.append(int(m.group(2))); start.append(int(m.group(1)))
        elif ÅR.match(e):
            år.append(int(e)); start.append(None)
        else:
            år.append(None); start.append(None)
        for j in kol:
            v = rader[i][j]
            if v is not None and not er_tall(v):
                varsle(f"{ws.title}: ikke-tall «{str(v)[:40]}» i {hode[j]!r} – satt til tom")
                v = None
            verdier[j].append(None if v is None else round(float(v), 4))
        for j in range(1, bredde):
            v = rader[i][j]
            if j not in kol and v not in (None, "") and not (isinstance(v, str) and len(v) > 25):
                løse += 1
    # kontroll før utfylling: avstanden mellom kjente etiketter må stemme med antall rader
    kjente = [(k, a) for k, a in enumerate(år) if a is not None]
    for (k1, a1), (k2, a2) in zip(kjente, kjente[1:]):
        if k2 - k1 > 1 and a2 - a1 != k2 - k1:
            varsle(f"{ws.title}: {k2 - k1 - 1} rader uten årstall mellom {a1} og {a2} stemmer ikke med årsavstanden")
    # fyll ut år uten etikett
    utfylt = 0
    for k in range(len(år)):
        if år[k] is None:
            forrige = next((q for q in range(k - 1, -1, -1) if år[q] is not None), None)
            if forrige is not None:
                år[k] = år[forrige] + (k - forrige); utfylt += 1
    if None in år:
        varsle(f"{ws.title}: rader uten årstall før første etikett – utelatt")
        behold = [k for k, a in enumerate(år) if a is not None]
        år = [år[k] for k in behold]; start = [start[k] for k in behold]
        verdier = {j: [v[k] for k in behold] for j, v in verdier.items()}
    if any(b <= a for a, b in zip(år, år[1:])):
        varsle(f"{ws.title}: årstallene er ikke stigende etter utfylling – sjekk arket")
    if utfylt:
        varsle(f"{ws.title}: {utfylt} rader uten årstall fylt ut mellom etikettene (hvert 5. år er merket i arket)")
    if løse:
        varsle(f"{ws.title}: {løse} løse celler utenfor datakolonnene ignorert")
    navn = {j: (str(hode[j]).strip() if hode[j] not in (None, "") else "") for j in kol}
    return {"år": år, "periodestart": start if any(start) else None, "hode": navn,
            "verdier": verdier, "arktittel": tittel}

def main():
    katalog = json.loads((ROT / "data/katalog.json").read_text("utf-8"))
    figurer = json.loads((ROT / "data/figurer.json").read_text("utf-8"))
    emner = json.loads((ROT / "data/emner.json").read_text("utf-8"))
    epoker = json.loads((ROT / "data/epoker.json").read_text("utf-8"))
    kat = {k["id"]: k for k in katalog}

    kobling = {}
    kp = ROT / "data/arkkobling.json"
    if kp.exists():
        kobling = {k: v for k, v in json.loads(kp.read_text("utf-8")).items() if not k.startswith("_")}
    ark = {}
    for fil in sorted(glob.glob(str(ROT / "excel/*.xlsx"))):
        wb = openpyxl.load_workbook(fil, data_only=True)
        for ws in wb.worksheets:
            fid = ws.title.strip().rstrip(".")
            nøkkel = f"{os.path.basename(fil)}:{fid}"
            if nøkkel in kobling:
                varsle(f"{nøkkel}: koblet til figur {kobling[nøkkel]} (se data/arkkobling.json)")
                fid = kobling[nøkkel]
            if fid in ark:
                varsle(f"{fid}: finnes i flere filer, bruker {os.path.basename(fil)}")
            d = les_ark(ws)
            if d:
                d["fil"] = os.path.basename(fil); d["ark"] = ws.title
                ark[fid] = d

    indikatorer = []
    for k in katalog:
        fid = k["id"]
        cfg = json.loads(json.dumps(figurer.get(fid, {})))
        if "serier" in cfg: cfg["serier"] = {k.strip(): v for k, v in cfg["serier"].items()}
        if "samme_farge" in cfg: cfg["samme_farge"] = [[x.strip() for x in g] for g in cfg["samme_farge"]]
        for m_ in cfg.get("merknader", []): m_["serie"] = m_["serie"].strip()
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
            if cfg.get("type"):
                typ = cfg["type"]
            elif a["periodestart"]:
                typ = "periode"
            elif steg == [1]:
                typ = "aar"
            elif re.search(r"5-år", k["tittel"]) or (set(steg) <= {4, 5, 6} and 1939 in år and 1945 in år):
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
                serier.append({"id": h, "navn": navn.get(h, (h.strip()[:1].upper() + h.strip()[1:]) or "Verdi"),
                               "rolle": rolle, "gruppe": gruppe, "v": v})
            # periodestart for femårsperioder: verdien for år t gjelder (forrige t) til t
            start = None
            if typ == "periode":
                start = a["periodestart"] or ([år[0] - 5] + år[:-1])
            ind.update({"harData": True, "type": typ, "år": år, "periodeStart": start,
                        "serier": serier, "fra": (start[0] if start else år[0]), "til": år[-1], "periodekilde": "data",
                        "kilde": f"{a['fil']}, ark {a['ark']}", "tallart": cfg.get("tallart")})
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
            if cfg.get("stabel"):
                stb = {"total": cfg["stabel"]["total"].strip(), "deler": [x.strip() for x in cfg["stabel"]["deler"]]}
                mangler = [x for x in [stb["total"]] + stb["deler"] if x not in ids]
                if mangler:
                    varsle(f"{fid}: stabel viser til ukjente serier {mangler} – stabling slått av")
                else:
                    tot = next(x for x in serier if x["id"] == stb["total"])
                    dl = [next(x for x in serier if x["id"] == d) for d in stb["deler"]]
                    avvik, neg = 0.0, False
                    for k_, t_ in enumerate(tot["v"]):
                        vals = [d_["v"][k_] for d_ in dl]
                        if any(v_ is not None and v_ < 0 for v_ in vals): neg = True
                        if t_ in (None, 0) or all(v_ is None for v_ in vals): continue
                        avvik = max(avvik, abs(sum(v_ or 0 for v_ in vals) - t_) / abs(t_))
                    stb["avvik"] = round(avvik * 100, 2)
                    if neg:
                        varsle(f"{fid}: stabel har negative verdier – stabling slått av"); stb = None
                    elif avvik > 0.005:
                        varsle(f"{fid}: delene avviker fra totalen med opptil {avvik*100:.1f} prosent")
                    if stb: ind["stabel"] = stb
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
