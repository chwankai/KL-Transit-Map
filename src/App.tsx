import { lazy, Suspense } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { SettingsProvider } from "./context/SettingsContext";
import { Layout } from "./components/layout/Layout";

// Lazy-load page components for bundle splitting (excludes heavy Leaflet code from initial load of other pages)
const MapView = lazy(() => import("./pages/MapView").then(m => ({ default: m.MapView })));
const LinesView = lazy(() => import("./pages/LinesView").then(m => ({ default: m.LinesView })));
const PlanView = lazy(() => import("./pages/PlanView").then(m => ({ default: m.PlanView })));
const BusView = lazy(() => import("./pages/BusView").then(m => ({ default: m.BusView })));
const StationInfoView = lazy(() => import("./pages/StationInfoView").then(m => ({ default: m.StationInfoView })));
const GuideView = lazy(() => import("./pages/GuideView").then(m => ({ default: m.GuideView })));

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
        <Layout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<MapView />} />
              <Route path="/lines" element={<LinesView />} />
              <Route path="/plan" element={<PlanView />} />
              <Route path="/bus" element={<BusView />} />
              <Route path="/station/:stationName" element={<StationInfoView />} />
              <Route path="/guide" element={<GuideView />} />
            </Routes>
          </Suspense>
        </Layout>
      </Router>
    </SettingsProvider>
  );
}

export default App;
