import { buildComparisonUrl } from "@/app/comparisonUrl";
import { useExplorer } from "@/app/ExplorerContext";
import { AppHeader, StatusBadge } from "@/components/terratwin/AppChrome";
import { candidates, comparisonDimensions, features, getCandidate } from "@/data/mockData";
import { planetNames, type ResearchDimensionId } from "@/domain/terratwin";
import { Activity, AlertTriangle, ArrowLeft, ArrowUpRight, Check, ChevronRight, CircleDashed, Compass, ExternalLink, FlaskConical, Layers3, MapPin, MountainSnow, Plus, ShieldAlert, Thermometer, Waves } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

export default function SiteProfilePage() {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeDimensionId, setActiveDimensionId] = useState<ResearchDimensionId>("terrain");
  const linkReferenceId = searchParams.get("referenceId");
  const linkReference = features.find((feature) => feature.id === linkReferenceId && feature.body !== "earth");
  const invalidReferenceLink = linkReferenceId !== null && !linkReference;
  const candidate = siteId ? getCandidate(siteId) : undefined;
  const { reference, comparisonCandidates, addCandidateById, setReferenceFeature } = useExplorer();

  useEffect(() => {
    if (linkReference) setReferenceFeature(linkReference);
  }, [linkReference, setReferenceFeature]);

  if (!candidate) {
    return (
      <main className="site-profile-page">
        <AppHeader active="earth" />
        <section className="site-not-found">
          <AlertTriangle size={26} />
          <p className="eyebrow">SITE RECORD NOT AVAILABLE</p>
          <h1>This demonstration site is not in the catalog.</h1>
          <p>TerraTwin did not substitute another site. Return to Discovery and choose one of the explicitly identified demonstration records.</p>
          <Link className="mission-button mission-button--primary" to="/discovery">RETURN TO DISCOVERY <ArrowUpRight size={15} /></Link>
        </section>
      </main>
    );
  }

  const site = candidate;
  const focusedDimension = comparisonDimensions.find((dimension) => dimension.id === activeDimensionId) ?? comparisonDimensions[0];
  const added = comparisonCandidates.some((selection) => selection.id === site.id);
  const compareReady = Boolean(reference) && !invalidReferenceLink;
  const relatedEarth = candidates.filter((relatedSite) => relatedSite.id !== site.id);
  const moonFeatures = features.filter((feature) => feature.body === "moon");
  const marsFeatures = features.filter((feature) => feature.body === "mars");
  const discoveryReturnHref = reference ? `/discovery?referenceId=${encodeURIComponent(reference.id)}` : "/discovery";

  function addToComparison() {
    addCandidateById(site.id);
  }

  function openEarth() {
    addCandidateById(site.id);
    navigate("/explorer/earth");
  }

  function compareWithReference() {
    if (!reference || invalidReferenceLink) return;
    const selected = comparisonCandidates.some((selection) => selection.id === site.id)
      ? comparisonCandidates.map((selection) => selection.id)
      : [...comparisonCandidates.map((selection) => selection.id), site.id];
    addCandidateById(site.id);
    navigate(buildComparisonUrl(reference.id, site.id, selected));
  }

  return (
    <main className={`site-profile-page site-profile-page--${site.discovery.environment.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
      <AppHeader active="earth" />
      <section className="site-hero">
        <div className="site-hero__terrain" aria-hidden="true"><i /><i /><i /></div>
        <div className="site-hero__content">
          <Link className="back-link" to={discoveryReturnHref}><ArrowLeft size={15} /> RETURN TO GLOBAL DISCOVERY</Link>
          <p className="eyebrow">ANALOG SITE PROFILE / DEMONSTRATION CATALOG</p>
          <div className="site-hero__title"><div><h1>{site.title}</h1><p><MapPin size={16} /> {site.region} <span>· ILLUSTRATIVE MAP POSITION</span></p></div><StatusBadge status="demonstration" /></div>
          <p className="site-hero__lede">{site.description} This atmospheric terrain treatment is an interface visualization only, not site imagery or a scientific layer.</p>
          <div className="site-hero__metadata"><span>ENVIRONMENT / <b>{site.discovery.environment} · DEMO LABEL</b></span><span>DEMO TARGET SCOPE / <b>{site.discovery.targetPlanets.map((planet) => planetNames[planet]).join(" + ")}</b></span><span>DATA STATE / <b>DEMONSTRATION ONLY</b></span></div>
          <div className="site-hero__actions"><button type="button" className="mission-button mission-button--secondary" onClick={openEarth}>EXPLORE ON EARTH <ArrowUpRight size={15} /></button><button type="button" className="mission-button mission-button--primary" onClick={compareWithReference} disabled={!compareReady} title={!compareReady ? "Set a Moon or Mars reference in the Explorer before opening comparison." : undefined}>COMPARE WITH PLANETARY REFERENCE <ArrowUpRight size={15} /></button><button type="button" className="mission-button mission-button--secondary" onClick={addToComparison}>{added ? <><Check size={15} /> ADDED TO COMPARISON</> : <><Plus size={15} /> ADD TO COMPARISON</>}</button></div>
          {!compareReady && <p className="site-hero__reference-warning">{invalidReferenceLink ? "INVALID REFERENCE ID / NOTHING SUBSTITUTED. Return to Discovery or choose a valid Moon/Mars reference." : "A planetary reference is required before comparison navigation. Candidate selection is preserved until then."}</p>}
        </div>
      </section>

      <nav className="dossier-nav" aria-label="Site dossier sections"><div className="dossier-nav__brand"><Compass size={15} /> FIELD DOSSIER <span>/ {site.id}</span></div><div className="dossier-nav__links"><a href="#site-overview">OVERVIEW</a><a href="#site-terrain">TERRAIN</a><a href="#site-dimensions">ANALOGY</a><a href="#site-limitations">LIMITATIONS</a><a href="#site-sources">EVIDENCE</a></div><span>DEMO / UNVERIFIED</span></nav>
      <section className="dossier-visuals" aria-label="Site visual overview">
        <div className="dossier-visuals__heading"><div><span className="eyebrow">SITE INVESTIGATION / VISUAL WORKSPACE</span><h2>Know the site. <em>Know the gaps.</em></h2></div><p>These instrument previews are illustrative UI treatments. None displays measured terrain, geology, or climate for this candidate.</p></div>
        <div className="dossier-visuals__grid">
          <article className="dossier-visuals__main"><div className="dossier-visuals__label"><span>01 / TERRAIN PREVIEW</span><span>UNCONNECTED</span></div><div className="dossier-landscape" aria-hidden="true"><div className="dossier-landscape__sun"/><div className="dossier-landscape__mountain dossier-landscape__mountain--back"/><div className="dossier-landscape__mountain dossier-landscape__mountain--front"/><div className="dossier-landscape__grid" /></div><div className="dossier-visuals__caption"><MountainSnow size={16} /><span>CONCEPTUAL LANDSCAPE RENDER — NOT SATELLITE OR TERRAIN DATA</span></div></article>
          <div className="dossier-visuals__stats"><article><Layers3 size={20} /><span>GEOLOGY / MATERIALS</span><strong>Not assessed</strong><small>Reviewed composition needed</small></article><article><Activity size={20} /><span>SLOPE / ROUGHNESS</span><strong>Not assessed</strong><small>Elevation model needed</small></article><article><Thermometer size={20} /><span>THERMAL PROFILE</span><strong>Not assessed</strong><small>Time-series coverage needed</small></article><article><Waves size={20} /><span>WATER / ICE</span><strong>Not assessed</strong><small>Source coverage needed</small></article></div>
        </div>
      </section>
      <section id="site-overview" className="site-dossier">
        <article className="site-section site-section--overview"><span className="eyebrow">01 / OVERVIEW</span><h2>A field dossier, not a validated analog claim.</h2><p>{site.demoNotice}</p><p>The catalog uses the existing location label and coordinates as an <strong>illustrative map position</strong>. It does not assert a verified field observation, similarity value, or scientifically reviewed analogue relationship.</p></article>
        <article className="site-section"><span className="eyebrow">02 / ENVIRONMENT CHARACTERISTICS</span><h2>{site.discovery.environment} classification</h2><p>This is an illustrative discovery classification used to make the prototype filters and routing tangible. It is not a reviewed environmental characterization of the actual place.</p><div className="site-section__tokens">{site.discovery.targetPlanets.map((planet) => <span key={planet}>DEMO TARGET SCOPE / {planetNames[planet].toUpperCase()}</span>)}</div></article>
        <article className="site-section"><span className="eyebrow">03 / GEOLOGICAL CONTEXT</span><h2>Evidence connection pending.</h2><p>No reviewed composition, formation history, or geological dataset is connected to this characteristic yet.</p><div className="site-section__empty"><CircleDashed size={16} /> No reviewed scientific dataset is connected to this characteristic yet.</div></article>
        <article id="site-terrain" className="site-section"><span className="eyebrow">04 / TERRAIN CHARACTERISTICS</span><h2>Terrain method not connected.</h2><p>No elevation, slope, roughness, or mobility source is supplied by this demonstration catalog.</p><div className="site-section__empty"><CircleDashed size={16} /> No reviewed scientific dataset is connected to this characteristic yet.</div></article>
        <article className="site-section"><span className="eyebrow">05 / EXPLORATION APPLICATIONS</span><h2>Questions to structure, not mission conclusions.</h2><ul className="site-application-list">{site.discovery.suggestedApplications.map((application) => <li key={application}>{application}</li>)}</ul><p>Potential future review would require a mission scenario, method, compatible units, reviewed site evidence, uncertainty handling, and a stated comparison boundary.</p></article>
      </section>

      <section id="site-dimensions" className="site-dimensions">
        <div className="site-dimensions__heading"><div><span className="eyebrow">06 / ANALOGY DIMENSIONS</span><h2>Inspect every uncertainty.</h2></div><StatusBadge status="demonstration" /></div>
        <div className="site-dimensions__callout"><FlaskConical size={18} /><div><strong>DEMONSTRATION RUBRIC — NOT A SITE-SPECIFIC SCIENTIFIC ASSESSMENT.</strong><p>These states demonstrate interface language for a future reviewed method. They are not findings, measurements, or similarity percentages about this site.</p></div></div>
        <div className="dossier-dimension-inspector"><div className="dossier-dimension-inspector__selectors" role="group" aria-label="Choose dimension to investigate">{comparisonDimensions.map((item, index) => <button type="button" key={item.id} aria-pressed={activeDimensionId === item.id} className={activeDimensionId === item.id ? "is-active" : ""} onClick={() => setActiveDimensionId(item.id)}><span>{String(index+1).padStart(2,"0")}</span>{item.label}<ChevronRight size={14} /></button>)}</div><div className="dossier-dimension-inspector__detail" key={focusedDimension.id}><span className="eyebrow">FOCUSED RESEARCH QUESTION</span><h3>{focusedDimension.label}</h3><p>{focusedDimension.statement}</p><div className="dossier-evidence-bar"><CircleDashed size={18} /><div><strong>AWAITING REVIEWED SOURCE</strong><small>Measurements, units, coverage and uncertainty are not yet connected.</small></div></div><p className="dossier-dimension-inspector__boundary"><ShieldAlert size={15} /> {focusedDimension.caveat}</p></div></div>
        <div className="site-dimensions__grid">{comparisonDimensions.map((dimension) => {
          const included = site.discovery.researchDimensions.includes(dimension.id);
          return <article key={dimension.id} className={`site-dimension ${included ? "is-included" : ""}`}><div><span>{included ? "ACTIVE DEMO PROMPT" : "NOT SELECTED AS PROMPT"}</span><StatusBadge status={dimension.status} compact /></div><h3>{dimension.label}</h3><p>{included ? dimension.statement : "No site-specific prompt is active for this dimension in the current demonstration catalog."}</p>{dimension.status !== "verified" && <div className="site-dimension__availability"><CircleDashed size={13} /> No reviewed scientific dataset is connected to this characteristic yet.</div>}<small>DEMONSTRATION RUBRIC — NOT A SITE-SPECIFIC SCIENTIFIC ASSESSMENT.</small></article>;
        })}</div>
      </section>

      <section className="site-dossier site-dossier--lower">
        <article id="site-limitations" className="site-section"><span className="eyebrow">07 / LIMITATIONS AND UNCERTAINTIES</span><h2>What this profile cannot establish.</h2><p>{site.discovery.limitations}</p><p>Visual geography, an illustrative classification, and interface state cannot establish a scientific relationship without reviewed evidence and a documented method.</p></article>
        <article id="site-sources" className="site-section"><span className="eyebrow">08 / DATA AVAILABILITY</span><h2>Demonstration catalog record.</h2><div className="site-section__empty"><ShieldAlert size={16} /> No reviewed scientific dataset is connected to this characteristic yet.</div><p>Future data would need a provider/product identifier, version, license, coordinate reference system, temporal coverage, units, processing lineage, uncertainty, and an explicit appropriate-use statement.</p></article>
        <article className="site-section">
          <span className="eyebrow">09 / RELATED PLANETARY REFERENCES</span>
          <h2>Continue the research path.</h2>
          <p className="site-related-disclosure">Related routes support exploration continuity; they do not indicate a verified scientific relationship.</p>
          <div className="site-related-grid">
            <div><span>MOON CONTEXTS</span>{moonFeatures.map((feature) => <Link key={feature.id} to="/explorer/moon" onClick={() => { setReferenceFeature(feature); }}>{feature.title}<ArrowUpRight size={13} /></Link>)}</div>
            <div><span>MARS CONTEXTS</span>{marsFeatures.map((feature) => <Link key={feature.id} to="/explorer/mars" onClick={() => { setReferenceFeature(feature); }}>{feature.title}<ArrowUpRight size={13} /></Link>)}</div>
            <div><span>EARTH CANDIDATES</span>{relatedEarth.map((relatedSite) => <Link key={relatedSite.id} to={`/sites/${relatedSite.id}${reference ? `?referenceId=${encodeURIComponent(reference.id)}` : ""}`}>{relatedSite.title}<ArrowUpRight size={13} /></Link>)}</div>
            <div><span>MISSION APPLICATIONS / DEMONSTRATION PROMPTS</span>{site.discovery.missionObjectives.map((objective) => <Link to="/mission#method" key={objective}>{objective}<ArrowUpRight size={13} /></Link>)}</div>
          </div>
        </article>
      </section>
      <footer className="site-profile-footer"><span>VISUAL TREATMENT / NOT SOURCE IMAGERY</span><span>CATALOG STATUS / DEMONSTRATION</span><Link to={discoveryReturnHref}>RETURN TO DISCOVERY <ExternalLink size={12} /></Link></footer>
    </main>
  );
}
