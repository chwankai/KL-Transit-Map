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

// Lazy-load page components for bundle splitting (excludes heavy Leaflet code from initial load of other pages)
const MapView = lazy(() => import("./pages/MapView").then(m => ({ default: m.MapView })));
const LinesView = lazy(() => import("./pages/LinesView").then(m => ({ default: m.LinesView })));
const PlanView = lazy(() => import("./pages/PlanView").then(m => ({ default: m.PlanView })));
const BusView = lazy(() => import("./pages/BusView").then(m => ({ default: m.BusView })));
const StationInfoView = lazy(() => import("./pages/StationInfoView").then(m => ({ default: m.StationInfoView })));
const GuideView = lazy(() => import("./pages/GuideView").then(m => ({ default: m.GuideView })));
const DevHubView = lazy(() => import("./pages/dev/DevHubView").then(m => ({ default: m.DevHubView })));
const DevTranslationsView = lazy(() => import("./pages/dev/DevTranslationsView").then(m => ({ default: m.DevTranslationsView })));
const StorageInspectorView = lazy(() => import("./pages/dev/StorageInspectorView").then(m => ({ default: m.StorageInspectorView })));
const LocationInspectorView = lazy(() => import("./pages/dev/LocationInspectorView").then(m => ({ default: m.LocationInspectorView })));
const NetworkDataManagerView = lazy(() => import("./pages/dev/NetworkDataManagerView").then(m => ({ default: m.NetworkDataManagerView })));
const RapidKLInsightsView = lazy(() => import("./pages/dev/RapidKLInsightsView").then(m => ({ default: m.RapidKLInsightsView })));

const PageLoader = () => (
  <div className="flex items-center justify-center w-full h-[calc(100vh-64px)] bg-background">
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="w-8 h-8 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin" />
    </div>
  </div>
);

function App() {
  return (
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
  );
}

export default App;
