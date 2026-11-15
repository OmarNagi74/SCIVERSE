const ZOOM = 6;
const DEG = 180 / 2 ** ZOOM;
const MOON_RADIUS = 1737400;

/** NASA Trek WMTS matrices. Polar v2 uses lunar stereographic metres,
 * top-left (-1095930, 1095930); level 5 spans 68495.625 m per tile.
 * Source: trek.nasa.gov/tiles/Moon/SP/LRO_WAC_Mosaic_SPole60_100m_v02/1.0.0/WMTSCapabilities.xml
 */
export function trekLayout(body: string, lat: number, lon: number) {
  const polar = body === "moon" && Math.abs(lat) >= 60;
  let x: number, y: number, zoom: number, base: string, extension: string;
  let cols: number, rows: number, widthKm: number;
  if (polar) {
    const north = lat >= 0;
    const rho = 2 * MOON_RADIUS * Math.tan(Math.PI / 4 - Math.abs(lat) * Math.PI / 360);
    const px = rho * Math.sin(lon * Math.PI / 180);
    const py = (north ? -1 : 1) * rho * Math.cos(lon * Math.PI / 180);
    zoom = 5;
    const span = 2191860 / 2 ** zoom;
    x = (px + 1095930) / span;
    y = (1095930 - py) / span;
    cols = 64; rows = 32;
    const pole = north ? "N" : "S";
    base = `https://trek.nasa.gov/tiles/Moon/${pole}P/LRO_WAC_Mosaic_${pole}Pole60_100m_v02/1.0.0/default/default028mm`;
    extension = "png";
    // Local stereographic scale factor, not longitude convergence.
    widthKm = span / 0.6 / 1000 * (1 + Math.sin(Math.abs(lat) * Math.PI / 180)) / 2;
  } else {
    x = (((lon + 180) % 360 + 360) % 360) / DEG;
    y = (90 - lat) / DEG;
    zoom = ZOOM; cols = 2 ** (zoom + 1); rows = 2 ** zoom;
    base = body === "moon"
      ? "https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm"
      : "https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm";
    extension = "jpg";
    widthKm = DEG / 0.6 * (body === "moon" ? 30.32 : 59.27) * Math.cos(lat * Math.PI / 180);
  }
  const col = Math.floor(x), row = Math.floor(y);
  const tiles: { key: string; src: string | null }[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const r = row + dy;
    const c = polar ? col + dx : ((col + dx) % cols + cols) % cols;
    tiles.push({ key: `${dy}:${dx}`, src: r < 0 || r >= rows || c < 0 || c >= cols ? null : `${base}/${zoom}/${r}/${c}.${extension}` });
  }
  return { tiles, fx: x - col, fy: y - row, widthKm, polar };
}
