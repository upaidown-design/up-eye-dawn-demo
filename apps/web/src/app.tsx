import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import * as maplibregl from "maplibre-gl";
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import "maplibre-gl/dist/maplibre-gl.css";
import type { SimulationSnapshot } from "@ued/contracts";
import { brand, truth } from "@ued/configuration";
import { runtimeConfig, websocketUrl } from "./runtime-config";
import {
  AnomalyView,
  DataEngineView,
  GroundTruthView,
  InvestorFinancialView,
  NdviAnalytics,
  ReportView,
  SystemHealthView,
} from "./data-viz";
import { RoundDecisionTool } from "./round-decision";
import {
  FleetExperience,
  RoverProductExperience,
  SentinelProductExperience,
} from "./product-experience";
import {
  AdminLogin,
  AdminPortal,
  NdaAccessPage,
  ProtectedInvestorRoute,
} from "./access-control";
import { AdminRecoveryPage, TeamJoinPage } from "./admin-collaboration";
import { PublicHome } from "./public-home";
const FieldScene3D = lazy(() =>
  import("./field-scene-3d").then((module) => ({
    default: module.FieldScene3D,
  })),
);
maplibregl.setWorkerUrl(mapWorkerUrl);
const API = runtimeConfig.apiBase,
  runId = "run_new_york_001";
const phases = [
  "PREPARE",
  "SENTINEL",
  "LAUNCH",
  "FLIGHT",
  "CAPTURE",
  "NDVI",
  "ANOMALY",
  "ROVER",
  "PROBE",
  "FUSION",
  "REPORT",
];
const phaseTimes = [0, 20, 60, 85, 190, 215, 255, 280, 350, 380, 410];
const en = {
  start: "START INVESTOR DEMO",
  demo: "Investor demo",
  operator: "Mission control",
  about: "About demo",
  health: "System health",
  sim: "SIMULATED REAL-TIME",
  concept: "AUTONOMOUS ROVER CONCEPT",
  ready: "READY WITH WARNINGS",
};
const es = {
  start: "INICIAR DEMO DE INVERSIÓN",
  demo: "Demo de inversión",
  operator: "Control de misión",
  about: "Acerca de la demo",
  health: "Salud del sistema",
  sim: "TIEMPO REAL SIMULADO",
  concept: "CONCEPTO DE ROVER AUTÓNOMO",
  ready: "LISTO CON AVISOS",
};
const initial: SimulationSnapshot = {
  runId,
  scenarioId: "new-york-investor-demo-v1",
  sequence: 0,
  simulationTime: 0,
  speed: 1,
  status: "READY",
  phase: "PREPARE",
  actors: [],
  coverage: 0,
  ndviReady: false,
  anomalyReady: false,
  reportReady: false,
};
function useSimulation() {
  const [s, setS] = useState(initial);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    let disposed = false,
      ws: WebSocket | undefined,
      reconnectTimer: number | undefined;
    const connect = () => {
      if (disposed) return;
      ws = new WebSocket(websocketUrl());
      ws.onopen = () => {
        if (!disposed) setConnected(true);
      };
      ws.onmessage = (e) => {
        if (disposed) return;
        const m = JSON.parse(e.data);
        if (m.type === "snapshot") setS(m.data);
      };
      ws.onclose = () => {
        if (disposed) return;
        setConnected(false);
        reconnectTimer = window.setTimeout(connect, 1200);
      };
    };
    connect();
    return () => {
      disposed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);
  const command = async (action: string, value?: number) => {
    const options: RequestInit = { method: "POST" };
    let path = action.toLowerCase();
    if (action === "SET_SPEED") {
      path = "speed";
      options.headers = { "content-type": "application/json" };
      options.body = JSON.stringify({ speed: value });
    } else if (action === "SEEK") {
      path = "seek";
      options.headers = { "content-type": "application/json" };
      options.body = JSON.stringify({ time: value });
    }
    const response = await fetch(`${API}/demo/runs/${runId}/${path}`, options);
    if (!response.ok)
      throw new Error(`Demo command ${action} failed: ${response.status}`);
  };
  return { s, connected, command };
}
function FarmMap({ s }: { s: SimulationSnapshot }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Record<string, maplibregl.Marker>>({});
  const [error, setError] = useState("");
  useEffect(() => {
    if (!el.current) return;
    const instance = new maplibregl.Map({
      container: el.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#09120f" },
          },
        ],
      },
      center: [-3.7002, 37.1921],
      zoom: 15.5,
      pitch: 52,
      bearing: -18,
      attributionControl: false,
    });
    map.current = instance;
    instance.on("load", async () => {
      try {
        const response = await fetch(`${API}/farms`);
        if (!response.ok)
          throw new Error(`farm request failed: ${response.status}`);
        const farm = await response.json();
        instance.addSource("farm", { type: "geojson", data: farm[0] });
        instance.addLayer({
          id: "farm-fill",
          type: "fill",
          source: "farm",
          paint: { "fill-color": "#244f37", "fill-opacity": 0.55 },
        });
        instance.addLayer({
          id: "farm-line",
          type: "line",
          source: "farm",
          paint: { "line-color": "#b9f36a", "line-width": 2 },
        });
        setError("");
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : "farm map unavailable",
        );
      }
    });
    return () => {
      for (const marker of Object.values(markers.current)) marker.remove();
      markers.current = {};
      map.current = null;
      instance.remove();
    };
  }, []);
  useEffect(() => {
    if (!map.current) return;
    for (const a of s.actors.filter((x) =>
      ["mast", "drone", "rover"].includes(x.type),
    )) {
      if (!markers.current[a.id]) {
        const d = document.createElement("div");
        d.className = `device-marker ${a.type}`;
        d.setAttribute("aria-label", a.id);
        markers.current[a.id] = new maplibregl.Marker({ element: d })
          .setLngLat(a.position)
          .addTo(map.current);
      } else markers.current[a.id]?.setLngLat(a.position);
    }
  }, [s]);
  return (
    <div
      ref={el}
      className="map"
      aria-label="Synthetic Demo Farm Alpha geospatial view"
      data-map-ready={map.current && !error ? "true" : "false"}
    >
      {error && <span role="alert">{error}</span>}
    </div>
  );
}
function Mast({ height = 0, bay = false }: { height?: number; bay?: boolean }) {
  return (
    <div className="mast-model" aria-label="Procedural Sentinel concept model">
      <div className="mast-base" />
      <div
        className="segment s1"
        style={{ transform: `translateY(${-height * 0.3}px)` }}
      />
      <div
        className="segment s2"
        style={{ transform: `translateY(${-height * 0.55}px)` }}
      />
      <div
        className="segment s3"
        style={{ transform: `translateY(${-height * 0.8}px)` }}
      />
      <div className={`bay ${bay ? "open" : ""}`}>
        <i />
      </div>
      <span>CONCEPT MODEL</span>
    </div>
  );
}
function Rover({ probing = false }: { probing?: boolean }) {
  return (
    <div
      className="rover-model"
      aria-label="Original industrial rover concept model"
    >
      <div className="rover-bay" />
      <div className="chassis">
        <i />
        <i />
        <i />
      </div>
      <div className="tracks">
        <b />
        <b />
      </div>
      <div className={`probe ${probing ? "down" : ""}`} />
      <span>CONCEPT MODEL</span>
    </div>
  );
}
function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number | boolean;
  unit?: string;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>
        {value}
        <small>{unit}</small>
      </strong>
    </div>
  );
}
function Timeline({
  s,
  command,
}: {
  s: SimulationSnapshot;
  command: (a: string, v?: number) => void;
}) {
  const labels = [
    "Sentinel Ready",
    "Mast Deploy",
    "Drone Launch",
    "Survey",
    "Capture Complete",
    "NDVI",
    "Anomaly",
    "Rover Dispatch",
    "Ground Truth",
    "Data Fusion",
    "Report",
  ];
  return (
    <div className="timeline" aria-label="Autonomous mission timeline">
      {phases.map((p, i) => (
        <button
          key={p}
          className={
            p === s.phase
              ? "active"
              : phaseTimes[i]! < s.simulationTime
                ? "done"
                : ""
          }
          onClick={() => command("SEEK", phaseTimes[i])}
          aria-current={p === s.phase ? "step" : undefined}
        >
          <i />
          <time>
            {Math.floor(phaseTimes[i]! / 60)}:
            {String(phaseTimes[i]! % 60).padStart(2, "0")}
          </time>
          <span>{labels[i]}</span>
        </button>
      ))}
    </div>
  );
}
function Demo({
  s,
  command,
  t,
}: {
  s: SimulationSnapshot;
  command: (a: string, v?: number) => void;
  t: typeof en;
}) {
  const drone = s.actors.find((a) => a.type === "drone"),
    mast = s.actors.find((a) => a.type === "mast"),
    rover = s.actors.find((a) => a.type === "rover"),
    probe = s.actors.find((a) => a.type === "probe");
  return (
    <main
      className="demo-shell"
      data-phase={s.phase}
      data-status={s.status}
      data-simulation-time={s.simulationTime}
    >
      <section className="world">
        <FarmMap s={s} />
        <Suspense fallback={null}>
          <FieldScene3D snapshot={s} />
        </Suspense>
        {s.ndviReady && (
          <div className="ndvi-overlay">
            <span>NDVI · SYNTHETIC</span>
          </div>
        )}
        {s.anomalyReady && (
          <div className="anomaly-pulse" aria-label="Simulated anomaly" />
        )}
        <div className="world-title">
          <span>DEMO FARM ALPHA · SYNTHETIC</span>
          <h1>
            {s.phase === "PREPARE" ? "Autonomous Field Intelligence" : s.phase}
          </h1>
        </div>
        <div className="device-stage">
          {["PREPARE", "SENTINEL", "LAUNCH"].includes(s.phase) ? (
            <Mast
              height={Number(mast?.telemetry.heightPercent ?? 0)}
              bay={Boolean(mast?.telemetry.bayOpen)}
            />
          ) : ["ROVER", "PROBE"].includes(s.phase) ? (
            <Rover probing={s.phase === "PROBE"} />
          ) : null}
        </div>
      </section>
      <aside className="telemetry">
        <div className="aside-head">
          <span>{t.sim}</span>
          <b>
            {Math.floor(s.simulationTime / 60)}:
            {String(Math.floor(s.simulationTime % 60)).padStart(2, "0")}
          </b>
        </div>
        <h2>Mission telemetry</h2>
        <div className="metric-grid">
          <Metric label="Drone state" value={drone?.state ?? "DOCKED"} />
          <Metric
            label="Altitude"
            value={drone?.telemetry.altitude ?? 0}
            unit=" m"
          />
          <Metric label="Drone battery" value={drone?.battery ?? 98} unit="%" />
          <Metric label="Coverage" value={s.coverage} unit="%" />
          <Metric label="Rover state" value={rover?.state ?? "IDLE"} />
          <Metric label="Rover battery" value={rover?.battery ?? 96} unit="%" />
        </div>
        {s.phase === "PROBE" && (
          <div className="soil">
            <span>SYNTHETIC SOIL SAMPLE</span>
            <div>
              <b>{probe?.telemetry.moisture}%</b>
              <small>Moisture</small>
              <b>{probe?.telemetry.ph}</b>
              <small>pH</small>
              <b>{probe?.telemetry.ec}</b>
              <small>EC</small>
            </div>
          </div>
        )}
        {s.reportReady && (
          <div className="report-ready" role="status">
            <span>SIMULATED MISSION REPORT</span>
            <b>REPORT READY</b>
          </div>
        )}
        <div className="event-feed">
          <span>EVENT STREAM</span>
          <p>{s.phase.toLowerCase()}.state.updated</p>
          <p>sequence · {s.sequence}</p>
          <p>classification · SIMULATED</p>
        </div>
      </aside>
      <Timeline s={s} command={command} />
      <Controls s={s} command={command} />
    </main>
  );
}
function Controls({
  s,
  command,
}: {
  s: SimulationSnapshot;
  command: (a: string, v?: number) => void;
}) {
  return (
    <div className="controls">
      <button
        onClick={() => command(s.status === "RUNNING" ? "PAUSE" : "PLAY")}
      >
        {s.status === "RUNNING" ? "PAUSE" : "PLAY"}
      </button>
      {[1, 2, 5, 10, 20].map((v) => (
        <button
          className={s.speed === v ? "active" : ""}
          onClick={() => command("SET_SPEED", v)}
          key={v}
        >
          {v}×
        </button>
      ))}
      <button onClick={() => command("RESET")}>RESET</button>
      <button onClick={() => document.documentElement.requestFullscreen?.()}>
        FULLSCREEN
      </button>
    </div>
  );
}
function Preflight({ start, t }: { start: () => void; t: typeof en }) {
  const checks = [
    "API",
    "WebSocket",
    "Scenario",
    "Synthetic farm",
    "Procedural models",
    "NDVI fallback",
    "Local assets",
    "Browser renderer",
  ];
  return (
    <main className="preflight">
      <p className="eyebrow">NEW YORK · PRESENTATION SYSTEM</p>
      <h1>
        Autonomous Field
        <br />
        Intelligence
      </h1>
      <div className="checks">
        {checks.map((x, i) => (
          <div key={x}>
            <i className={i < 6 ? "ok" : "warn"} />
            <span>{x}</span>
            <b>{i < 6 ? "READY" : "FALLBACK READY"}</b>
          </div>
        ))}
      </div>
      <button className="start" onClick={start}>
        {t.start}
      </button>
      <p className="honesty">
        All telemetry, farm data, imagery, NDVI and agronomic outputs in this
        environment are synthetic or simulated.
      </p>
    </main>
  );
}
const pages = [
  "fleet/drone/drone-001",
  "missions",
  "missions/mission-001",
  "analytics",
  "reports",
];
function Operator({
  s,
  command,
}: {
  s: SimulationSnapshot;
  command: (a: string, v?: number) => void;
}) {
  const [focus, setFocus] = useState("Overview");
  const drone = s.actors.find((a) => a.type === "drone"),
    rover = s.actors.find((a) => a.type === "rover"),
    mast = s.actors.find((a) => a.type === "mast");
  const captures = Math.min(6, Math.floor(s.coverage / 17));
  return (
    <main
      className="mission-cinema"
      data-phase={s.phase}
      data-focus={focus.toLowerCase()}
    >
      <section className="command-map">
        <FarmMap s={s} />
        {s.ndviReady && (
          <div className="ndvi-overlay cinematic">
            <span>NDVI · SYNTHETIC</span>
          </div>
        )}
        {s.anomalyReady && (
          <div className="anomaly-pulse" aria-label="Simulated anomaly" />
        )}
        <div className="command-title">
          <p>OPERATOR MODE · DETERMINISTIC SIMULATION</p>
          <h1>Mission control</h1>
          <span>
            {s.phase} · {Math.floor(s.simulationTime / 60)}:
            {String(Math.floor(s.simulationTime % 60)).padStart(2, "0")}
          </span>
        </div>
        <nav className="camera-nav" aria-label="Map camera focus">
          {["Overview", "Drone", "Rover", "Sentinel", "Anomaly"].map((x) => (
            <button
              key={x}
              className={focus === x ? "active" : ""}
              onClick={() => setFocus(x)}
            >
              {x}
            </button>
          ))}
        </nav>
        {["FLIGHT", "CAPTURE"].includes(s.phase) && (
          <div className="capture-flash" />
        )}
        <div className="coverage-trace">
          <span>MISSION COVERAGE</span>
          <i style={{ width: `${s.coverage}%` }} />
          <b>{s.coverage.toFixed(0)}%</b>
        </div>
      </section>
      <aside className="intelligence-rail">
        <header>
          <p>INTELLIGENCE RAIL</p>
          <b>{focus.toUpperCase()}</b>
        </header>
        <section>
          <span>SENTINEL</span>
          <strong>{mast?.state ?? "READY"}</strong>
          <small>Fixed node · simulated state</small>
        </section>
        <section>
          <span>DRONE</span>
          <strong>{drone?.state ?? "DOCKED"}</strong>
          <small>
            {drone?.telemetry.altitude ?? 0} m · {drone?.battery ?? 98}% battery
          </small>
        </section>
        <section>
          <span>ROVER_001</span>
          <strong>{rover?.state ?? "IDLE"}</strong>
          <small>{rover?.battery ?? 96}% battery · ground layer</small>
        </section>
        <section className="capture-strip">
          <span>AERIAL CAPTURES</span>
          <div>
            {Array.from({ length: 6 }, (_, i) => (
              <i key={i} className={i < captures ? "complete" : ""}>
                <b>{String(i + 1).padStart(2, "0")}</b>
              </i>
            ))}
          </div>
          <small>{captures}/6 evidence tiles captured</small>
        </section>
        {s.anomalyReady && (
          <section className="dispatch-state">
            <span>COORDINATED RESPONSE</span>
            <strong>GROUND INSPECTION REQUIRED</strong>
            <button onClick={() => command("SEEK", 280)}>DISPATCH ROVER</button>
          </section>
        )}
        <section>
          <span>CLASSIFICATION</span>
          <strong>SIMULATED</strong>
          <small>Farm, telemetry, NDVI and evidence chain</small>
        </section>
      </aside>
      <Timeline s={s} command={command} />
      <Controls s={s} command={command} />
    </main>
  );
}
function StaticPage({ kind }: { kind: string }) {
  return (
    <main className="static-page">
      <p className="eyebrow">{kind.toUpperCase()}</p>
      <h1>{kind.replaceAll("-", " ")}</h1>
      <p>
        This route is connected to the normalized simulation domain. Detailed
        production adapters remain future work.
      </p>
      <Link to="/mission-control">Open mission control</Link>
    </main>
  );
}
function About() {
  return (
    <main className="static-page">
      <p className="eyebrow">TRANSPARENCY</p>
      <h1>About this demo</h1>
      <p>{truth.terminology.demo_description}</p>
      <div className="truth-grid">
        <article>
          <b>SOFTWARE_WORKING</b>
          <p>
            Deterministic clock, replayable state, route interpolation,
            telemetry invariants, API and WebSocket transport.
          </p>
        </article>
        <article>
          <b>DEMO_SIMULATION</b>
          <p>
            {truth.language_matrix.ndvi.investor} Farm, anomaly, soil readings
            and mission report are also synthetic or simulated.
          </p>
        </article>
        <article>
          <b>CONCEPT</b>
          <p>
            SENTINEL and ROVER_001 procedural representations are not evidence
            of physical prototypes.
          </p>
        </article>
        <article>
          <b>RELATED TECHNOLOGY</b>
          <p>{truth.ndvi.investor_wording}</p>
        </article>
      </div>
    </main>
  );
}

function TruthDebugger() {
  return (
    <main className="static-page truth-debugger">
      <p className="eyebrow">DEVELOPMENT ONLY · CANONICAL SOURCE</p>
      <h1>New York 2026 truth debugger</h1>
      <p>Source · source-of-truth/new-york-2026.json · as of {truth.as_of}</p>
      <div className="truth-grid">
        <article>
          <b>COMPANY</b>
          <pre>{JSON.stringify(truth.company, null, 2)}</pre>
        </article>
        <article>
          <b>PRODUCTS + MATURITY</b>
          <pre>{JSON.stringify(truth.products, null, 2)}</pre>
        </article>
        <article>
          <b>CURRENT CLAIMS</b>
          <pre>{JSON.stringify(truth.claims, null, 2)}</pre>
        </article>
        <article>
          <b>FINANCIAL + ROUND</b>
          <pre>
            {JSON.stringify(
              { financial: truth.financial, round: truth.round },
              null,
              2,
            )}
          </pre>
        </article>
        <article>
          <b>UNRESOLVED P0</b>
          <pre>{JSON.stringify(truth.decision_queue, null, 2)}</pre>
        </article>
        <article>
          <b>WHAT EXISTS TODAY</b>
          <pre>{JSON.stringify(truth.what_exists_today, null, 2)}</pre>
        </article>
      </div>
    </main>
  );
}
const generatedAssets = [
  ["rover-master-reference-board.png", "Rover reference board"],
  ["rover-operating-states.png", "Rover operating states"],
  ["rover-exploded-concept.png", "Rover exploded concept"],
  ["sentinel-master-reference-board.png", "Sentinel reference board"],
  ["sentinel-animation-reference.png", "Sentinel animation reference"],
  ["ecosystem-hero.png", "Ecosystem hero"],
  ["mission-storyboard.png", "Mission storyboard"],
  ["data-ai-engine.png", "Data and AI engine"],
  ["dashboard-concept.png", "Dashboard concept"],
  ["rover-cutout-front-three-quarter.png", "Rover front 3/4 cutout"],
  ["rover-cutout-rear-three-quarter.png", "Rover rear 3/4 cutout"],
  ["rover-cutout-left-side.png", "Rover left cutout"],
  ["rover-cutout-right-side.png", "Rover right cutout"],
  ["rover-cutout-top-front-isometric.png", "Rover top isometric cutout"],
  ["rover-cutout-bay-open.png", "Rover open-bay cutout"],
  ["rover-cutout-probe-deployed.png", "Rover deployed-probe cutout"],
] as const;
function DevAssets() {
  const base = "/assets/concepts/generated-2026-08-16/";
  return (
    <main className="static-page">
      <p className="eyebrow">INTERNAL · ASSET QA</p>
      <h1>Concept asset registry</h1>
      <p>
        All imagery is concept-only: not prototype evidence, CAD, manufacturing
        geometry or a validated technical claim.
      </p>
      <div className="truth-grid">
        {generatedAssets.map(([file, label]) => (
          <article key={file}>
            <img
              src={`${base}${file}`}
              alt={label}
              loading="lazy"
              style={{
                width: "100%",
                aspectRatio: "16 / 10",
                objectFit: "contain",
                borderRadius: 12,
                background: "#080c0b",
              }}
            />
            <b>{label.toUpperCase()}</b>
            <p>
              CONCEPT_ONLY ·{" "}
              {file.includes("exploded")
                ? "CONCEPT_ENGINEERING_VISUAL"
                : "CONCEPT_RENDER"}
            </p>
          </article>
        ))}
      </div>
      <p>
        Third-party geometry and external INSECE assets remain excluded pending
        license, ownership and security review.
      </p>
    </main>
  );
}
export function App() {
  const nav = useNavigate();
  const location = useLocation();
  const { s, connected, command } = useSimulation();
  const [locale, setLocale] = useState<"en" | "es">("en");
  const t = locale === "en" ? en : es;
  const isolated =
    location.pathname === "/" ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/access");
  useEffect(() => {
    if (isolated) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === " ") command(s.status === "RUNNING" ? "PAUSE" : "PLAY");
      if (e.key.toLowerCase() === "r") command("RESET");
      if (e.key.toLowerCase() === "f")
        document.documentElement.requestFullscreen?.();
      if (["1", "2", "5"].includes(e.key)) command("SET_SPEED", Number(e.key));
      if (e.key.toLowerCase() === "n") command("SEEK", 215);
      if (e.key.toLowerCase() === "d") command("SEEK", 85);
      if (e.key.toLowerCase() === "w") command("SEEK", 280);
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [s.status, isolated]);
  const start = () => {
    void command("PLAY").catch(() => {});
    nav("/investor");
  };
  const secure = (content: ReactNode) => (
    <ProtectedInvestorRoute>{content}</ProtectedInvestorRoute>
  );
  const adminSecure = (content: ReactNode) => (
    <ProtectedInvestorRoute adminOnly>{content}</ProtectedInvestorRoute>
  );
  return (
    <>
      {!isolated && (
        <header>
          <Link to="/" className="wordmark">
            {brand.companyName}
          </Link>
          <nav>
            <Link to="/investor">{t.demo}</Link>
            <Link to="/investor-financials">Capital</Link>
            <Link to="/analytics/ndvi/ndvi-001">Analytics</Link>
            <Link to="/mission-control">{t.operator}</Link>
            <Link to="/system-health">{t.health}</Link>
          </nav>
          <div className="badges">
            <span className={connected ? "connected" : "offline"}>
              {connected ? "CONNECTED" : "RECONNECTING"}
            </span>
            <b>{truth.demo_disclosures.environment}</b>
            <button onClick={() => setLocale(locale === "en" ? "es" : "en")}>
              {locale.toUpperCase()}
            </button>
          </div>
        </header>
      )}
      <Routes>
        <Route path="/" element={<PublicHome />} />
        <Route
          path="/preflight"
          element={secure(<Preflight start={start} t={t} />)}
        />
        <Route path="/access" element={<NdaAccessPage />} />
        <Route path="/access/reverify" element={<NdaAccessPage />} />
        <Route path="/access/expired" element={<NdaAccessPage />} />
        <Route path="/access/revoked" element={<NdaAccessPage />} />
        <Route path="/access/:inviteToken" element={<NdaAccessPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/join" element={<TeamJoinPage />} />
        <Route path="/admin/recover" element={<AdminRecoveryPage />} />
        <Route path="/admin" element={<AdminPortal />} />
        {[
          "agenda",
          "tasks",
          "notes",
          "decisions",
          "crm",
          "materials",
          "meeting-kit",
          "team",
          "invitations",
          "visitors",
          "nda",
          "meeting",
          "security",
        ].map((section) => (
          <Route
            key={section}
            path={`/admin/${section}`}
            element={<AdminPortal />}
          />
        ))}
        <Route
          path="/investor"
          element={secure(<Demo s={s} command={command} t={t} />)}
        />
        <Route
          path="/investor-demo"
          element={secure(<Demo s={s} command={command} t={t} />)}
        />
        <Route
          path="/investor-financials"
          element={secure(<InvestorFinancialView />)}
        />
        <Route path="/fleet" element={secure(<FleetExperience />)} />
        <Route
          path="/fleet/rover/rover-001"
          element={secure(<RoverProductExperience />)}
        />
        <Route
          path="/fleet/sentinel/sentinel-001"
          element={secure(<SentinelProductExperience />)}
        />
        <Route
          path="/mission-control"
          element={secure(<Operator s={s} command={command} />)}
        />
        <Route
          path="/analytics/ndvi/ndvi-001"
          element={secure(<NdviAnalytics />)}
        />
        <Route
          path="/anomalies/anomaly-001"
          element={secure(<AnomalyView />)}
        />
        <Route
          path="/mission/ground-truth"
          element={secure(<GroundTruthView />)}
        />
        <Route path="/data-engine" element={secure(<DataEngineView />)} />
        <Route
          path="/system-health"
          element={secure(<SystemHealthView connected={connected} />)}
        />
        <Route path="/reports/report-001" element={secure(<ReportView />)} />
        <Route path="/about-demo" element={<About />} />
        <Route path="/transparency" element={<About />} />
        <Route path="/dev/truth" element={adminSecure(<TruthDebugger />)} />
        <Route
          path="/dev/round-decision"
          element={adminSecure(<RoundDecisionTool />)}
        />
        <Route path="/dev/assets" element={adminSecure(<DevAssets />)} />
        {pages.map((p) => (
          <Route
            key={p}
            path={`/${p}`}
            element={secure(<StaticPage kind={p} />)}
          />
        ))}
      </Routes>
    </>
  );
}
