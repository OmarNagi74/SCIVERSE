export type TerrainManifest = {
  id: string;
  title: string;
  width: number;
  height: number;
  bounds: { west: number; east: number; north: number; south: number };
  scaleMeters: number;
  noData: number;
  referenceRadiusMeters: number;
  dataUrl: string;
  sha256: string;
  sampleMinimumMeters: number;
  sampleMaximumMeters: number;
  validSamples: number;
  noDataSamples: number;
  source: { productId: string; productVersion: string; dataSetId: string; url: string; labelUrl: string; auxiliaryScaleMetadataUrl: string; scaleReferenceUrl: string; citation: string; sourceSha256: string; sourceWidth: number; sourceHeight: number; sourceMode: string; sourceCropPixels: { west: number; east: number; north: number; south: number }; jp2UnsignedBias: number; sourceNoDataRaw: number; sourceNoData: number; scaleMeaning: string };
};

export function validateTerrainManifest(value: unknown): TerrainManifest {
  const m = value as TerrainManifest;
  if (!m || m.id !== "tycho-sldem2015-poc" || m.width !== 129 || m.height !== 129 ||
    m.bounds?.west !== -15 || m.bounds?.east !== -7 || m.bounds?.north !== -40 || m.bounds?.south !== -46 ||
    m.scaleMeters !== 0.5 || m.noData !== -32768 || m.referenceRadiusMeters !== 1737400 ||
    m.dataUrl !== "/assets/terrain/tycho-sldem2015.i16" || !/^[a-f0-9]{64}$/.test(m.sha256) ||
    !Number.isFinite(m.sampleMinimumMeters) || !Number.isFinite(m.sampleMaximumMeters) ||
    m.sampleMaximumMeters < m.sampleMinimumMeters || !Number.isInteger(m.validSamples) || !Number.isInteger(m.noDataSamples) || m.validSamples < 1 || m.noDataSamples < 0 || m.validSamples + m.noDataSamples !== 129 * 129 ||
    m.source?.productId !== "SLDEM2015_512_60S_30S_315_360" || m.source.productVersion !== "V2.0" || m.source.dataSetId !== "LRO-L-LOLA-4-GDR-V1.0" ||
    m.source.url !== "https://imbrium.mit.edu/EXTRAS/SLDEM2015/TILES/JP2/SLDEM2015_512_60S_30S_315_360.JP2" ||
    m.source.labelUrl !== "https://imbrium.mit.edu/EXTRAS/SLDEM2015/TILES/JP2/SLDEM2015_512_60S_30S_315_360_JP2.LBL" ||
    m.source.auxiliaryScaleMetadataUrl !== "https://imbrium.mit.edu/EXTRAS/SLDEM2015/TILES/JP2/SLDEM2015_512_60S_30S_315_360_AUX.XML" ||
    m.source.scaleReferenceUrl !== "https://pds-geosciences.wustl.edu/missions/lro/lola_faq.htm" ||
    m.source.sourceWidth !== 23040 || m.source.sourceHeight !== 15360 || !["I", "I;16", "I;16B", "F"].includes(m.source.sourceMode) ||
    m.source.sourceCropPixels?.west !== 15360 || m.source.sourceCropPixels?.east !== 19456 || m.source.sourceCropPixels?.north !== 5120 || m.source.sourceCropPixels?.south !== 8192 ||
    m.source.jp2UnsignedBias !== 32768 || m.source.sourceNoDataRaw !== 0 || m.source.sourceNoData !== -32768 || m.source.scaleMeaning !== "Signed count = unsigned JP2 pixel − 32768; source no-data is raw 0 / decoded −32768; 0.5 metres per valid signed count; absolute radius offset 1,737,400 metres per PDS LOLA FAQ." || !/^[a-f0-9]{64}$/.test(m.source.sourceSha256) || !m.source.citation) {
    throw new Error("Terrain asset metadata is invalid or outside the bounded lunar proof.");
  }
  return m;
}

export function decodeTerrainGrid(buffer: ArrayBuffer, manifest: TerrainManifest): Int16Array {
  if (buffer.byteLength !== manifest.width * manifest.height * 2) throw new Error("Terrain asset length mismatch.");
  const result = new Int16Array(manifest.width * manifest.height);
  const data = new DataView(buffer);
  for (let i = 0; i < result.length; i++) result[i] = data.getInt16(i * 2, true);
  const covered = result.filter((value) => value !== manifest.noData);
  if (!covered.length) throw new Error("Terrain asset has no covered samples.");
  if (covered.length !== manifest.validSamples || result.length - covered.length !== manifest.noDataSamples) throw new Error("Terrain sample counts do not match its provenance manifest.");
  return result;
}

export function validateTerrainSamples(samples: Int16Array, manifest: TerrainManifest): void {
  let minimum = Infinity;
  let maximum = -Infinity;
  let validCount = 0;
  for (const sample of samples) {
    if (sample === manifest.noData) continue;
    validCount += 1;
    minimum = Math.min(minimum, sample);
    maximum = Math.max(maximum, sample);
  }
  if (validCount !== manifest.validSamples || minimum * manifest.scaleMeters !== manifest.sampleMinimumMeters || maximum * manifest.scaleMeters !== manifest.sampleMaximumMeters) {
    throw new Error("Terrain elevation bounds do not match the source-derived grid.");
  }
}
/** Regional tangent-plane display. Heights remain source-derived, only the explicitly shown display exaggeration changes. */
export function buildTerrainArrays(samples: Int16Array, m: TerrainManifest, exaggeration: number, stride = 1) {
  if (![1, 3, 6].includes(exaggeration) || ![1, 2].includes(stride)) throw new Error("Unsupported terrain display setting.");
  const columns = (m.width - 1) / stride + 1;
  const rows = (m.height - 1) / stride + 1;
  const positions = new Float32Array(columns * rows * 3);
  const uvs = new Float32Array(columns * rows * 2);
  const valid = new Uint8Array(columns * rows);
  const centerLat = (m.bounds.north + m.bounds.south) / 2;
  const metersPerDegree = Math.PI * m.referenceRadiusMeters / 180;
  const northSouthMeters = (m.bounds.north - m.bounds.south) * metersPerDegree;
  const displayScale = 6 / northSouthMeters;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const i = y * columns + x;
      const latitude = m.bounds.north - y / (rows - 1) * (m.bounds.north - m.bounds.south);
      const longitude = m.bounds.west + x / (columns - 1) * (m.bounds.east - m.bounds.west);
      const raw = samples[(y * stride) * m.width + x * stride];
      valid[i] = raw === m.noData ? 0 : 1;
      positions[i * 3] = (longitude - (m.bounds.west + m.bounds.east) / 2) * metersPerDegree * Math.cos(centerLat * Math.PI / 180) * displayScale;
      positions[i * 3 + 1] = valid[i] ? (raw * m.scaleMeters - m.sampleMinimumMeters) * displayScale * exaggeration : 0;
      positions[i * 3 + 2] = -(latitude - centerLat) * metersPerDegree * displayScale;
      // Existing global GLD100 visualization has longitude -180..180, latitude -90..90.
      uvs[i * 2] = (longitude + 180) / 360;
      uvs[i * 2 + 1] = (latitude + 90) / 180;
    }
  }
  const indices: number[] = [];
  for (let y = 0; y < rows - 1; y++) for (let x = 0; x < columns - 1; x++) {
    const a = y * columns + x, b = a + 1, c = a + columns, d = c + 1;
    if (valid[a] && valid[c] && valid[b]) indices.push(a, c, b);
    if (valid[b] && valid[c] && valid[d]) indices.push(b, c, d);
  }
  return { positions, uvs, indices, columns, rows };
}


export async function verifyTerrainGridChecksum(buffer: ArrayBuffer, expectedHash: string, cryptoProvider: Crypto | undefined): Promise<void> {
  if (!cryptoProvider?.subtle) throw new Error("Secure SHA-256 is unavailable; terrain integrity cannot be confirmed.");
  const digest = await cryptoProvider.subtle.digest("SHA-256", buffer);
  const actualHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  if (actualHash !== expectedHash) throw new Error("Terrain checksum mismatch.");
}
