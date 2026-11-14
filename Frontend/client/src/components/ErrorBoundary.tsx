import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { hasError: boolean }

/** Keep the full technical error in the developer console, not on the presentation screen. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State { return { hasError: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("SciVerse workspace encountered an error", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="sciverse-fallback sciverse-app-error" role="alert">
        <div className="sciverse-fallback__body">
          <span className="sciverse-fallback__eyebrow"><AlertTriangle size={15} /> SCIVERSE / VISUALIZATION INTERRUPTED</span>
          <h1>Let's reconnect<br /><em>the exploration.</em></h1>
          <p>This workspace couldn't be rendered. No scientific result or comparison has been generated. Please reload or return to the main experience.</p>
          <div className="sciverse-fallback__actions">
            <button type="button" className="mission-button mission-button--primary" onClick={() => window.location.reload()}><RotateCcw size={16} /> RELOAD WORKSPACE</button>
            <a className="mission-button mission-button--secondary" href="/"><ArrowLeft size={16} /> RETURN HOME</a>
          </div>
        </div>
      </main>
    );
  }
}
