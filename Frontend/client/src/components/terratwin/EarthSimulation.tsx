import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { MathUtils, AdditiveBlending, BackSide, BufferGeometry, Group, Mesh, SRGBColorSpace, TextureLoader, Vector3 } from "three";

/** Home visualization only. Blue Marble = NASA Earth Observatory composite;
 * moving clouds, orbital paths and beacons are explicitly illustrative. */
function EarthBody({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  const [surface, clouds] = useLoader(TextureLoader, ["/assets/earth-blue-marble-3072.webp", "/assets/earth-clouds-illustrative.png"]);
  const earth = useRef<Mesh>(null);
  const cloudMesh = useRef<Mesh>(null);
  const orbitOne = useRef<Group>(null);
  const orbitTwo = useRef<Group>(null);
  useMemo(() => { surface.colorSpace = SRGBColorSpace; clouds.colorSpace = SRGBColorSpace; }, [surface, clouds]);
  const points = useMemo(() => Array.from({ length: 129 }, (_, i) => {
    const angle = Math.PI * 2 * i / 128;
    return new Vector3(Math.cos(angle) * 2.19, Math.sin(angle) * 2.19, 0);
  }), []);
  const orbit = useMemo(() => new BufferGeometry().setFromPoints(points), [points]);
  useEffect(() => () => orbit.dispose(), [orbit]);
  useFrame((state, delta) => {
    if (!active || reducedMotion) return;
    const dt = Math.min(delta, 0.045);
    if (earth.current) earth.current.rotation.y += dt * 0.035;
    if (cloudMesh.current) cloudMesh.current.rotation.y += dt * 0.051;
    if (orbitOne.current) orbitOne.current.rotation.z += dt * 0.12;
    if (orbitTwo.current) orbitTwo.current.rotation.z -= dt * 0.082;
    const glow = 0.8 + Math.sin(state.clock.elapsedTime * 1.25) * 0.13;
    if (orbitOne.current) orbitOne.current.scale.setScalar(glow);
  });
  return <>
    <ambientLight intensity={0.35} color="#b2d1ed" />
    <directionalLight position={[4, 2.4, 5.5]} intensity={2.5} color="#f5e2c7" />
    <directionalLight position={[-4.8, -0.5, -4]} intensity={0.3} color="#237eae" />
    <group rotation={[MathUtils.degToRad(-18), MathUtils.degToRad(-20), MathUtils.degToRad(-7)]}>
      <mesh ref={earth} rotation={[0, -1.0, 0]}>
        <sphereGeometry args={[1.92, 96, 64]} />
        <meshStandardMaterial map={surface} roughness={0.93} metalness={0} />
      </mesh>
      <mesh ref={cloudMesh} rotation={[0, -0.95, 0]}>
        <sphereGeometry args={[1.932, 80, 56]} />
        <meshBasicMaterial map={clouds} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <mesh scale={1.07}>
        <sphereGeometry args={[1.92, 80, 56]} />
        <meshBasicMaterial color="#2689c4" transparent opacity={0.07} side={BackSide} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
    <group ref={orbitOne} rotation={[0.33, -0.36, -0.38]}>
      <lineLoop geometry={orbit}><lineBasicMaterial color="#5ad9e6" opacity={0.23} transparent depthWrite={false} /></lineLoop>
      <mesh position={[2.19, 0, 0]}><sphereGeometry args={[0.035, 10, 10]} /><meshBasicMaterial color="#b4f5fd" /></mesh>
    </group>
    <group ref={orbitTwo} rotation={[0.88, 0.31, 0.3]}>
      <lineLoop geometry={orbit}><lineBasicMaterial color="#e8a174" opacity={0.15} transparent depthWrite={false} /></lineLoop>
      <mesh position={[-2.19, 0, 0]}><sphereGeometry args={[0.023, 10, 10]} /><meshBasicMaterial color="#ffbd8e" /></mesh>
    </group>
  </>;
}

export default function EarthSimulation({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  return <div className="tt-live-earth" aria-label="Rotating NASA Blue Marble Earth with illustrative satellite-orbit simulation">
    <div className="tt-live-earth__halo" aria-hidden="true" />
    <Suspense fallback={<div className="tt-live-earth__fallback" aria-hidden="true" />}>
      <Canvas frameloop={active && !reducedMotion ? "always" : "demand"} camera={{ position: [0, 0, 6.35], fov: 43 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true, powerPreference: "low-power" }} fallback={<div className="tt-live-earth__fallback" />}>
        <EarthBody active={active} reducedMotion={reducedMotion} />
      </Canvas>
    </Suspense>
    <div className="tt-live-earth__reticle" aria-hidden="true" />
    <div className="tt-live-earth__corner tt-live-earth__corner--tl" aria-hidden="true" />
    <div className="tt-live-earth__corner tt-live-earth__corner--br" aria-hidden="true" />
    <span className="tt-live-earth__caption">EARTH / VISUAL ORBIT SIMULATION</span>
  </div>;
}
