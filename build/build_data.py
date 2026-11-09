"""Ndërton data/report.json për faqen nga depoja e të dhënave dhe raporti PBIP.

Përdorimi:  python build/build_data.py [dosja e depos zgjedhjet-shqiperi]

Lexon:
  data/kuvend-2025/raw/*.json        rezultatet e KQZ-së sipas QV-së, qarkut dhe vendit
  data/popullsia/popullsia_2025_qarqe.json
  data/krahasime/*.csv               lëvizshmëria 2021-2023-2025, krahasimi 2023-2025
  data/gjeografi/*.topojson          kufijtë e njësive të Tiranës dhe Vlorës
  powerbi/Zgjedhjet-Shqiperi.Report  faqet, pozicionet, titujt dhe tekstet e vizualeve

Të dhënat nuk ndryshohen me dorë. Skripti ndalon nëse totalet nuk përputhen me KQZ-në.
"""
import csv
import json
import math
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / "zgjedhjet-shqiperi"
DATA = SRC / "data"
REPORT = SRC / "powerbi" / "Zgjedhjet-Shqiperi.Report" / "definition"
OUT = ROOT / "data" / "report.json"

KQZ_VALID_2025 = 1_606_057
KQZ_SEATS = 140


def dec(s):
    """HTML entities në tekstet e KQZ-së, si në Power Query."""
    return (s.replace("&Euml;", "Ë").replace("&euml;", "ë")
             .replace("&Ccedil;", "Ç").replace("&ccedil;", "ç"))


def proper(s):
    """Text.Proper i Power Query: shkronja e parë e çdo fjale e madhe, të tjerat të vogla."""
    out, prev_letter = [], False
    for ch in s:
        out.append(ch.lower() if prev_letter else ch.upper())
        prev_letter = ch.isalpha()
    return "".join(out)


def nja_name(s):
    return s.replace("Njësia Administrative", "Nj.Ad.").replace("NjA ", "Nj.Ad. ").strip()


def party_name(p):
    return {"BASHKE": "L. BASHKE", "PD-ASHM": "PD"}.get(p, p)


def load_json(p):
    return json.loads(Path(p).read_text(encoding="utf-8"))


def read_csv(p):
    with open(p, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


# ---------------------------------------------------------------- partitë
SMALL = {"ADR", "AKSH", "DZH", "KEA", "LA"}
PRIORITY = ["PS", "PD", "PSD", "MUNDESIA", "NISMA-SHB", "L. BASHKE"]

ps_json = load_json(DATA / "kuvend-2025/raw/polling_station_party_results.json")
qv_raw, votes_raw = ps_json["data_main"][0]["data"], ps_json["data_main"][1]["data"]

orig_order = {}
for r in votes_raw:
    orig_order.setdefault(party_name(r["v3"]), int(r["v2"]))
parties = sorted(orig_order, key=lambda p: (PRIORITY.index(p) if p in PRIORITY else 100 + orig_order[p]))
P = {p: i for i, p in enumerate(parties)}


def grupi(p):
    return "PS + PSD" if p in ("PS", "PSD") else ("Te tjeret" if p in SMALL else p)


def detajuar(p):
    return "Te tjeret" if p in SMALL else p


def skenar(p):
    if p in ("NISMA-SHB", "MUNDESIA", "L. BASHKE"):
        return "Grupimi SHESHIT"
    return grupi(p)


# ---------------------------------------------------------------- qendrat e votimit
reg = load_json(DATA / "kuvend-2025/raw/regional_party_results.json")["data_main"]
pop = {r["Qarku"]: r for r in load_json(DATA / "popullsia/popullsia_2025_qarqe.json")["data"]}

rows = []
for r in qv_raw:
    rows.append(dict(
        qarku=dec(r["v1"]), bashkia=proper(dec(r["v2"])), nja=nja_name(proper(dec(r["v3"]))),
        qv=r["v5"], lista=int(r["v6"]), listaW=int(r["v7"]), vot=int(r["v8"]), votW=int(r["v9"]),
        valid=int(r["v10"]), invalid=int(r["v11"]), dia=False))
for r in reg[0]["data"]:
    q = dec(r["v1"]).upper()
    rows.append(dict(qarku=q, bashkia="Diaspora", nja="Diaspora", qv="DIA-" + q,
                     lista=int(r["v40"]), listaW=int(r["v41"]), vot=int(r["v42"]), votW=int(r["v43"]),
                     valid=int(r["v10_1"]), invalid=int(r["v11_1"]), dia=True))

# zgjedhësit rezidentë: shtetasit 18+ të qarkut, shpërndarë sipas listës (si në modelin Power BI)
lq, lqw = {}, {}
for r in rows:
    if not r["dia"]:
        lq[r["qarku"]] = lq.get(r["qarku"], 0) + r["lista"]
        lqw[r["qarku"]] = lqw.get(r["qarku"], 0) + r["listaW"]
for r in rows:
    if r["dia"]:
        r["res"] = r["resW"] = 0.0
    else:
        p = pop[r["qarku"]]
        r["res"] = r["lista"] * p["Shtetas_18plus"] / lq[r["qarku"]]
        r["resW"] = r["listaW"] * p["Shtetas_femra_18plus"] / lqw[r["qarku"]]

qv_index = {r["qv"]: i for i, r in enumerate(rows)}
assert len(qv_index) == len(rows), "kode QV të përsëritura"

votes = [[0] * len(parties) for _ in rows]
for r in votes_raw:
    votes[qv_index[r["v1"]]][P[party_name(r["v3"])]] += int(r["v5"])
for r in reg[1]["data"]:
    votes[qv_index["DIA-" + dec(r["v1"]).upper()]][P[party_name(r["v3"])]] += int(r["v5_1"])

# ---------------------------------------------------------------- kontrollet me KQZ-në
nat = load_json(DATA / "kuvend-2025/raw/national_party_results.json")["data_main"]
total_votes = sum(map(sum, votes))
total_valid = sum(r["valid"] for r in rows)
assert total_votes == KQZ_VALID_2025, f"votat e partive {total_votes:,} != {KQZ_VALID_2025:,}"
assert total_valid == KQZ_VALID_2025, f"votat e vlefshme {total_valid:,} != {KQZ_VALID_2025:,}"
assert int(nat[0]["data"][0]["v10_2"]) == KQZ_VALID_2025
for r in nat[1]["data"]:
    p = P[party_name(r["v3"])]
    got = sum(v[p] for v in votes)
    assert got == int(r["v5_2"]), f"{r['v3']}: {got} != {r['v5_2']}"
for i, r in enumerate(rows):
    assert sum(votes[i]) == r["valid"], f"QV {r['qv']}: votat e partive != votat e vlefshme"

# mandatet sipas qarkut
qarqe = sorted({r["qarku"] for r in rows})
Q = {q: i for i, q in enumerate(qarqe)}
seats = [[0] * len(parties) for _ in qarqe]
for r in reg[1]["data"]:
    seats[Q[dec(r["v1"]).upper()]][P[party_name(r["v3"])]] = int(r["v6"] or 0)
assert sum(map(sum, seats)) == KQZ_SEATS, "mandatet != 140"
for r in nat[1]["data"]:
    assert sum(s[P[party_name(r["v3"])]] for s in seats) == int(r["v6"] or 0), f"mandatet e {r['v3']}"

# ---------------------------------------------------------------- gjeografia (indekse)
bashki = sorted({(r["qarku"], r["bashkia"]) for r in rows}, key=lambda t: (t[0], t[1]))
B = {t: i for i, t in enumerate(bashki)}
njesi = sorted({(r["qarku"], r["bashkia"], r["nja"]) for r in rows})
N = {t: i for i, t in enumerate(njesi)}
nja_by_bn = {}
for (q, b, n), i in N.items():
    nja_by_bn.setdefault((b, n), []).append(i)

order = sorted(range(len(rows)), key=lambda i: (rows[i]["qarku"], rows[i]["bashkia"], rows[i]["nja"], rows[i]["qv"]))
rows = [rows[i] for i in order]
votes = [votes[i] for i in order]

# ---------------------------------------------------------------- lëvizshmëria
LEV_GROUPS = ["PS", "PSD", "PD", "NISMA-SHB", "MUNDESIA", "BASHKE", "Te tjeret"]
lev = []
for r in read_csv(DATA / "krahasime/levizshmeria_vota_2021_2023_2025.csv"):
    key = (r["Bashkia"], nja_name(r["Njesia administrative"]))
    ids = nja_by_bn.get(key)
    assert ids and len(ids) == 1, f"njësia e lëvizshmërisë pa përputhje: {key}"
    lev.append([int(r["Viti"]), ids[0], LEV_GROUPS.index(r["Grupi"]), int(r["Vota"])])


def pedersen(sel, ya, yb):
    a, b = [0] * 7, [0] * 7
    for y, n, g, v in lev:
        if n in sel:
            if y == ya:
                a[g] += v
            elif y == yb:
                b[g] += v
    ta, tb = sum(a), sum(b)
    if not (ta and tb):
        return None, None
    tot = 50 * sum(abs(b[i] / tb - a[i] / ta) for i in range(7))
    new = 50 * sum(b[i] / tb for i in range(7) if a[i] == 0)
    return tot, new


# kontroll: indeksi i llogaritur këtu = levizshmeria_pedersen.csv (të gjitha nivelet)
checked = 0
for r in read_csv(DATA / "krahasime/levizshmeria_pedersen.csv"):
    ya, yb = map(int, r["Krahasimi"].split("-"))
    lvl = r["Niveli"]
    if lvl == "Shqipëria":
        sel = {n for _, n, _, _ in lev}
    elif lvl == "Qarku":
        sel = {i for (q, b, n), i in N.items() if q == r["Qarku"]}
    elif lvl == "Bashkia":
        sel = {i for (q, b, n), i in N.items() if b == r["Bashkia"] and q == r["Qarku"]}
    else:
        sel = set(nja_by_bn[(r["Bashkia"], nja_name(r["Njesia administrative"]))])
    tot, new = pedersen(sel, ya, yb)
    if r["Pedersen"] == "":
        continue
    assert tot is not None and abs(tot - float(r["Pedersen"])) < 0.051, f"Pedersen {r}: {tot}"
    assert abs(new - float(r["Nga subjektet e reja"])) < 0.051, f"Pedersen të rinjtë {r}: {new}"
    checked += 1
assert checked > 1300, f"u kontrolluan vetëm {checked} vlera Pedersen"

# ---------------------------------------------------------------- krahasimi 2023-2025
CITY_TOTALS_2025 = {"Tiranë": 340_301, "Vlorë": 49_636}
krah = []
for city, fname in (("Tiranë", "tirane"), ("Vlorë", "vlore")):
    for r in read_csv(DATA / f"krahasime/krahasimi_{fname}_2023_2025.csv"):
        ids = nja_by_bn.get((city, nja_name(r["Njesia administrative"])))
        assert ids, f"krahasimi: njësi e panjohur {r['Njesia administrative']}"
        krah.append([int(r["Viti"]), ids[0], party_name(r["Grupi"]), party_name(r["Grupi i detajuar"]), int(r["Vota"])])
    k25 = sum(v for y, n, g, d, v in krah if y == 2025 and njesi[n][1] == city)
    qv25 = sum(sum(votes[i]) for i, r in enumerate(rows) if r["bashkia"] == city)
    assert k25 == qv25 == CITY_TOTALS_2025[city], f"{city} 2025: {k25} / {qv25}"

# ---------------------------------------------------------------- hartat
def topo_paths(path, bashkia):
    t = load_json(path)
    tr = t.get("transform")
    arcs = []
    for arc in t["arcs"]:
        pts, x, y = [], 0, 0
        for p in arc:
            if tr:
                x, y = x + p[0], y + p[1]
                pts.append((x * tr["scale"][0] + tr["translate"][0], y * tr["scale"][1] + tr["translate"][1]))
            else:
                pts.append((p[0], p[1]))
        arcs.append(pts)

    def ring(idx):
        out = []
        for a in idx:
            pts = arcs[a] if a >= 0 else arcs[~a][::-1]
            out.extend(pts if not out else pts[1:])
        return out

    geoms = list(t["objects"].values())[0]["geometries"]
    polys = {}
    for g in geoms:
        rings = [ring(r) for r in g["arcs"]] if g["type"] == "Polygon" else [ring(r) for poly in g["arcs"] for r in poly]
        polys[nja_name(g["id"])] = rings
    allp = [p for rs in polys.values() for r in rs for p in r]
    lat0 = math.radians(sum(p[1] for p in allp) / len(allp))
    xs = [p[0] * math.cos(lat0) for p in allp]
    ys = [-p[1] for p in allp]
    minx, miny = min(xs), min(ys)
    w, h = max(xs) - minx, max(ys) - miny
    s = 1000 / max(w, h)
    out = {}
    for name, rs in polys.items():
        assert (bashkia, name) in nja_by_bn, f"harta: {name} nuk gjendet te {bashkia}"
        d = ""
        for r in rs:
            pts = [((p[0] * math.cos(lat0) - minx) * s, (-p[1] - miny) * s) for p in r]
            d += "M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + "Z"
        out[name] = d
    return {"w": round(w * s, 1), "h": round(h * s, 1), "paths": out}


maps = {
    "Tiranë": topo_paths(DATA / "gjeografi/tirana_njesite_administrative.topojson", "Tiranë"),
    "Vlorë": topo_paths(DATA / "gjeografi/vlore_njesite_administrative.topojson", "Vlorë"),
}
for city, m in maps.items():
    units = {n for (q, b, n) in njesi if b == city}
    assert set(m["paths"]) == units, f"harta e {city}: {set(m['paths']) ^ units}"

# ---------------------------------------------------------------- faqet nga PBIP
def slug(s):
    s = unicodedata.normalize("NFKD", s.replace("ë", "e").replace("Ë", "E").replace("ç", "c").replace("Ç", "C"))
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def text_runs(v):
    paras = []
    for p in v.get("objects", {}).get("general", [{}])[0].get("properties", {}).get("paragraphs", []):
        runs = []
        for tr in p.get("textRuns", []):
            st = tr.get("textStyle", {})
            runs.append({"t": tr.get("value", ""), "b": st.get("fontWeight") == "bold",
                         "s": float((re.findall(r"[0-9.]+", st.get("fontSize", "")) or ["0"])[0])})
        paras.append(runs)
    return paras


def title_of(v):
    try:
        return v["visualContainerObjects"]["title"][0]["properties"]["text"]["expr"]["Literal"]["Value"].strip("'")
    except (KeyError, IndexError):
        return ""


pages_meta = load_json(REPORT / "pages/pages.json")
pages = []
for pid in pages_meta["pageOrder"]:
    pj = load_json(REPORT / f"pages/{pid}/page.json")
    visuals = []
    for vf in sorted((REPORT / f"pages/{pid}/visuals").glob("*/visual.json")):
        d = load_json(vf)
        v = d.get("visual", {})
        pos = d.get("position", {})
        item = {"id": d["name"], "type": v.get("visualType", "group"), "title": title_of(v),
                "x": round(pos.get("x", 0)), "y": round(pos.get("y", 0)),
                "w": round(pos.get("width", 0)), "h": round(pos.get("height", 0))}
        if item["type"] == "textbox":
            item["text"] = text_runs(v)
        visuals.append(item)
    visuals.sort(key=lambda x: (x["y"], x["x"]))
    pages.append({"id": pid, "name": pj["displayName"], "slug": slug(pj["displayName"]),
                  "w": pj.get("width", 1920), "h": pj.get("height", 1080),
                  "hidden": pj.get("visibility") == "HiddenInViewMode", "visuals": visuals})

# ---------------------------------------------------------------- shkruaj
def col(key, nd=None):
    return [round(r[key], nd) if nd is not None else r[key] for r in rows]


out = {
    "meta": {
        "burimi": "KQZ: Kuvendi 2021 dhe 2025, vendore 2023; INSTAT: popullsia 2025; OpenStreetMap: kufijtë",
        "votat_e_vlefshme_2025": KQZ_VALID_2025, "mandate": KQZ_SEATS,
    },
    "parties": [{"id": p, "grupi": grupi(p), "det": detajuar(p), "skenar": skenar(p)} for p in parties],
    "qarqe": qarqe,
    "bashki": [[b, Q[q]] for q, b in bashki],
    "njesi": [[n, B[(q, b)]] for q, b, n in njesi],
    "qv": {
        "kodi": col("qv"),
        "nja": [N[(r["qarku"], r["bashkia"], r["nja"])] for r in rows],
        "lista": col("lista"), "listaW": col("listaW"), "vot": col("vot"), "votW": col("votW"),
        "valid": col("valid"), "invalid": col("invalid"),
        "res": col("res", 2), "resW": col("resW", 2), "dia": [1 if r["dia"] else 0 for r in rows],
    },
    "votes": [v for row in votes for v in row],
    "seats": seats,
    "lev": {"groups": LEV_GROUPS, "rows": lev},
    "krah": krah,
    "maps": maps,
    "pages": pages,
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"OK: {OUT} ({OUT.stat().st_size / 1024:.0f} KB), {len(rows)} QV, {len(parties)} parti, "
      f"{total_votes:,} vota, {sum(map(sum, seats))} mandate, {checked} vlera Pedersen të kontrolluara, "
      f"{len(pages)} faqe")
