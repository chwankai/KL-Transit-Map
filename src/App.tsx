import { lazy, Suspense, useEffect } from "react";
import { HashRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { SettingsProvider } from "./context/SettingsContext";
import { Layout } from "./components/layout/Layout";
import { trackPageView } from "./lib/analytics";

// Helper component to track page views automatically on location changes
const PageViewTracker = () => {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);

  return null;
};

import { Component, type ReactNode } from "react";

// Safe lazy-loading helper that automatically retries and handles stale chunk hash errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(() =>
    factory().catch((err) => {
      // If a dynamic import failed (e.g. stale Vite hash on reload), check if we already reloaded
      const hasReloaded = sessionStorage.getItem("chunk_reload_retry");
      if (!hasReloaded) {
        sessionStorage.setItem("chunk_reload_retry", "true");
        window.location.reload();
      }
      throw err;
    })
  );
}

// Clear chunk reload flag on successful load
if (typeof window !== "undefined") {
  sessionStorage.removeItem("chunk_reload_retry");
}

// Error Boundary to catch any unexpected runtime errors and prevent blank screens
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background text-text-primary p-6">
          <div className="max-w-md w-full p-6 rounded-2xl bg-card border border-border shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>
            <h2 className="text-lg font-bold">Application Refreshed</h2>
            <p className="text-xs text-text-secondary">
              A newer version of the application or updated data module was detected.
            </p>
            <button
              onClick={() => {
                sessionStorage.clear();
                window.location.reload();
              }}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md active:scale-95"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy-load page components with automatic retry
const MapView = lazyWithRetry(() => import("./pages/MapView").then(m => ({ default: m.MapView })));
const LinesView = lazyWithRetry(() => import("./pages/LinesView").then(m => ({ default: m.LinesView })));
const PlanView = lazyWithRetry(() => import("./pages/PlanView").then(m => ({ default: m.PlanView })));
const BusView = lazyWithRetry(() => import("./pages/BusView").then(m => ({ default: m.BusView })));
const StationInfoView = lazyWithRetry(() => import("./pages/StationInfoView").then(m => ({ default: m.StationInfoView })));
const GuideView = lazyWithRetry(() => import("./pages/GuideView").then(m => ({ default: m.GuideView })));
const DevHubView = lazyWithRetry(() => import("./pages/dev/DevHubView").then(m => ({ default: m.DevHubView })));
const DevTranslationsView = lazyWithRetry(() => import("./pages/dev/DevTranslationsView").then(m => ({ default: m.DevTranslationsView })));
const StorageInspectorView = lazyWithRetry(() => import("./pages/dev/StorageInspectorView").then(m => ({ default: m.StorageInspectorView })));
const LocationInspectorView = lazyWithRetry(() => import("./pages/dev/LocationInspectorView").then(m => ({ default: m.LocationInspectorView })));
const NetworkDataManagerView = lazyWithRetry(() => import("./pages/dev/NetworkDataManagerView").then(m => ({ default: m.NetworkDataManagerView })));
const RapidKLInsightsView = lazyWithRetry(() => import("./pages/dev/RapidKLInsightsView").then(m => ({ default: m.RapidKLInsightsView })));

const PageLoader = () => (
  <div className="flex items-center justify-center w-full h-[calc(100vh-64px)] bg-background">
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="w-8 h-8 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin" />
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <Router>
          <PageViewTracker />
          <Layout>
            <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<MapView />} />
              <Route path="/lines" element={<LinesView />} />
              <Route path="/plan" element={<PlanView />} />
              <Route path="/bus" element={<BusView />} />
              <Route path="/station/:stationName" element={<StationInfoView />} />
              <Route path="/guide" element={<GuideView />} />
              {/* Hidden developer-only routes (not visible in public navigation) */}
              <Route path="/dev" element={<DevHubView />} />
              <Route path="/dev/insights" element={<RapidKLInsightsView />} />
              <Route path="/dev/ridership" element={<RapidKLInsightsView />} />
              <Route path="/dev/network" element={<NetworkDataManagerView />} />
              <Route path="/dev/stations" element={<NetworkDataManagerView />} />
              <Route path="/dev/lines" element={<NetworkDataManagerView />} />
              <Route path="/dev/location" element={<LocationInspectorView />} />
              <Route path="/dev/gps" element={<LocationInspectorView />} />
              <Route path="/dev/storage" element={<StorageInspectorView />} />
              <Route path="/dev/inspector" element={<StorageInspectorView />} />
              <Route path="/dev/translations" element={<DevTranslationsView />} />
              <Route path="/dev/i18n" element={<DevTranslationsView />} />
            </Routes>
          </Suspense>
        </Layout>
        </Router>
        <Analytics />
        <SpeedInsights />
      </SettingsProvider>
    </ErrorBoundary>
  );
}

export default App;
