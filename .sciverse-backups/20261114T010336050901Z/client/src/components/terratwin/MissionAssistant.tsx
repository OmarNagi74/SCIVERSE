import { useEffect, useRef, useState } from "react";
import { useExplorer } from "@/app/ExplorerContext";
import { apiRequest, type AgentReply } from "@/lib/sciverseApi";
import "./mission-assistant.css";

export default function MissionAssistant() {
  const { reference, candidate } = useExplorer();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [mode, setMode] = useState("query");
  const [health, setHealth] = useState("Checking connection…");
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reply, setReply] = useState<AgentReply | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!open) return;
    const abort = new AbortController();
    apiRequest<{ llmConfigured: boolean }>("/agent/health", undefined, abort.signal)
      .then(data => { setHealth("Backend connected"); setConfigured(Boolean(data.llmConfigured)); })
      .catch(() => { if (!abort.signal.aborted) setHealth("Backend unavailable — start the server on port 8000"); });
    return () => abort.abort();
  }, [open]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || text.trim().length < 3) return;
    const abort = new AbortController(); controller.current = abort;
    const timeout = window.setTimeout(() => abort.abort(), 420000);
    setBusy(true); setError(""); setReply(null);
    const context = [reference && `Reference: ${reference.title} (${reference.body}).`, candidate && `Earth site: ${candidate.title}.`].filter(Boolean).join(" ");
    try {
      const result = await apiRequest<AgentReply>(`/agent/${mode}`, { text: `${text.trim()}\n${context}`.trim() }, abort.signal);
      if (typeof result.answer !== "string") throw new Error("The backend response is missing its answer.");
      setReply(result);
    } catch (err) { setError(abort.signal.aborted ? "Request cancelled or timed out. You can try again." : err instanceof Error ? err.message : "Could not reach the backend."); }
    finally { clearTimeout(timeout); setBusy(false); controller.current = null; }
  }
  return <aside className="mission-assistant">
    <button className="assistant-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mission-assistant-panel">{open ? "Close assistant ×" : "✦ Ask SciVerse"}</button>
    {open && <section id="mission-assistant-panel" className="assistant-panel" aria-label="SciVerse mission assistant">
      <h2>SciVerse mission assistant</h2><p role="status">{health}</p>
      <p>{reference ? `Context: ${reference.title}${candidate ? ` / ${candidate.title}` : ""}` : "Ask about Earth analogs for Moon and Mars missions."}</p>
      <form onSubmit={submit}>
        <label>Research mode<select value={mode} disabled={busy} onChange={event => setMode(event.target.value)}><option value="query">Local mission search</option><option value="chat" disabled={!configured}>OpenRouter AI</option></select></label>
        <label>Mission question (English)<textarea maxLength={1700} value={text} disabled={busy} onChange={event => setText(event.target.value)} placeholder="Find Earth analogs in Egypt for rover testing at Jezero crater." /></label>
        <button disabled={busy || text.trim().length < 3} type="submit">{busy ? "Researching…" : "Search and explain"}</button>
        {busy && <button type="button" onClick={() => controller.current?.abort()}>Cancel</button>}
      </form>
      {error && <p role="alert" className="assistant-error">{error}</p>}
      {reply && <div aria-live="polite"><p className="assistant-answer">{reply.answer}</p>{reply.picks?.map((pick, index) => <article key={`${pick.earth_id}-${index}`}><strong>{pick.name}</strong>{typeof pick.score_pct === "number" && <p>Model similarity: {pick.score_pct.toFixed(1)}% (not a probability)</p>}{typeof pick.lat === "number" && typeof pick.lon === "number" && <p>{pick.lat.toFixed(4)}, {pick.lon.toFixed(4)}</p>}</article>)}{reply.trace && <details><summary>Research trace</summary><pre>{JSON.stringify(reply.trace, null, 2)}</pre></details>}<small>Research candidates require validation. Earth environments are not exact planetary copies.</small></div>}
    </section>}
  </aside>;
}
