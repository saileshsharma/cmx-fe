
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

  const color = (a: SurveyorPoint["availability"]) => (a === "AVAILABLE" ? "bg-green-500" : a === "ON_JOB" ? "bg-blue-500" : "bg-gray-400");

  return (
    <div ref={ref} className="relative w-full h-[420px] rounded-[20px] bg-gray-50/30 border border-gray-200/30 overflow-hidden backdrop-blur-xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.02)_1px,transparent_0)] [background-size:32px_32px]" />
      {points.map((p) => {
        const { x, y } = project(p.lon, p.lat);
        return (
          <TooltipProvider key={p.surveyorId}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={`absolute -translate-x-1/2 -translate-y-1/2 ${color(p.availability)} w-3 h-3 rounded-full shadow-lg ring-2 ring-white/30 animate-pulse`}
                  style={{ left: x, top: y }}
                />
              </TooltipTrigger>
              <TooltipContent className="rounded-[12px] border-0 bg-black/85 text-white backdrop-blur-xl shadow-xl">
                <div className="text-sm">
                  <div className="font-medium">{p.surveyorId}</div>
                  <div className="text-gray-300 text-xs mt-1">{p.availability}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
      <div className="absolute bottom-6 right-6 flex items-center gap-4 rounded-[16px] bg-white/95 backdrop-blur-xl px-5 py-3 shadow-sm border border-black/5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-medium text-gray-900">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-xs font-medium text-gray-900">On Job</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          <span className="text-xs font-medium text-gray-900">Offline</span>
        </div>
      </div>
    </div>
  );
}

// ---------- KPI Card ---------------------------------------------------------
function KpiCard({ label, value, icon: Icon, hint }: { label: string; value: string | number; icon: any; hint?: string }) {
  return (
    <Card className="rounded-[20px] bg-white/95 backdrop-blur-xl border border-black/5 shadow-sm">
      <CardContent className="p-8 flex items-center gap-5">
        <div className="p-4 rounded-[16px] bg-gray-50">
          <Icon className="w-7 h-7 text-gray-800" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">{label}</div>
          <div className="text-4xl font-semibold text-black leading-none tracking-tight">{value}</div>
          {hint && <div className="text-sm text-gray-600 mt-3 leading-relaxed">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Charts -----------------------------------------------------------
function InflowChart({ data }: { data: any[] }) {
  return (
    <Card className="rounded-[20px] bg-white/95 backdrop-blur-xl border border-black/5 shadow-sm">
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="font-semibold text-xl text-black">Claim Inflow</div>
          <div className="text-sm text-gray-600">5‑min windows</div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="2 2" stroke="#f1f5f9" />
              <XAxis dataKey="t" hide />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <RTooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0, 0, 0, 0.05)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="minor" stackId="1" fill="#34d399" fillOpacity={0.8} stroke="#10b981" strokeWidth={2} />
              <Area type="monotone" dataKey="medium" stackId="1" fill="#60a5fa" fillOpacity={0.8} stroke="#3b82f6" strokeWidth={2} />
              <Area type="monotone" dataKey="major" stackId="1" fill="#f87171" fillOpacity={0.8} stroke="#ef4444" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function LatencyChart({ data }: { data: any[] }) {
  return (
    <Card className="rounded-[20px] bg-white/95 backdrop-blur-xl border border-black/5 shadow-sm">
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="font-semibold text-xl text-black">Assignment Latency</div>
          <div className="text-sm text-gray-600">p50/p95 (seconds)</div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="2 2" stroke="#f1f5f9" />
              <XAxis dataKey="t" hide />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <RTooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0, 0, 0, 0.05)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="p50" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }} />
              <Line type="monotone" dataKey="p95" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }} />
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
    <div className="flex flex-wrap gap-4 items-center p-6 rounded-[16px] bg-white/95 backdrop-blur-xl border border-black/5 shadow-sm">
      <Select defaultValue="SG">
        <SelectTrigger className="w-36 h-12 rounded-[12px] border-black/10 bg-white text-sm font-medium">
          <SelectValue placeholder="Tenant" />
        </SelectTrigger>
        <SelectContent className="rounded-[12px] border-black/10 bg-white/98 backdrop-blur-xl">
          <SelectItem value="SG" className="rounded-[8px]">Singapore</SelectItem>
          <SelectItem value="TH" className="rounded-[8px]">Thailand</SelectItem>
          <SelectItem value="VN" className="rounded-[8px]">Vietnam</SelectItem>
        </SelectContent>
      </Select>
      <Select defaultValue="Central">
        <SelectTrigger className="w-44 h-12 rounded-[12px] border-black/10 bg-white text-sm font-medium">
          <SelectValue placeholder="Region" />
        </SelectTrigger>
        <SelectContent className="rounded-[12px] border-black/10 bg-white/98 backdrop-blur-xl">
          <SelectItem value="Central" className="rounded-[8px]">Central</SelectItem>
          <SelectItem value="North" className="rounded-[8px]">North</SelectItem>
          <SelectItem value="East" className="rounded-[8px]">East</SelectItem>
          <SelectItem value="West" className="rounded-[8px]">West</SelectItem>
        </SelectContent>
      </Select>
      <Input
        className="w-72 h-12 rounded-[12px] border-black/10 bg-white text-sm font-medium placeholder:text-gray-500"
        placeholder="Search by Surveyor ID or Claim #"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        className="h-12 px-8 rounded-[12px] bg-white border-black/10 text-sm font-medium hover:bg-gray-50"
      >
        <RefreshCw className="w-4 h-4 mr-2" /> Refresh
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50/50 via-white to-gray-50/30">
      <div className="p-12 space-y-12 max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <h1 className="text-5xl font-semibold text-black tracking-tight leading-tight">Real‑Time Operations</h1>
            <p className="text-xl text-gray-600 leading-relaxed">Live surveyors, claim inflow by region, and assignment latency</p>
          </div>
          <Filters onRefresh={() => { /* hook to refetch or reset window */ }} />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
            <KpiCard label="Surveyors Online" value={online} icon={Activity} hint={`${available} available / ${onJob} on job`} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}>
            <KpiCard label="Claims (last hr)" value={inflow.slice(-12).reduce((a,b)=>a+b.minor+b.medium+b.major,0)} icon={TrendingUp} hint="Minor/Med/Major split shown below" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}>
            <KpiCard label="Assignment p95" value={`${latency.at(-1)?.p95 ?? 0}s`} icon={Clock} hint="Lower is better" />
          </motion.div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}>
            <Card className="rounded-[20px] bg-white/95 backdrop-blur-xl border border-black/5 shadow-sm">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 font-semibold text-xl text-black">
                    <MapPin className="w-6 h-6 text-blue-600" />
                    Surveyor Live Map
                  </div>
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 font-medium px-4 py-2 rounded-[12px] border border-blue-200/50">
                    {online} active
                  </Badge>
                </div>
                <SurveyorLiveMap points={surveyorLive} />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }} className="space-y-8">
            <InflowChart data={inflow} />
            <LatencyChart data={latency} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
