"""TerraTwin - full dataset scraper (Earth grid + Mars grid + Moon south-pole grid).

Every endpoint and file format below was checked live on 2026-11-13.
Run:   pip install requests
       python scrape_all.py                # everything (about 20-30 min)
       python scrape_all.py earth          # or: sites | mars | mcd | moon | targets
Output goes to ./data/*.csv ; partial downloads are cached in ./raw/ so a rerun resumes.
"""
import array
import csv
import json
import math
import pathlib
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor

import requests

HERE = pathlib.Path(__file__).resolve().parent
DATA, RAW = HERE / "data", HERE / "raw"
S = requests.Session()
S.headers["User-Agent"] = "TerraTwin-SpaceApps/1.0"
PDS = "https://pds-geosciences.wustl.edu"
MONTHS = "JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC".split()


def get(url, tries=5, wait=3, **kw):
    for k in range(tries):
        try:
            r = S.get(url, timeout=120, **kw)
            if r.status_code in (200, 206):
                return r
            time.sleep(60 if r.status_code == 429 else wait * (k + 1))
        except requests.RequestException:
            time.sleep(wait * (k + 1))
    raise RuntimeError(f"failed: {url[:120]}")


def write_csv(name, header, rows):
    DATA.mkdir(exist_ok=True)
    with open(DATA / name, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)
    print(f"  wrote data/{name}: {len(rows)} rows")


def cache_json(name, fn):
    RAW.mkdir(exist_ok=True)
    p = RAW / name
    if p.exists():
        return json.loads(p.read_text())
    v = fn()
    p.write_text(json.dumps(v))
    return v


# =============================================================== EARTH
POWER_PARAMS = ("T2M,T2M_MAX,T2M_MIN,T2M_RANGE,TS,PRECTOTCORR,RH2M,QV2M,WS2M,PS,"
                "ALLSKY_SFC_SW_DWN,ALLSKY_KT,ALLSKY_SRF_ALB")
EARTH_COLS = ["t_mean_c", "t_max_c", "t_min_c", "t_seasonal_range_c", "t_diurnal_range_c",
              "t_surface_c", "precip_mm_year", "rel_humidity_pct", "spec_humidity_g_kg",
              "wind_m_s", "pressure_kpa", "solar_kwh_m2_day", "clearness_index", "albedo",
              "power_grid_elev_m", "elevation_m", "relief_m", "slope_deg"]


def elevations(points):
    """OpenTopoData 'mapzen' DEM (global, includes sea floor as negative). 100 points/call, 1 call/s."""
    out = []
    for i in range(0, len(points), 100):
        b = points[i:i + 100]
        loc = "|".join(f"{max(-89.99, min(89.99, p[0])):.4f},{(p[1] + 180) % 360 - 180:.4f}" for p in b)
        r = get("https://api.opentopodata.org/v1/mapzen", params={"locations": loc})
        out += [x["elevation"] for x in r.json()["results"]]
        time.sleep(1.1)
    return out


def power_point(lat, lon):
    def fetch():
        j = get("https://power.larc.nasa.gov/api/temporal/climatology/point", params={
            "parameters": POWER_PARAMS, "community": "RE", "latitude": lat,
            "longitude": lon, "format": "JSON"}).json()
        return {"elev": j["geometry"]["coordinates"][2], "p": j["properties"]["parameter"]}
    return cache_json(f"power_{lat}_{lon}.json", fetch)


def earth_features(points):
    """points: list of (lat, lon). Returns one feature list (EARTH_COLS order) per point."""
    with ThreadPoolExecutor(3) as ex:
        pw = list(ex.map(lambda p: power_point(*p), points))
    ring = []
    for la, lo in points:
        dlat, dlon = 1 / 111.32, 1 / (111.32 * max(math.cos(math.radians(la)), 0.05))
        ring += [(la + i * dlat, lo + j * dlon) for i in (-1, 0, 1) for j in (-1, 0, 1)]
    ev = elevations(ring)
    rows = []
    for k, d in enumerate(pw):
        p = d["p"]
        ok = lambda v: None if v is None or v <= -900 else v
        ann = lambda n: ok(p[n]["ANN"])
        t = [v for v in (ok(p["T2M"][m]) for m in MONTHS) if v is not None]
        e = ev[k * 9:k * 9 + 9]
        c = e[4]
        sl = [math.degrees(math.atan(abs(v - c) / (1000 * math.hypot(q // 3 - 1, q % 3 - 1))))
              for q, v in enumerate(e) if q != 4]
        rain = ann("PRECTOTCORR")
        rows.append([ann("T2M"), ann("T2M_MAX"), ann("T2M_MIN"), round(max(t) - min(t), 2),
                     ann("T2M_RANGE"), ann("TS"), None if rain is None else round(rain * 365.25, 1),
                     ann("RH2M"), ann("QV2M"), ann("WS2M"), ann("PS"), ann("ALLSKY_SFC_SW_DWN"),
                     ann("ALLSKY_KT"), ann("ALLSKY_SRF_ALB"), d["elev"], c,
                     max(e) - min(e), round(sum(sl) / 8, 3)])
    return rows


def earth_grid(step=5):
    print("Earth grid")
    pts = [(la, lo) for la in range(-85, 86, step) for lo in range(-180, 180, step)]
    el = cache_json(f"landmask_{step}.json", lambda: elevations(pts))
    land = [p for p, e in zip(pts, el) if e is not None and e > 0]    # <= 0 is ocean
    print(f"  {len(land)} land points of {len(pts)}")
    rows = earth_features(land)
    write_csv("earth_grid_features.csv", ["lat", "lon"] + EARTH_COLS,
              [list(p) + r for p, r in zip(land, rows)])


def earth_sites():
    print("Earth named sites")
    sites = list(csv.DictReader(open(HERE / "sites_earth.csv", encoding="utf-8")))
    rows = earth_features([(float(s["lat"]), float(s["lon"])) for s in sites])
    write_csv("earth_features.csv", list(sites[0]) + EARTH_COLS,
              [list(s.values()) + r for s, r in zip(sites, rows)])


# ================================================================ MARS
def mars_grid():
    """5-degree cells: MOLA terrain (16 px/deg map) + Odyssey GRS element maps."""
    print("Mars 5-degree grid (MOLA + GRS)")
    RAW.mkdir(exist_ok=True)
    f = RAW / "megt90n000eb.img"
    if not f.exists():
        f.write_bytes(get(PDS + "/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg016/megt90n000eb.img").content)
    a = array.array("h", f.read_bytes())
    a.byteswap()                                   # file is big-endian int16
    W, H = 5760, 2880
    E = lambda l, s: a[min(max(l, 0), H - 1) * W + s % W]
    grs = {}
    for el in ("h2o", "fe", "si", "k", "th", "cl"):
        t = get(f"{PDS}/ody/ody-m-grs-5-elements-v1/odgm_xxxx/data/smoothed/{el}_sr_5x5.tab").text
        grs[el] = {(float(p[0]), float(p[1])): float(p[2]) for p in (r.split() for r in t.splitlines())
                   if len(p) >= 3 and float(p[2]) < 9000}
    px = 3396000 * math.pi / 180 / 16
    rows = []
    for i in range(36):
        la = -87.5 + 5 * i
        cosl = max(math.cos(math.radians(la)), 0.02)
        for j in range(72):
            lo = 2.5 + 5 * j
            l0, s0 = round((90 - la - 2.5) * 16), round((lo - 2.5) * 16)
            v, sl = [], []
            for l in range(l0, l0 + 80, 2):
                for s in range(s0, s0 + 80, 2):
                    v.append(E(l, s))
                    gx = (E(l, s + 1) - E(l, s - 1)) / (2 * px * cosl)
                    gy = (E(l + 1, s) - E(l - 1, s)) / (2 * px)
                    sl.append(math.degrees(math.atan(math.hypot(gx, gy))))
            m = sum(v) / len(v)
            sd = math.sqrt(sum((x - m) ** 2 for x in v) / len(v))
            rows.append([la, lo, round(m), round(sd), max(v) - min(v), round(sum(sl) / len(sl), 3)]
                        + [grs[e].get((la, lo), "") for e in ("h2o", "fe", "si", "k", "th", "cl")])
    write_csv("mars_grid_5deg.csv", ["lat", "lon_east", "elev_mean_m", "elev_std_m", "relief_m",
              "slope_mean_deg", "grs_h2o_wt_pct", "grs_fe_wt_pct", "grs_si_wt_pct", "grs_k_wt_pct",
              "grs_th_ppm", "grs_cl_wt_pct"], rows)


MCD = "https://www-mars.lmd.jussieu.fr/mcd_python/cgi-bin/"


def mcd_maps(variables, ls, lt):
    """One global map per variable from the Mars Climate Database web interface."""
    q = {f"var{i + 1}": (variables[i] if i < len(variables) else "none") for i in range(4)}
    q.update(datekeyhtml=1, ls=ls, localtime=lt, year=2026, month=11, day=13, hours=20, minutes=11,
             seconds=47, julian=2461358.34, martianyear=39, sol=44, latitude="all", longitude="all",
             altitude="10.", zkey=3, spacecraft="none", isfixedlt="on", dust=1, hrkey=1,
             averaging="off", animation="off", animframes=12, dpi=80, islog="off", colorm="jet",
             minval="", maxval="", proj="cyl", palt="", plon="", plat="", trans="", iswind="off",
             latpoint="", lonpoint="")
    html = get(MCD + "mcdcgi.py", params=q).text
    txt = get(requests.compat.urljoin(MCD, re.search(r"href=[\"']?([^\"' >]+\.txt)", html).group(1))).text
    return parse_mcd(txt)


def parse_mcd(txt):
    maps, lats, lons, cur = [], None, [], None
    for line in txt.splitlines():
        if line.startswith("### Columns 2+ are"):
            cur = []
            maps.append(cur)
        elif "||" in line:
            a, b = line.split("||")
            vals = [float(x) for x in b.split()]
            if a.strip().startswith("--"):
                lats = vals
            else:
                cur.append(vals)
                if len(maps) == 1:
                    lons.append(float(a))
    return maps, lats, lons                         # maps[var][lon_index][lat_index]


MCD_COLS = ("lat,lon_east,t_surface_c,t_surface_max_c,t_surface_min_c,t_surface_diurnal_range_c,"
            "t_surface_seasonal_range_c,t_mean_c,t_max_c,t_min_c,t_diurnal_range_c,t_seasonal_range_c,pressure_kpa,"
            "wind_m_s,solar_noon_w_m2,dust_optical_depth,water_vapor_col_kg_m2,frost_max_kg_m2,thermal_inertia,"
            "albedo,mcd_elevation_m,roughness_z0_m").split(",")


def mars_mcd():
    print("Mars climate grid (Mars Climate Database v6.2)")
    LS, LT = (0, 90, 180, 270), (2, 8, 14, 20)
    c = {(ls, lt): cache_json(f"mcd_c_{ls}_{lt}.json", lambda: mcd_maps(["tsurf", "t", "ps", "wind"], ls, lt))
         for ls in LS for lt in LT}
    f = {ls: cache_json(f"mcd_f_{ls}.json", lambda: mcd_maps(["fluxsurf_dn_sw", "dod", "col_h2ovapor", "surf_h2o_ice"], ls, 12))
         for ls in LS}
    st, lats, lons = cache_json("mcd_static.json", lambda: mcd_maps(["thermal_inertia", "ground_albedo", "oroheight", "z_0"], 0, 12))
    K, rows = 273.15, []
    for i, lo in enumerate(lons):
        for j, la in enumerate(lats):
            def stats(v):
                m = [[c[ls, lt][0][v][i][j] for lt in LT] for ls in LS]
                flat = [x for r in m for x in r]
                sm = [sum(r) / 4 for r in m]
                return (sum(flat) / 16, max(flat), min(flat),
                        sum(max(r) - min(r) for r in m) / 4, max(sm) - min(sm))
            ts, t, ps, w = stats(0), stats(1), stats(2), stats(3)
            fm = [[f[ls][0][v][i][j] for ls in LS] for v in range(4)]
            rows.append([round(la, 3), round(lo % 360, 3)]
                        + [round(ts[0] - K, 2), round(ts[1] - K, 2), round(ts[2] - K, 2), round(ts[3], 2), round(ts[4], 2)]
                        + [round(t[0] - K, 2), round(t[1] - K, 2), round(t[2] - K, 2), round(t[3], 2), round(t[4], 2)]
                        + [round(ps[0] / 1000, 4), round(w[0], 2), round(sum(fm[0]) / 4, 1), round(sum(fm[1]) / 4, 3),
                           sum(fm[2]) / 4, max(fm[3])] + [st[v][i][j] for v in range(4)])
    write_csv("mars_mcd_grid.csv", "lat,lon_east,t_surface_c,t_surface_max_c,t_surface_min_c,t_surface_diurnal_range_c,"
              "t_surface_seasonal_range_c,t_mean_c,t_max_c,t_min_c,t_diurnal_range_c,t_seasonal_range_c,pressure_kpa,"
              "wind_m_s,solar_noon_w_m2,dust_optical_depth,water_vapor_col_kg_m2,frost_max_kg_m2,thermal_inertia,"
              "albedo,mcd_elevation_m,roughness_z0_m".split(","), rows)
    return MCD_COLS, rows


# ================================================================ MOON
def moon_grid(every=10):
    """LRO Diviner Polar Resource Product (south): 1200x1200 cells of 0.5 km, 2 triangles per cell."""
    print("Moon south-pole grid (Diviner PRP)")
    url = PDS + "/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_prp/dlre_prp_south.tab"
    rows = []
    for i in range(every // 2, 1200, every):
        start = 210 * (2400 * i + 1)                # 210-byte records, 1 header record
        lines = get(url, headers={"Range": f"bytes={start}-{start + 210 * 2400 - 1}"}).text.split("\r\n")
        for j in range(every // 2, 1200, every):
            tri = [[float(x) for x in lines[2 * j + k].split(",")] for k in (0, 1)]
            sl = []
            for p in tri:
                cx = [(p[q] + p[q + 3] + p[q + 6]) / 3 for q in range(3)]
                u, v = [p[q + 3] - p[q] for q in range(3)], [p[q + 6] - p[q] for q in range(3)]
                n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
                cosang = abs(sum(a * b for a, b in zip(n, cx))) / (math.hypot(*cx) * math.hypot(*n))
                sl.append(math.degrees(math.acos(min(1, cosang))))
            a, b = tri
            ice = [x for x in (a[14], b[14]) if x >= 0]     # -999 = deeper than 2.87 m, -1 = flag
            rows.append([i, j, round((a[10] + b[10]) / 2, 4), round(a[9], 3), round((a[11] + b[11]) * 500),
                         round((a[12] + b[12]) / 2, 2), round((a[13] + b[13]) / 2, 2), round(sum(sl) / 2, 2),
                         round(sum(ice) / len(ice), 4) if ice else "", a[14]])
        print(f"  row {i}/1200", end="\r")
    write_csv("moon_south_grid.csv", ["grid_i", "grid_j", "lat", "lon_east", "elevation_m", "temp_avg_k",
              "temp_max_k", "slope_deg", "ice_depth_m", "ice_flag_raw"], rows)
    t = get(PDS + "/lunar/lp-l-grs-5-elem-abundance-v1/lp_9001/data/lpgrs_high1_elem_abundance_5deg.tab").text
    write_csv("moon_lp_elements_5deg.csv", ["pixel_index", "min_lat", "max_lat", "min_lon", "max_lon",
              "atomic_mass_g_mol", "neutron_density_g_cm3", "mgo_wt_frac", "al2o3_wt_frac", "sio2_wt_frac",
              "cao_wt_frac", "tio2_wt_frac", "feo_wt_frac", "k_ppm", "th_ppm", "u_ppm"],
              [[float(x) for x in r.split()[:16]] for r in t.splitlines() if r.strip()])


# ============================================================= TARGETS
def extra_targets():
    """Features for the targets in targets_extra_list.csv -> data/targets_extra.csv
    (same column names as data/targets_features.csv, so the model can use both)."""
    print("Extra Moon/Mars targets")
    tl = list(csv.DictReader(open(HERE / "targets_extra_list.csv", encoding="utf-8")))
    cols, mcd = mars_mcd()
    grs = {}
    for el in ("h2o", "fe", "si", "k", "th", "cl"):
        t = get(f"{PDS}/ody/ody-m-grs-5-elements-v1/odgm_xxxx/data/smoothed/{el}_sr_5x5.tab").text
        grs[el] = {(float(q[0]), float(q[1])): float(q[2]) for q in (r.split() for r in t.splitlines())
                   if len(q) >= 3 and float(q[2]) < 9000}
    lp = [[float(x) for x in r.split()[:16]] for r in get(
        PDS + "/lunar/lp-l-grs-5-elem-abundance-v1/lp_9001/data/lpgrs_high1_elem_abundance_5deg.tab").text.splitlines() if r.strip()]
    prp = PDS + "/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_prp/dlre_prp_south.tab"
    mola = PDS + "/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/"
    out = []
    for t in tl:
        la, lo = float(t["lat"]), float(t["lon_east"])
        row = dict(t, precip_mm_year=0, ndvi_mean=0, coords_verified="no")
        if t["body"] == "mars":
            top = 88 if la >= 44 else 44 if la >= 0 else 0 if la >= -44 else -44
            left = int(lo // 90) * 90
            name = f"megt{abs(top):02d}{'n' if top >= 0 else 's'}{left:03d}hb.img"
            l0, s0, e = int((top - la) * 128), int((lo - left) * 128), []
            for di in (-2, 0, 2):                              # 3x3 points, 0.93 km apart
                a = ((l0 + di) * 11520 + (s0 - 2)) * 2
                b = get(mola + name, headers={"Range": f"bytes={a}-{a + 9}"}).content
                e += [int.from_bytes(b[k * 2:k * 2 + 2], "big", signed=True) for k in (0, 2, 4)]
            px = 3396000 * math.pi / 180 / 128
            dy, dx, c = 2 * px, 2 * px * math.cos(math.radians(la)), e[4]
            sl = [math.degrees(math.atan(abs(v - c) / math.hypot((k // 3 - 1) * dy, (k % 3 - 1) * dx)))
                  for k, v in enumerate(e) if k != 4]
            row.update(elevation_m=c, relief_m=max(e) - min(e), slope_deg=round(sum(sl) / 8, 3),
                       terrain_source="MGS MOLA MEGDR 128ppd (0.93 km step)")
            best = min(mcd, key=lambda r: math.hypot(r[0] - la, min(abs(r[1] - lo), 360 - abs(r[1] - lo)) * math.cos(math.radians(la))))
            row.update(dict(zip(cols[2:], best[2:])))
            row["climate_source"] = f"Mars Climate Database v6.2 nearest grid cell ({best[0]}, {best[1]})"
            cell = (math.floor(la / 5) * 5 + 2.5, math.floor(lo / 5) * 5 + 2.5)
            for el, col in zip(("h2o", "fe", "si", "k", "th", "cl"), ("grs_h2o_wt_pct", "grs_fe_wt_pct",
                               "grs_si_wt_pct", "grs_k_wt_pct", "grs_th_ppm", "grs_cl_wt_pct")):
                row[col] = grs[el].get(cell, "")
        else:
            R, H = 1737.4, 2 * 1737.4 * math.tan(math.radians(5))
            cell, r = 2 * H / 1200, 2 * 1737.4 * math.tan(math.radians((90 + la) / 2))
            i0 = int((H - r * math.cos(math.radians(lo))) / cell)
            j0 = int((r * math.sin(math.radians(lo)) + H) / cell)
            tri = []
            for i in range(i0 - 5, i0 + 6):                    # about a 5 km box
                a = 210 * (2400 * i + 2 * (j0 - 5) + 1)
                tri += [[float(x) for x in ln.split(",")] for ln in
                        get(prp, headers={"Range": f"bytes={a}-{a + 210 * 22 - 1}"}).text.split("\r\n") if ln.strip()]
            sl = []
            for q in tri:
                cx = [(q[k] + q[k + 3] + q[k + 6]) / 3 for k in range(3)]
                u, v = [q[k + 3] - q[k] for k in range(3)], [q[k + 6] - q[k] for k in range(3)]
                n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
                sl.append(math.degrees(math.acos(min(1, abs(sum(x * y for x, y in zip(n, cx))) / (math.hypot(*cx) * math.hypot(*n))))))
            ta, tm = [q[12] for q in tri if q[12] > 0], [q[13] for q in tri if q[13] > 0]
            alt, ice = [q[11] for q in tri], [q[14] for q in tri if q[14] >= 0]
            row.update(t_mean_c=round(sum(ta) / len(ta) - 273.15, 2), t_max_c=round(max(tm) - 273.15, 2),
                       moon_tavg_min_c=round(min(ta) - 273.15, 2), moon_tmax_mean_c=round(sum(tm) / len(tm) - 273.15, 2),
                       cold_trap_frac=round(sum(x < 110 for x in tm) / len(tm), 3), pressure_kpa=0,
                       elevation_m=round(1000 * sum(alt) / len(alt)), relief_m=round(1000 * (max(alt) - min(alt))),
                       slope_deg=round(sum(sl) / len(sl), 3), ice_stable_within_2p87m_frac=round(len(ice) / len(tri), 3),
                       ice_depth_mean_m=round(sum(ice) / len(ice), 3) if ice else "",
                       climate_source="LRO Diviner PRP v2 (5 km box)", terrain_source="LRO Diviner PRP v2 triangle mesh (0.5 km)")
            lon180 = lo - 360 if lo > 180 else lo
            px = next((q for q in lp if q[1] <= la <= q[2] and q[3] <= lon180 <= q[4]), None)
            if px:
                row.update(dict(zip(("lp_mgo_wt_frac", "lp_al2o3_wt_frac", "lp_sio2_wt_frac", "lp_cao_wt_frac",
                                     "lp_tio2_wt_frac", "lp_feo_wt_frac", "lp_k_ppm", "lp_th_ppm", "lp_u_ppm"), px[7:16])))
        out.append(row)
    keys = []
    for r in out:
        keys += [k for k in r if k not in keys]
    write_csv("targets_extra.csv", keys, [[r.get(k, "") for k in keys] for r in out])


if __name__ == "__main__":
    jobs = {"sites": earth_sites, "earth": earth_grid, "mars": mars_grid, "mcd": mars_mcd, "moon": moon_grid,
            "targets": extra_targets}
    for name in (sys.argv[1:] or list(jobs)):
        try:
            jobs[name]()
        except Exception as exc:                    # keep going; rerun resumes from ./raw
            print(f"  {name} failed: {exc}")
