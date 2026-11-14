import { useEffect, useMemo, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { buildTerrainArrays, decodeTerrainGrid, validateTerrainManifest, validateTerrainSamples, verifyTerrainGridChecksum, type TerrainManifest } from "./terrainGeometry";

export type TerrainStatus = "loading" | "ready" | "unavailable";

type Props = {
  texture: THREE.Texture | null;
  exaggeration: number;
  economy: boolean;
  wireframe: boolean;
  onStatus: (status: TerrainStatus) => void;
};

export default function LunarTerrain({ texture, exaggeration, economy, wireframe, onStatus }: Props) {
  const [data, setData] = useState<{ manifest: TerrainManifest; samples: Int16Array } | null>(null);
  const { invalidate } = useThree();
  useEffect(() => {
    const controller = new AbortController();
    onStatus("loading");
    async function load() {
      try {
        const response = await fetch("/assets/terrain/tycho-sldem2015.json", { signal: controller.signal });
        if (!response.ok) throw new Error("Terrain manifest unavailable");
        const manifest = validateTerrainManifest(await response.json());
        const gridResponse = await fetch(manifest.dataUrl, { signal: controller.signal });
        if (!gridResponse.ok) throw new Error("Terrain samples unavailable");
        const buffer = await gridResponse.arrayBuffer();
        await verifyTerrainGridChecksum(buffer, manifest.sha256, globalThis.crypto);
        const samples = decodeTerrainGrid(buffer, manifest);
        validateTerrainSamples(samples, manifest);
        if (controller.signal.aborted) return;
        setData({ manifest, samples });
        onStatus("ready");
        invalidate();
      } catch (error) {
        if (controller.signal.aborted) return;
        console.warn("Bounded lunar terrain unavailable; relief withheld.", error);
        onStatus("unavailable");
        invalidate();
      }
    }
    void load();
    return () => controller.abort();
  }, [invalidate, onStatus]);
  const geometry = useMemo(() => {
    if (!data) return null;
    const arrays = buildTerrainArrays(data.samples, data.manifest, exaggeration, economy ? 2 : 1);
    const mesh = new THREE.BufferGeometry();
    mesh.setAttribute("position", new THREE.BufferAttribute(arrays.positions, 3));
    mesh.setAttribute("uv", new THREE.BufferAttribute(arrays.uvs, 2));
    mesh.setIndex(arrays.indices);
    mesh.computeVertexNormals();
    mesh.computeBoundingSphere();
    return mesh;
  }, [data, exaggeration, economy]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  useEffect(() => { invalidate(); }, [geometry, texture, wireframe, invalidate]);
  return (
    <group position={[0, -0.3, 0]}>
      {geometry && <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial key={texture ? "mapped" : "neutral"} map={texture ?? undefined} color={texture ? "#e2e5de" : "#89918e"} roughness={0.96} metalness={0} wireframe={wireframe} side={THREE.DoubleSide} />
      </mesh>}
      <gridHelper args={[7.5, 15, "#315c6d", "#17313d"]} position={[0, -0.04, 0]} />
    </group>
  );
}
