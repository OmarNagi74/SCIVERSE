import { useExplorer } from "@/app/ExplorerContext";
import { ArrowRight, ArrowUpRight, CheckCircle2, Compass, Earth, Layers3, ScanSearch } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface LandingStoryProps { reduceMotion: boolean; onChooseTarget: () => void }

const chapters = [
  { number: "01", id: "tt-story-reference", title: "Pick a world", short: "SELECT" },
  { number: "02", id: "tt-story-discovery", title: "Find Earth sites", short: "DISCOVER" },
  { number: "03", id: "tt-story-comparison", title: "Compare evidence", short: "COMPARE" },
] as const;

function ReferenceVisual() {
  return <div className="tt-story-scene tt-story-scene--reference" role="img" aria-label="Illustration of Moon and Mars reference selection">
    <div className="tt-scene__scope"><span /><span /><span /><span /></div>
    <div className="tt-scene__orbit tt-scene__orbit--one" /><div className="tt-scene__orbit tt-scene__orbit--two" />
    <div className="tt-scene__planet tt-scene__planet--moon"><span>MOON</span></div>
    <div className="tt-scene__planet tt-scene__planet--mars"><span>MARS</span></div>
    <div className="tt-scene__target"><i /><span>CHOOSE A PLANETARY REFERENCE</span></div>
    <div className="tt-scene__caption">ILLUSTRATIVE / NOT TO SCALE</div>
  </div>;
}

function DiscoveryVisual() {
  return <div className="tt-story-scene tt-story-scene--discovery" role="img" aria-label="Illustrative Earth map with possible study-location markers">
    <div className="tt-scene__earth-disk"><div className="tt-scene__earth-lines" /><div className="tt-scene__earth-texture" />
      <i className="tt-scene__pin tt-scene__pin--one" /><i className="tt-scene__pin tt-scene__pin--two" /><i className="tt-scene__pin tt-scene__pin--three" />
      <div className="tt-scene__earth-sweep" />
    </div>
    <span className="tt-scene__discovery-id">EARTH / STUDY AREA DISCOVERY</span>
    <span className="tt-scene__discovery-tag">DESERT · VOLCANIC · POLAR</span>
    <span className="tt-scene__caption">SCHEMATIC / NOT DATA OUTPUT</span>
  </div>;
}

function ComparisonVisual() {
  return <div className="tt-story-scene tt-story-scene--comparison" role="img" aria-label="Illustration of evidence comparison and limitations">
    <div className="tt-scene__comparison-head"><span>PLANETARY REFERENCE</span><span>EARTH CANDIDATE</span></div>
    <div className="tt-scene__comparison-orbs"><div className="tt-scene__comparison-orb tt-scene__comparison-orb--mars" /><div className="tt-scene__comparison-line"><span /></div><div className="tt-scene__comparison-orb tt-scene__comparison-orb--earth" /></div>
    <div className="tt-scene__metric-label">WHAT MATCHES — AND WHAT DOESN'T?</div>
    <div className="tt-scene__metrics" aria-hidden="true"><div><span>TERRAIN</span><i /><b /></div><div><span>GEOLOGY</span><i /><b /></div><div><span>ENVIRONMENT</span><i /><b /></div></div>
    <div className="tt-scene__evidence"><CheckCircle2 size={15} /><span>EVIDENCE BEFORE SCORES</span></div>
    <span className="tt-scene__caption">ILLUSTRATIVE / NO SIMILARITY CLAIM</span>
  </div>;
}

const chapterReveal = (reduceMotion: boolean, delay = 0) => ({
  initial: reduceMotion ? false as const : { opacity: 0, y: 46 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.27 },
  transition: { duration: reduceMotion ? 0 : 0.75, delay, ease: [0.22, 0.68, 0.16, 1] as const },
});

export default function LandingStory({ reduceMotion, onChooseTarget }: LandingStoryProps) {
  const { reference } = useExplorer();
  const [activeIndex, setActiveIndex] = useState(0);
  const discoveryRoute = reference ? `/discovery?referenceId=${encodeURIComponent(reference.id)}` : "/discovery";

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      const shown = entries.filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (shown.length) {
        const found = chapters.findIndex((chapter) => chapter.id === shown[0].target.id);
        if (found >= 0) setActiveIndex(found);
      }
    }, { threshold: [0.12, 0.3, 0.5], rootMargin: "-12% 0px -28% 0px" });
    chapters.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  return <>
    <section id="landing-method" className="tt-story-intro" aria-labelledby="tt-story-intro-title">
      <motion.div {...chapterReveal(reduceMotion)}>
        <span className="tt-overline"><span className="tt-signal-dot" /> HOW SCIVERSE WORKS</span>
        <h2 id="tt-story-intro-title">One question. <em>Three steps.</em><br />A whole new perspective.</h2>
        <p>SciVerse connects a planetary reference to possible Earth study environments. Here is the exact journey you'll take—nothing hidden behind a complicated dashboard.</p>
      </motion.div>
      <a className="tt-story-intro__jump" href="#tt-story-reference">EXPLORE THE JOURNEY <ArrowRight size={17} /></a>
    </section>
    <section className="tt-story" aria-label="How to use SciVerse">
      <nav className="tt-story__rail" aria-label="Story chapters">
        <span>MISSION ROUTE</span>
        {chapters.map((chapter, index) => <a key={chapter.id} href={`#${chapter.id}`} className={index === activeIndex ? "is-active" : ""} aria-current={index === activeIndex ? "step" : undefined}>
          <b>{chapter.number}</b><span>{chapter.short}</span><i /></a>)}
        <small>SCROLL TO EXPLORE</small>
      </nav>
      <div className="tt-story__chapters">
        <article className={`tt-story-chapter tt-story-chapter--moon${activeIndex === 0 ? " is-active" : ""}`} id="tt-story-reference">
          <div className="tt-story-chapter__copy">
            <motion.div {...chapterReveal(reduceMotion)}><span className="tt-story-chapter__eyebrow">01 / BEGIN WITH A QUESTION</span><h3>First, choose <em>another world.</em></h3></motion.div>
            <motion.p {...chapterReveal(reduceMotion, 0.1)}>Explore the Moon or Mars, select a reference region, and define what you want to investigate. The planet is the starting point—not the answer.</motion.p>
            <motion.div {...chapterReveal(reduceMotion, 0.2)} className="tt-story-chapter__actions">
              <button type="button" className="tt-story-chapter__primary" onClick={onChooseTarget}>CHOOSE YOUR WORLD <ArrowUpRight size={17} /></button>
              <span>MOON · MARS</span>
            </motion.div>
          </div>
          <motion.div {...chapterReveal(reduceMotion, 0.12)} className="tt-story-chapter__visual"><ReferenceVisual /></motion.div>
        </article>
        <article className={`tt-story-chapter tt-story-chapter--earth${activeIndex === 1 ? " is-active" : ""}`} id="tt-story-discovery">
          <div className="tt-story-chapter__copy">
            <motion.div {...chapterReveal(reduceMotion)}><span className="tt-story-chapter__eyebrow">02 / SEARCH OUR PLANET</span><h3>Find the <em>Earth connection.</em></h3></motion.div>
            <motion.p {...chapterReveal(reduceMotion, 0.1)}>Discover potential analog environments on Earth. Filter by terrain, geology, environment, and the needs of a real exploration mission.</motion.p>
            <motion.div {...chapterReveal(reduceMotion, 0.2)} className="tt-story-chapter__actions">
              <Link className="tt-story-chapter__primary" to={discoveryRoute}>OPEN EARTH DISCOVERY <ArrowUpRight size={17} /></Link>
              <span>DATASET CANDIDATES</span>
            </motion.div>
          </div>
          <motion.div {...chapterReveal(reduceMotion, 0.12)} className="tt-story-chapter__visual"><DiscoveryVisual /></motion.div>
        </article>
        <article className={`tt-story-chapter tt-story-chapter--compare${activeIndex === 2 ? " is-active" : ""}`} id="tt-story-comparison">
          <div className="tt-story-chapter__copy">
            <motion.div {...chapterReveal(reduceMotion)}><span className="tt-story-chapter__eyebrow">03 / GO BEYOND APPEARANCE</span><h3>See what matches. <em>And what doesn't.</em></h3></motion.div>
            <motion.p {...chapterReveal(reduceMotion, 0.1)}>Compare scientific dimensions and limitations side by side. An analog should explain where it can help an exploration mission—and where the analogy breaks down.</motion.p>
            <motion.div {...chapterReveal(reduceMotion, 0.2)} className="tt-story-chapter__actions">
              <Link className="tt-story-chapter__primary" to="/compare">ENTER COMPARISON LAB <ArrowUpRight size={17} /></Link>
              <span>NO INVENTED SCORES</span>
            </motion.div>
          </div>
          <motion.div {...chapterReveal(reduceMotion, 0.12)} className="tt-story-chapter__visual"><ComparisonVisual /></motion.div>
        </article>
      </div>
    </section>
    <section className="tt-story-finale" aria-labelledby="tt-story-finale-title">
      <div className="tt-story-finale__stars" aria-hidden="true" />
      <motion.div {...chapterReveal(reduceMotion)} className="tt-story-finale__content">
        <span className="tt-overline"><span className="tt-signal-dot" /> MISSION READY</span>
        <h2 id="tt-story-finale-title">The next world<br />begins <em>right here.</em></h2>
        <p>Start with the Moon or Mars. Follow the evidence back to Earth.</p>
        <div className="tt-story-finale__actions">
          <button type="button" className="mission-button mission-button--primary" onClick={onChooseTarget}>START EXPLORING <ArrowUpRight size={16} /></button>
          <Link className="mission-button mission-button--secondary" to="/mission">THE SCIENCE BEHIND IT <ArrowRight size={16} /></Link>
        </div>
        <span className="tt-story-finale__footer"><Compass size={15} /> EXPLORE <ArrowRight size={13} /> <Earth size={15} /> DISCOVER <ArrowRight size={13} /> <ScanSearch size={15} /> COMPARE <ArrowRight size={13} /> <Layers3 size={15} /> UNDERSTAND</span>
      </motion.div>
    </section>
  </>;
}
