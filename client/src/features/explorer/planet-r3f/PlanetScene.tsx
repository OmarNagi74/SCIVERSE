import PlanetFallback from "@/components/terratwin/PlanetFallback";
import { getFeaturesForBody } from "@/data/mockData";
import type { CameraAction, PlanetId } from "@/domain/terratwin";
import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { Component, type ReactNode, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Focus, Maximize2, Mountain, Orbit, Pause, Play, RotateCcw } from "lucide-react";
import * as THREE from "three";
import { clampCameraDistance, type RenderProfile } from "../renderingPolicy";
import { useScenePolicy } from "../useScenePolicy";
import type { TerrainStatus } from "./LunarTerrain";
import { usePlanetTexture, type TextureStatus } from "./usePlanetTexture";

const LunarTerrain = lazy(() => import("./LunarTerrain"));

type PlanetSceneProps = {
  body: Exclude<PlanetId, "earth">;
  selectedFeatureId: string | null;
  onSelectFeature: (id: string) => void;
  cameraAction: CameraAction;
  visualLayerEnabled: boolean;
  showFeatures?: boolean;
};

type SceneErrorBoundaryState = { hasError: boolean };
class SceneErrorBoundary extends Component<{ children: ReactNode; body: PlanetId }, SceneErrorBoundaryState> {
  state: SceneErrorBoundaryState = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? <PlanetFallback body={this.props.body} error /> : this.props.children; }
}

function positionFromCoordinate(latitude: number, longitude: number, radius = 2.39) {
  const phi = (90 - latitude) * Math.PI / 180;
  const theta = (longitude + 180) * Math.PI / 180;
  return new THREE.Vector3(-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
}

/**
 * Demand-rendered camera dolly. Globe orientation is animated by OrbitalSurface;
 * this controller moves the orbital camera smoothly without simulating data.
 * A real pointer gesture cancels any scripted flight immediately.
 */
function CameraController({ action, regional, reducedMotion, selectedFeatureId, replayFocus, userGestureNonce }: {
  action: CameraAction;
  regional: boolean;
  reducedMotion: boolean;
  selectedFeatureId: string | null;
  replayFocus: number;
  userGestureNonce: number;
}) {
  const { camera, invalidate, size } = useThree();
  const flightTarget = useRef<{ start: THREE.Vector3; destination: THREE.Vector3; elapsed: number; duration: number; sweep: number } | null>(null);
  const lastGestureNonce = useRef(userGestureNonce);
  const lastActionNonce = useRef(action.nonce);
  const homePosition = useMemo(() => {
    const aspect = size.width / Math.max(1, size.height);
    const scale = Math.max(1, 0.85 / Math.max(0.35, aspect));
    return new THREE.Vector3(0, regional ? 5.8 : 0, regional ? 7.4 : 8.2).multiplyScalar(scale);
  }, [regional, size.width, size.height]);
  const startFlight = useCallback((destination: THREE.Vector3, cinematic = false) => {
    if (reducedMotion) {
      camera.position.copy(destination);
      camera.lookAt(0, 0, 0);
      flightTarget.current = null;
    } else flightTarget.current = {
      start: camera.position.clone(), destination, elapsed: 0,
      duration: cinematic ? 1.35 : 0.65,
      sweep: cinematic ? Math.min(0.45, destination.length() * 0.07) : 0,
    };
    invalidate();
  }, [camera, invalidate, reducedMotion]);
  useEffect(() => {
    camera.position.copy(homePosition);
    camera.lookAt(0, 0, 0);
    flightTarget.current = null;
    invalidate();
  }, [camera, homePosition, invalidate]);
  useEffect(() => {
    if (regional) return;
    // A conservative dolly keeps the whole globe in view; selection rotation is
    // responsible for putting the geographic feature at the front of the globe.
    const distance = selectedFeatureId ? Math.max(6.75, homePosition.length() * 0.84) : homePosition.length();
    startFlight(camera.position.clone().normalize().multiplyScalar(clampCameraDistance(distance)), true);
  }, [selectedFeatureId, replayFocus, regional, homePosition, startFlight, camera]);
  useEffect(() => {
    if (action.nonce === lastActionNonce.current) return;
    lastActionNonce.current = action.nonce;
    const nextDistance = action.kind === "home" ? homePosition.length() : clampCameraDistance(camera.position.length() * (action.kind === "zoom-in" ? 0.78 : 1.28), regional);
    startFlight(action.kind === "home" ? homePosition.clone() : camera.position.clone().normalize().multiplyScalar(nextDistance));
  }, [action, camera, homePosition, regional, startFlight]);
  // Cancel the animated dolly if the visitor drags, rotates or pinches the planet.
  useEffect(() => {
    if (lastGestureNonce.current === userGestureNonce) return;
    lastGestureNonce.current = userGestureNonce;
    flightTarget.current = null;
  }, [userGestureNonce]);
  useFrame((_, delta) => {
    const flight = flightTarget.current;
    if (!flight) return;
    flight.elapsed += Math.min(delta, 0.05);
    const t = Math.min(1, flight.elapsed / flight.duration);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    camera.position.copy(flight.start).lerp(flight.destination, eased);
    if (flight.sweep > 0 && t < 1) {
      // A small sideways arc reads as a fly-by, while staying safely beyond
      // the sphere and landing on the same user-controlled orbital axis.
      const side = flight.destination.clone().normalize().cross(new THREE.Vector3(0, 1, 0)).normalize();
      camera.position.addScaledVector(side, Math.sin(Math.PI * t) * flight.sweep);
    }
    camera.lookAt(0, 0, 0);
    if (t >= 1) flightTarget.current = null;
    else invalidate();
  });
  return null;
}

function RenderLifecycle({ visible, animate, fps, onContextLost }: { visible: boolean; animate: boolean; fps: number; onContextLost: () => void }) {
  const { invalidate, gl } = useThree();
  useEffect(() => {
    if (!visible) return;
    invalidate();
    if (!animate) return;
    const timer = window.setInterval(() => invalidate(), 1000 / fps);
    return () => window.clearInterval(timer);
  }, [visible, animate, fps, invalidate]);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => { event.preventDefault(); onContextLost(); };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onContextLost]);
  return null;
}

function SelectionMarker({ position, selected, onSelect, reducedMotion }: { position: THREE.Vector3; selected: boolean; onSelect: () => void; reducedMotion: boolean }) {
  const ring = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { invalidate, gl } = useThree();
  const started = useRef(0);
  useEffect(() => { started.current = performance.now(); invalidate(); }, [selected, invalidate]);
  useEffect(() => { invalidate(); }, [hovered, invalidate]);
  useEffect(() => () => { gl.domElement.style.cursor = ""; }, [gl]);
  useFrame(() => {
    if (!selected || reducedMotion || !ring.current) return;
    const elapsed = (performance.now() - started.current) / 700;
    ring.current.scale.setScalar(1 + Math.sin(Math.min(elapsed, 1) * Math.PI) * 0.45);
    if (elapsed < 1) invalidate();
  });
  const quaternion = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), position.clone().normalize()), [position]);
  return (
    <group position={position} quaternion={quaternion}
      onPointerOver={(event) => { event.stopPropagation(); setHovered(true); gl.domElement.style.cursor = "pointer"; }}
      onPointerOut={() => { setHovered(false); gl.domElement.style.cursor = ""; }}
      onClick={(event) => { event.stopPropagation(); onSelect(); }}>
      <mesh><sphereGeometry args={[0.135, 10, 10]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
      <mesh><sphereGeometry args={[selected ? 0.061 : 0.042, 12, 12]} /><meshBasicMaterial color={selected ? "#ff9857" : hovered ? "#baf5f4" : "#46c7d9"} /></mesh>
      {hovered && !selected && <mesh position={[0, 0, 0.008]}><ringGeometry args={[0.092, 0.107, 32]} /><meshBasicMaterial color="#baf5f4" side={THREE.DoubleSide} transparent opacity={0.78} /></mesh>}
      {selected && <mesh ref={ring} position={[0, 0, 0.008]}><ringGeometry args={[0.095, 0.105, 40]} /><meshBasicMaterial color="#f9b082" side={THREE.DoubleSide} transparent opacity={0.85} /></mesh>}
    </group>
  );
}

function OrbitalSurface({ body, selectedFeatureId, onSelectFeature, showFeatures = true, texture, profile, rotating, reducedMotion, visible, replayFocus }: PlanetSceneProps & { texture: THREE.Texture | null; profile: RenderProfile; rotating: boolean; reducedMotion: boolean; visible: boolean; replayFocus: number }) {
  const group = useRef<THREE.Group>(null);
  const { invalidate } = useThree();
  const focusing = useRef(true);
  const features = useMemo(() => getFeaturesForBody(body), [body]);
  const selected = features.find((feature) => feature.id === selectedFeatureId);
  const target = useMemo(() => {
    const normal = selected ? positionFromCoordinate(selected.coordinate.latitude, selected.coordinate.longitude, 1) : new THREE.Vector3(0, 0, 1);
    return new THREE.Quaternion().setFromUnitVectors(normal, new THREE.Vector3(0, 0, 1));
  }, [selected]);
  useEffect(() => { focusing.current = true; invalidate(); }, [target, replayFocus, invalidate]);
  useFrame((_, delta) => {
    if (!group.current || !visible) return;
    if (focusing.current) {
      if (reducedMotion) group.current.quaternion.copy(target);
      else group.current.quaternion.slerp(target, 1 - Math.exp(-Math.min(delta, 0.06) * 6));
      focusing.current = group.current.quaternion.angleTo(target) > 0.005;
      if (focusing.current) invalidate();
    } else if (rotating && !reducedMotion) group.current.rotateY(Math.min(delta, 0.06) * (body === "moon" ? 0.025 : 0.035));
  });
  const outline = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const bounds = { west: -15, east: -7, north: -40, south: -46 };
    for (let side = 0; side < 4; side++) for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const lat = side === 0 ? bounds.north : side === 1 ? bounds.north - 6 * t : side === 2 ? bounds.south : bounds.south + 6 * t;
      const lon = side === 0 ? bounds.west + 8 * t : side === 1 ? bounds.east : side === 2 ? bounds.east - 8 * t : bounds.west;
      points.push(positionFromCoordinate(lat, lon, 2.367));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);
  useEffect(() => () => outline.dispose(), [outline]);
  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[2.35, profile.segments, profile.segments]} />
        <meshStandardMaterial key={`${body}-${texture ? "mapped" : "neutral"}`} map={texture ?? undefined} color={texture ? "#ffffff" : body === "moon" ? "#667079" : "#8a4b36"} roughness={body === "moon" ? 0.98 : 0.92} metalness={0} />
      </mesh>
      {body === "mars" && <mesh scale={1.015}><sphereGeometry args={[2.35, 48, 48]} /><meshBasicMaterial color="#d68359" transparent opacity={0.08} side={THREE.BackSide} depthWrite={false} /></mesh>}
      {showFeatures && body === "moon" && <lineLoop geometry={outline}><lineBasicMaterial color="#46c7d9" transparent opacity={0.9} /></lineLoop>}
      {showFeatures && features.map((feature) => <SelectionMarker key={feature.id} position={positionFromCoordinate(feature.coordinate.latitude, feature.coordinate.longitude)} selected={feature.id === selectedFeatureId} onSelect={() => onSelectFeature(feature.id)} reducedMotion={reducedMotion} />)}
    </group>
  );
}

function SceneContents(props: PlanetSceneProps & { profile: RenderProfile; visible: boolean; rotating: boolean; regional: boolean; exaggeration: number; wireframe: boolean; reducedMotion: boolean; sunAngle: number; replayFocus: number; userGestureNonce: number; onCameraGesture: () => void; onTextureStatus: (status: TextureStatus) => void; onTerrainStatus: (status: TerrainStatus) => void; onContextLost: () => void }) {
  const texture = usePlanetTexture(props.body, props.profile.textureSize, props.visualLayerEnabled, props.onTextureStatus);
  const angle = props.sunAngle * Math.PI / 180;
  return (
    <>
      <color attach="background" args={["#07101a"]} />
      <ambientLight intensity={props.regional ? 0.25 : 0.32} color="#b9cddd" />
      <directionalLight position={props.regional ? [Math.sin(angle) * 7, 2.8, Math.cos(angle) * 7] : [5, 3, 5]} intensity={props.regional ? 2.4 : 2.15} color={props.body === "moon" ? "#fff0dc" : "#ffdbbd"} castShadow={props.regional && props.profile.tier !== "economy"} shadow-mapSize={[1024, 1024]} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} shadow-bias={-0.001} />
      <directionalLight position={[-5, 1, -4]} intensity={0.45} color={props.body === "moon" ? "#809bae" : "#d67c51"} />
      {!props.regional && <Stars radius={32} depth={22} count={props.profile.stars} factor={2.1} saturation={0} fade speed={0} />}
      {props.regional ? <Suspense fallback={null}><LunarTerrain texture={texture} exaggeration={props.exaggeration} economy={props.profile.tier === "economy"} wireframe={props.wireframe} onStatus={props.onTerrainStatus} /></Suspense> : <OrbitalSurface {...props} texture={texture} />}
      <OrbitControls enablePan={props.regional} enableDamping dampingFactor={0.09} minDistance={props.regional ? 3 : 3.5} maxDistance={props.regional ? 24 : 20} maxPolarAngle={props.regional ? Math.PI * 0.48 : Math.PI} onStart={props.onCameraGesture} />
      <CameraController action={props.cameraAction} regional={props.regional} reducedMotion={props.reducedMotion} selectedFeatureId={props.selectedFeatureId} replayFocus={props.replayFocus} userGestureNonce={props.userGestureNonce} />
      <RenderLifecycle visible={props.visible} animate={props.rotating && !props.regional && !props.reducedMotion} fps={props.profile.fps} onContextLost={props.onContextLost} />
    </>
  );
}

export default function PlanetScene(props: PlanetSceneProps) {
  const reducedMotion = Boolean(useReducedMotion());
  const { hostRef, visible, profile } = useScenePolicy(reducedMotion);
  const [textureStatus, setTextureStatus] = useState<TextureStatus>("loading");
  const [terrainStatus, setTerrainStatus] = useState<TerrainStatus>("loading");
  const [regional, setRegional] = useState(false);
  const [rotating, setRotating] = useState(!reducedMotion);
  const [exaggeration, setExaggeration] = useState(3);
  const [wireframe, setWireframe] = useState(false);
  const [sunAngle, setSunAngle] = useState(115);
  const [lost, setLost] = useState(false);
  const [retry, setRetry] = useState(0);
  const [replayFocus, setReplayFocus] = useState(0);
  const [userGestureNonce, setUserGestureNonce] = useState(0);
  const priorSelection = useRef(props.selectedFeatureId);
  const onContextLost = useCallback(() => setLost(true), []);
  const onCameraGesture = useCallback(() => setUserGestureNonce((count) => count + 1), []);
  useEffect(() => { setRegional(false); setLost(false); setTextureStatus("loading"); }, [props.body]);
  useEffect(() => {
    if (priorSelection.current !== props.selectedFeatureId) { setRotating(false); setRegional(false); }
    priorSelection.current = props.selectedFeatureId;
  }, [props.selectedFeatureId]);
  const selectedTitle = getFeaturesForBody(props.body).find((feature) => feature.id === props.selectedFeatureId)?.title;
  const replayTargetFocus = () => { setRotating(false); setReplayFocus((count) => count + 1); };
  return (
    <div ref={hostRef} className={`r3f-scene ${regional ? "r3f-scene--regional" : ""}`} aria-label={`${props.body === "moon" ? "Lunar" : "Martian"} interactive surface visualization`}>
      {lost ? <><PlanetFallback body={props.body} error /><button className="scene-retry" onClick={() => { setLost(false); setRetry((value) => value + 1); }}><RotateCcw size={14} /> RETRY 3D VIEW</button></> : <SceneErrorBoundary key={`${props.body}-${regional}-${retry}`} body={props.body}>
        <Canvas camera={{ position: regional ? [0, 5.8, 7.4] : [0, 0, 8.2], fov: 40 }} key={`${props.body}-${regional}-${retry}`} dpr={profile.dpr} shadows={regional && profile.tier !== "economy"} frameloop="demand" gl={{ antialias: profile.tier !== "economy", alpha: false, powerPreference: "default" }} fallback={<PlanetFallback body={props.body} error />}>
          <SceneContents {...props} profile={profile} visible={visible} rotating={rotating} regional={regional} exaggeration={exaggeration} wireframe={wireframe} reducedMotion={reducedMotion} sunAngle={sunAngle} onTextureStatus={setTextureStatus} onTerrainStatus={setTerrainStatus} onContextLost={onContextLost} replayFocus={replayFocus} userGestureNonce={userGestureNonce} onCameraGesture={onCameraGesture} />
        </Canvas>
      </SceneErrorBoundary>}
      <div className="planet-scene-controls" aria-label="Planet visualization settings">
        {props.body === "moon" && <div className="scene-mode-switch" role="group" aria-label="Lunar view mode">
          <button type="button" className={!regional ? "is-active" : ""} aria-pressed={!regional} onClick={() => setRegional(false)}><Orbit size={13} /> ORBITAL</button>
          <button type="button" className={regional ? "is-active" : ""} aria-pressed={regional} disabled={props.selectedFeatureId !== "moon-tycho"} title={props.selectedFeatureId !== "moon-tycho" ? "Select Tycho crater context before viewing this bounded terrain patch." : "Open the source-bounded Tycho terrain proof."} onClick={() => { setRegional(true); setRotating(false); }}><Mountain size={13} /> TYCHO RELIEF</button>
        </div>}
        {!regional && props.selectedFeatureId && <button type="button" className="scene-focus-control" onClick={replayTargetFocus} aria-label={`Fly camera to ${selectedTitle ?? "selected region"}`} title="Replay guided focus on the selected planetary region"><Focus size={13} /> FOCUS REGION</button>}
        {!regional && <button type="button" className="scene-motion-toggle" aria-pressed={rotating && !reducedMotion} disabled={reducedMotion} onClick={() => setRotating((value) => !value)}>{rotating && !reducedMotion ? <Pause size={12} /> : <Play size={12} />} {reducedMotion ? "REDUCED MOTION" : rotating ? "PAUSE ROTATION" : "ROTATE PLANET"}</button>}
      </div>
      {regional && <div className="terrain-instrument" aria-label="Bounded lunar terrain controls">
        <div><span className="eyebrow">TYCHO / REGIONAL RELIEF PROOF</span><strong>LOLA + SELENE · SLDEM2015</strong></div>
        <p>40°–46°S · 15°–7°W · sampled static DEM · no terrain outside this patch</p>
        <div className="terrain-instrument__controls">
          <label>RELIEF <select aria-label="Terrain vertical exaggeration" value={exaggeration} onChange={(event) => setExaggeration(Number(event.target.value))}><option value={1}>1× true relative scale</option><option value={3}>3× visual exaggeration</option><option value={6}>6× visual exaggeration</option></select></label>
          <label>LIGHT <input aria-label="Terrain light direction" type="range" min={0} max={360} step={5} value={sunAngle} onChange={(event) => setSunAngle(Number(event.target.value))} /></label>
          <button type="button" aria-pressed={wireframe} onClick={() => setWireframe((value) => !value)}><Maximize2 size={12} /> {wireframe ? "SOLID" : "MESH"}</button>
        </div>
        <small>Source heights drive geometry. Coarse GLD100 color is aligned by geographic UVs, not image-matched. Display light is illustrative; no measurement or site assessment is provided.</small>
      </div>}
      {((textureStatus === "loading" || textureStatus === "unavailable") || (regional && terrainStatus !== "ready")) && <div className={`planet-texture-status ${textureStatus === "unavailable" || terrainStatus === "unavailable" ? "is-unavailable" : ""}`} role="status" aria-live="polite">{regional && terrainStatus === "unavailable" ? "TERRAIN ASSET UNAVAILABLE — RELIEF WITHHELD" : regional && terrainStatus === "loading" ? "LOADING LOCAL SOURCE-DERIVED TERRAIN" : textureStatus === "unavailable" ? "COLOR TEXTURE UNAVAILABLE — COLOR DETAIL WITHHELD" : "LOADING LOCAL VISUAL TEXTURE"}</div>}
      <div className="render-quality-readout">{profile.tier.toUpperCase()} · {regional ? "REGIONAL DEM" : textureStatus === "preview" ? "PREVIEW → DETAIL" : `${profile.textureSize}px VISUAL`} · {visible ? "DEMAND RENDER" : "PAUSED"}</div>
      <span className="sr-only" aria-live="polite">{selectedTitle ? `Selected ${selectedTitle}. ` : ""}{regional ? `Bounded Tycho terrain. ${exaggeration} times vertical display exaggeration.` : "Orbital visual context."}</span>
    </div>
  );
}
