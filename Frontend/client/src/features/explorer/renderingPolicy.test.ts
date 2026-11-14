import { describe, expect, it } from "vitest";
import { chooseRenderProfile, clampCameraDistance, clampEarthCameraDistance } from "./renderingPolicy";
import { buildTerrainArrays, decodeTerrainGrid, validateTerrainManifest, validateTerrainSamples, verifyTerrainGridChecksum, type TerrainManifest } from "./planet-r3f/terrainGeometry";

const manifest: TerrainManifest = {
  id: "tycho-sldem2015-poc", title: "Tycho regional relief", width: 129, height: 129,
  bounds: { west: -15, east: -7, north: -40, south: -46 }, scaleMeters: 0.5,
  noData: -32768, referenceRadiusMeters: 1737400, dataUrl: "/assets/terrain/tycho-sldem2015.i16",
  sha256: "0".repeat(64), sampleMinimumMeters: -1000, sampleMaximumMeters: 1000,
  validSamples: 129 * 129, noDataSamples: 0,
  source: {
    productId: "SLDEM2015_512_60S_30S_315_360", productVersion: "V2.0", dataSetId: "LRO-L-LOLA-4-GDR-V1.0",
    url: "https://imbrium.mit.edu/EXTRAS/SLDEM2015/TILES/JP2/SLDEM2015_512_60S_30S_315_360.JP2",
    labelUrl: "https://imbrium.mit.edu/EXTRAS/SLDEM2015/TILES/JP2/SLDEM2015_512_60S_30S_315_360_JP2.LBL",
    auxiliaryScaleMetadataUrl: "https://imbrium.mit.edu/EXTRAS/SLDEM2015/TILES/JP2/SLDEM2015_512_60S_30S_315_360_AUX.XML",
    scaleReferenceUrl: "https://pds-geosciences.wustl.edu/missions/lro/lola_faq.htm", citation: "LOLA / SELENE",
    sourceSha256: "0".repeat(64), sourceWidth: 23040, sourceHeight: 15360, sourceMode: "I;16",
    sourceCropPixels: { west: 15360, east: 19456, north: 5120, south: 8192 },
    jp2UnsignedBias: 32768, sourceNoDataRaw: 0, sourceNoData: -32768,
    scaleMeaning: "Signed count = unsigned JP2 pixel − 32768; source no-data is raw 0 / decoded −32768; 0.5 metres per valid signed count; absolute radius offset 1,737,400 metres per PDS LOLA FAQ.",
  },
};

describe("Frontend rendering policy", () => {
  it.each([{ cores: 2 }, { memory: 4 }, { coarsePointer: true }, { reducedMotion: true }])("uses economy detail for limited capabilities: %j", (signals) => {
    expect(chooseRenderProfile({ ...signals, devicePixelRatio: 3 }).dpr).toBe(1);
    expect(chooseRenderProfile(signals).textureSize).toBe(512);
  });
  it("caps normal DPR and does not equate unknown memory with low memory", () => {
    expect(chooseRenderProfile({ cores: 8, devicePixelRatio: 3 }).dpr).toBe(1.5);
    expect(chooseRenderProfile({}).tier).toBe("balanced");
  });
  it("bounds zoom independently for orbital and regional views", () => {
    expect(clampCameraDistance(1)).toBe(3.5);
    expect(clampCameraDistance(100)).toBe(20);
    expect(clampCameraDistance(100, true)).toBe(24);
  });
  it("bounds Earth zoom to the Cesium camera range", () => {
    expect(clampEarthCameraDistance(1)).toBe(1_400_000);
    expect(clampEarthCameraDistance(14_600_000)).toBe(14_600_000);
    expect(clampEarthCameraDistance(50_000_000)).toBe(28_000_000);
  });
});

describe("Bounded source-derived lunar terrain", () => {
  it("rejects out-of-region or corrupt manifest contracts", () => {
    expect(validateTerrainManifest(manifest)).toEqual(manifest);
    expect(() => validateTerrainManifest({ ...manifest, bounds: { ...manifest.bounds, north: -39 } })).toThrow();
    expect(() => validateTerrainManifest({ ...manifest, dataUrl: "https://arbitrary.example/height" })).toThrow();
    expect(() => validateTerrainManifest({ ...manifest, sampleMinimumMeters: 2000 })).toThrow();
    expect(() => validateTerrainManifest({ ...manifest, source: { ...manifest.source, sourceCropPixels: { ...manifest.source.sourceCropPixels, west: 0 } } })).toThrow();
    expect(() => validateTerrainManifest({ ...manifest, source: { ...manifest.source, sourceSha256: "invalid" } })).toThrow();
    expect(() => validateTerrainManifest({ ...manifest, source: { ...manifest.source, auxiliaryScaleMetadataUrl: "https://other.invalid/scale" } })).toThrow();
    expect(() => validateTerrainManifest({ ...manifest, source: { ...manifest.source, scaleReferenceUrl: "https://other.invalid/formula" } })).toThrow();
    expect(() => validateTerrainManifest({ ...manifest, source: { ...manifest.source, jp2UnsignedBias: 65536 } })).toThrow();
    expect(() => validateTerrainManifest({ ...manifest, validSamples: 100 })).toThrow();
  });
  it("decodes signed little-endian samples and rejects truncated/all-no-data assets", () => {
    const grid = new Int16Array(129 * 129).fill(100);
    const buffer = new ArrayBuffer(grid.byteLength);
    const view = new DataView(buffer);
    for (let i = 0; i < grid.length; i++) view.setInt16(i * 2, i === 0 ? -2000 : 100, true);
    expect(decodeTerrainGrid(buffer, manifest)[0]).toBe(-2000);
    expect(() => decodeTerrainGrid(buffer.slice(2), manifest)).toThrow();
    expect(() => decodeTerrainGrid(new Int16Array(grid.length).fill(-32768).buffer, manifest)).toThrow();
  });
  it("checks the documented height extrema against the verified local samples", () => {
    const samples = new Int16Array(129 * 129).fill(10);
    const exact = { ...manifest, sampleMinimumMeters: 5, sampleMaximumMeters: 5 };
    expect(() => validateTerrainSamples(samples, exact)).not.toThrow();
    expect(() => validateTerrainSamples(samples, { ...exact, sampleMinimumMeters: 4 })).toThrow();
    expect(() => validateTerrainSamples(samples, { ...exact, sampleMaximumMeters: 6 })).toThrow();
  });
  it("requires WebCrypto and rejects an incorrect terrain SHA-256", async () => {
    const buffer = new Uint8Array([1, 2, 3]).buffer;
    const digest = new Uint8Array(32);
    digest[0] = 0xab;
    const provider = { subtle: { digest: async () => digest.buffer } } as unknown as Crypto;
    const expected = `ab${"00".repeat(31)}`;
    await expect(verifyTerrainGridChecksum(buffer, expected, provider)).resolves.toBeUndefined();
    await expect(verifyTerrainGridChecksum(buffer, "0".repeat(64), provider)).rejects.toThrow("checksum mismatch");
    await expect(verifyTerrainGridChecksum(buffer, expected, undefined)).rejects.toThrow("unavailable");
  });
  it("aligns the corners to the existing global color UVs without using image pixels as height", () => {
    const grid = new Int16Array(129 * 129).fill(0);
    const mesh = buildTerrainArrays(grid, manifest, 1);
    expect(mesh.uvs[0]).toBeCloseTo(165 / 360);
    expect(mesh.uvs[1]).toBeCloseTo(50 / 180);
    expect(mesh.uvs[mesh.uvs.length - 2]).toBeCloseTo(173 / 360);
    expect(mesh.uvs[mesh.uvs.length - 1]).toBeCloseTo(44 / 180);
    expect(mesh.positions[2]).toBeCloseTo(-3);
    expect(mesh.positions[mesh.positions.length - 1]).toBeCloseTo(3);
  });
  it("changes only vertical display relief, uses a coarser grid tier, and leaves no-data holes", () => {
    const grid = new Int16Array(129 * 129).fill(0);
    const natural = buildTerrainArrays(grid, manifest, 1);
    const exaggerated = buildTerrainArrays(grid, manifest, 3);
    expect(exaggerated.positions[1]).toBeCloseTo(natural.positions[1] * 3);
    expect(exaggerated.positions[0]).toEqual(natural.positions[0]);
    expect(buildTerrainArrays(grid, manifest, 1, 2).columns).toBe(65);
    grid[0] = manifest.noData;
    expect(buildTerrainArrays(grid, manifest, 1).indices.length).toBeLessThan(natural.indices.length);
    expect(() => buildTerrainArrays(grid, manifest, 10)).toThrow();
  });
});
