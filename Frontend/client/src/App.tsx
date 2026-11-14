import { ExplorerProvider } from "@/app/ExplorerContext";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";

const ComparisonPage = lazy(() => import("@/pages/ComparisonPage"));
const DiscoveryPage = lazy(() => import("@/pages/DiscoveryPage"));
const ExplorerPage = lazy(() => import("@/pages/ExplorerPage"));
const Home = lazy(() => import("@/pages/Home"));
const MissionPage = lazy(() => import("@/pages/MissionPage"));
const SiteProfilePage = lazy(() => import("@/pages/SiteProfilePage"));

function RouteScrollManager() {
  const location = useLocation();
  useEffect(() => {
    if (!location.hash) { window.scrollTo({ top: 0, behavior: "instant" }); return; }
    let id = location.hash.slice(1);
    try { id = decodeURIComponent(id); } catch { /* Keep literal ID. */ }
    // A lazy route may not have committed its section when the URL changes.
    let attempts = 0;
    const scrollToAnchor = () => {
      const node = document.getElementById(id);
      if (node) { node.scrollIntoView({ block: "start", behavior: "instant" }); return true; }
      return false;
    };
    if (scrollToAnchor()) return;
    const interval = window.setInterval(() => {
      attempts += 1;
      if (scrollToAnchor() || attempts >= 30) window.clearInterval(interval);
    }, 100);
    return () => window.clearInterval(interval);
  }, [location.pathname, location.hash]);
  return null;
}

function AppRoutes() {
  return (<>
    <RouteScrollManager />
    <Suspense fallback={<div className="route-loading"><span className="spin-ring" /> OPENING PLANETARY WORKSPACE</div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/mission" element={<MissionPage />} />
        <Route path="/explorer/earth" element={<ExplorerPage body="earth" />} />
        <Route path="/explorer/moon" element={<ExplorerPage body="moon" />} />
        <Route path="/explorer/mars" element={<ExplorerPage body="mars" />} />
        <Route path="/discovery" element={<DiscoveryPage />} />
        <Route path="/sites/:siteId" element={<SiteProfilePage />} />
        <Route path="/compare" element={<ComparisonPage />} />
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  </>);
}

import CatalogGate from "@/app/CatalogGate";
import MissionAssistant from "@/components/terratwin/MissionAssistant";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <CatalogGate><ExplorerProvider>
            <BrowserRouter>
              <AppRoutes />
              <MissionAssistant />
            </BrowserRouter>
          </ExplorerProvider></CatalogGate>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
