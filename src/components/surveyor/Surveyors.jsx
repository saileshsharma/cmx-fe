import React, { useMemo, useState } from "react";
import { useQuery } from "@apollo/client";

import {
  GET_ALL_CLAIMS,
  GET_CLAIMS_BY_STATUS,
  ClaimStatusEnum, // keep if you use it elsewhere
} from "../../graphql/claims";
import {
  PieChart,
  Pie,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

/* =========================
   Helpers & constants
   ========================= */
const formatCurrencyTHB = (amount) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(amount ?? 0);

const fmtDate = (v) => (v ? new Date(v).toLocaleString() : "-");
const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const StatusLabel = {
  REGISTERED: "Registered",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAID: "Paid",
};

const STATUS_ORDER = [
  "REGISTERED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "PAID",
];

const STATUS_COLOR = {
  REGISTERED: "#2563EB", // blue
  UNDER_REVIEW: "#F59E0B", // amber
  APPROVED: "#22C55E", // green
  REJECTED: "#EF4444", // red
  PAID: "#8B5CF6", // violet
};

const ALL = "ALL";

/* =========================
   Component
   ========================= */
export default function ClaimsDashboard() {
  // UI state
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [search, setSearch] = useState("");

  // Queries
  const {
    data: allData,
    loading: allLoading,
    error: allError,
  } = useQuery(GET_ALL_CLAIMS);

  const {
    data: byStatusData,
    loading: byStatusLoading,
    error: byStatusError,
  } = useQuery(GET_CLAIMS_BY_STATUS, {
    variables: { status: statusFilter },
    skip: statusFilter === ALL,
  });

  // Source lists
  const allClaims = allData?.getAllClaims ?? [];
  const filteredByStatus = byStatusData?.getClaimsByStatus ?? [];

  // Active list (status + search)
  const baseClaims = statusFilter === ALL ? allClaims : filteredByStatus;

  const claims = useMemo(() => {
    if (!search?.trim()) return baseClaims;
    const s = search.trim().toLowerCase();
    return baseClaims.filter((c) =>
      String(c.claimNumber ?? "").toLowerCase().includes(s)
    );
  }, [baseClaims, search]);

  const loading = statusFilter === ALL ? allLoading : byStatusLoading;
  const error = statusFilter === ALL ? allError : byStatusError;

  // Aggregations (based on ALL data for charts)
  const totalsByStatus = useMemo(() => {
    const agg = {};
    for (const s of STATUS_ORDER) agg[s] = { status: s, count: 0, amount: 0 };
    (allClaims || []).forEach((c) => {
      const s = c.claimStatus;
      if (!agg[s]) agg[s] = { status: s, count: 0, amount: 0 };
      agg[s].count += 1;
      agg[s].amount += safeNum(c.claimAmount);
    });
    return STATUS_ORDER
      .filter((s) => agg[s].count > 0 || agg[s].amount > 0)
      .map((s) => agg[s]);
  }, [allClaims]);

  const kpis = useMemo(() => {
    const list = claims;
    const total = list.length;
    const sum = list.reduce((acc, c) => acc + safeNum(c.claimAmount), 0);
    const avg = total ? sum / total : 0;
    const approvedAmt = list
      .filter((c) => c.claimStatus === "APPROVED")
      .reduce((acc, c) => acc + safeNum(c.claimAmount), 0);
    const registeredCount = list.filter((c) => c.claimStatus === "REGISTERED").length;
    const underReviewCount = list.filter((c) => c.claimStatus === "UNDER_REVIEW").length;

    return { total, sum, avg, approvedAmt, registeredCount, underReviewCount };
  }, [claims]);

  // Charts data
  const pieDataAll = useMemo(
    () =>
      totalsByStatus.map((x) => ({
        name: StatusLabel[x.status] ?? x.status,
        value: x.count,
        status: x.status,
      })),
    [totalsByStatus]
  );

  const barDataAll = useMemo(
    () =>
      totalsByStatus.map((x) => ({
        status: StatusLabel[x.status] ?? x.status,
        amount: x.amount,
        rawStatus: x.status,
      })),
    [totalsByStatus]
  );

  if (error) {
    console.error(error);
    return (
      <div className="p-6 max-w-7xl mx-auto bg-white rounded shadow text-center text-red-500">
        <p>⚠️ Failed to load claims data.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">📊 Claims Dashboard</h2>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value={ALL}>All statuses</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {StatusLabel[s]}
              </option>
            ))}
          </select>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by claim number…"
            className="border border-gray-300 rounded px-3 py-2 w-64"
          />
        </div>

        <div className="text-sm text-gray-500">
          Showing <span className="font-semibold">{claims.length}</span>{" "}
          {statusFilter === ALL ? "claim(s)" : `claim(s) in ${StatusLabel[statusFilter]}`}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Claims" value={kpis.total} />
        <KpiCard title="Approved Amount" value={formatCurrencyTHB(kpis.approvedAmt)} accent="text-green-600" />
        <KpiCard title="Average Amount" value={formatCurrencyTHB(kpis.avg)} />
        <KpiCard
          title="Registered / Under Review"
          value={`${kpis.registeredCount} / ${kpis.underReviewCount}`}
          accent="text-amber-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie: count by status (ALL) */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold mb-2">Claims by Status — All</h4>
          {allLoading ? (
            <p className="text-blue-600">Loading chart…</p>
          ) : pieDataAll.length ? (
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieDataAll}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieDataAll.map((d, i) => (
                      <Cell key={i} fill={STATUS_COLOR[d.status] || "#64748B"} />
                    ))}
                  </Pie>
                  <Tooltip wrapperStyle={{ fontSize: 12 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500">No data to chart.</p>
          )}
        </div>

        {/* Bar: total amount by status (ALL) */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold mb-2">Total Amount by Status — All</h4>
          {allLoading ? (
            <p className="text-blue-600">Loading chart…</p>
          ) : barDataAll.length ? (
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barDataAll}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis tickFormatter={(v) => formatCurrencyTHB(v).replace("฿", "")} />
                  <Tooltip formatter={(v) => formatCurrencyTHB(v)} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="amount">
                    {barDataAll.map((d, i) => (
                      <Cell key={i} fill={STATUS_COLOR[d.rawStatus] || "#64748B"} />
                    ))}
                  </Bar>
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500">No data to chart.</p>
          )}
        </div>
      </div>

      {/* All Claims Table (Claims fields only) */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold">All Claims (current filter)</h4>
          <span className="text-xs text-gray-500">Showing {claims.length} row(s)</span>
        </div>

        {loading ? (
          <p className="text-blue-600">Loading claims…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-3 py-2">Claim ID</th>
                  <th className="border px-3 py-2">Claim #</th>
                  <th className="border px-3 py-2">Status</th>
                  <th className="border px-3 py-2">Status (Alt)</th>
                  <th className="border px-3 py-2">Amount</th>
                  <th className="border px-3 py-2">Claim Date</th>
                  <th className="border px-3 py-2">Incident Date</th>
                  <th className="border px-3 py-2">Date Reported</th>
                  <th className="border px-3 py-2">Severity</th>
                  <th className="border px-3 py-2">Location</th>
                  <th className="border px-3 py-2">Created At</th>
                </tr>
              </thead>
              <tbody>
                {claims.length ? (
                  claims.map((c, i) => (
                    <tr key={c.id ?? `row-${i}`} className="text-center hover:bg-gray-50">
                      <td className="border px-3 py-2">{c.id ?? "-"}</td>
                      <td className="border px-3 py-2">{c.claimNumber ?? "-"}</td>
                      <td className="border px-3 py-2">
                        {StatusLabel[c.claimStatus] ?? c.claimStatus ?? "-"}
                      </td>
                      <td className="border px-3 py-2">
                        {StatusLabel[c.status] ?? c.status ?? "-"}
                      </td>
                      <td className="border px-3 py-2">{formatCurrencyTHB(safeNum(c.claimAmount))}</td>
                      <td className="border px-3 py-2">{fmtDate(c.claimDate)}</td>
                      <td className="border px-3 py-2">{c.incidentDate ?? "-"}</td>
                      <td className="border px-3 py-2">{c.dateReported ?? "-"}</td>
                      <td className="border px-3 py-2">{c.claimSeverity ?? "-"}</td>
                      <td className="border px-3 py-2">{c.location ?? "-"}</td>
                      <td className="border px-3 py-2">{fmtDate(c.createdAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="border px-4 py-4 text-center text-gray-500">
                      No claims found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================
   Presentational subcomponents
   ========================= */
function KpiCard({ title, value, accent }) {
  return (
    <div className="bg-white shadow rounded p-4 text-center">
      <p className="text-gray-500 text-sm">{title}</p>
      <p className={`text-2xl font-bold ${accent || ""}`}>{value}</p>
    </div>
  );
}
