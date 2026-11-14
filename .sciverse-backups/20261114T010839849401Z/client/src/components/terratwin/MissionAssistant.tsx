import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, Check, Copy, MessageSquare, Plus, Sparkles, Square, X } from "lucide-react";
import { useExplorer } from "@/app/ExplorerContext";
import { apiRequest, type AgentReply } from "@/lib/sciverseApi";
import "./mission-assistant.css";

type Turn = { id: number; question: string; reply?: AgentReply; error?: string };
const suggestions = ["Find Earth analogs in Egypt for rover testing at Jezero crater.", "Find lunar analog sites for thermal testing.", "Compare the limitations of Earth analogs for Mars missions."];
export default function MissionAssistant() {
  const { reference, candidate } = useExplorer();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [mode, setMode] = useState("query");
  const [health, setHealth] = useState<"checking" | "ready" | "offline">("checking");
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [copied, setCopied] = useState<number | null>(null);
  const [includeContext, setIncludeContext] = useState(true);
  const controller = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const sequence = useRef(0);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    setHealth("checking");
    const abort = new AbortController();
    apiRequest<{ llmConfigured: boolean }>("/agent/health", undefined, AbortSignal.any([abort.signal, AbortSignal.timeout(10000)]))
      .then(data => { setHealth("ready"); setConfigured(Boolean(data.llmConfigured)); if (!data.llmConfigured) setMode("query"); })
      .catch(() => { if (!abort.signal.aborted) { setHealth("offline"); setConfigured(false); } });
    return () => abort.abort();
  }, [open]);
  useEffect(() => { if (open) bottom.current?.scrollIntoView({ block: "nearest" }); }, [turns, busy, open]);
  function close() { setOpen(false); toggle.current?.focus(); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (controller.current || text.trim().length < 3) return;
    const question = text.trim();
    const id = ++sequence.current;
    const abort = new AbortController(); controller.current = abort;
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; abort.abort(); }, 120000);
    setBusy(true); setText(""); setTurns(current => [...current.slice(-19), { id, question }]);
    const context = includeContext ? [reference && `Reference: ${reference.title} (${reference.body}).`, candidate && `Earth site: ${candidate.title}.`].filter(Boolean).join(" ") : "";
    try {
      const result = await apiRequest<AgentReply>(`/agent/${mode}`, { text: `${question}\n${context.slice(0, 300)}`.trim() }, abort.signal);
      if (typeof result.answer !== "string") throw new Error("The backend response is missing its answer.");
      setTurns(current => current.map(turn => turn.id === id ? { ...turn, reply: result } : turn));
      setHealth("ready");
    } catch (err) {
      const error = abort.signal.aborted ? timedOut ? "This search took too long. Try a narrower question." : "Stopped waiting. The server may still be finishing this search." : err instanceof Error ? err.message : "Could not reach the backend.";
      setTurns(current => current.map(turn => turn.id === id ? { ...turn, error } : turn));
    } finally { clearTimeout(timeout); setBusy(false); controller.current = null; input.current?.focus(); }
  }
  async function copy(turn: Turn) {
    try { await navigator.clipboard.writeText(turn.reply?.answer ?? ""); setCopied(turn.id); }
    catch { setCopied(null); }
  }
  return <aside className="mission-assistant">
    <button ref={toggle} className="assistant-toggle" onClick={() => open ? close() : setOpen(true)} aria-expanded={open} aria-controls="mission-assistant-panel"><Sparkles size={17} /> Ask SciVerse {open ? <X size={16} /> : <MessageSquare size={16} />}</button>
    {open && <section id="mission-assistant-panel" className="assistant-panel" role="dialog" aria-modal="false" aria-labelledby="assistant-title" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}>
      <header className="assistant-heading"><div className="assistant-avatar"><Sparkles size={21} /></div><div><h2 id="assistant-title">Ask SciVerse</h2><span className={`assistant-connection is-${health}`}><i />{health === "ready" ? "Connected to research tools" : health === "checking" ? "Connecting…" : "Connection unavailable"}</span></div><button className="assistant-icon" type="button" title="Clear conversation" aria-label="Clear conversation" disabled={busy || !turns.length} onClick={() => { setTurns([]); setCopied(null); input.current?.focus(); }}><Plus size={18} /></button><button className="assistant-icon" type="button" onClick={close} aria-label="Close Ask SciVerse"><X size={19} /></button></header>
      <div className="assistant-controls"><label htmlFor="assistant-mode">Research mode</label><select id="assistant-mode" value={mode} disabled={busy} onChange={event => setMode(event.target.value)}><option value="query">Local search · English</option><option value="chat" disabled={!configured}>AI research · OpenRouter</option></select></div>
      {mode === "chat" && <p className="assistant-provider-note">Your question and selected context are sent to OpenRouter and its model provider.</p>}
      {(reference || candidate) && <label className="assistant-context"><input type="checkbox" checked={includeContext} onChange={event => setIncludeContext(event.target.checked)} disabled={busy} /><span>Use selected context<strong>{[reference?.title, candidate?.title].filter(Boolean).join(" / ")}</strong></span></label>}
      <div className="assistant-thread" role="log" aria-label="Research conversation" aria-live="polite" aria-relevant="additions text">
        {!turns.length && <div className="assistant-welcome"><span className="assistant-kicker">YOUR MISSION STARTS WITH A QUESTION</span><h3>Explore here.<br />Prepare for beyond.</h3><p>Find candidate Earth environments for Moon and Mars research, with evidence and limitations.</p><div className="assistant-suggestions">{suggestions.map(question => <button type="button" key={question} onClick={() => { setText(question); input.current?.focus(); }}>{question}<ArrowUp size={14} /></button>)}</div></div>}
        {turns.map(turn => <article className="assistant-turn" key={turn.id}><div className="assistant-question" dir="auto">{turn.question}</div>{turn.reply && <div className="assistant-response"><span className="assistant-kicker"><Sparkles size={13} /> SCIVERSE · {turn.reply.mode === "openrouter" ? "AI RESEARCH" : "LOCAL SEARCH"}</span><div className="assistant-answer" dir="auto">{turn.reply.answer}</div>{turn.reply.picks?.length ? <div className="assistant-picks">{turn.reply.picks.map((pick, index) => <div className="assistant-pick" key={`${pick.earth_id}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{pick.name}</strong>{typeof pick.score_pct === "number" && <small>Dataset percentile {pick.score_pct.toFixed(1)} · not physical similarity</small>}{typeof pick.lat === "number" && typeof pick.lon === "number" && <small>{pick.lat.toFixed(3)}, {pick.lon.toFixed(3)} · verify before field use</small>}</div></div>)}</div> : null}<div className="assistant-answer-actions"><button type="button" onClick={() => copy(turn)}>{copied === turn.id ? <Check size={13} /> : <Copy size={13} />}{copied === turn.id ? "Copied" : "Copy answer"}</button>{turn.reply.trace && <details><summary>Research steps</summary><pre>{JSON.stringify(turn.reply.trace, null, 2)}</pre></details>}</div></div>}{turn.error && <div className="assistant-error" role="alert"><p>{turn.error}</p><button type="button" disabled={busy} onClick={() => { setText(turn.question); input.current?.focus(); }}>Edit and retry</button></div>}</article>)}
        {busy && <p className="assistant-progress" role="status"><span /> Checking research evidence…</p>}<div ref={bottom} />
      </div>
      <form className="assistant-composer" onSubmit={submit}><label className="assistant-input-label" htmlFor="assistant-question">Your mission question</label><textarea ref={input} id="assistant-question" maxLength={1600} value={text} onChange={event => setText(event.target.value)} placeholder="Ask about Earth, Moon or Mars…" rows={3} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (!busy) void submit(event); } }} /><div className="assistant-composer-footer"><small>{text.length}/1600 · Shift + Enter for a new line</small>{busy ? <button className="assistant-send" type="button" onClick={() => controller.current?.abort()} aria-label="Stop waiting for response"><Square size={14} /> Stop</button> : <button className="assistant-send" type="submit" disabled={text.trim().length < 3} aria-label="Send mission question"><ArrowUp size={18} /></button>}</div></form>
      <footer className="assistant-disclaimer">Research guidance, not mission approval. Each question is independent.</footer>
    </section>}
  </aside>;
}
