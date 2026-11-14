import { ArrowRight, ArrowUpRight, Compass, Layers3, Radar, X } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";

type Target = "moon" | "mars";

interface DestinationChooserProps {
  open: boolean;
  onClose: () => void;
  onSelect: (target: Target) => void;
  reduceMotion: boolean;
}

/**
 * The first real interaction in the mission. Only a destination is selected here;
 * the region is selected in the existing planetary Explorer.
 */
export default function DestinationChooser({ open, onClose, onSelect, reduceMotion }: DestinationChooserProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus only after the portal has committed.
    const id = window.requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(id);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") { event.stopPropagation(); onClose(); return; }
    if (event.key !== "Tab") return;
    const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href]:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
    ) ?? []);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function backdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return createPortal(
    <div className="tt-target-overlay" onMouseDown={backdropClick}>
      <motion.div
        ref={dialogRef}
        className="tt-target-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tt-target-title"
        aria-describedby="tt-target-description"
        tabIndex={-1}
        onKeyDown={trapFocus}
        initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.45, ease: [0.22, 0.68, 0.16, 1] }}
      >
        <div className="tt-target__head">
          <span className="tt-overline"><span className="tt-signal-dot" /> MISSION / INITIALIZATION</span>
          <button ref={closeRef} className="tt-target__close" type="button" aria-label="Close mission selection" onClick={onClose}><X size={19} /></button>
        </div>
        <div className="tt-target__intro">
          <span className="eyebrow">YOUR FIRST DECISION</span>
          <h2 id="tt-target-title">Where do we <em>begin?</em></h2>
          <p id="tt-target-description">Choose a world. You’ll select a reference region on its globe, then discover and compare Earth study locations. No account or setup needed.</p>
        </div>
        <div className="tt-target__options">
          <button type="button" className="tt-target-card tt-target-card--moon" onClick={() => onSelect("moon")}>
            <div className="tt-target-card__visual" aria-hidden="true"><span className="tt-target-card__orbit" /><span className="tt-target-card__planet" /><span className="tt-target-card__crosshair" /></div>
            <span className="tt-target-card__num">01 / LUNAR EXPLORATION</span>
            <strong>THE MOON</strong>
            <span className="tt-target-card__description">Explore craters, polar terrain, and potential reference regions.</span>
            <span className="tt-target-card__action">ENTER MOON EXPLORER <ArrowUpRight size={16} /></span>
          </button>
          <button type="button" className="tt-target-card tt-target-card--mars" onClick={() => onSelect("mars")}>
            <div className="tt-target-card__visual" aria-hidden="true"><span className="tt-target-card__orbit" /><span className="tt-target-card__planet" /><span className="tt-target-card__crosshair" /></div>
            <span className="tt-target-card__num">02 / MARTIAN EXPLORATION</span>
            <strong>MARS</strong>
            <span className="tt-target-card__description">Explore canyons, volcanic regions, and rover-relevant terrain.</span>
            <span className="tt-target-card__action">ENTER MARS EXPLORER <ArrowUpRight size={16} /></span>
          </button>
        </div>
        <div className="tt-target__sequence" aria-label="What happens next">
          <span><Compass size={14} /> SELECT REGION</span><ArrowRight size={13} aria-hidden="true" />
          <span><Radar size={14} /> FIND EARTH SITES</span><ArrowRight size={13} aria-hidden="true" />
          <span><Layers3 size={14} /> COMPARE EVIDENCE</span>
        </div>
        <p className="tt-target__disclaimer">SciVerse currently presents demonstration candidate records, not validated scientific matches.</p>
      </motion.div>
    </div>, document.body,
  );
}
