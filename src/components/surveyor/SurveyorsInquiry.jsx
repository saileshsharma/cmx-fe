import React, { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import { GET_ALL_SURVEYORS } from "../../graphql/surveyor";

/* =========================================================================
   🎨 Theme — tweak these hex codes to match your Claims Dashboard brand
   ========================================================================= */
const PALETTE = {
  primary: "#5B6CFF",       // main brand
  primaryDark: "#3A46D4",   // darker shade
  accent: "#8B5CF6",        // secondary/accent
  pink: "#EC4899",          // tertiary accent
  success: "#10B981",
  warn: "#F59E0B",
  muted: "#334155",         // headings/body ink
  surface: "#FFFFFF",
};
const cssVars = {
  "--brand-primary": PALETTE.primary,
  "--brand-primary-dark": PALETTE.primaryDark,
  "--brand-accent": PALETTE.accent,
  "--brand-pink": PALETTE.pink,
  "--brand-ink": PALETTE.muted,
  "--brand-surface": PALETTE.surface,
};

/* =========================================================================
   GraphQL
   ========================================================================= */

/* =========================================================================
   Constants & helpers
   ========================================================================= */
const INTERNAL_OPTIONS = ["All", "Internal", "External"];
const AVAIL_FILTERS = ["All", "AVAILABLE", "UNAVAILABLE", "INACTIVE"];

const STATUS_PILL = {
  AVAILABLE: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  UNAVAILABLE: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  INACTIVE: "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
};
const STATUS_DOT = {
  AVAILABLE: "bg-emerald-500",
  UNAVAILABLE: "bg-amber-500",
  INACTIVE: "bg-gray-500",
};
const jobStatusBadge = (v = "") => {
  const m = String(v || "").toUpperCase();
  if (m === "ACCEPTED") return "bg-sky-100 text-sky-800";
  if (m === "WORKING") return "bg-indigo-100 text-indigo-800";
  if (m === "PENDING") return "bg-amber-100 text-amber-800";
  if (m === "CLOSED") return "bg-green-100 text-green-800";
  if (m === "ON_THE_WAY") return "bg-purple-100 text-purple-800";
  return "bg-gray-100 text-gray-800";
};
const uc = (v) => String(v || "").toUpperCase();
function formatDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.valueOf())) return String(v);
  return d.toLocaleString();
}
function SkillChips({ skills }) {
  if (!skills) return "—";
  const list = String(skills).split(/[,|]/g).map(s => s.trim()).filter(Boolean);
  if (!list.length) return "—";
  const shown = list.slice(0,3);
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((p, i) => (
        <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-slate-50 ring-1 ring-slate-200 text-slate-700">
          {p}
        </span>
      ))}
      {list.length > shown.length && (
        <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">+{list.length - shown.length}</span>
      )}
    </div>
  );
}

/* =========================================================================
   Component
   ========================================================================= */
export default function SurveyorsInquiry() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery(GET_ALL_SURVEYORS, {
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  // filters
  const [internalFilter, setInternalFilter] = useState("All");
  const [availabilityFilter, setAvailabilityFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // search (debounced)
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // auto refresh
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const timerRef = useRef(null);

  // selection
  const [selectedId, setSelectedId] = useState(null);

  const all = data?.getAllSurveyors ?? [];

  // KPI counts
  const counts = useMemo(() => {
    const totalInternal = all.filter((s) => !!s.internal).length;
    const totalExternal = all.length - totalInternal;
    const totalAvailable = all.filter((s) => uc(s.status) === "AVAILABLE").length;
    const totalUnavailable = all.filter((s) => uc(s.status) === "UNAVAILABLE").length;
    const totalInactive = all.filter((s) => uc(s.status) === "INACTIVE").length;
    return {
      totalInternal, totalExternal, totalAvailable, totalUnavailable, totalInactive, total: all.length
    };
  }, [all]);

  // filtering
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((s) => {
      const byInternal =
        internalFilter === "All" ||
        (internalFilter === "Internal" && !!s.internal) ||
        (internalFilter === "External" && !s.internal);
      const byAvail = availabilityFilter === "All" || uc(s.status) === availabilityFilter;
      const bySearch =
        !q ||
        [
          s.name, s.email, s.phoneNumber, s.city, s.province, s.country,
          s.skills, s.status, s.surveyorJobStatus, s.app_version,
          s.internal ? "internal" : "external",
        ].filter(Boolean).some(v => String(v).toLowerCase().includes(q));
      return byInternal && byAvail && bySearch;
    });
  }, [all, internalFilter, availabilityFilter, search]);

  // keep selection valid after filter
  useEffect(() => {
    if (selectedId && !filtered.some((r) => String(r.id) === String(selectedId))) setSelectedId(null);
  }, [filtered, selectedId]);

  // pagination
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);
  useEffect(() => setPage(1), [search, internalFilter, availabilityFilter]);

  // auto refresh
  useEffect(() => {
    if (!autoRefresh) { if (timerRef.current) clearInterval(timerRef.current); return; }
    refetch().finally(() => setLastRefreshed(new Date()));
    timerRef.current = setInterval(async () => {
      try { await refetch(); setLastRefreshed(new Date()); } catch {}
    }, 15000);
    return () => timerRef.current && clearInterval(timerRef.current);
  }, [autoRefresh, refetch]);

  // selected object
  const selectedSurveyor = useMemo(
    () => filtered.find((s) => String(s.id) === String(selectedId)) || null,
    [filtered, selectedId]
  );

  const handleEditSelected = () => {
    if (!selectedSurveyor) return;
    try {
      window.dispatchEvent(new CustomEvent("surveyors:selected", { detail: selectedSurveyor }));
    } catch {}
    navigate(`/surveyors-edit?id=${encodeURIComponent(selectedSurveyor.id)}`);
  };

  return (
    <div className="p-4 md:p-6 space-y-5" style={cssVars}>
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 md:p-6 text-white shadow"
        style={{
          background: `linear-gradient(90deg,var(--brand-primary),var(--brand-accent),var(--brand-pink))`,
        }}
      >
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Surveyor Management</h1>
            <p className="text-white/80 text-sm">Search, filter and update your surveyor roster at a glance.</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              Auto-refresh
            </label>
            <span className="text-xs px-2 py-1 rounded-full bg-white/15 backdrop-blur">
              {lastRefreshed ? `Refreshed ${formatDate(lastRefreshed)}` : "—"}
            </span>
            <button
              onClick={() => refetch().then(() => setLastRefreshed(new Date()))}
              className="px-3 py-2 rounded-lg bg-white/90 text-indigo-700 hover:bg-white font-medium shadow"
            >
              Refresh now
            </button>
            <button
              className="px-3 py-2 rounded-lg font-medium shadow disabled:opacity-50"
              style={{
                background: "white",
                color: "var(--brand-primary-dark)",
                border: "1px solid rgba(0,0,0,.06)",
              }}
              disabled={!selectedSurveyor}
              onClick={handleEditSelected}
            >
              Edit Selected
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <FancyKpi label="Internal" value={counts.totalInternal} color="var(--brand-primary)" />
        <FancyKpi label="External" value={counts.totalExternal} color="#EC4899" />
        <FancyKpi label="Available" value={counts.totalAvailable} color="#10B981" />
        <FancyKpi label="Unavailable" value={counts.totalUnavailable} color="#F59E0B" />
        <FancyKpi label="Inactive" value={counts.totalInactive} color="#64748B" />
      </div>

      {/* Filters */}
      <div className="bg-white/70 backdrop-blur border rounded-2xl shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Internal / External</label>
            <select
              value={internalFilter}
              onChange={(e) => setInternalFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 bg-white"
            >
              {INTERNAL_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs text-gray-600 mb-1">Search</label>
            <div className="relative">
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name, email, phone, location, skills, status…"
                className="border rounded-lg pl-9 pr-9 py-2 w-full"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔎</span>
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Clear"
                >
                  ✖
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Availability chips */}
        <div className="flex flex-wrap gap-2">
          {AVAIL_FILTERS.map((opt) => {
            const active = availabilityFilter === opt;
            return (
              <button
                key={opt}
                onClick={() => setAvailabilityFilter(opt)}
                className="px-3 py-1.5 rounded-full text-sm transition border"
                style={{
                  background: active ? "var(--brand-primary)" : "white",
                  color: active ? "white" : "var(--brand-ink)",
                  borderColor: active ? "transparent" : "#E5E7EB",
                  boxShadow: active ? "0 4px 14px rgba(0,0,0,.08)" : "none",
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-auto">
        <table className="min-w-[1200px] w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10">
            <tr>
              <Th w="w-10">Select</Th>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Phone</Th>
              <Th>Internal</Th>
              <Th>Availability</Th>
              <Th>Job</Th>
              <Th>Rating</Th>
              <Th>App</Th>
              <Th>Cap/Day</Th>
              <Th>Active Jobs</Th>
              <Th>Skills</Th>
              <Th>City</Th>
              <Th>Province</Th>
              <Th>Created</Th>
              <Th>Updated</Th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && !data ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
            ) : error ? (
              <tr>
                <td colSpan={16} className="p-6 text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200">
                    <span>⚠</span>
                    <span>Failed to load. {error.message}</span>
                    <button onClick={() => refetch()} className="ml-2 underline">Retry</button>
                  </div>
                </td>
              </tr>
            ) : !paged.length ? (
              <tr>
                <td colSpan={16} className="p-10 text-center text-gray-600">No surveyors match your filters.</td>
              </tr>
            ) : (
              paged.map((s) => {
                const statusKey = uc(s.status);
                const pill = STATUS_PILL[statusKey] || "bg-gray-100 text-gray-700 ring-1 ring-gray-200";
                const dot = STATUS_DOT[statusKey] || "bg-gray-500";
                const activeJobsDisplay = statusKey === "AVAILABLE" ? 0 : Number(s.activeJobsCount ?? 0);

                return (
                  <tr key={s.id} className="hover:bg-indigo-50/40" onClick={() => setSelectedId(s.id)}>
                    <td className="px-3 py-3">
                      <input
                        type="radio"
                        name="selectedSurveyor"
                        value={s.id}
                        checked={String(selectedId) === String(s.id)}
                        onChange={() => setSelectedId(s.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-gray-500">#{s.id}</div>
                    </td>
                    <td className="px-4 py-3">{s.email || "—"}</td>
                    <td className="px-4 py-3">{s.phoneNumber || "—"}</td>
                    <td className="px-4 py-3">{s.internal ? "Yes" : "No"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full ${pill}`}>
                        <span className={`w-2 h-2 rounded-full ${dot}`} />
                        {s.status ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${jobStatusBadge(s.surveyorJobStatus)}`}>
                        {s.surveyorJobStatus || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{s.rating_avg ?? "—"}</td>
                    <td className="px-4 py-3">{s.app_version || "—"}</td>
                    <td className="px-4 py-3">{s.capacityPerDay ?? "—"}</td>
                    <td className="px-4 py-3">{activeJobsDisplay}</td>
                    <td className="px-4 py-3"><SkillChips skills={s.skills} /></td>
                    <td className="px-4 py-3">{s.city || "—"}</td>
                    <td className="px-4 py-3">{s.province || "—"}</td>
                    <td className="px-4 py-3">{formatDate(s.createdAt)}</td>
                    <td className="px-4 py-3">{formatDate(s.updatedAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing <span className="font-medium">{total ? (currentPage - 1) * pageSize + 1 : 0}</span>–{" "}
          <span className="font-medium">{Math.min(currentPage * pageSize, total)}</span> of{" "}
          <span className="font-medium">{total}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setPage(1)} disabled={currentPage <= 1} label="« First" />
          <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} label="‹ Prev" />
          <span className="text-sm px-2">
            Page <span className="font-medium">{currentPage}</span> / {totalPages}
          </span>
          <Button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} label="Next ›" />
          <Button onClick={() => setPage(totalPages)} disabled={currentPage >= totalPages} label="Last »" />
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   Small helpers
   ========================================================================= */
function Th({ children, w }) {
  return <th className={`px-4 py-3 text-left ${w || ""}`}>{children}</th>;
}
function Button({ label, disabled, onClick }) {
  return (
    <button
      className={`px-3 py-1.5 rounded-lg border text-sm transition
        ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
function FancyKpi({ label, value, color }) {
  return (
    <div
      className="rounded-2xl p-4 ring-1 shadow-sm"
      style={{
        background: `linear-gradient(180deg, ${color}1A, #ffffff)`, // 10% tint -> to white
        borderColor: `${color}33`, // subtle ring
      }}
    >
      <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 16 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded" />
        </td>
      ))}
    </tr>
  );
}
