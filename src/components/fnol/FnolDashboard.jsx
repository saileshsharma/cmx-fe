import React, { useMemo, useState, useEffect } from "react";
import { gql, useQuery } from "@apollo/client";
import {
  PieChart, Pie, Tooltip, Legend, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, XAxis, YAxis, BarChart, Bar,
} from "recharts";

/* =========================
   GraphQL
   ========================= */
const GET_ALL_FNOL = gql`
  query GetAllFnol {
    getAllFnol {
      id
      fnolState
      fnolReferenceNo
      accidentDate
      description
      severity
      accidentLocation { id city postalCode latitude longitude }
      surveyor { id name status }
      policy   { id policyNumber }
      vehicle  { id registrationNumber make model year }
      insured  { insuredId }
    }
  }
`;

/* =========================
   Helpers & constants
   ========================= */
const toDate = (v) => (v == null ? null : new Date(typeof v === "number" ? v : String(v)));
const fmtDate = (v) => {
  const d = toDate(v);
  return d && !Number.isNaN(d.valueOf()) ? d.toLocaleString() : "-";
};
const toTs = (v) => {
  const d = toDate(v);
  return d && !Number.isNaN(d.valueOf()) ? d.getTime() : Number.NEGATIVE_INFINITY;
};

const SeverityLabel = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };
const SEVERITY_ORDER = ["LOW", "MEDIUM", "HIGH"];

/* Use violet-forward colors for consistency */
const SEVERITY_COLOR = {
  LOW: "#8B5CF6",     // violet-500
  MEDIUM: "#A78BFA",  // violet-300
  HIGH: "#6D28D9",    // violet-700
};
const normSeverity = (v) => {
  const s = String(v || "").toUpperCase();
  return SEVERITY_ORDER.includes(s) ? s : null;
};

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

/* =========================
   Component
   ========================= */
export default function FnolDashboard() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [compact, setCompact] = useState(true);
  const [timeBucket, setTimeBucket] = useState("WEEK"); // WEEK | MONTH
  const [severityFilter, setSeverityFilter] = useState("ALL"); // ALL | LOW | MEDIUM | HIGH
  const [stateFilter, setStateFilter] = useState("ALL");       // ALL | <any fnolState from data>
  const CHART_H = compact ? 260 : 380;

  useEffect(() => {
    const t = setTimeout(() => setSearch(q), 200);
    return () => clearTimeout(t);
  }, [q]);

  const { data, loading, error } = useQuery(GET_ALL_FNOL);
  const allFnol = data?.getAllFnol ?? [];

  // dynamic state list
  const allStates = useMemo(() => {
    const s = new Set();
    (allFnol || []).forEach((f) => {
      if (f?.fnolState) s.add(String(f.fnolState));
    });
    return ["ALL", ...Array.from(s.values()).sort()];
  }, [allFnol]);

  const filtered = useMemo(() => {
    let list = allFnol;
    if (severityFilter !== "ALL") list = list.filter((f) => normSeverity(f.severity) === severityFilter);
    if (stateFilter !== "ALL") list = list.filter((f) => String(f.fnolState) === stateFilter);
    if (search?.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((f) => {
        const loc = f.accidentLocation || {};
        return (
          String(f.fnolReferenceNo ?? "").toLowerCase().includes(s) ||
          String(f.description ?? "").toLowerCase().includes(s) ||
          String(f.policy?.policyNumber ?? "").toLowerCase().includes(s) ||
          String(f.vehicle?.registrationNumber ?? "").toLowerCase().includes(s) ||
          String(f.surveyor?.name ?? "").toLowerCase().includes(s) ||
          String(f.insured?.insuredId ?? "").toLowerCase().includes(s) ||
          String(loc.city ?? "").toLowerCase().includes(s) ||
          String(loc.postalCode ?? "").toLowerCase().includes(s)
        );
      });
    }
    return list;
  }, [allFnol, severityFilter, stateFilter, search]);

  // --- Sort by most recent accident date (nulls last) ---
  const filteredSorted = useMemo(
    () => [...filtered].sort((a, b) => toTs(b.accidentDate) - toTs(a.accidentDate)),
    [filtered]
  );

  /* =========================
     KPIs
     ========================= */
  const totalFnol   = filtered.length;
  const highCount   = filtered.filter((f) => normSeverity(f.severity) === "HIGH").length;
  const mediumCount = filtered.filter((f) => normSeverity(f.severity) === "MEDIUM").length;
  const lowCount    = filtered.filter((f) => normSeverity(f.severity) === "LOW").length;
  const withSurveyor = filtered.filter((f) => !!f.surveyor?.id).length;
  const uniqueCities = new Set(filtered.map((f) => f.accidentLocation?.city).filter(Boolean)).size || "-";

  const kpiByState = useMemo(() => {
    const map = new Map(); // state -> count
    filtered.forEach((f) => {
      const st = String(f.fnolState || "UNKNOWN");
      map.set(st, (map.get(st) ?? 0) + 1);
    });
    const arr = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const top = arr.slice(0, 6);
    return top;
  }, [filtered]);

  /* =========================
     Charts
     ========================= */
  const severityAgg = useMemo(() => {
    const agg = {};
    for (const s of SEVERITY_ORDER) agg[s] = { severity: s, count: 0 };
    (filtered || []).forEach((f) => {
      const sev = normSeverity(f.severity);
      if (!sev) return;
      agg[sev].count += 1;
    });
    return SEVERITY_ORDER.filter((s) => agg[s] && agg[s].count > 0).map((s) => agg[s]);
  }, [filtered]);

  const severityPieData = useMemo(
    () => severityAgg.map((x) => ({
      name: SeverityLabel[x.severity] ?? x.severity,
      value: x.count,
      severity: x.severity
    })),
    [severityAgg]
  );

  const stateBarData = useMemo(() => {
    const map = new Map();
    (filtered || []).forEach((f) => {
      const st = String(f.fnolState || "UNKNOWN");
      map.set(st, (map.get(st) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([k, v]) => ({ state: k, count: v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filtered]);

  const timeSeriesData = useMemo(() => {
    const bucket = new Map(); // key -> { key, label, count }
    (filtered || []).forEach((f) => {
      if (!f.accidentDate) return;
      const dt = new Date(f.accidentDate);
      let key, label;
      if (timeBucket === "MONTH") { key = fmtMonthKey(dt); label = key; }
      else { key = fmtWeekKey(dt); label = fmtWeekLabel(dt); }
      if (!bucket.has(key)) bucket.set(key, { key, label, count: 0 });
      bucket.get(key).count += 1;
    });
    return Array.from(bucket.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [filtered, timeBucket]);

  const locationBarData = useMemo(() => {
    const map = new Map(); // key -> count
    (filtered || []).forEach((f) => {
      const loc = f.accidentLocation;
      const key =
        loc?.city ||
        (loc?.postalCode ? `Postal ${loc.postalCode}` : null) ||
        "Unknown";
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([k, v]) => ({ place: k, count: v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [filtered]);

  /* =========================
     Render
     ========================= */
  if (error) {
    console.error(error);
    return (
      <div className="p-6 max-w-7xl mx-auto bg-white rounded-3xl shadow text-center text-red-600 border border-red-100">
        <p>⚠️ Failed to load FNOL data.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header + Controls (violet) */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-violet-700">📝 FNOL Dashboard</h2>

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
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="border border-violet-200 rounded-xl px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="ALL">All severities</option>
            {SEVERITY_ORDER.map((s) => (
              <option key={s} value={s}>{SeverityLabel[s]}</option>
            ))}
          </select>

          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="border border-violet-200 rounded-xl px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {allStates.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ref/policy/reg/city/postal/surveyor/insured…"
            className="border border-violet-200 rounded-xl px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* KPI tiles — violet gradients */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard title="Total FNOL" value={totalFnol} color="from-violet-600 to-violet-500 text-white" />
        <KpiCard title="High Severity" value={highCount} color="from-violet-700 to-violet-600 text-white" />
        <KpiCard title="Medium Severity" value={mediumCount} color="from-violet-400 to-violet-300 text-white" />
        <KpiCard title="Low Severity" value={lowCount} color="from-violet-300 to-violet-200 text-violet-900" />
        <KpiCard title="With Surveyor" value={withSurveyor} color="from-emerald-600 to-emerald-500 text-white" />
        <KpiCard title="Unique Cities" value={uniqueCities} color="from-indigo-600 to-indigo-500 text-white" />
      </div>

      {/* Optional: Top FNOL states as a second KPI row */}
      {kpiByState.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpiByState.map(([name, val], idx) => (
            <KpiCard
              key={name}
              title={`State: ${name}`}
              value={val}
              color={[
                "from-emerald-600 to-emerald-500 text-white",
                "from-fuchsia-600 to-fuchsia-500 text-white",
                "from-cyan-600 to-cyan-500 text-white",
                "from-amber-600 to-amber-500 text-white",
                "from-violet-600 to-violet-500 text-white",
                "from-lime-600 to-lime-500 text-white",
              ][idx % 6]}
            />
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="FNOL by Severity" height={CHART_H} loading={loading}>
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

        <Card title="FNOL by State (Top 8)" height={CHART_H} loading={loading}>
          {stateBarData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stateBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="state" />
                <YAxis allowDecimals={false} />
                <Tooltip wrapperStyle={{ fontSize: 12 }} />
                <Legend />
                <Bar dataKey="count" name="FNOLs" fill="#7C3AED" />
              </BarChart>
            </ResponsiveContainer>
          ) : (<Empty />)}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card
          title={`Accidents Over Time (${timeBucket === "MONTH" ? "Monthly" : "Weekly"})`}
          height={CHART_H}
          loading={loading}
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
                <Line type="monotone" dataKey="count" name="Accidents" strokeWidth={2} dot={!compact} stroke="#7C3AED" />
              </LineChart>
            </ResponsiveContainer>
          ) : (<Empty />)}
        </Card>

        <Card title="Top Locations (City / Postal)" height={CHART_H} loading={loading}>
          {locationBarData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locationBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="place" />
                <YAxis allowDecimals={false} />
                <Tooltip wrapperStyle={{ fontSize: 12 }} />
                <Legend />
                <Bar dataKey="count" name="FNOLs" fill="#6D28D9" />
              </BarChart>
            </ResponsiveContainer>
          ) : (<Empty />)}
        </Card>
      </div>

      {/* FNOL table (sorted by most recent accident date) */}
      <div className="bg-white border border-violet-100 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-3">
          <h4 className="font-semibold text-violet-700">All FNOL (current filter)</h4>
        </div>
        {loading ? (
          <p className="px-3 pb-3 text-violet-700">Loading FNOL…</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full border-collapse border border-violet-100 text-sm">
                <thead className="sticky top-0 z-10 bg-violet-50">
                  <tr>
                    <Th>Ref #</Th>
                    <Th>State</Th>
                    <Th>Accident Date</Th>
                    <Th>Severity</Th>
                    <Th>City</Th>
                    <Th>Postal</Th>
                    <Th>Lat</Th>
                    <Th>Lng</Th>
                    <Th>Vehicle</Th>
                    <Th>Policy</Th>
                    <Th>Surveyor</Th>
                  </tr>
                </thead>
                <tbody>
                  {(filteredSorted || []).length ? (
                    filteredSorted.map((f, idx) => (
                      <tr key={String(f.id)} className="hover:bg-violet-50/40">
                        <Td className="font-medium text-violet-700">{f.fnolReferenceNo ?? "-"}</Td>
                        <Td>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                            {f.fnolState ?? "-"}
                          </span>
                        </Td>
                        <Td className="whitespace-nowrap">
                          {fmtDate(f.accidentDate)}
                          {idx === 0 && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 align-middle">
                              Newest
                            </span>
                          )}
                        </Td>
                        <Td>{SeverityLabel[normSeverity(f.severity)] ?? (f.severity ?? "-")}</Td>
                        <Td>{f.accidentLocation?.city ?? "-"}</Td>
                        <Td>{f.accidentLocation?.postalCode ?? "-"}</Td>
                        <Td>{f.accidentLocation?.latitude ?? "-"}</Td>
                        <Td>{f.accidentLocation?.longitude ?? "-"}</Td>
                        <Td>{[f.vehicle?.registrationNumber, f.vehicle?.make, f.vehicle?.model, f.vehicle?.year].filter(Boolean).join(" • ") || "-"}</Td>
                        <Td>{f.policy?.policyNumber ?? "-"}</Td>
                        <Td>{[f.surveyor?.name, f.surveyor?.status].filter(Boolean).join(" • ") || "-"}</Td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={12} className="border px-4 py-6 text-center text-gray-500">No FNOL found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
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

function KpiCard({ title, value, color = "from-violet-200 to-violet-100 text-violet-900" }) {
  return (
    <div
      className={`text-left rounded-2xl p-4 border border-violet-100 shadow-sm bg-gradient-to-br ${color}`}
      title={String(title)}
    >
      <p className="text-xs sm:text-sm opacity-90">{title}</p>
      <p className="mt-1 text-xl sm:text-2xl font-bold">{value}</p>
    </div>
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
