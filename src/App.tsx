import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { SettingsProvider } from "./context/SettingsContext";
import { Layout } from "./components/layout/Layout";
import { MapView } from "./pages/MapView";
import { PlanView } from "./pages/PlanView";
import { BusView } from "./pages/BusView";
import { StationInfoView } from "./pages/StationInfoView";

function App() {
  return (
    <SettingsProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<MapView />} />
            <Route path="/plan" element={<PlanView />} />
            <Route path="/bus" element={<BusView />} />
            <Route path="/station/:stationName" element={<StationInfoView />} />
          </Routes>
        </Layout>
      </Router>
    </SettingsProvider>
  );
}

export default App;
