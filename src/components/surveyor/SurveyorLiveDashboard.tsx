
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, MapPin, Clock, TrendingUp, RefreshCw } from "lucide-react";
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
 * SurveyorLiveDashboard — shadcn/ui + Recharts + framer-motion
 *
 * Replace useMockStream() with GraphQL subscriptions forwarding:
 *   - rt.surveyor.live.upsert
 *   - rt.inflow.upsert
 *   - rt.assignment.latency.upsert
 */

// ---------- Types ------------------------------------------------------------
export type SurveyorPoint = {
  surveyorId: string;
  lon: number;
  lat: number;
  availability: "AVAILABLE" | "ON_JOB" | "OFFLINE";
  ts: string;
};

// ---------- Mock stream (replace with real subscriptions) --------------------
function useMockStream() {
  const [surveyorLive, setSurveyorLive] = useState<SurveyorPoint[]>(() =>
    Array.from({ length: 60 }, (_, i) => ({
      surveyorId: `SVY-${100 + i}`,
      lon: 103.8 + Math.random() * 0.2,
      lat: 1.22 + Math.random() * 0.1,
      availability: ["AVAILABLE", "ON_JOB", "OFFLINE"][Math.floor(Math.random() * 3)] as SurveyorPoint["availability"],
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
      setSurveyorLive((prev) =>
        prev.map((s) => ({
          ...s,
          lon: s.lon + (Math.random() - 0.5) * 0.002,
          lat: s.lat + (Math.random() - 0.5) * 0.002,
          availability: Math.random() < 0.02
            ? (["AVAILABLE", "ON_JOB", "OFFLINE"][Math.floor(Math.random() * 3)] as SurveyorPoint["availability"]) : s.availability,
          ts: new Date().toISOString(),
        }))
      );
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

  return { surveyorLive, inflow, latency } as const;
}

// ---------- Map placeholder --------------------------------------------------
function SurveyorLiveMap({ points }: { points: SurveyorPoint[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 800, h: 420 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // SG bounding box (rough) → project lon/lat to x/y
  const project = (lon: number, lat: number) => {
    const minLon = 103.6, maxLon = 104.05;
    const minLat = 1.15, maxLat = 1.48;
    const x = ((lon - minLon) / (maxLon - minLon)) * size.w;
    const y = size.h - ((lat - minLat) / (maxLat - minLat)) * size.h;
    return { x, y };
  };

  const color = (a: SurveyorPoint["availability"]) => (a === "AVAILABLE" ? "bg-emerald-500" : a === "ON_JOB" ? "bg-amber-500" : "bg-slate-400");

  return (
    <div ref={ref} className="relative w-full h-[420px] rounded-2xl border bg-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.08)_1px,transparent_0)] [background-size:20px_20px]" />
      {points.map((p) => {
        const { x, y } = project(p.lon, p.lat);
        return (
          <TooltipProvider key={p.surveyorId}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={`absolute -translate-x-1/2 -translate-y-1/2 ${color(p.availability)} w-3 h-3 rounded-full shadow`}
                  style={{ left: x, top: y }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div className="font-medium">{p.surveyorId}</div>
                  <div className="opacity-70">{p.availability}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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

// ---------- KPI Card ---------------------------------------------------------
function KpiCard({ label, value, icon: Icon, hint }: { label: string; value: string | number; icon: any; hint?: string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-slate-100"><Icon className="w-5 h-5" /></div>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
          <div className="text-2xl font-semibold leading-tight">{value}</div>
          {hint && <div className="text-xs text-slate-500 mt-0.5">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Charts -----------------------------------------------------------
function InflowChart({ data }: { data: any[] }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Claim Inflow (5‑min windows)</div>
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

function LatencyChart({ data }: { data: any[] }) {
  return (
    <Card className="rounded-2xl">
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

// ---------- Filters ----------------------------------------------------------
function Filters({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Select defaultValue="SG">
        <SelectTrigger className="w-28"><SelectValue placeholder="Tenant" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="SG">SG</SelectItem>
          <SelectItem value="TH">TH</SelectItem>
          <SelectItem value="VN">VN</SelectItem>
        </SelectContent>
      </Select>
      <Select defaultValue="Central">
        <SelectTrigger className="w-40"><SelectValue placeholder="Region" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="Central">Central</SelectItem>
          <SelectItem value="North">North</SelectItem>
          <SelectItem value="East">East</SelectItem>
          <SelectItem value="West">West</SelectItem>
        </SelectContent>
      </Select>
      <Input className="w-52" placeholder="Filter by Surveyor ID or Claim #" />
      <Button variant="outline" size="sm" onClick={onRefresh}>
        <RefreshCw className="w-4 h-4 mr-1" /> Refresh
      </Button>
    </div>
  );
}

// ---------- Page -------------------------------------------------------------
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
          <h1 className="text-2xl font-semibold">Real‑Time Operations</h1>
          <p className="text-slate-500">Live surveyors, claim inflow by region, and assignment latency.</p>
        </div>
        <Filters onRefresh={() => { /* hook to refetch or reset window */ }} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard label="Surveyors Online" value={online} icon={Activity} hint={`${available} available / ${onJob} on job`} />
        <KpiCard label="Claims (last hr)" value={inflow.slice(-12).reduce((a,b)=>a+b.minor+b.medium+b.major,0)} icon={TrendingUp} hint="Minor/Med/Major split shown below" />
        <KpiCard label="Assignment p95" value={`${latency.at(-1)?.p95 ?? 0}s`} icon={Clock} hint="Lower is better" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="rounded-2xl">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium"><MapPin className="w-4 h-4" /> Surveyor Live Map</div>
                <Badge variant="secondary">~{online} active</Badge>
              </div>
              <SurveyorLiveMap points={surveyorLive} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }} className="space-y-4">
          <InflowChart data={inflow} />
          <LatencyChart data={latency} />
        </motion.div>
      </div>
    </div>
  );
}
