import { ExternalLink, FileImage, ChevronDown } from "lucide-react";

const sourceRecords = [
  {
    body: "EARTH",
    title: "NASA GIBS / Blue Marble visual context",
    href: "https://svs.gsfc.nasa.gov/3615/",
    description: "NASA GIBS serves optional Blue Marble Shaded Relief & Bathymetry imagery for orientation only. Credit the imagery to NASA/GSFC and NASA Earth Observatory. This is not an analytical layer or TerraTwin finding.",
  },
  {
    body: "MOON",
    title: "USGS LROC WAC GLD100 preview texture",
    href: "https://astrogeology.usgs.gov/search/map/moon_lroc_wac_dtm_gld100_118m",
    description: "Source: USGS Astrogeology LROC Team GLD100; source pages request citation of named product authors. This reduced-resolution image is a visualization texture, not elevation data. It covers equatorial and mid-latitude regions from 79°N to 79°S; polar caps display a gridded no-data treatment.",
  },
  {
    body: "MOON · REGIONAL TERRAIN",
    title: "NASA PDS / SLDEM2015 Tycho-area terrain source",
    href: "https://imbrium.mit.edu/EXTRAS/SLDEM2015/TILES/JP2/SLDEM2015_512_60S_30S_315_360_JP2.LBL",
    description: "True elevation data from the LRO LOLA and SELENE/Kaguya terrain-camera merged product, 512 px/degree. For the JP2, TerraTwin decodes signed count = unsigned pixel − 32768; raw zero becomes the source no-data sentinel, −32768. Valid counts use 0.5 m/count relative to the 1,737.4 km radius. Only a small 40°–46°S, 15°–7°W Tycho visualization patch is rendered. This is not an active global dataset, elevation readout, site finding, or analysis result. Product authors: David E. Smith / LRO LOLA Team; cite Barker et al. (2016), Icarus 273, 346–355, doi:10.1016/j.icarus.2015.07.039; credit NASA LOLA and JAXA SELENE/Kaguya teams.",
  },
  {
    body: "MARS",
    title: "USGS Viking colorized global mosaic preview",
    href: "https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m",
    description: "Source: USGS Astrogeology; NASA Ames originator. Reduced-resolution Viking colorized mosaic preview for orientation only—not an analytical raster layer. Product illumination and control limits apply.",
  },
] as const;

export default function VisualSources() {
  return (
    <section className="visual-sources" aria-label="Visual asset sources">
      <details>
        <summary>
          <span><FileImage size={14} /> VISUAL SOURCE DOSSIER</span>
          <ChevronDown size={14} aria-hidden="true" />
        </summary>
        <p className="visual-sources__intro">Visual color textures are not elevation. One separately sourced, source-bounded Tycho terrain patch is a local visual relief proof—not a global terrain product or site-specific analysis.</p>
        <ul>
          {sourceRecords.map((source) => (
            <li key={source.title}>
              <span className="visual-sources__body">{source.body}</span>
              <a href={source.href} target="_blank" rel="noreferrer">
                {source.title} <ExternalLink size={12} aria-hidden="true" />
              </a>
              <p>{source.description}</p>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
