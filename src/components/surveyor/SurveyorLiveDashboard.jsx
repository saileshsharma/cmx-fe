import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * CMX Real-Time Dashboards — UI (no external UI libs)
 * - Plain HTML + Tailwind classes
 * - No shadcn/ui, no lucide-react, no framer-motion
 * - Uses Recharts only (install if missing)
 *
 * Replace useMockStream() with your GraphQL subscriptions for rt.*.upsert topics.
 */

// ---- Simple Card / Badge / Button primitives -------------------------------
function Card({ className = "", children }) {
  return <div className={`rounded-2xl border bg-white ${className}`}>{children}</div>;
}
function CardContent({ className = "", children }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}
function Badge({ className = "", children }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${className}`}>
      {children}
    </span>
  );
}
function Button({ className = "", children, ...props }) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// ---- Mock stream for demo ---------------------------------------------------
function useMockStream() {
  const [surveyorLive, setSurveyorLive] = useState(() =>
    Array.from({ length: 60 }, (_, i) => ({
      surveyorId: `SVY-${100 + i}`,
      lon: 103.8 + Math.random() * 0.2,
      lat: 1.22 + Math.random() * 0.1,
      availability: ["AVAILABLE", "ON_JOB", "OFFLINE"][Math.floor(Math.random() * 3)],
      ts: new Date().toISOString(),
    }))
  );

  const [inflow, setInflow] = useState(
    Array.from({ length: 24 }, (_, i) => ({
      t: new Date(Date.now() - (24 - i) * 60 * 1000).toISOString(),
      minor: Math.floor(Math.random() * 12),
      medium: Math.floor(Math.random() * 6),
      major: Math.floor(Math.random() * 3),
    }))
  );

  const [latency, setLatency] = useState(
    Array.from({ length: 24 }, (_, i) => ({
      t: new Date(Date.now() - (24 - i) * 60 * 1000).toISOString(),
      p50: 120 + Math.round(Math.random() * 80),
      p95: 240 + Math.round(Math.random() * 160),
    }))
  );

  useEffect(() => {
    const id = setInterval(() => {
      // drift surveyors slightly
      setSurveyorLive((prev) =>
        prev.map((s) => ({
          ...s,
          lon: s.lon + (Math.random() - 0.5) * 0.002,
          lat: s.lat + (Math.random() - 0.5) * 0.002,
          availability:
            Math.random() < 0.02 ? ["AVAILABLE", "ON_JOB", "OFFLINE"][Math.floor(Math.random() * 3)] : s.availability,
          ts: new Date().toISOString(),
        }))
      );
      // push next window for inflow & latency
      setInflow((prev) => {
        const next = prev.slice(1);
        next.push({
          t: new Date().toISOString(),
          minor: Math.floor(Math.random() * 12),
          medium: Math.floor(Math.random() * 6),
          major: Math.floor(Math.random() * 3),
        });
        return next;
      });
      setLatency((prev) => {
        const next = prev.slice(1);
        next.push({
          t: new Date().toISOString(),
          p50: 120 + Math.round(Math.random() * 80),
          p95: 240 + Math.round(Math.random() * 160),
        });
        return next;
      });
    }, 1500);
    return () => clearInterval(id);
  }, []);

  return { surveyorLive, inflow, latency };
}

// ---- Map placeholder ---------------------------------------------------------
function SurveyorLiveMap({ points }) {
  // Map placeholder using a simple grid + absolute markers
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 420 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // SG bounding box (rough) → project lon/lat to x/y
  const project = (lon, lat) => {
    const minLon = 103.6,
      maxLon = 104.05;
    const minLat = 1.15,
      maxLat = 1.48;
    const x = ((lon - minLon) / (maxLon - minLon)) * size.w;
    const y = size.h - ((lat - minLat) / (maxLat - minLat)) * size.h;
    return { x, y };
  };

  const color = (a) => (a === "AVAILABLE" ? "bg-emerald-500" : a === "ON_JOB" ? "bg-amber-500" : "bg-slate-400");

  return (
    <div ref={ref} className="relative w-full h-[420px] rounded-2xl border bg-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.08)_1px,transparent_0)] [background-size:20px_20px]" />
      {points.map((p) => {
        const { x, y } = project(p.lon, p.lat);
        return (
          <span
            key={p.surveyorId}
            className={`absolute -translate-x-1/2 -translate-y-1/2 ${color(p.availability)} w-3 h-3 rounded-full shadow`}
            style={{ left: x, top: y }}
            title={`${p.surveyorId} • ${p.availability}`}
          />
        );
      })}
      <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-xl bg-white/80 backdrop-blur px-3 py-1.5 shadow">
        <span className="w-2 h-2 rounded-full bg-emerald-500" /> <span className="text-xs">Available</span>
        <span className="w-2 h-2 rounded-full bg-amber-500 ml-3" /> <span className="text-xs">On Job</span>
        <span className="w-2 h-2 rounded-full bg-slate-400 ml-3" /> <span className="text-xs">Offline</span>
      </div>
    </div>
  );
}

// ---- KPI cards ---------------------------------------------------------------
function KpiCard({ label, value, hint, icon }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-slate-100">{icon || <span>📊</span>}</div>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
          <div className="text-2xl font-semibold leading-tight">{value}</div>
          {hint && <div className="text-xs text-slate-500 mt-0.5">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Charts ------------------------------------------------------------------
function InflowChart({ data }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Claim Inflow (5-min windows)</div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="t" hide />
              <YAxis />
              <RTooltip />
              <Legend />
              <Area type="monotone" dataKey="minor" stackId="1" />
              <Area type="monotone" dataKey="medium" stackId="1" />
              <Area type="monotone" dataKey="major" stackId="1" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function LatencyChart({ data }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Assignment Latency (p50/p95, seconds)</div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="t" hide />
              <YAxis />
              <RTooltip />
              <Legend />
              <Line type="monotone" dataKey="p50" />
              <Line type="monotone" dataKey="p95" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Filters -----------------------------------------------------------------
function Filters({ onRefresh }) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <select defaultValue="SG" className="h-9 rounded-lg border px-2 text-sm">
        <option value="SG">SG</option>
        <option value="TH">TH</option>
        <option value="VN">VN</option>
      </select>

      <select defaultValue="Central" className="h-9 rounded-lg border px-2 text-sm">
        <option value="Central">Central</option>
        <option value="North">North</option>
        <option value="East">East</option>
        <option value="West">West</option>
      </select>

      <input className="h-9 rounded-lg border px-3 text-sm w-56" placeholder="Filter by Surveyor ID or Claim #" />

      <Button onClick={onRefresh}>
        <span className="text-lg">↻</span> Refresh
      </Button>
    </div>
  );
}

// ---- Page --------------------------------------------------------------------
export default function SurveyorLiveDashboard() {
  const { surveyorLive, inflow, latency } = useMockStream();

  const online = useMemo(() => surveyorLive.filter((s) => s.availability !== "OFFLINE").length, [surveyorLive]);
  const onJob = useMemo(() => surveyorLive.filter((s) => s.availability === "ON_JOB").length, [surveyorLive]);
  const available = useMemo(() => surveyorLive.filter((s) => s.availability === "AVAILABLE").length, [surveyorLive]);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Real-Time Operations</h1>
          <p className="text-slate-500">Live surveyors, claim inflow by region, and assignment latency.</p>
        </div>
        <Filters onRefresh={() => {}} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard
          label="Surveyors Online"
          value={online}
          hint={`${available} available / ${onJob} on job`}
          icon={<span className="text-lg">⚡</span>}
        />
        <KpiCard
          label="Claims (last hr)"
          value={inflow.slice(-12).reduce((a, b) => a + b.minor + b.medium + b.major, 0)}
          hint="Minor/Med/Major split shown below"
          icon={<span className="text-lg">📈</span>}
        />
        <KpiCard
          label="Assignment p95"
          value={`${(latency[latency.length - 1]?.p95) || 0}s`}
          hint="Lower is better"
          icon={<span className="text-lg">⏱️</span>}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                <span className="text-lg">📍</span> Surveyor Live Map
              </div>
              <Badge>~{online} active</Badge>
            </div>
            <SurveyorLiveMap points={surveyorLive} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <InflowChart data={inflow} />
          <LatencyChart data={latency} />
        </div>
      </div>
    </div>
  );
}
