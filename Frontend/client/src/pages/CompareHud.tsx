import { useState } from "react";
import { features, getCandidate } from "@/data/catalog";
import "./compare-hud.css";
import { trekLayout } from "./trekTiles";

type Feat = { feature: string; label?: string; unit?: string; earth?: number | null; target?: number | null; gap_in_earth_std?: number | null };
type Facts = {
  earth_site?: { name?: string; known_status?: string };
  target?: { id?: string; name?: string; body?: string };
  purpose?: string;
  overall_percentile?: number | null;
  theme_percentiles?: Record<string, number | null>;
  closest_features?: Feat[];
  widest_gaps?: Feat[];
  cannot_be_reproduced?: Record<string, unknown>;
};
type Audit = { status?: string; flags?: unknown[] };
export type HudDetail = { id: string; classification: string; coordinate: { latitude: number; longitude: number }; facts: unknown; audit: unknown; rawFeatures: Record<string, string | number | null>; uncertaintyStatus: string };

const THEMES = ["thermal", "dryness", "pressure", "terrain", "surface"];
const KM_PER_DEG: Record<string, number> = { earth: 111.32, mars: 59.27, moon: 30.32 };
const EARTH_HALF_W = 2.4;

function fmt(v: number | null | undefined, digits = 2) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const a = Math.abs(v);
  return a >= 1000 ? v.toFixed(0) : a >= 100 ? v.toFixed(1) : v.toFixed(digits);
}
function coord(lat: number, lon: number) {
  const l = normLon(lon);
  return `${Math.abs(lat).toFixed(2)}°${lat < 0 ? "S" : "N"}, ${Math.abs(l).toFixed(2)}°${l < 0 ? "W" : "E"}`;
}
function text(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v !== "object") return String(v);
  if (Array.isArray(v)) return v.map(text).join(" · ");
  return Object.entries(v as Record<string, unknown>).map(([k, x]) => `${k.replaceAll("_", " ")}: ${text(x)}`).join(" · ");
}
function normLon(lon: number) { return ((((lon + 180) % 360) + 360) % 360) - 180; }

/** Use polar stereographic imagery near lunar poles to avoid geographic stretching. */
function TrekTiles({ body, lat, lon }: { body: string; lat: number; lon: number }) {
  const { tiles, fx, fy } = trekLayout(body, lat, lon);
  return <div className="hud-tiles" style={{ ["--fx" as string]: fx, ["--fy" as string]: fy }}>
    {tiles.map(t => t.src ? <img key={t.src} src={t.src} alt="" onError={e => { e.currentTarget.style.visibility = "hidden"; }} /> : <span key={t.key} />)}
  </div>;
}

/** Cloud-free NASA Blue Marble view. `onBright` reports snow/ice scenes that have no surface detail at local scale. */
function EarthImage({ latC, lon, halfW, name, onBright }: { latC: number; lon: number; halfW: number; name: string; onBright?: () => void }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <p className="hud-noimg">Imagery unavailable for this location.</p>;
  const halfH = halfW * 0.75;
  const bbox = [latC - halfH, lon - halfW, latC + halfH, lon + halfW].map(n => n.toFixed(4)).join(",");
  const src = `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=BlueMarble_ShadedRelief_Bathymetry&STYLES=&CRS=EPSG:4326&BBOX=${bbox}&WIDTH=960&HEIGHT=720&FORMAT=image/jpeg`;
  return <img key={src} className="hud-earth-img" src={src} crossOrigin="anonymous" alt={`Satellite view around ${name}`} onError={() => setFailed(true)}
    onLoad={e => {
      if (!onBright) return;
      try {
        const c = document.createElement("canvas"); c.width = 16; c.height = 12;
        const g = c.getContext("2d"); if (!g) return;
        g.drawImage(e.currentTarget, 0, 0, 16, 12);
        const d = g.getImageData(0, 0, 16, 12).data; let s = 0;
        for (let i = 0; i < d.length; i += 4) s += Math.min(d[i], d[i + 1], d[i + 2]);
        if (s / (d.length / 4) > 185) onBright();
      } catch { /* pixels not readable: leave as is */ }
    }} />;
}

function Marker({ dy = 0 }: { dy?: number }) {
  return <svg className="hud-marker" style={dy ? { top: `calc(50% + ${dy.toFixed(3)}cqw)` } : undefined} viewBox="-20 -20 40 40" aria-hidden="true"><circle r="8" /><path d="M-18 0H-11M11 0H18M0 -18V-11M0 11V18" /></svg>;
}
function ScaleBar({ widthKm }: { widthKm: number }) {
  if (!Number.isFinite(widthKm) || widthKm <= 0) return null;
  const nice = [2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1].find(n => n <= widthKm * 0.3);
  if (!nice) return null;
  return <div className="hud-scale" style={{ width: `${(nice / widthKm) * 100}%` }}><span>{nice} km</span></div>;
}
function Readout({ rows, side }: { rows: Feat[]; side: "target" | "earth" }) {
  if (!rows.length) return null;
  return <dl className="hud-readout">{rows.map(f => <div key={f.feature}><dt>{f.label || f.feature.replaceAll("_", " ")}</dt><dd>{fmt(side === "target" ? f.target : f.earth)}{f.unit ? <i> {f.unit}</i> : null}</dd></div>)}</dl>;
}

function ThemeBars({ themes }: { themes: Record<string, number | null> }) {
  const keys = [...THEMES.filter(k => k in themes), ...Object.keys(themes).filter(k => !THEMES.includes(k))];
  return <ul className="hud-themes">
    {keys.map(k => { const v = themes[k]; const low = typeof v === "number" && v < 40; return <li key={k} className={low ? "low" : ""}>
      <span className="name">{k}</span>
      <span className="track"><span style={{ width: `${typeof v === "number" ? Math.max(1, v) : 0}%` }} /></span>
      <span className="val">{fmt(v, 0)}{low ? " · low" : ""}</span>
    </li>; })}
  </ul>;
}

function PairRows({ rows, targetLabel }: { rows: Feat[]; targetLabel: string }) {
  if (!rows.length) return <p className="hud-empty">None reported.</p>;
  return <div className="hud-pairs">
    {rows.map(f => {
      const m = Math.max(Math.abs(f.earth ?? 0), Math.abs(f.target ?? 0)) || 1;
      return <div key={f.feature} className="hud-pair">
        <div className="hud-pair-head"><span>{f.label || f.feature.replaceAll("_", " ")}</span>{typeof f.gap_in_earth_std === "number" && <em>{fmt(f.gap_in_earth_std, 2)} σ apart</em>}</div>
        <div className="hud-pair-row t"><span className="who">{targetLabel}</span><span className="track"><span style={{ width: `${(Math.abs(f.target ?? 0) / m) * 100}%` }} /></span><span className="val">{fmt(f.target)} {f.unit || ""}</span></div>
        <div className="hud-pair-row e"><span className="who">Earth</span><span className="track"><span style={{ width: `${(Math.abs(f.earth ?? 0) / m) * 100}%` }} /></span><span className="val">{fmt(f.earth)} {f.unit || ""}</span></div>
      </div>;
    })}
  </div>;
}

function HudCard({ detail, targetId }: { detail: HudDetail; targetId: string }) {
  const [raw, setRaw] = useState(false);
  const [wide, setWide] = useState(false);
  const facts = (detail.facts || {}) as Facts;
  const audit = (detail.audit || {}) as Audit;
  const feature = features.find(f => f.id === (facts.target?.id || targetId));
  const body = (facts.target?.body || feature?.body || "mars").toLowerCase();
  const targetName = facts.target?.name || feature?.title || targetId;
  const earthName = facts.earth_site?.name || getCandidate(detail.id)?.title || detail.id;
  const tLat = feature?.coordinate.latitude, tLon = feature?.coordinate.longitude;
  const hasT = typeof tLat === "number" && typeof tLon === "number";
  const eLat = detail.coordinate.latitude, eLon = detail.coordinate.longitude;
  const closest = facts.closest_features || [];
  const widest = facts.widest_gaps || [];
  const bodyLabel = body === "moon" ? "Moon" : "Mars";
  const fallback = body === "moon" ? "/assets/moon-surface-preview.webp" : "/assets/mars-surface-preview.webp";
  const flags = (audit.flags || []).map(text).filter(Boolean);
  const cannot = Object.entries(facts.cannot_be_reproduced || {});
  const purpose = (facts.purpose || "general").replaceAll("_", " ");
  const pct = facts.overall_percentile;
  const top = typeof pct === "number" ? Math.max(0.1, 100 - pct) : null;
  // Ice sheets are featureless at local scale, so those sites get a wider view that reaches the coast or mountains.
  const halfW = wide ? 20 : EARTH_HALF_W, halfH = halfW * 0.75;
  const latC = Math.max(-90 + halfH, Math.min(90 - halfH, eLat));
  const markerDy = ((latC - eLat) / (2 * halfH)) * 75;

  return <article id={`cmp-${detail.id}`} className={`hud hud-${body}`}>
    <div className="hud-split">
      <figure className="hud-side hud-target">
        <header><span className="hud-kicker">{bodyLabel} reference</span><h2>{targetName}</h2>{hasT && <p>{coord(tLat as number, tLon as number)}</p>}</header>
        <div className="hud-view" style={{ backgroundImage: `url(${fallback})` }}>
          {hasT && <TrekTiles body={body} lat={tLat as number} lon={tLon as number} />}
          <Marker /><Readout rows={closest.slice(0, 3)} side="target" />
          {hasT && <ScaleBar widthKm={trekLayout(body, tLat as number, tLon as number).widthKm} />}
        </div>
        <figcaption>{body === "moon" ? hasT && Math.abs(tLat as number) >= 60 ? "LRO WAC polar mosaic · polar stereographic" : "LRO WAC global mosaic" : "Viking MDIM 2.1 colour mosaic"}, NASA Trek. Visual context only.</figcaption>
      </figure>
      <figure className="hud-side hud-earth">
        <header><span className="hud-kicker">Earth candidate</span><h2>{earthName}</h2><p>{coord(eLat, eLon)} · {detail.classification}</p></header>
        <div className="hud-view">
          <EarthImage latC={latC} lon={eLon} halfW={halfW} name={earthName} onBright={wide ? undefined : () => setWide(true)} />
          <Marker dy={markerDy} /><Readout rows={closest.slice(0, 3)} side="earth" />
          <ScaleBar widthKm={2 * halfW * KM_PER_DEG.earth * Math.cos((eLat * Math.PI) / 180)} />
        </div>
        <figcaption>Blue Marble, NASA GIBS. Visual context only.{wide ? " Wide view: the ice sheet has no surface detail at local scale." : ""}</figcaption>
      </figure>
    </div>

    <p className="hud-rank">{top === null ? "No overall rank was returned for this pair." : <>For <b>{purpose}</b>, {earthName} ranks in the <b>top {top < 1 ? top.toFixed(1) : Math.round(top)}%</b> of Earth locations in the dataset. This is a rank, not a physical similarity percentage.</>}</p>

    <div className="hud-panels">
      <section className="hud-panel"><h3>Rank by theme</h3><p className="hud-sub">Percentile among Earth locations, 0–100</p>{facts.theme_percentiles ? <ThemeBars themes={facts.theme_percentiles} /> : <p className="hud-empty">Missing</p>}</section>
      <section className="hud-panel"><h3>Closest measurements</h3><PairRows rows={closest} targetLabel={bodyLabel} /></section>
      <section className="hud-panel"><h3>Widest gaps</h3><PairRows rows={widest} targetLabel={bodyLabel} />
        {cannot.length > 0 && <><h4>Cannot be reproduced on Earth</h4><dl className="hud-cannot">{cannot.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{text(v)}</dd></div>)}</dl></>}
      </section>
    </div>

    <footer className="hud-foot">
      <ul>
        <li>Audit: {audit.status || "not reported"}</li>
        {flags.map(f => <li key={f}>{f}</li>)}
        <li>Uncertainty: {detail.uncertaintyStatus}; no calibrated confidence interval supplied.</li>
      </ul>
      <button type="button" aria-expanded={raw} onClick={() => setRaw(r => !r)}>{raw ? "Hide" : "Show"} dataset measurements</button>
    </footer>
    {raw && <table className="hud-raw"><tbody>{Object.entries(detail.rawFeatures || {}).map(([k, v]) => <tr key={k}><th scope="row">{k.replaceAll("_", " ")}</th><td>{v === null ? "Missing" : String(v)}</td></tr>)}</tbody></table>}
  </article>;
}

export default function CompareHud({ details, targetId }: { details: HudDetail[]; targetId: string }) {
  return <section className="hud-list">{details.map(d => <HudCard key={d.id} detail={d} targetId={targetId} />)}</section>;
}
