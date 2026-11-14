import { ArrowLeft, Compass, Orbit, ScanSearch } from "lucide-react";
import { Link } from "react-router-dom";
import { AppHeader, SciVerseGlyph } from "@/components/terratwin/AppChrome";

export default function NotFound() {
  return (
    <main className="sciverse-fallback sciverse-not-found">
      <AppHeader />
      <div className="sciverse-fallback__body">
        <div className="sciverse-fallback__orb" aria-hidden="true"><SciVerseGlyph /></div>
        <span className="sciverse-fallback__eyebrow">SCIVERSE / NAVIGATION SIGNAL LOST</span>
        <h1>There's nothing<br /><em>at these coordinates.</em></h1>
        <p>The route you entered isn't part of the current SciVerse exploration workspace. Your scientific selections remain in this browser.</p>
        <div className="sciverse-fallback__actions">
          <Link className="mission-button mission-button--primary" to="/"><ArrowLeft size={16} /> RETURN HOME</Link>
          <Link className="mission-button mission-button--secondary" to="/explorer/moon"><Orbit size={16} /> OPEN EXPLORER</Link>
          <Link className="sciverse-fallback__text-link" to="/discovery"><ScanSearch size={15} /> EARTH DISCOVERY</Link>
        </div>
        <span className="sciverse-fallback__status"><Compass size={15} /> 404 · NO DESTINATION FOUND</span>
      </div>
    </main>
  );
}
