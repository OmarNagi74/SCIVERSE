import { ArrowLeft, ArrowRight, ArrowUpRight, Compass, Crosshair, Globe2, Layers3, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { useExplorer } from "@/app/ExplorerContext";

const journey = [
  { code: "01 / SELECT", title: "Choose your destination.", body: "Start with a named Moon or Mars reference. The globe is an exploration canvas, not a similarity calculation.", href: "/explorer/mars", cta: "OPEN PLANETARY EXPLORER", Icon: Globe2 },
  { code: "02 / DISCOVER", title: "Search the Earth.", body: "Browse illustrative terrestrial candidates, apply mission filters and build a comparison set. Demonstration positions are not verified analog findings.", href: "/discovery", cta: "OPEN EARTH DISCOVERY", Icon: Compass },
  { code: "03 / INVESTIGATE", title: "Inspect the evidence boundary.", body: "Read candidate dossiers, review missing datasets, and see which scientific questions still need a source.", href: "/discovery", cta: "BROWSE SITE DOSSIERS", Icon: Crosshair },
  { code: "04 / COMPARE", title: "Compare, without invented scores.", body: "Switch between candidates and scientific dimensions; see exactly what the prototype can and cannot claim.", href: "/compare", cta: "OPEN COMPARISON LAB", Icon: Layers3 },
];

export default function GuidedJourney({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const { reference } = useExplorer();
  const active = journey[index];
  const Icon = active.Icon;

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLButtonElement | HTMLAnchorElement>('button:not([disabled]),a[href]');
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => { window.removeEventListener("keydown", handleKey); document.body.style.overflow = oldOverflow; };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(<div className="journey-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="journey-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="journey-title" aria-describedby="journey-description">
      <div className="journey-dialog__top"><span className="eyebrow">SCIVERSE / MISSION BRIEFING</span><button type="button" ref={closeRef} aria-label="Close mission briefing" onClick={onClose}><X size={19} /></button></div>
      <div className="journey-dialog__progress" role="group" aria-label="Journey progress">{journey.map((step, i) => <button key={step.code} type="button" className={i === index ? "is-active" : ""} aria-label={`Step ${i + 1}: ${step.title}`} aria-current={i === index ? "step" : undefined} onClick={() => setIndex(i)}><span />{String(i + 1).padStart(2, "0")}</button>)}</div>
      <div className="journey-dialog__scene" key={active.code}><div className="journey-dialog__orb"><Icon size={50} strokeWidth={1} /></div><div><span className="eyebrow">{active.code} / MISSION SEQUENCE</span><h2 id="journey-title">{active.title}</h2><p id="journey-description">{active.body}</p><p className="journey-dialog__note">{reference ? `CURRENT REFERENCE / ${reference.title}` : "NO REFERENCE SELECTED / START WITH MOON OR MARS"}</p></div></div>
      <div className="journey-dialog__actions"><div><button type="button" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}><ArrowLeft size={15} /> BACK</button><button type="button" disabled={index === journey.length - 1} onClick={() => setIndex((value) => Math.min(journey.length - 1, value + 1))}>NEXT <ArrowRight size={15} /></button></div><button type="button" className="mission-button mission-button--primary" onClick={() => { onClose(); navigate(active.href === "/discovery" && reference ? `/discovery?referenceId=${encodeURIComponent(reference.id)}` : active.href); }}>{active.cta} <ArrowUpRight size={15} /></button></div>
    </section>
  </div>, document.body);
}
