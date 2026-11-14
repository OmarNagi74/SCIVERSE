import { AppHeader, SciVerseGlyph } from "@/components/terratwin/AppChrome";
import DestinationChooser from "@/components/terratwin/DestinationChooser";
import LandingStory from "@/components/terratwin/LandingStory";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, Compass, Orbit, ScanSearch, Sparkles } from "lucide-react";
import { motion, useAnimationControls, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./home-story.css";

const heroArtwork = "/assets/terratwin-hero.webp";
const cinematicEase = [0.22, 0.68, 0.16, 1] as const;
type Destination = "moon" | "mars";

function useLandingReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(preference.matches);
    update();
    if (typeof preference.addEventListener === "function") preference.addEventListener("change", update);
    else preference.addListener(update);
    return () => {
      if (typeof preference.removeEventListener === "function") preference.removeEventListener("change", update);
      else preference.removeListener(update);
    };
  }, []);

  return reduced;
}

const pathSteps = [
  { number: "01", text: "SELECT A WORLD", icon: Orbit, anchor: "#tt-story-reference" },
  { number: "02", text: "FIND EARTH SITES", icon: Compass, anchor: "#tt-story-discovery" },
  { number: "03", text: "COMPARE EVIDENCE", icon: ScanSearch, anchor: "#tt-story-comparison" },
] as const;

export default function Home() {
  const navigate = useNavigate();
  const reduceMotion = useLandingReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const mounted = useRef(true);
  const activationLock = useRef(false);
  const navigationDone = useRef(false);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ambientVisible, setAmbientVisible] = useState(true);
  const [pointerAllowed, setPointerAllowed] = useState(false);
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [departingTo, setDepartingTo] = useState<Destination | null>(null);
  const [artworkAvailable, setArtworkAvailable] = useState(true);
  const scene = useAnimationControls();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 38, damping: 24, mass: 1.2 });
  const smoothY = useSpring(pointerY, { stiffness: 38, damping: 24, mass: 1.2 });
  const farX = useTransform(smoothX, (value) => value * 0.25);
  const farY = useTransform(smoothY, (value) => value * 0.25);
  const nearX = useTransform(smoothX, (value) => value * 0.8);
  const nearY = useTransform(smoothY, (value) => value * 0.8);
  const starX = useTransform(smoothX, (value) => value * -0.35);
  const starY = useTransform(smoothY, (value) => value * -0.35);
  const { scrollYProgress } = useScroll();
  const motionActive = ambientVisible && !reduceMotion && !departingTo && !destinationOpen;
  const departing = departingTo !== null;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (navigationTimer.current) clearTimeout(navigationTimer.current);
      scene.stop();
      smoothX.stop();
      smoothY.stop();
    };
  }, [scene, smoothX, smoothY]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setPointerAllowed(finePointer.matches && !reduceMotion);
    update();
    if (typeof finePointer.addEventListener === "function") finePointer.addEventListener("change", update);
    else finePointer.addListener(update);
    return () => {
      if (typeof finePointer.removeEventListener === "function") finePointer.removeEventListener("change", update);
      else finePointer.removeListener(update);
    };
  }, [reduceMotion]);

  useEffect(() => {
    let heroIsPrimaryView = true;
    const sync = () => setAmbientVisible(heroIsPrimaryView && document.visibilityState !== "hidden");
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      heroIsPrimaryView = Boolean(entry?.isIntersecting && (entry.intersectionRatio ?? 0) >= 0.45);
      sync();
    }, { threshold: [0, 0.45, 1] });
    if (heroRef.current) observer?.observe(heroRef.current);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  useEffect(() => {
    if (!motionActive || !pointerAllowed) {
      pointerX.jump(0); pointerY.jump(0); smoothX.jump(0); smoothY.jump(0);
    }
  }, [motionActive, pointerAllowed, pointerX, pointerY, smoothX, smoothY]);

  useEffect(() => {
    if (activationLock.current) return;
    if (reduceMotion) scene.set({ scale: 1, x: 0, y: 0 });
    else void scene.start({ scale: 1, x: 0, y: 0, transition: { duration: 2.8, ease: cinematicEase } });
  }, [reduceMotion, scene]);

  function movePointer(event: PointerEvent<HTMLElement>) {
    if (!pointerAllowed || !motionActive || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 12);
    pointerY.set(((event.clientY - bounds.top) / bounds.height - 0.5) * 8);
  }

  function resetPointer() { pointerX.set(0); pointerY.set(0); }
  function openMissionChooser() { if (!activationLock.current) setDestinationOpen(true); }

  async function startExploration(target: Destination) {
    if (activationLock.current) return;
    activationLock.current = true;
    setDestinationOpen(false);
    setDepartingTo(target);
    resetPointer();
    // Warm the existing lazy route. The destination is always chosen explicitly.
    void import("@/pages/ExplorerPage").catch(() => undefined);
    const finish = () => {
      if (!mounted.current || navigationDone.current) return;
      navigationDone.current = true;
      if (navigationTimer.current) clearTimeout(navigationTimer.current);
      navigate(`/explorer/${target}`);
    };
    navigationTimer.current = setTimeout(finish, reduceMotion ? 0 : 1150);
    try {
      await scene.start(reduceMotion
        ? { scale: 1, transition: { duration: 0 } }
        : { scale: 1.085, x: "-1%", y: "1%", transition: { duration: 0.7, ease: cinematicEase } });
    } finally { finish(); }
  }

  function reveal(delay: number, masked = false) {
    return {
      initial: reduceMotion ? false as const : { opacity: masked ? 1 : 0, y: masked ? "108%" : 10, rotate: masked ? 1.5 : 0 },
      animate: { opacity: 1, y: 0, rotate: 0 },
      transition: { duration: masked ? 0.95 : 0.7, delay: reduceMotion ? 0 : delay, ease: cinematicEase },
    };
  }

  return (
    <main className={`landing-page landing-page--cinematic tt-home${departing ? " is-departing" : ""}`} data-ambient={motionActive ? "running" : "paused"} data-reduced-motion={reduceMotion ? "true" : "false"}>
      <motion.div className="tt-home__reading-line" style={{ scaleX: scrollYProgress }} aria-hidden="true" />
      <motion.div className="landing-navigation" inert={departing} aria-hidden={departing} {...reveal(1.5)}><AppHeader /></motion.div>
      <section ref={heroRef} className="landing-hero tt-hero" onPointerMove={movePointer} onPointerLeave={resetPointer}>
        <motion.div className="landing-stage" initial={reduceMotion ? false : { scale: 1.035 }} animate={scene} aria-hidden="true">
          {artworkAvailable && <>
            <motion.div className="landing-plane landing-plane--far" style={{ x: farX, y: farY }}><div className="landing-ambient landing-ambient--far"><img src={heroArtwork} alt="" fetchPriority="high" onError={() => setArtworkAvailable(false)} /></div></motion.div>
            <motion.div className="landing-plane landing-plane--near" style={{ x: nearX, y: nearY }}><div className="landing-ambient landing-ambient--near"><img src={heroArtwork} alt="" /></div></motion.div>
          </>}
          <motion.div className="landing-star-plane" style={{ x: starX, y: starY }}><div className="landing-star-drift landing-star-drift--far" /><div className="landing-star-drift landing-star-drift--near" /></motion.div>
          <div className="landing-stage__light" /><div className="landing-stage__vignette" />
        </motion.div>
        <div className="landing-hero__noise" aria-hidden="true" />
        <div className="landing-hero__orbit landing-hero__orbit--one" aria-hidden="true" />
        <div className="landing-hero__orbit landing-hero__orbit--two" aria-hidden="true" />
        <div className="tt-hero__light-sweep" aria-hidden="true" />
        <div className="tt-hero__signal tt-hero__signal--moon" aria-hidden="true"><i /><span>MOON / REFERENCE</span></div>
        <div className="tt-hero__signal tt-hero__signal--earth" aria-hidden="true"><i /><span>EARTH / FIELD LAB</span></div>
        <div className="tt-hero__floating-ui" aria-hidden="true"><span className="tt-overline"><span className="tt-signal-dot" /> VISUAL LINK / PROTOTYPE</span><b>EARTH ↔ SPACE</b><small>CHOOSE · DISCOVER · COMPARE</small><div><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></div>
        <motion.div className="landing-hero__content" inert={departing} aria-hidden={departing} animate={departing && !reduceMotion ? { opacity: 0, y: -8 } : { opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: cinematicEase }}>
          <motion.div className="landing-hero__serial" {...reveal(0.1)}><SciVerseGlyph compact /><span>EARTH × MOON × MARS / EXPLORATION</span><i aria-hidden="true" /></motion.div>
          <motion.p className="landing-hero__eyebrow" {...reveal(0.22)}><span className="tt-signal-dot" /> YOUR JOURNEY THROUGH THE SOLAR SYSTEM</motion.p>
          <h1 aria-label="Explore the Moon and Mars. Discover their connections to Earth.">
            <span className="landing-title-mask" aria-hidden="true"><motion.span {...reveal(0.34, true)}>THE NEXT WORLD</motion.span></span>
            <span className="landing-title-mask" aria-hidden="true"><motion.span {...reveal(0.56, true)}>STARTS <em>RIGHT</em></motion.span></span>
            <span className="landing-title-mask" aria-hidden="true"><motion.span {...reveal(0.78, true)}><em>HERE.</em></motion.span></span>
          </h1>
          <motion.p className="landing-hero__lede" {...reveal(1.04)}>Choose a place on the <strong>Moon or Mars.</strong> Discover similar environments on <strong>Earth.</strong> Compare what science can—and can't—tell us.</motion.p>
          <div className="landing-hero__actions">
            <motion.div className="landing-action-reveal" {...reveal(1.25)}><button type="button" className="mission-button mission-button--primary landing-start tt-hero__main-cta" onClick={openMissionChooser} disabled={departing} aria-describedby="landing-handoff-note"><span>START EXPLORING</span><ArrowUpRight size={17} aria-hidden="true" /></button></motion.div>
            <motion.div className="landing-action-reveal" {...reveal(1.45)}><a className="mission-button mission-button--secondary" href="#landing-method">SEE HOW IT WORKS <ArrowDownRight size={16} aria-hidden="true" /></a></motion.div>
          </div>
          <motion.div className="tt-hero__trust" {...reveal(1.65)}><span><Check size={13} /> NO ACCOUNT NEEDED</span><span><Sparkles size={13} /> INTERACTIVE 3D</span><span>BACKEND DATA · EVIDENCE LIMITS</span></motion.div>
        </motion.div>
        <div className="tt-hero__route" aria-label="Three steps to explore SciVerse">
          {pathSteps.map(({ number, text, icon: Icon, anchor }, index) => <a href={anchor} key={number} className="tt-hero__route-step"><span className="tt-hero__route-no">{number}</span><Icon size={18} aria-hidden="true" /><span>{text}</span>{index < pathSteps.length - 1 && <ArrowRight size={14} className="tt-hero__route-arrow" aria-hidden="true" />}</a>)}
        </div>
        <a className="landing-hero__scroll tt-hero__scroll" href="#landing-method" aria-label="Scroll to see how SciVerse works"><span>SCROLL TO DISCOVER</span><i aria-hidden="true"><b /></i></a>
        <p className="sr-only" id="landing-handoff-note">Choose Moon or Mars, then select a reference region in the Explorer. A guided tour is also available in the header.</p>
      </section>
      <LandingStory reduceMotion={reduceMotion} onChooseTarget={openMissionChooser} />
      <div className="tt-home-footer"><span>SCIVERSE / PLANETARY ANALOG DISCOVERY</span><span>RESEARCH PROTOTYPE · ILLUSTRATIVE WORKFLOW</span><Link to="/mission">EXPLORE THE MISSION <ArrowUpRight size={13} /></Link></div>
      <DestinationChooser open={destinationOpen && !departing} onClose={() => setDestinationOpen(false)} onSelect={(destination) => void startExploration(destination)} reduceMotion={reduceMotion} />
      {departingTo && <motion.div className={`landing-departure tt-home-departure tt-home-departure--${departingTo}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.33, ease: cinematicEase }} aria-hidden="true">
        <div className="tt-home-departure__orb" aria-hidden="true" />
        <div className="landing-departure__label"><span>DESTINATION CONFIRMED / TRANSFERRING VIEW</span><strong>OPENING {departingTo === "moon" ? "LUNAR" : "MARTIAN"} EXPLORER</strong><i /></div>
      </motion.div>}
      <span className="sr-only" role="status" aria-live="polite">{departingTo ? `Opening ${departingTo} exploration workspace.` : ""}</span>
    </main>
  );
}
