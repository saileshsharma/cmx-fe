import React, { useMemo, useState, useEffect } from "react";
import { useQuery } from "@apollo/client";
import { GET_ALL_CLAIMS, GET_CLAIMS_BY_STATUS } from "../../graphql/claims";
import {
  PieChart, Pie, Tooltip, Legend, ResponsiveContainer, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from "recharts";

/* =========================
   Helpers & constants
   ========================= */
const formatCurrencyTHB = (amount) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 2 })
    .format(amount ?? 0);

const toDate = (v) => (v == null ? null : new Date(typeof v === "number" ? v : String(v)));
const fmtDate = (v) => {
  const d = toDate(v);
  return d && !Number.isNaN(d.valueOf()) ? d.toLocaleString() : "-";
};
const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Status */
const StatusLabel = {
  REGISTERED: "Registered",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAID: "Paid",
};
const STATUS_ORDER = ["REGISTERED", "UNDER_REVIEW", "APPROVED", "REJECTED", "PAID"];

/* Keep categorical colors distinct for charts,
   but push overall UI toward violet */
const STATUS_COLOR = {
  REGISTERED: "#7C3AED",   // violet-600
  UNDER_REVIEW: "#A78BFA",  // violet-300
  APPROVED: "#10B981",      // emerald-500
  REJECTED: "#EF4444",      // red-500
  PAID: "#6D28D9",          // violet-700
};

/** Severity */
const SeverityLabel = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };
const SEVERITY_ORDER = ["LOW", "MEDIUM", "HIGH"];
const SEVERITY_COLOR = {
  LOW: "#8B5CF6",     // violet-500
  MEDIUM: "#A78BFA",  // violet-300
  HIGH: "#6D28D9",    // violet-700
};
const normSeverity = (v) => {
  const s = String(v || "").toUpperCase();
  return SEVERITY_ORDER.includes(s) ? s : null;
};

const ALL = "ALL";

/* =========================
   Component
   ========================= */
export default function ClaimsDashboard() {
  // UI state
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [activeTab, setActiveTab] = useState("overview"); // overview | trends | breakdown | matrix
  const [compact, setCompact] = useState(true);
  const [timeBucket, setTimeBucket] = useState("WEEK"); // WEEK | MONTH

  // Quick filters
  const [quickStatuses, setQuickStatuses] = useState(null);
  const [quickSeverity, setQuickSeverity] = useState(null);
  const [quickFlag, setQuickFlag] = useState(null);

  const CHART_H = compact ? 260 : 380;

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(q), 200);
    return () => clearTimeout(t);
  }, [q]);

  // pagination
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // queries
  const { data: allData, loading: allLoading, error: allError } = useQuery(GET_ALL_CLAIMS);
  const isValidStatus = STATUS_ORDER.includes(statusFilter);
  const { data: byStatusData, loading: byStatusLoading, error: byStatusError } = useQuery(
    GET_CLAIMS_BY_STATUS,
    { variables: { status: statusFilter }, skip: statusFilter === ALL || !isValidStatus }
  );

  // sources
  const allClaims = allData?.getAllClaims ?? [];
  const filteredByStatus = byStatusData?.getClaimsByStatus ?? [];
  const baseClaims = statusFilter === ALL ? allClaims : filteredByStatus;

  // apply quick filters + search
  const claims = useMemo(() => {
    let list = baseClaims;
    if (quickStatuses?.length) {
      const sset = new Set(quickStatuses.map(String));
      list = list.filter((c) => sset.has(String(c.claimStatus)));
    }
    if (quickSeverity) {
      list = list.filter((c) => normSeverity(c.claimSeverity) === quickSeverity);
    }
    if (search?.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((c) => String(c.claimNumber ?? "").toLowerCase().includes(s));
    }
    return list;
  }, [baseClaims, quickStatuses, quickSeverity, search]);

  const loading = statusFilter === ALL ? allLoading : byStatusLoading;
  const error = statusFilter === ALL ? allError : byStatusError;

  /* =========================
     Aggregations
     ========================= */
  const totalsByStatus = useMemo(() => {
    const agg = {};
    for (const s of STATUS_ORDER) agg[s] = { status: s, count: 0, amount: 0 };
    (allClaims || []).forEach((c) => {
      const st = c.claimStatus;
      if (!agg[st]) agg[st] = { status: st, count: 0, amount: 0 };
      agg[st].count += 1;
      agg[st].amount += safeNum(c.claimAmount);
    });
    return STATUS_ORDER.filter((s) => agg[s].count > 0 || agg[s].amount > 0).map((s) => agg[s]);
  }, [allClaims]);

  const kpis = useMemo(() => {
    const list = claims;
    const total = list.length;
    const sum = list.reduce((acc, c) => acc + safeNum(c.claimAmount), 0);
    const avg = total ? sum / total : 0;

    const approvedAmt = list
      .filter((c) => c.claimStatus === "APPROVED")
      .reduce((acc, c) => acc + safeNum(c.claimAmount), 0);

    const registeredCount   = list.filter((c) => c.claimStatus === "REGISTERED").length;
    const underReviewCount  = list.filter((c) => c.claimStatus === "UNDER_REVIEW").length;
    const rejectedCount     = list.filter((c) => c.claimStatus === "REJECTED").length;

    const highSeverity      = list.filter((c) => normSeverity(c.claimSeverity) === "HIGH").length;
    const mediumSeverity    = list.filter((c) => normSeverity(c.claimSeverity) === "MEDIUM").length;
    const lowSeverity       = list.filter((c) => normSeverity(c.claimSeverity) === "LOW").length;

    const pendingAmount     = list
      .filter((c) => ["UNDER_REVIEW", "REGISTERED"].includes(String(c.claimStatus)))
      .reduce((acc, c) => acc + safeNum(c.claimAmount), 0);

    const paidAmount        = list
      .filter((c) => c.claimStatus === "PAID")
      .reduce((acc, c) => acc + safeNum(c.claimAmount), 0);

    // Avg processing time (days)
    const diffs = list
      .map((c) => {
        const d1 = toDate(c.claimDate);
        const d2 = toDate(c.dateReported);
        if (!d1 || !d2 || Number.isNaN(d1.valueOf()) || Number.isNaN(d2.valueOf())) return null;
        return Math.abs(d2 - d1) / (1000 * 60 * 60 * 24);
      })
      .filter((n) => Number.isFinite(n));
    const avgProcDays = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : null;

    return {
      total, sum, avg, approvedAmt,
      registeredCount, underReviewCount, rejectedCount,
      highSeverity, mediumSeverity, lowSeverity,
      pendingAmount, paidAmount, avgProcDays,
    };
  }, [claims]);

  const pieDataAll = useMemo(
    () => totalsByStatus.map((x) => ({ name: StatusLabel[x.status] ?? x.status, value: x.count, status: x.status })),
    [totalsByStatus]
  );

  const barDataAll = useMemo(
    () => totalsByStatus.map((x) => ({ status: StatusLabel[x.status] ?? x.status, amount: x.amount, rawStatus: x.status })),
    [totalsByStatus]
  );

  const severityAgg = useMemo(() => {
    const agg = {};
    for (const s of SEVERITY_ORDER) agg[s] = { severity: s, count: 0 };
    (allClaims || []).forEach((c) => {
      const sev = normSeverity(c.claimSeverity);
      if (!sev) return;
      agg[sev].count += 1;
    });
    return SEVERITY_ORDER.filter((s) => agg[s] && agg[s].count > 0).map((s) => agg[s]);
  }, [allClaims]);

  const severityPieData = useMemo(
    () => severityAgg.map((x) => ({ name: SeverityLabel[x.severity] ?? x.severity, value: x.count, severity: x.severity })),
    [severityAgg]
  );

  /* =========================
     Time series
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
    (allClaims || []).forEach((c) => {
      const raw = c.dateReported || c.claimDate || c.createdAt || null;
      if (!raw) return;
      const dt = new Date(raw);
      let key, label;
      if (timeBucket === "MONTH") { key = fmtMonthKey(dt); label = key; }
      else { key = fmtWeekKey(dt); label = fmtWeekLabel(dt); }
      if (!bucket.has(key)) bucket.set(key, { key, label, count: 0 });
      bucket.get(key).count += 1;
    });
    return Array.from(bucket.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [allClaims, timeBucket]);

  /* =========================
     Pagination
     ========================= */
  const totalRows = claims.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageRows = claims.slice(start, end);

  useEffect(() => {
    if (currentPage > Math.ceil(claims.length / pageSize)) setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claims.length, pageSize]);

  /* =========================
     Helpers
     ========================= */
  const clearAllFilters = () => {
    setStatusFilter(ALL);
    setQuickStatuses(null);
    setQuickSeverity(null);
    setQuickFlag(null);
    setSearch("");
    setQ("");
  };

  const isTile = {
    total: statusFilter === ALL && !quickStatuses && !quickSeverity && !search,
    approvedAmount: statusFilter === "APPROVED" && !quickSeverity,
    regOrUnder:
      ["REGISTERED", "UNDER_REVIEW"].includes(statusFilter) ||
      (quickStatuses &&
        quickStatuses.includes("REGISTERED") &&
        quickStatuses.includes("UNDER_REVIEW")),
    rejected: statusFilter === "REJECTED",
    high: quickSeverity === "HIGH",
    medium: quickSeverity === "MEDIUM",
    low: quickSeverity === "LOW",
    pendingAmt:
      Array.isArray(quickStatuses) &&
      quickStatuses.length === 2 &&
      quickStatuses.includes("REGISTERED") &&
      quickStatuses.includes("UNDER_REVIEW"),
    paidAmt: statusFilter === "PAID",
    avgProc: quickFlag === "avgProc",
    avgAmt: quickFlag === "avgAmt",
  };
  const anyFilterActive = !isTile.total;

  /* =========================
     Render
     ========================= */
  if (error) {
    console.error(error);
    return (
      <div className="p-6 max-w-7xl mx-auto bg-white rounded-3xl shadow text-center text-red-600 border border-red-100">
        <p>⚠️ Failed to load claims data.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header + Controls (violet) */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-violet-700">📊 Claims Dashboard</h2>

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
            onChange={(e) => { setStatusFilter(e.target.value); setQuickStatuses(null); setQuickFlag(null); }}
            className="border border-violet-200 rounded-xl px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
          >
            <option value={ALL}>All statuses</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{StatusLabel[s]}</option>
            ))}
          </select>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search claim #…"
            className="border border-violet-200 rounded-xl px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />

          {anyFilterActive && (
            <button
              onClick={clearAllFilters}
              className="text-xs px-3 py-1.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700"
              title="Clear status, quick filters, severity, and search"
            >
              Clear filters ✕
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards — violet look */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          title="Total Claims"
          value={kpis.total}
          color="from-violet-600 to-violet-500 text-white"
          onClick={clearAllFilters}
          active={isTile.total}
        />
        <KpiCard
          title="Approved Amount"
          value={formatCurrencyTHB(kpis.approvedAmt)}
          color="from-emerald-600 to-emerald-500 text-white"
          onClick={() => { setStatusFilter("APPROVED"); setQuickStatuses(null); setQuickSeverity(null); setQuickFlag(null); }}
          active={isTile.approvedAmount}
        />
        <KpiCard
          title="Average Amount"
          value={formatCurrencyTHB(kpis.avg)}
          color="from-violet-500 to-violet-400 text-white"
          onClick={() => { setQuickFlag("avgAmt"); setActiveTab("overview"); }}
          active={isTile.avgAmt}
        />
        <KpiCard
          title="Registered / Under Review"
          value={`${kpis.registeredCount} / ${kpis.underReviewCount}`}
          color="from-amber-600 to-amber-500 text-white"
          onClick={() => { setStatusFilter(ALL); setQuickStatuses(["REGISTERED","UNDER_REVIEW"]); setQuickSeverity(null); setQuickFlag(null); }}
          active={isTile.regOrUnder || isTile.pendingAmt}
        />
        <KpiCard
          title="Rejected Claims"
          value={kpis.rejectedCount}
          color="from-rose-600 to-rose-500 text-white"
          onClick={() => { setStatusFilter("REJECTED"); setQuickStatuses(null); setQuickSeverity(null); setQuickFlag(null); }}
          active={isTile.rejected}
        />
        <KpiCard
          title="High Severity"
          value={kpis.highSeverity}
          color="from-violet-700 to-violet-600 text-white"
          onClick={() => { setQuickSeverity("HIGH"); setQuickStatuses(null); setQuickFlag(null); }}
          active={isTile.high}
        />
        <KpiCard
          title="Medium Severity"
          value={kpis.mediumSeverity}
          color="from-violet-400 to-violet-300 text-white"
          onClick={() => { setQuickSeverity("MEDIUM"); setQuickStatuses(null); setQuickFlag(null); }}
          active={isTile.medium}
        />
        <KpiCard
          title="Low Severity"
          value={kpis.lowSeverity}
          color="from-violet-300 to-violet-200 text-violet-900"
          onClick={() => { setQuickSeverity("LOW"); setQuickStatuses(null); setQuickFlag(null); }}
          active={isTile.low}
        />
        <KpiCard
          title="Pending Amount"
          value={formatCurrencyTHB(kpis.pendingAmount)}
          color="from-amber-700 to-amber-600 text-white"
          onClick={() => { setStatusFilter(ALL); setQuickStatuses(["REGISTERED","UNDER_REVIEW"]); setQuickSeverity(null); setQuickFlag(null); }}
          active={isTile.pendingAmt}
        />
        <KpiCard
          title="Paid Amount"
          value={formatCurrencyTHB(kpis.paidAmount)}
          color="from-violet-700 to-violet-600 text-white"
          onClick={() => { setStatusFilter("PAID"); setQuickStatuses(null); setQuickSeverity(null); setQuickFlag(null); }}
          active={isTile.paidAmt}
        />
        <KpiCard
          title="Avg Processing Time (Days)"
          value={kpis.avgProcDays != null ? kpis.avgProcDays.toFixed(1) : "-"}
          color="from-violet-600 to-violet-500 text-white"
          onClick={() => { setQuickFlag("avgProc"); setActiveTab("trends"); }}
          active={isTile.avgProc}
        />
      </div>

      {/* Tabs (violet chips) */}
      <div className="bg-white border border-violet-100 rounded-2xl overflow-hidden">
        <div className="flex flex-wrap gap-2 p-2 border-b border-violet-100">
          {[
            { id: "overview", label: "Overview" },
            { id: "trends", label: "Trends" },
            { id: "breakdown", label: "Breakdown" },
            { id: "matrix", label: "Status × Severity" },
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

          <div className="ml-auto text-xs text-gray-600 self-center px-2">
            Showing <span className="font-semibold">{claims.length}</span>{" "}
            {statusFilter === ALL ? "claim(s)" : `in ${StatusLabel[statusFilter]}`}
            {quickSeverity && ` • Severity: ${SeverityLabel[quickSeverity]}`}
            {quickStatuses?.length === 2 && " • Status: Registered+Under Review"}
          </div>
        </div>

        <div className="p-3 sm:p-4">
          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card title="Claims by Status — All" height={CHART_H} loading={allLoading}>
                {pieDataAll.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieDataAll}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={compact ? 90 : 110}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {pieDataAll.map((d, i) => (
                          <Cell key={i} fill={STATUS_COLOR[d.status] || "#8B5CF6"} />
                        ))}
                      </Pie>
                      <Tooltip wrapperStyle={{ fontSize: 12 }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (<Empty />)}
              </Card>

              <Card title="Total Amount by Status — All" height={CHART_H} loading={allLoading}>
                {barDataAll.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barDataAll}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis tickFormatter={(v) => formatCurrencyTHB(v).replace("฿", "")} />
                      <Tooltip formatter={(v) => formatCurrencyTHB(v)} wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="amount">
                        {barDataAll.map((d, i) => (
                          <Cell key={i} fill={STATUS_COLOR[d.rawStatus] || "#8B5CF6"} />
                        ))}
                      </Bar>
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (<Empty />)}
              </Card>
            </div>
          )}

          {/* TRENDS */}
          {activeTab === "trends" && (
            <Card
              title={`Reported Claims Over Time (${timeBucket === "MONTH" ? "Monthly" : "Weekly"})`}
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
                    <Line type="monotone" dataKey="count" name="Claims" strokeWidth={2} dot={!compact} stroke="#7C3AED" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (<Empty />)}
            </Card>
          )}

          {/* BREAKDOWN */}
          {activeTab === "breakdown" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card title="Claims by Severity — All" height={CHART_H} loading={allLoading}>
                {severityPieData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityPieData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={compact ? 90 : 110}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {severityPieData.map((d, i) => (
                          <Cell key={i} fill={SEVERITY_COLOR[d.severity] || "#8B5CF6"} />
                        ))}
                      </Pie>
                      <Tooltip wrapperStyle={{ fontSize: 12 }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (<Empty />)}
              </Card>

              <div className="bg-violet-50 border border-violet-100 rounded-2xl p-3 flex items-center justify-center text-sm text-violet-700">
                Add another claim-only chart here (e.g., Amount distribution, Top vehicles, etc.)
              </div>
            </div>
          )}

          {/* MATRIX */}
          {activeTab === "matrix" && (
            <Card title="Status × Severity — Counts" height={CHART_H + 40} loading={allLoading}>
              <StatusSeverityMatrix allClaims={allClaims} />
            </Card>
          )}
        </div>
      </div>

      {/* Claims Table (violet header + pager) */}
      <div className="bg-white border border-violet-100 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-3">
          <h4 className="font-semibold text-violet-700">All Claims (current filter)</h4>
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
          <p className="px-3 pb-3 text-violet-700">Loading claims…</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full border-collapse border border-violet-100 text-sm">
                <thead className="sticky top-0 z-10 bg-violet-50">
                  <tr>
                    <Th>Claim ID</Th>
                    <Th>Claim #</Th>
                    <Th>Status</Th>
                    <Th align="right">Amount</Th>
                    <Th>Claim Date</Th>
                    <Th>Incident Date</Th>
                    <Th>Date Reported</Th>
                    <Th>Severity</Th>
                    <Th align="center">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length ? (
                    pageRows.map((c, i) => (
                      <tr key={String(c.id ?? c.claimNumber ?? i)} className="hover:bg-violet-50/40">
                        <Td>{c.id ?? "-"}</Td>
                        <Td className="font-medium text-violet-700">{c.claimNumber ?? "-"}</Td>
                        <Td>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                            {StatusLabel[c.claimStatus] ?? c.claimStatus ?? "-"}
                          </span>
                        </Td>
                        <Td align="right">{formatCurrencyTHB(safeNum(c.claimAmount))}</Td>
                        <Td>{fmtDate(c.claimDate)}</Td>
                        <Td>{fmtDate(c.incidentDate)}</Td>
                        <Td>{fmtDate(c.dateReported)}</Td>
                        <Td>{SeverityLabel[normSeverity(c.claimSeverity)] ?? (c.claimSeverity ?? "-")}</Td>
                        <Td align="center">
                          <button
                            onClick={() => console.log("Edit claim", c.id)}
                            className="px-2 py-1 rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-50"
                            title="Edit claim"
                            aria-label={`Edit claim ${c.claimNumber || c.id || ""}`}
                          >
                            Edit
                          </button>
                        </Td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="border px-4 py-6 text-center text-gray-500">No claims found.</td>
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
    </div>
  );
}

/* =========================
   Matrix (counts) as a child component
   ========================= */
function StatusSeverityMatrix({ allClaims }) {
  const data = useMemo(() => {
    const seed = STATUS_ORDER.map((st) => {
      const row = { status: StatusLabel[st] ?? st };
      SEVERITY_ORDER.forEach((sev) => (row[sev] = 0));
      return { key: st, row };
    });
    const byStatus = new Map(seed.map((s) => [s.key, s.row]));
    (allClaims || []).forEach((c) => {
      const st = c.claimStatus;
      const sev = normSeverity(c.claimSeverity);
      if (!sev) return;
      if (!byStatus.has(st)) {
        const row = { status: StatusLabel[st] ?? st };
        SEVERITY_ORDER.forEach((s) => (row[s] = 0));
        byStatus.set(st, row);
      }
      byStatus.get(st)[sev] += 1;
    });
    return STATUS_ORDER.map((st) => byStatus.get(st)).filter(Boolean);
  }, [allClaims]);

  return data.length ? (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="status" />
        <YAxis allowDecimals={false} />
        <Tooltip wrapperStyle={{ fontSize: 12 }} />
        <Legend />
        {SEVERITY_ORDER.map((sev) => (
          <Bar key={sev} dataKey={sev} name={SeverityLabel[sev] ?? sev} stackId="a"
               fill={SEVERITY_COLOR[sev] || "#8B5CF6"} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  ) : (<Empty />);
}

/* =========================
   Tiny UI helpers (violet)
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
