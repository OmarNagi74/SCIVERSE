import { Focus, Info, Minus, Plus, RotateCcw, X, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import type { PlanetId } from "@/domain/terratwin";
import "./planetary-tiles.css";

/** Source-backed NASA Solar System Treks WMTS imagery. Uses unaltered image tiles
 * for actual additional detail, never magnifies the original 1024px globe map.
 * No DEM is inferred from color imagery. Tile failures remain explicitly missing. */
const DATASETS = {
  moon: { layer: "LRO_WAC_Mosaic_Global_303ppd_v02", maxZoom: 8, title: "LRO WAC GLOBAL MOSAIC", source: "Lunar Reconnaissance Orbiter / NASA Trek", href: "https://trek.nasa.gov/moon/" },
  mars: { layer: "Mars_Viking_MDIM21_ClrMosaic_global_232m", maxZoom: 7, title: "VIKING COLOR GLOBAL MOSAIC", source: "Viking Orbiter / NASA Trek", href: "https://trek.nasa.gov/mars/" },
} as const;

const TILE_SIZE = 256;
type DetailBody = Exclude<PlanetId, "earth">;
type Tile = { row: number; col: number; left: number; top: number; key: string; src: string };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const normLon = (v: number) => ((v + 180) % 360 + 360) % 360 - 180;

export default function PlanetaryTileViewer({ body, lat, lon, title, onClose }: { body: DetailBody; lat: number; lon: number; title: string; onClose: () => void }) {
  const config = DATASETS[body];
  const viewport = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number; lat: number; lon: number } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 550 });
  const [center, setCenter] = useState({ lat, lon: normLon(lon) });
  const [zoom, setZoom] = useState(5);
  const [available, setAvailable] = useState(false);
  const [errors, setErrors] = useState(0);
  const [showGuide, setShowGuide] = useState(true);
  useEffect(() => {setCenter({lat,lon:normLon(lon)}); setZoom(5); setAvailable(false); setErrors(0);},[body,lat,lon]);
  useEffect(() => { const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", closeOnEscape); return () => window.removeEventListener("keydown", closeOnEscape); }, [onClose]);
  useEffect(() => {
    if (!viewport.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setDimensions({width: Math.max(200, entry.contentRect.width), height: Math.max(200, entry.contentRect.height)});
    });
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);
  const widthPx = TILE_SIZE * 2 ** (zoom + 1);
  const heightPx = TILE_SIZE * 2 ** zoom;
  const lonPx = (center.lon + 180) / 360 * widthPx;
  const latPx = (90 - center.lat) / 180 * heightPx;
  const tiles = useMemo(() => {
    const countX = 2 ** (zoom + 1), countY = 2 ** zoom;
    const firstCol = Math.floor((lonPx - dimensions.width / 2) / TILE_SIZE) - 1;
    const lastCol = Math.ceil((lonPx + dimensions.width / 2) / TILE_SIZE) + 1;
    const firstRow = clamp(Math.floor((latPx - dimensions.height / 2) / TILE_SIZE) - 1, 0, countY - 1);
    const lastRow = clamp(Math.ceil((latPx + dimensions.height / 2) / TILE_SIZE) + 1, 0, countY - 1);
    const entries: Tile[] = [];
    for (let row = firstRow; row <= lastRow; row++) for (let col = firstCol; col <= lastCol; col++) {
      const wrapped = ((col % countX) + countX) % countX;
      entries.push({row,col,left:dimensions.width / 2 + col * TILE_SIZE - lonPx,top:dimensions.height / 2 + row * TILE_SIZE - latPx,
        key:`${zoom}/${row}/${wrapped}/${col}`,
        src:`https://trek.nasa.gov/tiles/${body === "moon" ? "Moon" : "Mars"}/EQ/${config.layer}/1.0.0/default/default028mm/${zoom}/${row}/${wrapped}.jpg`});
    }
    return entries;
  }, [body, config.layer, zoom, dimensions.width, dimensions.height, lonPx, latPx]);
  const updateZoom = useCallback((next: number) => {setZoom(clamp(next,2,config.maxZoom));setAvailable(false);setErrors(0);}, [config.maxZoom]);
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    gesture.current = {x:event.clientX,y:event.clientY,...center};
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!gesture.current) return;
    const g = gesture.current;
    setCenter({lat:clamp(g.lat + (event.clientY-g.y) / heightPx * 180, -89.8, 89.8),lon:normLon(g.lon - (event.clientX-g.x) / widthPx * 360)});
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onWheel = (event: WheelEvent<HTMLDivElement>) => {if (event.deltaY !== 0) {event.stopPropagation(); updateZoom(zoom+(event.deltaY<0?1:-1));}};
  return <div className="tt-planet-tiles" role="region" aria-label={`${body} NASA imagery for ${title}`}>
    <div className="tt-planet-tiles__top">
      <div><span className="tt-planet-tiles__eyebrow"><Focus size={13}/> REGIONAL IMAGE EXPLORATION · NASA SOURCE</span>
        <h3>{title}</h3><p>{config.title} · {config.source}</p></div>
      <button type="button" onClick={onClose} className="tt-planet-tiles__close" aria-label="Return to 3D globe"><X size={18}/></button>
    </div>
    <div className="tt-planet-tiles__viewport" ref={viewport} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onWheel={onWheel}>
      {tiles.map(tile=><img key={tile.key} src={tile.src} alt="" draggable={false} loading="lazy" decoding="async" style={{left:tile.left,top:tile.top}} onLoad={()=>{setAvailable(true);}} onError={()=>setErrors(v=>v+1)} />)}
      <div className="tt-planet-tiles__crosshair" aria-hidden="true"><span/><span/></div>
      <div className="tt-planet-tiles__coordinates">{Math.abs(center.lat).toFixed(3)}°{center.lat<0?"S":"N"} · {Math.abs(center.lon).toFixed(3)}°{center.lon<0?"W":"E"}</div>
      {showGuide && <div className="tt-planet-tiles__guide"><Info size={16}/><span>Drag to pan · Scroll or use +/− for source imagery detail. This is not measured terrain elevation.</span><button type="button" onClick={()=>setShowGuide(false)} aria-label="Dismiss help"><X size={14}/></button></div>}
      {!available && <div className="tt-planet-tiles__loading" role="status">{errors>0 ? "NASA IMAGERY NOT REACHABLE — CHECK NETWORK OR OPEN SOURCE" : "CONNECTING TO NASA TREK IMAGERY…"}</div>}
    </div>
    <div className="tt-planet-tiles__toolbar">
      <div className="tt-planet-tiles__zoom"><button type="button" onClick={()=>updateZoom(zoom-1)} disabled={zoom<=2} aria-label="Zoom out"><Minus size={16}/></button><span>LEVEL {zoom} / {config.maxZoom}</span><button type="button" onClick={()=>updateZoom(zoom+1)} disabled={zoom>=config.maxZoom} aria-label="Zoom into NASA tiles"><Plus size={16}/></button><button type="button" onClick={()=>{setCenter({lat,lon:normLon(lon)});updateZoom(5);}} aria-label="Reset regional view"><RotateCcw size={16}/></button></div>
      <span className="tt-planet-tiles__status">{available ? "NASA IMAGE TILES LOADED" : "REMOTE SOURCE REQUIRED"}{errors>0 ? ` · ${errors} TILE ERRORS` : ""}</span>
      <a href={config.href} target="_blank" rel="noreferrer">OPEN NASA TREK <ExternalLink size={14}/></a>
    </div>
    <p className="tt-planet-tiles__disclaimer">Imagery tiles load from NASA Trek while online. This view reveals source imagery where available, not additional resolution from the 3D globe texture. Regional imagery availability and resolution vary. No surface height, slope or mineral claims are inferred here.</p>
  </div>;
}
