import { AppHeader, StatusBadge } from "@/components/terratwin/AppChrome";
import { ArrowDown, ArrowUpRight, CircleDot, Compass, Globe2, Orbit, Scale, Telescope } from "lucide-react";
import { Link } from "react-router-dom";

export default function MissionPage() {
  return (
    <main className="mission-page">
      <AppHeader />
      <div className="mission-page__grid" />
      <section className="mission-page__hero">
        <p className="eyebrow">MISSION OVERVIEW / SCIVERSE</p>
        <h1>PREPARE ON EARTH.<br /><em>QUESTION</em> BEYOND IT.</h1>
        <p>SciVerse is an interactive research-exploration prototype for framing a careful question: which terrestrial environments may be useful analogs for a selected lunar or Martian context, and where does that analogy break down?</p>
        <Link to="/explorer/moon" className="mission-button mission-button--primary">OPEN REFERENCE EXPLORER <ArrowUpRight size={16} /></Link>
      </section>
      <section className="mission-cinematic" aria-label="Journey from planetary research to Earth exploration"><div className="mission-cinematic__copy"><span className="eyebrow">THE QUESTION / 01</span><h2>WORLD'S APART.<br /><em>CONNECTED BY SCIENCE.</em></h2><p>We cannot reproduce the Moon or Mars on Earth. We can investigate specific environments and processes that help us test the next generation of exploration technologies.</p><a href="#mission-flow">FOLLOW THE SCIENTIFIC PATH <ArrowDown size={15} /></a></div><div className="mission-cinematic__scene" aria-hidden="true"><div className="mission-cinematic__body mission-cinematic__body--mars"/><div className="mission-cinematic__orbit"><span>OBSERVE</span><i/><span>COMPARE</span></div><div className="mission-cinematic__body mission-cinematic__body--earth"/></div></section>
      <section id="mission-flow" className="mission-flow"><div className="mission-flow__heading"><p className="eyebrow">FROM REFERENCE TO RESEARCH / 02</p><h2>One connected <em>exploration journey.</em></h2><p>Each step is an invitation to investigate; none implies a precomputed match.</p></div><div className="mission-flow__steps"><article><span>01</span><Orbit size={26}/><h3>Choose a world.</h3><p>Identify a specific lunar or Martian reference context and the question your mission needs to answer.</p><Link to="/explorer/mars">OPEN EXPLORER <ArrowUpRight size={14}/></Link></article><article><span>02</span><Globe2 size={26}/><h3>Search Earth.</h3><p>Inspect candidate environments and query the backend catalog by mission purpose and region.</p><Link to="/discovery">GLOBAL DISCOVERY <ArrowUpRight size={14}/></Link></article><article><span>03</span><Telescope size={26}/><h3>Inspect evidence.</h3><p>Trace what is known, what remains missing, and which measurements would be required for assessment.</p><Link to="/discovery">SITE DOSSIERS <ArrowUpRight size={14}/></Link></article><article><span>04</span><Scale size={26}/><h3>Explain the limits.</h3><p>Compare by dimension and communicate the boundary of every analogy without unsupported scores.</p><Link to="/compare">COMPARISON LAB <ArrowUpRight size={14}/></Link></article></div></section>
      <section className="mission-page__principles">
        <article><Compass size={22} /><span className="eyebrow">01 / CONTEXT</span><h2>Start with a place, not a slogan.</h2><p>Choose a planetary reference and make its coordinate convention, visual layers, and selection context visible.</p></article>
        <article><Scale size={22} /><span className="eyebrow">02 / COMPARISON</span><h2>Compare dimensions, not worlds.</h2><p>Geology, terrain, thermal context, resources, and operational questions need distinct evidence and different caveats.</p></article>
        <article><Telescope size={22} /><span className="eyebrow">03 / EVIDENCE</span><h2>Keep uncertainty in the interface.</h2><p>A favorable visual similarity is not a scientific result. Every claimed relationship must show its source, method, and limitation.</p></article>
      </section>
      <section className="mission-boundary"><div><span className="eyebrow">SCIENTIFIC BOUNDARY / 03</span><h2>Similar terrain.<br /><em>Different worlds.</em></h2></div><div className="mission-boundary__grid"><article><CircleDot size={18}/><span>EARTH</span><strong>Field testing</strong><p>Natural landscapes, accessible samples and a laboratory for operations.</p></article><article><CircleDot size={18}/><span>MOON</span><strong>Vacuum + reduced gravity</strong><p>Conditions an Earth site cannot reproduce without additional testing.</p></article><article><CircleDot size={18}/><span>MARS</span><strong>Thin atmosphere + cold</strong><p>Environmental factors require dedicated simulation and careful interpretation.</p></article></div></section>
      <section id="method" className="mission-page__method">
        <div><span className="eyebrow">SCIENTIFIC INTEGRITY</span><h2>Demo data is a design tool, not a measurement.</h2></div>
        <div className="mission-page__method-copy"><StatusBadge status="hypothesis" /><p>The explorer, discovery, site profiles, and comparisons load backend dataset records and model results. Scores are exploratory dataset percentiles, not validated scientific matches. Missing measurements and provenance limitations remain visible.</p></div>
      </section>
      <footer className="mission-page__footer">SCIVERSE IS AN INDEPENDENT PROTOTYPE. IT IS NOT AN OFFICIAL NASA PRODUCT.</footer>
    </main>
  );
}
