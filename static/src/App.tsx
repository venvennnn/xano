import { NavLink, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, subscribe } from "./api";
import Docket from "./pages/Docket";
import Convene from "./pages/Convene";
import Hearing from "./pages/Hearing";
import Registry from "./pages/Registry";
import MetricDetail from "./pages/MetricDetail";
import Precedents from "./pages/Precedents";
import DriftRadar from "./pages/DriftRadar";

export default function App() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    return subscribe(() => setTick((n) => n + 1));
  }, []);

  async function reset() {
    if (!confirm("Reset Aether Credit to the seeded docket? Open demo cases will be cleared.")) return;
    await api.reset();
    setTick((n) => n + 1);
    window.location.hash = "#/";
  }

  return (
    <div className="shell">
      <aside className="nav">
        <div>
          <div className="brand-kicker">Aether Credit</div>
          <div className="brand-name">Metric Court</div>
          <div className="brand-sub">Organizational truth-resolution</div>
        </div>
        <nav className="nav-links">
          <NavLink to="/" end>
            Docket
          </NavLink>
          <NavLink to="/convene">Convene</NavLink>
          <NavLink to="/registry">Registry</NavLink>
          <NavLink to="/precedents">Precedents</NavLink>
          <NavLink to="/radar">Drift radar</NavLink>
        </nav>
        <div className="nav-foot">
          <strong>Priya Nair</strong>
          Judge · Chief Data Officer
          <button className="ghost" onClick={reset} type="button">
            Reset seeded demo
          </button>
        </div>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Docket tick={tick} />} />
          <Route path="/convene" element={<Convene />} />
          <Route path="/cases/:id" element={<Hearing tick={tick} />} />
          <Route path="/registry" element={<Registry tick={tick} />} />
          <Route path="/registry/:id" element={<MetricDetail />} />
          <Route path="/precedents" element={<Precedents tick={tick} />} />
          <Route path="/radar" element={<DriftRadar tick={tick} />} />
        </Routes>
      </main>
    </div>
  );
}
