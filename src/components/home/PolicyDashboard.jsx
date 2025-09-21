
import React, { useMemo, useState, useEffect } from "react";
import { useQuery } from "@apollo/client";
import { useSearchParams } from "react-router-dom";
import {
  GET_ALL_POLICIES,
  GET_POLICY_BY_STATUS,
  GET_POLICY_WITH_CLAIMS
} from "../../graphql/policies";
import { GET_CLAIMS_BY_POLICY } from "../../graphql/claims";
import {
  PieChart, Pie, Tooltip, Legend, ResponsiveContainer, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
  ScatterChart, Scatter,
} from "recharts";

/* =========================
   Helpers & constants
   ========================= */
const formatCurrencyTHB = (amount) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 2 })
    .format(Number.isFinite(Number(amount)) ? Number(amount) : 0);

const toDate = (v) => (v == null ? null : new Date(typeof v === "number" ? v : String(v)));
const fmtDate = (v) => {
  const d = toDate(v);
  return d && !Number.isNaN(d.valueOf()) ? d.toLocaleString() : "-";
};
const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Status color palette (cycled for dynamic statuses) */
const COLOR_POOL = [
  "#7C3AED", "#A78BFA", "#6D28D9", "#8B5CF6", "#581C87",
  "#10B981", "#06B6D4", "#0EA5E9", "#EF4444", "#F59E0B",
];

/** Utility: stable color per key */
const colorFor = (key, map, pool = COLOR_POOL) => {
  if (!map.has(key)) map.set(key, pool[map.size % pool.length]);
  return map.get(key);
};

const ALL = "ALL";

// Open-FNOL definition — tweak to your enums
const OPEN_FNOL_STATES = ["CREATED","REGISTERED","SUBMITTED","UNDER_REVIEW","ASSIGNED","IN_PROGRESS"];
const isOpenFnol = (state) => state && OPEN_FNOL_STATES.includes(String(state));

/* URL param helpers */
const toBool = (v, def = false) => (v == null ? def : v === "1" || v === "true");
const toTopN = (v, defN = 8) => {
  if (!v) return defN;
  if (String(v).toUpperCase() === "ALL") return 0; // 0 => all
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : defN;
};
const fromTopN = (n) => (n === 0 ? "ALL" : String(n));

/* CSV helper */
const csv = (rows) => {
  if (!rows?.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (val) => {
    const s = val == null ? "" : String(val);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
};
const downloadCSV = (filename, rows) => {
  const blob = new Blob([csv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/* =========================
   Component
   ========================= */
export default function PolicyDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initial state from URL
  const initStatusFilter = searchParams.get("status") || ALL;
  const initCompact = toBool(searchParams.get("compact"), true);
  const initTimeBucket = (searchParams.get("timeBucket") === "WEEK") ? "WEEK" : "MONTH";
  const initOpenFnol = toBool(searchParams.get("openFnol"), false);
  const initQ = searchParams.get("q") || "";

  const initStatusTopN = toTopN(searchParams.get("statusTopN"), 8);
  const initShowPct = toBool(searchParams.get("showPct"), false);
  const initPremiumTopN = toTopN(searchParams.get("premiumTopN"), 8);
  const initShowPremiumPct = toBool(searchParams.get("showPremiumPct"), false);

  // UI state
  const [statusFilter, setStatusFilter] = useState(initStatusFilter);
  const [q, setQ] = useState(initQ);
  const [search, setSearch] = useState(initQ);
  const [activeTab, setActiveTab] = useState("overview"); // overview | trends | breakdown | matrix | statusInsights
  const [compact, setCompact] = useState(initCompact);
  const [timeBucket, setTimeBucket] = useState(initTimeBucket);
  const [openFnolOnly, setOpenFnolOnly] = useState(initOpenFnol);

  // Horizontal bar chart controls (counts/premium)
  const [statusTopN, setStatusTopN] = useState(initStatusTopN);             // 0=ALL
  const [showPct, setShowPct] = useState(initShowPct);
  const [premiumTopN, setPremiumTopN] = useState(initPremiumTopN);          // 0=ALL
  const [showPremiumPct, setShowPremiumPct] = useState(initShowPremiumPct);

  // Drill-in modal for policy quick view
  const [modalPolicy, setModalPolicy] = useState(null);
  // Claims history modal (by policy number)
  const [claimsPolicyNumber, setClaimsPolicyNumber] = useState(null);

  // debounce search text → search param
  useEffect(() => {
    const t = setTimeout(() => setSearch(q), 200);
    return () => clearTimeout(t);
  }, [q]);

  // pagination
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // queries
  const { data: allData, loading: allLoading, error: allError } = useQuery(GET_ALL_POLICIES);
  const { data: byStatusData, loading: byStatusLoading, error: byStatusError } = useQuery(
    GET_POLICY_BY_STATUS,
    { variables: { policyStatus: statusFilter }, skip: statusFilter === ALL }
  );

  // sources
  const allPolicies = allData?.getAllPolicies ?? [];
  const filteredByStatus = byStatusData?.getPolicyByStatus ?? [];
  const basePolicies = statusFilter === ALL ? allPolicies : filteredByStatus;

  // dynamic status list (stable, alphabetic)
  const STATUS_VALUES = useMemo(() => {
    const set = new Set();
    (allPolicies || []).forEach(p => { if (p?.policyStatus) set.add(String(p.policyStatus)); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allPolicies]);

  // filters + search
  const policies = useMemo(() => {
    let list = basePolicies;
    if (search?.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((p) =>
        String(p.policyNumber ?? "").toLowerCase().includes(s) ||
        String(p?.vehicle?.registrationNumber ?? "").toLowerCase().includes(s) ||
        String(p?.insured?.firstName ?? "").toLowerCase().includes(s) ||
        String(p?.insured?.lastName ?? "").toLowerCase().includes(s)
      );
    }
    if (openFnolOnly) {
      list = list.filter((p) => {
        const claims = Array.isArray(p?.claims) ? p.claims : [];
        return claims.some((c) => isOpenFnol(c?.fnol?.fnolState));
      });
    }
    return list;
  }, [basePolicies, search, openFnolOnly]);

  const loading = statusFilter === ALL ? allLoading : byStatusLoading;
  const error   = statusFilter === ALL ? allError   : byStatusError;

  /* =========================
     Persist view state → URL
     ========================= */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("status", statusFilter || ALL);
    params.set("compact", compact ? "1" : "0");
    params.set("timeBucket", timeBucket);
    params.set("openFnol", openFnolOnly ? "1" : "0");
    if (search) params.set("q", search); else params.delete("q");

    params.set("statusTopN", fromTopN(statusTopN));
    params.set("showPct", showPct ? "1" : "0");
    params.set("premiumTopN", fromTopN(premiumTopN));
    params.set("showPremiumPct", showPremiumPct ? "1" : "0");

    setSearchParams(params, { replace: true });
  }, [
    statusFilter, compact, timeBucket, openFnolOnly, search,
    statusTopN, showPct, premiumTopN, showPremiumPct, setSearchParams
  ]);

  /* =========================
     Aggregations
     ========================= */
  const statusColorMap = useMemo(() => new Map(), []);
  const totalsByStatus = useMemo(() => {
    const agg = new Map(); // status -> { status, count, sumInsured, premium }
    (allPolicies || []).forEach((p) => {
      const st = String(p?.policyStatus ?? "UNKNOWN");
      if (!agg.has(st)) agg.set(st, { status: st, count: 0, sumInsured: 0, premium: 0 });
      const a = agg.get(st);
      a.count += 1;
      a.sumInsured += safeNum(p?.sumInsured);
      a.premium   += safeNum(p?.premium);
    });
    return Array.from(agg.values()).sort((a, b) => a.status.localeCompare(b.status));
  }, [allPolicies]);

  const kpis = useMemo(() => {
    const list = policies;
    const total = list.length;
    const totalSI = list.reduce((acc, p) => acc + safeNum(p.sumInsured), 0);
    const totalPremium = list.reduce((acc, p) => acc + safeNum(p.premium), 0);
    const avgPremium = total ? totalPremium / total : 0;

    // heuristic “active-ish” counts (works with unknown enums)
    const activeCount  = list.filter(p => /ACTIV|INFORCE|BOUND|BIND/i.test(String(p.policyStatus))).length;
    const pendingCount = list.filter(p => /PEND|QUOT|ISSU/i.test(String(p.policyStatus))).length;
    const lapsedCount  = list.filter(p => /LAPSE|EXPIRE|CANCEL/i.test(String(p.policyStatus))).length;

    return { total, totalSI, totalPremium, avgPremium, activeCount, pendingCount, lapsedCount };
  }, [policies]);

  // Horizontal Bar data (Counts)
  const statusBars = useMemo(() => {
    const arr = [...totalsByStatus].sort((a, b) => b.count - a.count);
    const total = arr.reduce((s, x) => s + (x?.count || 0), 0);
    const mapped = arr.map((x) => ({
      status: x.status,
      count: x.count,
      pct: total ? (x.count / total) * 100 : 0,
    }));
    const n = Number.isFinite(Number(statusTopN)) && Number(statusTopN) > 0 ? Number(statusTopN) : null;
    return n ? mapped.slice(0, n) : mapped;
  }, [totalsByStatus, statusTopN]);

  // Horizontal Bar data (Premium)
  const premiumBars = useMemo(() => {
    const arr = [...totalsByStatus].sort((a, b) => b.premium - a.premium);
    const total = arr.reduce((s, x) => s + (x?.premium || 0), 0);
    const mapped = arr.map((x) => ({
      status: x.status,
      premium: x.premium,
      pctPremium: total ? (x.premium / total) * 100 : 0,
    }));
    const n = Number.isFinite(Number(premiumTopN)) && Number(premiumTopN) > 0 ? Number(premiumTopN) : null;
    return n ? mapped.slice(0, n) : mapped;
  }, [totalsByStatus, premiumTopN]);

  // Breakdown pies
  const typeAgg = useMemo(() => {
    const agg = new Map();
    (allPolicies || []).forEach((p) => {
      const key = String(p?.policyType ?? "Unknown");
      agg.set(key, (agg.get(key) || 0) + 1);
    });
    return Array.from(agg.entries()).map(([type, count]) => ({ type, count }));
  }, [allPolicies]);

  const coverageAgg = useMemo(() => {
    const agg = new Map();
    (allPolicies || []).forEach((p) => {
      const key = String(p?.coverageType ?? "Unknown");
      agg.set(key, (agg.get(key) || 0) + 1);
    });
    return Array.from(agg.entries()).map(([coverageType, count]) => ({ coverageType, count }));
  }, [allPolicies]);

  /* =========================
     Time series (by startDate)
     ========================= */
  const startOfISOWeek = (d) => {
    const dt = new Date(d);
    const day = (dt.getDay() + 6) % 7;
    dt.setHours(0, 0, 0, 0);
    dt.setDate(dt.getDate() - day);
    return dt;
  };
  const getISOWeekYear = (dt) => {
    const d = new Date(dt);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    return d.getFullYear();
  };
  const getISOWeek = (dt) => {
    const d = new Date(dt);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    const diff = (d - startOfISOWeek(week1)) / 86400000;
    return 1 + Math.floor(diff / 7);
  };
  const fmtMonthKey = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
  const fmtWeekKey  = (dt) => `${getISOWeekYear(dt)}-W${String(getISOWeek(dt)).padStart(2, "0")}`;
  const fmtWeekLabel = (dt) => {
    const start = startOfISOWeek(dt);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const sm = String(start.getMonth() + 1).padStart(2, "0");
    const sd = String(start.getDate()).padStart(2, "0");
    const em = String(end.getMonth() + 1).padStart(2, "0");
    const ed = String(end.getDate()).padStart(2, "0");
    return `${start.getFullYear()}-${sm}-${sd} → ${end.getFullYear()}-${em}-${ed}`;
  };

  const timeSeriesData = useMemo(() => {
    const bucket = new Map(); // key -> { key, label, count }
    (allPolicies || []).forEach((p) => {
      const raw = p?.startDate || p?.endDate || null;
      if (!raw) return;
      const dt = new Date(raw);
      let key, label;
      if (timeBucket === "MONTH") { key = fmtMonthKey(dt); label = key; }
      else { key = fmtWeekKey(dt); label = fmtWeekLabel(dt); }
      if (!bucket.has(key)) bucket.set(key, { key, label, count: 0 });
      bucket.get(key).count += 1;
    });
    return Array.from(bucket.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [allPolicies, timeBucket]);

  /* =========================
     Status Insights (selected status)
     ========================= */
  const statusPolicies = useMemo(() => {
    const arr = (byStatusData?.getPolicyByStatus ?? []).map(p => ({
      ...p,
      sumInsured: Number(p?.sumInsured) || 0,
      premium: Number(p?.premium) || 0,
    }));
    return arr;
  }, [byStatusData]);

  const statusKpis = useMemo(() => {
    const list = statusPolicies;
    const count = list.length;
    const totalSI = list.reduce((s, x) => s + x.sumInsured, 0);
    const totalPremium = list.reduce((s, x) => s + x.premium, 0);
    const avgPremium = count ? totalPremium / count : 0;
    const avgSI = count ? totalSI / count : 0;

    // Expiring buckets by endDate (0–30 / 31–60 / 61–90 days)
    const now = new Date();
    const inDays = (d) => Math.ceil((new Date(d) - now) / 86400000);
    const exp30 = list.filter(x => x.endDate && inDays(x.endDate) <= 30 && inDays(x.endDate) >= 0).length;
    const exp60 = list.filter(x => x.endDate && inDays(x.endDate) > 30 && inDays(x.endDate) <= 60).length;
    const exp90 = list.filter(x => x.endDate && inDays(x.endDate) > 60 && inDays(x.endDate) <= 90).length;

    return { count, totalSI, totalPremium, avgPremium, avgSI, exp30, exp60, exp90 };
  }, [statusPolicies]);

  const scatterPSI = useMemo(() => statusPolicies.map(p => ({
    x: p.sumInsured,
    y: p.premium,
    policyNumber: p.policyNumber,
    reg: p?.vehicle?.registrationNumber,
    _raw: p,
  })), [statusPolicies]);

  const topMakes = useMemo(() => {
    const m = new Map();
    statusPolicies.forEach(p => {
      const make = String(p?.vehicle?.make ?? "Unknown");
      m.set(make, (m.get(make) || 0) + 1);
    });
    return Array.from(m.entries())
      .map(([make, count]) => ({ make, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [statusPolicies]);

  const startsByMonth = useMemo(() => {
    const bucket = new Map();
    statusPolicies.forEach(p => {
      if (!p.startDate) return;
      const d = new Date(p.startDate);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      bucket.set(key, (bucket.get(key) || 0) + 1);
    });
    return Array.from(bucket.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [statusPolicies]);

  const topByPremium = useMemo(() => {
    return [...statusPolicies]
      .sort((a, b) => b.premium - a.premium)
      .slice(0, 10);
  }, [statusPolicies]);

  const exportStatusCSV = () => {
    const rows = statusPolicies.map(p => ({
      id: p.id,
      policyNumber: p.policyNumber,
      policyStatus: p.policyStatus,
      sumInsured: p.sumInsured,
      premium: p.premium,
      startDate: p.startDate,
      endDate: p.endDate,
      insured: [p?.insured?.firstName, p?.insured?.lastName].filter(Boolean).join(" "),
      vehicleRegistration: p?.vehicle?.registrationNumber ?? "",
      vehicleMake: p?.vehicle?.make ?? "",
      vehicleModel: p?.vehicle?.model ?? "",
    }));
    downloadCSV(`policies_${statusFilter}.csv`, rows);
  };

  /* =========================
     Pagination
     ========================= */
  const CHART_H = compact ? 260 : 380;
  const totalRows = policies.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageRows = policies.slice(start, end);

  useEffect(() => {
    if (currentPage > Math.ceil(policies.length / pageSize)) setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policies.length, pageSize]);

  /* =========================
     Helpers
     ========================= */
  const clearAll = () => {
    setStatusFilter(ALL);
    setQ("");
    setSearch("");
    setOpenFnolOnly(false);
    setActiveTab("overview");
  };

  const anyFilterActive = statusFilter !== ALL || !!search || openFnolOnly;

  /* =========================
     Render
     ========================= */
  if (error) {
    console.error(error);
    return (
      <div className="p-6 max-w-7xl mx-auto bg-white rounded-3xl shadow text-center text-red-600 border border-red-100">
        <p>⚠️ Failed to load policy data.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header + Controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-violet-700">📑 Policy Dashboard</h2>

        <div className="flex flex-wrap gap-2 items-center">
          <label className="inline-flex items-center gap-2 text-sm border rounded-xl px-2 py-1 bg-white">
            <input
              type="checkbox"
              checked={compact}
              onChange={(e) => setCompact(e.target.checked)}
              className="accent-violet-600"
            />
            <span className="text-gray-700">Compact charts</span>
          </label>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); if (e.target.value !== ALL) setActiveTab("statusInsights"); }}
            className="border border-violet-200 rounded-xl px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
          >
            <option value={ALL}>All statuses</option>
            {STATUS_VALUES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search policy # / reg / insured…"
            className="border border-violet-200 rounded-xl px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />

          <label className="inline-flex items-center gap-2 text-sm border rounded-xl px-2 py-1 bg-white">
            <input
              type="checkbox"
              className="accent-violet-600"
              checked={openFnolOnly}
              onChange={(e) => setOpenFnolOnly(e.target.checked)}
            />
            <span className="text-gray-700">Open Claims only</span>
          </label>

          {anyFilterActive && (
            <button
              onClick={clearAll}
              className="text-xs px-3 py-1.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700"
              title="Clear status, search, open-FNOL filter"
            >
              Clear filters ✕
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          title="Total Policies"
          value={kpis.total}
          color="from-violet-600 to-violet-500 text-white"
          onClick={clearAll}
          active={statusFilter === ALL && !search && !openFnolOnly}
        />
        <KpiCard
          title="Total Sum Insured"
          value={formatCurrencyTHB(kpis.totalSI)}
          color="from-indigo-600 to-indigo-500 text-white"
        />
        <KpiCard
          title="Total Premium"
          value={formatCurrencyTHB(kpis.totalPremium)}
          color="from-emerald-600 to-emerald-500 text-white"
        />
        <KpiCard
          title="Avg Premium"
          value={formatCurrencyTHB(kpis.avgPremium)}
          color="from-violet-500 to-violet-400 text-white"
        />
        <KpiCard
          title="Active-ish"
          value={kpis.activeCount}
          color="from-violet-700 to-violet-600 text-white"
          onClick={() => setStatusFilter("ACTIVE")}
        />
        <KpiCard
          title="Pending / Lapsed"
          value={`${kpis.pendingCount} / ${kpis.lapsedCount}`}
          color="from-amber-600 to-amber-500 text-white"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white border border-violet-100 rounded-2xl overflow-hidden">
        <div className="flex flex-wrap gap-2 p-2 border-b border-violet-100">
          {[
            { id: "overview", label: "Overview" },
            { id: "trends", label: "Trends" },
            { id: "breakdown", label: "Breakdown" },
            { id: "matrix", label: "Status × Type" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-xl text-sm transition
                ${activeTab === t.id
                  ? "bg-violet-600 text-white shadow-sm"
                  : "bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-100"}`}
            >
              {t.label}
            </button>
          ))}

          {statusFilter !== ALL && (
            <button
              onClick={() => setActiveTab("statusInsights")}
              className={`px-3 py-1.5 rounded-xl text-sm transition
                ${activeTab === "statusInsights"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-100"}`}
            >
              Status Insights
            </button>
          )}

          <div className="ml-auto text-xs text-gray-600 self-center px-2">
            Showing <span className="font-semibold">{policies.length}</span>{" "}
            {statusFilter === ALL ? "policy(s)" : `in ${statusFilter}`}
            {openFnolOnly && " • Open FNOL only"}
          </div>
        </div>

        <div className="p-3 sm:p-4">
          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Policies by Status — Top */}
              <Card
                title="Policies by Status — Top"
                height={CHART_H}
                loading={allLoading}
                right={
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-700 flex items-center gap-1 border rounded-xl px-2 py-1 bg-white">
                      <input
                        type="checkbox"
                        className="accent-violet-600"
                        checked={showPct}
                        onChange={(e) => setShowPct(e.target.checked)}
                      />
                      % of total
                    </label>
                    <select
                      value={String(fromTopN(statusTopN))}
                      onChange={(e) => setStatusTopN(e.target.value === "ALL" ? 0 : Number(e.target.value))}
                      className="border border-violet-200 rounded-xl px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                      title="Show top N statuses"
                    >
                      {["5","8","10","15","ALL"].map(o => (
                        <option key={o} value={o}>
                          {o === "ALL" ? "All" : `Top ${o}`}
                        </option>
                      ))}
                    </select>
                  </div>
                }
              >
                {statusBars.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    {/* vertical bars */}
                    <BarChart
                      data={statusBars}
                      margin={{ left: 8, right: 12, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="status"
                        type="category"
                        interval={0}
                        angle={-20}
                        height={compact ? 50 : 60}
                        tickMargin={8}
                      />
                      <YAxis
                        type="number"
                        tickFormatter={(v) => (showPct ? `${v.toFixed(0)}%` : v)}
                        domain={[
                          0,
                          (dataMax) =>
                            showPct
                              ? Math.max(100, Math.ceil(dataMax / 10) * 10)
                              : Math.ceil(dataMax),
                        ]}
                      />
                      <Tooltip
                        wrapperStyle={{ fontSize: 12 }}
                        formatter={(v) =>
                          showPct ? [`${Number(v).toFixed(1)}%`, "% of policies"] : [v, "Policies"]
                        }
                        labelFormatter={(label) => `Status: ${label}`}
                      />
                      <Legend />
                      <Bar
                        dataKey={showPct ? "pct" : "count"}
                        name={showPct ? "% of policies" : "Policies"}
                        fill="#7C3AED"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty />
                )}
              </Card>

              {/* Total Premium by Status — Top */}
              <Card
                title="Total Premium by Status — Top"
                height={CHART_H}
                loading={allLoading}
                right={
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-700 flex items-center gap-1 border rounded-xl px-2 py-1 bg-white">
                      <input
                        type="checkbox"
                        className="accent-violet-600"
                        checked={showPremiumPct}
                        onChange={(e) => setShowPremiumPct(e.target.checked)}
                      />
                      % of total
                    </label>
                    <select
                      value={String(fromTopN(premiumTopN))}
                      onChange={(e) => setPremiumTopN(e.target.value === "ALL" ? 0 : Number(e.target.value))}
                      className="border border-violet-200 rounded-xl px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                      title="Show top N statuses"
                    >
                      {["5","8","10","15","ALL"].map(o => <option key={o} value={o}>{o === "ALL" ? "All" : `Top ${o}`}</option>)}
                    </select>
                  </div>
                }
              >
                {premiumBars.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={premiumBars}
                      margin={{ left: 8, right: 12, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" type="category" interval={0} angle={-20} height={compact ? 50 : 60} tickMargin={8} />
                      <YAxis
                        type="number"
                        tickFormatter={(v) =>
                          showPremiumPct ? `${v.toFixed(0)}%` : String(formatCurrencyTHB(v)).replace("฿","")
                        }
                        domain={[
                          0,
                          (dataMax) => (showPremiumPct
                            ? Math.max(100, Math.ceil(dataMax / 10) * 10)
                            : Math.ceil(dataMax))
                        ]}
                      />
                      <Tooltip
                        wrapperStyle={{ fontSize: 12 }}
                        formatter={(v) =>
                          showPremiumPct ? [`${Number(v).toFixed(1)}%`, "% of premium"] : [formatCurrencyTHB(v), "Premium"]
                        }
                        labelFormatter={(label) => `Status: ${label}`}
                      />
                      <Legend />
                      <Bar
                        dataKey={showPremiumPct ? "pctPremium" : "premium"}
                        name={showPremiumPct ? "% of premium" : "Premium"}
                        fill="#10B981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (<Empty />)}
              </Card>
            </div>
          )}

          {/* TRENDS */}
          {activeTab === "trends" && (
            <Card
              title={`Policy Starts Over Time (${timeBucket === "MONTH" ? "Monthly" : "Weekly"})`}
              height={CHART_H}
              loading={allLoading}
              right={
                <select
                  value={timeBucket}
                  onChange={(e) => setTimeBucket(e.target.value)}
                  className="border border-violet-200 rounded-xl px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="WEEK">Weekly</option>
                  <option value="MONTH">Monthly</option>
                </select>
              }
            >
              {timeSeriesData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" interval={compact ? "preserveStartEnd" : 0} />
                    <YAxis allowDecimals={false} />
                    <Tooltip wrapperStyle={{ fontSize: 12 }} />
                    <Legend />
                    <Line type="monotone" dataKey="count" name="Policies" strokeWidth={2} dot={!compact} stroke="#7C3AED" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (<Empty />)}
            </Card>
          )}

          {/* BREAKDOWN */}
          {activeTab === "breakdown" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card title="Policies by Type — All" height={CHART_H} loading={allLoading}>
                {typeAgg.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeAgg.map(d => ({ name: d.type, value: d.count }))}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={compact ? 90 : 110}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {typeAgg.map((d, i) => (
                          <Cell key={i} fill={COLOR_POOL[i % COLOR_POOL.length]} />
                        ))}
                      </Pie>
                      <Tooltip wrapperStyle={{ fontSize: 12 }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (<Empty />)}
              </Card>

              <Card title="Policies by Coverage — All" height={CHART_H} loading={allLoading}>
                {coverageAgg.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={coverageAgg.map(d => ({ name: d.coverageType, value: d.count }))}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={compact ? 90 : 110}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {coverageAgg.map((d, i) => (
                          <Cell key={i} fill={COLOR_POOL[(i + 3) % COLOR_POOL.length]} />
                        ))}
                      </Pie>
                      <Tooltip wrapperStyle={{ fontSize: 12 }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (<Empty />)}
              </Card>
            </div>
          )}

          {/* MATRIX */}
          {activeTab === "matrix" && (
            <Card title="Status × Policy Type — Counts" height={CHART_H + 40} loading={allLoading}>
              <StatusTypeMatrix allPolicies={allPolicies} />
            </Card>
          )}

          {/* STATUS INSIGHTS */}
          {activeTab === "statusInsights" && statusFilter !== ALL && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-violet-700">{statusFilter} • Status Insights</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportStatusCSV}
                    className="px-3 py-1.5 rounded-xl border border-violet-200 text-violet-700 hover:bg-violet-50 text-sm"
                    title="Export current status data to CSV"
                  >
                    Export CSV
                  </button>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <KpiCard title={`${statusFilter} • Policies`} value={statusKpis.count} color="from-violet-600 to-violet-500 text-white" />
                <KpiCard title="Total Premium" value={formatCurrencyTHB(statusKpis.totalPremium)} color="from-emerald-600 to-emerald-500 text-white" />
                <KpiCard title="Avg Premium" value={formatCurrencyTHB(statusKpis.avgPremium)} color="from-violet-500 to-violet-400 text-white" />
                <KpiCard title="Total Sum Insured" value={formatCurrencyTHB(statusKpis.totalSI)} color="from-indigo-600 to-indigo-500 text-white" />
                <KpiCard title="Avg Sum Insured" value={formatCurrencyTHB(statusKpis.avgSI)} color="from-indigo-500 to-indigo-400 text-white" />
                <KpiCard title="Expiring 0–30/60/90" value={`${statusKpis.exp30}/${statusKpis.exp60}/${statusKpis.exp90}`} color="from-amber-600 to-amber-500 text-white" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card title="Premium vs Sum Insured (Scatter)" height={CHART_H} loading={byStatusLoading}>
                  {scatterPSI.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="x" name="Sum Insured" tickFormatter={(v)=>String(formatCurrencyTHB(v)).replace("฿","")} />
                        <YAxis type="number" dataKey="y" name="Premium" tickFormatter={(v)=>String(formatCurrencyTHB(v)).replace("฿","")} />
                        <Tooltip
                          wrapperStyle={{ fontSize: 12 }}
                          cursor={{ strokeDasharray: "3 3" }}
                          formatter={(v, n) => n === "x" ? [formatCurrencyTHB(v), "Sum Insured"] : [formatCurrencyTHB(v), "Premium"]}
                          labelFormatter={(_, i) => {
                            const d = scatterPSI[i] || {};
                            return `${d.policyNumber ?? "-"} • ${d.reg ?? "-"}`;
                          }}
                        />
                        <Legend />
                        <Scatter
                          data={scatterPSI}
                          fill="#7C3AED"
                          name="Policy"
                          onClick={(data) => setModalPolicy(data?.payload?._raw ?? null)}
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  ) : (<Empty />)}
                </Card>

                <Card title="Top Vehicle Makes (Count)" height={CHART_H} loading={byStatusLoading}>
                  {topMakes.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topMakes} layout="vertical" margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="make" width={120} />
                        <Tooltip wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="count" name="Policies" fill="#7C3AED" radius={[4,4,4,4]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (<Empty />)}
                </Card>
              </div>

              {/* Top by premium list (quick actions) */}
              <div className="bg-white border border-violet-100 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-3">
                  <h4 className="font-semibold text-violet-700">Top 10 by Premium — {statusFilter}</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-violet-100 text-sm">
                    <thead className="bg-violet-50">
                      <tr>
                        <Th>#</Th>
                        <Th>Policy #</Th>
                        <Th>Insured</Th>
                        <Th>Vehicle</Th>
                        <Th align="right">Sum Insured</Th>
                        <Th align="right">Premium</Th>
                        <Th>Start</Th>
                        <Th>End</Th>
                        <Th align="center">Actions</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {topByPremium.length ? topByPremium.map((p, i) => (
                        <tr key={p.id} className="hover:bg-violet-50/40">
                          <Td>{i+1}</Td>
                          <Td className="font-medium text-violet-700">{p.policyNumber ?? "-"}</Td>
                          <Td>{[p?.insured?.firstName, p?.insured?.lastName].filter(Boolean).join(" ") || "-"}</Td>
                          <Td>{[p?.vehicle?.make, p?.vehicle?.model, p?.vehicle?.registrationNumber].filter(Boolean).join(" • ") || "-"}</Td>
                          <Td align="right">{formatCurrencyTHB(p.sumInsured)}</Td>
                          <Td align="right">{formatCurrencyTHB(p.premium)}</Td>
                          <Td>{fmtDate(p.startDate)}</Td>
                          <Td>{fmtDate(p.endDate)}</Td>
                          <Td align="center">
     

                            <button
  onClick={() => openClaimsFor(p)}
  className="px-2 py-1 rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-50 disabled:opacity-50"
  title={p?.policyNumber ? "View claims history" : "No policy number"}
  disabled={!p?.policyNumber}
>
  Claims
</button>



                          </Td>
                        </tr>
                      )) : (
                        <tr><td colSpan={9} className="px-4 py-6 text-center text-gray-500">No policies.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Policies Table */}
      <div className="bg-white border border-violet-100 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-3">
          <h4 className="font-semibold text-violet-700">All Policies (current filter)</h4>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-violet-200 rounded-xl px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="px-3 pb-3 text-violet-700">Loading policies…</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full border-collapse border border-violet-100 text-sm">
                <thead className="sticky top-0 z-10 bg-violet-50">
                  <tr>
                    <Th>Policy ID</Th>
                    <Th>Policy #</Th>
                    <Th>Status</Th>
                    <Th>Type</Th>
                    <Th>Coverage</Th>
                    <Th align="right">Sum Insured</Th>
                    <Th align="right">Premium</Th>
                    <Th>Start</Th>
                    <Th>End</Th>
                    <Th>Insured</Th>
                    <Th>Vehicle</Th>
                    <Th align="center">Open Claims</Th>
                    <Th align="center"></Th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length ? (
                    pageRows.map((p, i) => {
                      const stColor = colorFor(String(p?.policyStatus ?? "UNKNOWN"), statusColorMap);
                      const openFnolCount = (p?.claims ?? []).reduce((acc, c) => acc + (isOpenFnol(c?.fnol?.fnolState) ? 1 : 0), 0);
                      return (
                        <tr key={String(p.id ?? p.policyNumber ?? i)} className="hover:bg-violet-50/40">
                          <Td>{p.id ?? "-"}</Td>
                          <Td className="font-medium text-violet-700">{p.policyNumber ?? "-"}</Td>
                          <Td>
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                              style={{
                                background: (stColor + "22"),
                                color: stColor,
                                border: `1px solid ${stColor}33`,
                              }}
                            >
                              {p.policyStatus ?? "-"}
                            </span>
                          </Td>
                          <Td>{p.policyType ?? "-"}</Td>
                          <Td>{p.coverageType ?? "-"}</Td>
                          <Td align="right">{formatCurrencyTHB(safeNum(p.sumInsured))}</Td>
                          <Td align="right">{formatCurrencyTHB(safeNum(p.premium))}</Td>
                          <Td>{fmtDate(p.startDate)}</Td>
                          <Td>{fmtDate(p.endDate)}</Td>
                          <Td>{[p?.insured?.firstName, p?.insured?.lastName].filter(Boolean).join(" ") || "-"}</Td>
                          <Td>{p?.vehicle?.registrationNumber || "-"}</Td>
                          <Td align="center">
                            {openFnolCount > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                {openFnolCount}
                              </span>
                            ) : "0"}
                          </Td>
                          <Td align="center">
                            <div className="flex items-center gap-2 justify-center">
                              <button
                                onClick={() => setClaimsPolicyNumber(p.policyNumber)}
                                className="px-2 py-1 rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-50"
                                title="View claims history"
                                aria-label={`View claims for ${p.policyNumber || p.id || ""}`}
                              >
                                View Claims
                              </button>
                             
                            </div>
                          </Td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={13} className="border px-4 py-6 text-center text-gray-500">No policies found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between p-3 text-sm border-t border-violet-100 bg-white">
              <span className="text-gray-700">
                {totalRows ? `${start + 1}-${Math.min(end, totalRows)} of ${totalRows}` : "0 of 0"}
              </span>
              <div className="flex items-center gap-2">
                <button className="px-2 py-1 border border-violet-200 rounded-xl disabled:opacity-50 hover:bg-violet-50"
                        onClick={() => setPage(1)} disabled={currentPage === 1}>« First</button>
                <button className="px-2 py-1 border border-violet-200 rounded-xl disabled:opacity-50 hover:bg-violet-50"
                        onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>‹ Prev</button>
                <span className="px-2 text-gray-700">Page {currentPage} / {pageCount}</span>
                <button className="px-2 py-1 border border-violet-200 rounded-xl disabled:opacity-50 hover:bg-violet-50"
                        onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={currentPage === pageCount}>Next ›</button>
                <button className="px-2 py-1 border border-violet-200 rounded-xl disabled:opacity-50 hover:bg-violet-50"
                        onClick={() => setPage(pageCount)} disabled={currentPage === pageCount}>Last »</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Drill-in Modal */}
      {modalPolicy && (
        <Modal onClose={() => setModalPolicy(null)} title={`Policy ${modalPolicy.policyNumber ?? ""}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Info label="Policy #" value={modalPolicy.policyNumber} />
            <Info label="Status" value={modalPolicy.policyStatus} />
            <Info label="Premium" value={formatCurrencyTHB(modalPolicy.premium)} />
            <Info label="Sum Insured" value={formatCurrencyTHB(modalPolicy.sumInsured)} />
            <Info label="Start" value={fmtDate(modalPolicy.startDate)} />
            <Info label="End" value={fmtDate(modalPolicy.endDate)} />
            <Info label="Insured" value={[modalPolicy?.insured?.firstName, modalPolicy?.insured?.lastName].filter(Boolean).join(" ") || "-"} />
            <Info label="Vehicle" value={[modalPolicy?.vehicle?.make, modalPolicy?.vehicle?.model, modalPolicy?.vehicle?.registrationNumber].filter(Boolean).join(" • ") || "-"} />
          </div>
        </Modal>
      )}

      {/* Claims History Modal */}
      {claimsPolicyNumber && (
        <Modal
          onClose={() => setClaimsPolicyNumber(null)}
          title={`Claims History • ${claimsPolicyNumber}`}
        >
          <ClaimsHistory policyNumber={claimsPolicyNumber} />
        </Modal>
      )}
    </div>
  );
}

/* =========================
   Claims History table
   ========================= */



function ClaimsHistory({ policyNumber }) {
  const { data, loading, error } = useQuery(GET_POLICY_WITH_CLAIMS, {
    variables: { policyNumber },
  });

  if (loading) return <p className="text-violet-700">Loading claims…</p>;
  if (error) return <p className="text-red-600">Failed to load claims.</p>;

  const rows = Array.isArray(data?.getPolicyByNumber?.claims)
    ? data.getPolicyByNumber.claims
    : [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-violet-100 text-sm">
        <thead className="bg-violet-50">
          <tr>
            <Th>Claim #</Th>
            <Th>Status</Th>
            <Th>Severity</Th>
            <Th>FNOL Ref</Th>
            <Th>FNOL State</Th>
            <Th>Created</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((c) => (
            <tr key={c.id ?? c.claimNumber} className="hover:bg-violet-50/40">
              <Td className="font-medium text-violet-700">{c.claimNumber ?? "-"}</Td>
              <Td>{c.status ?? "-"}</Td>
              <Td>{c.severity ?? "-"}</Td>
              <Td>{c?.fnol?.fnolReferenceNo ?? "-"}</Td>
              <Td>{c?.fnol?.fnolState ?? "-"}</Td>
              <Td>{fmtDate(c.createdAt)}</Td>
            </tr>
          )) : (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                No claims found for this policy.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}



/* =========================
   Matrix: Status × Policy Type
   ========================= */
function StatusTypeMatrix({ allPolicies }) {
  const data = useMemo(() => {
    // collect keys
    const statuses = new Set();
    const types = new Set();
    (allPolicies || []).forEach(p => {
      if (p?.policyStatus) statuses.add(String(p.policyStatus));
      types.add(String(p?.policyType ?? "Unknown"));
    });
    const _statuses = Array.from(statuses).sort((a, b) => a.localeCompare(b));
    const _types = Array.from(types).sort((a, b) => a.localeCompare(b));

    const seed = _statuses.map((st) => {
      const row = { status: st };
      _types.forEach((t) => (row[t] = 0));
      return { key: st, row };
    });
    const byStatus = new Map(seed.map((s) => [s.key, s.row]));

    (allPolicies || []).forEach((p) => {
      const st = String(p?.policyStatus ?? "UNKNOWN");
      const t  = String(p?.policyType ?? "Unknown");
      if (!byStatus.has(st)) {
        const row = { status: st };
        _types.forEach((x) => (row[x] = 0));
        byStatus.set(st, row);
      }
      byStatus.get(st)[t] += 1;
    });

    return { rows: _statuses.map((st) => byStatus.get(st)).filter(Boolean), columns: _types };
  }, [allPolicies]);

  const palette = COLOR_POOL;
  return data.rows?.length ? (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data.rows}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="status" type="category" width={140} />
        <Tooltip wrapperStyle={{ fontSize: 12 }} />
        <Legend />
        {data.columns.map((col, i) => (
          <Bar key={col} dataKey={col} name={col} stackId="a" fill={palette[i % palette.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  ) : (<Empty />);
}

/* =========================
   Tiny UI helpers
   ========================= */
function Card({ title, height, children, loading, right }) {
  return (
    <div className="bg-white border border-violet-100 rounded-2xl">
      <div className="flex items-center justify-between p-3">
        <h4 className="font-semibold text-violet-700">{title}</h4>
        {right}
      </div>
      <div className="p-3 pt-0">
        {loading ? <p className="text-violet-700">Loading…</p> : <div style={{ width: "100%", height }}>{children}</div>}
      </div>
    </div>
  );
}

function KpiCard({ title, value, color = "from-violet-200 to-violet-100 text-violet-900", onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl p-4 border border-violet-100 shadow-sm transition
        bg-gradient-to-br ${color} ${active ? "ring-2 ring-violet-300" : "hover:shadow"} `}
      title={String(title)}
    >
      <p className="text-xs sm:text-sm opacity-90">{title}</p>
      <p className="mt-1 text-xl sm:text-2xl font-bold">{value}</p>
    </button>
  );
}

function Th({ children, align }) {
  const cls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <th className={`border border-violet-100 px-3 py-2 ${cls} text-violet-900`}>{children}</th>;
}
function Td({ children, align, className = "" }) {
  const cls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <td className={`border border-violet-100 px-3 py-2 ${cls} ${className}`}>{children}</td>;
}
function Empty() {
  return <p className="text-violet-700 text-sm">No data to chart.</p>;
}

// Safely open the Claims modal with a usable policy number
const openClaimsFor = (row) => {
  const number =
    row?.policyNumber ??
    row?.policy?.policyNumber ??
    null;

  console.debug("[claims] openClaimsFor →", { number, row });

  if (!number) {
    alert("No policy number on this row. Cannot load claims.");
    return;
  }
  setClaimsPolicyNumber(String(number));
};



function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-violet-100">
        <div className="flex items-center justify-between p-3 border-b border-violet-100">
          <h4 className="font-semibold text-violet-700">{title}</h4>
          <button
            onClick={onClose}
            className="px-2 py-1 rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-50"
          >
            Close
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
function Info({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-600">{label}</div>
      <div className="font-medium text-violet-800">{value ?? "-"}</div>
    </div>
  );
}
