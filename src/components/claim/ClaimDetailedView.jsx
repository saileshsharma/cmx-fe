// src/pages/ClaimsDashboard.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useQuery } from "@apollo/client";
import { GET_ALL_CLAIMS } from "../../graphql/claims";

/* =========================
   Helpers (plain JS)
   ========================= */
const formatCurrencyTHB = (amount) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(Number(amount ?? 0));

const toDate = (v) => (v == null ? null : new Date(typeof v === "number" ? v : String(v)));
const fmtDate = (v) => {
  const d = toDate(v);
  return d && !Number.isNaN(d.valueOf()) ? d.toLocaleString() : "-";
};
const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* =========================
   Claim Detail Drawer (RESTORED)
   ========================= */
function KV({ label, children }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium break-words">{children ?? "-"}</div>
    </div>
  );
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
      {children}
    </span>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm text-gray-500 mb-3">{title}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function ClaimDetailDrawer({ claim, open, onClose }) {
  return (
    <div className={`fixed inset-0 z-40 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`absolute right-0 top-0 h-full w-full sm:w-[620px] bg-white shadow-2xl transition-transform p-6 overflow-y-auto
        ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-violet-700">Claim Details</h2>
          <button onClick={onClose} className="px-3 py-1 rounded-lg border hover:bg-violet-50">
            Close
          </button>
        </div>

        {!claim ? (
          <p className="text-gray-500">Select a claim to view details.</p>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
              <KV label="Claim Number">{claim.claimNumber ?? `ID ${claim.id}`}</KV>
              <KV label="Severity">{claim.claimSeverity ?? "-"}</KV>
              <KV label="Status"><Badge>{claim.claimStatus ?? claim.status ?? "-"}</Badge></KV>
              <KV label="Amount">{formatCurrencyTHB(claim.claimAmount ?? claim.claim_amount)}</KV>
              <KV label="Date Reported">{fmtDate(claim.dateReported ?? claim.date_reported)}</KV>
              <KV label="Incident Date">{fmtDate(claim.incidentDate ?? claim.incident_date)}</KV>
              <KV label="Location">{claim.location ?? "-"}</KV>
            </div>

            {/* Policy */}
            <Section title="Policy">
              <KV label="Policy Number">#{claim?.policy?.policyNumber ?? "-"}</KV>
              <KV label="Policy ID">{claim?.policy?.id ?? "-"}</KV>
            </Section>

            {/* Vehicle */}
            <Section title="Vehicle">
              <KV label="Registration No.">{claim?.vehicle?.registrationNo ?? "-"}</KV>
              <KV label="Make / Model / Year">
                {[
                  claim?.vehicle?.make,
                  claim?.vehicle?.model,
                  claim?.vehicle?.year,
                ].filter(Boolean).join(" • ") || "-"}
              </KV>
              <KV label="Vehicle ID">{claim?.vehicle?.id ?? "-"}</KV>
            </Section>

            {/* Surveyor */}
            <Section title="Surveyor">
              <KV label="Name">{claim?.surveyor?.name ?? "-"}</KV>
              <KV label="Status">{claim?.surveyor?.status ?? "-"}</KV>
              <KV label="Surveyor ID">{claim?.surveyor?.id ?? "-"}</KV>
            </Section>

            {/* Accident Location (if claim.accidentLocation exists in your shape) */}
            {claim?.accidentLocation && (
              <Section title="Accident Location">
                <KV label="City">{claim.accidentLocation.city}</KV>
                <KV label="Postal Code">{claim.accidentLocation.postalCode}</KV>
                <KV label="Latitude">{claim.accidentLocation.latitude}</KV>
                <KV label="Longitude">{claim.accidentLocation.longitude}</KV>
                <KV label="Location ID">{claim.accidentLocation.id}</KV>
              </Section>
            )}

            {/* Insured (if present on claim in your schema) */}
            {claim?.insured && (
              <Section title="Insured">
                <KV label="Insured ID">{claim.insured.insuredId ?? claim.insured.id}</KV>
                <KV label="Full Name">{claim.insured.fullName ?? "-"}</KV>
              </Section>
            )}

            {/* Notes placeholder */}
            <div className="rounded-2xl border p-4">
              <div className="text-sm text-gray-500 mb-2">Notes</div>
              <p className="text-sm text-gray-700">No notes available.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================
   Assignment Center (no mutation; JSON copy)
   ========================= */
function AssignmentCenter({ claim, open, onClose }) {
  const [surveyorName, setSurveyorName] = useState("");
  const [etaMinutes, setEtaMinutes] = useState("");
  const [priority, setPriority] = useState("NORMAL");

  useEffect(() => {
    setSurveyorName("");
    setEtaMinutes("");
    setPriority("NORMAL");
  }, [claim?.id]);

  const payload = useMemo(() => {
    if (!claim) return {};
    return {
      claimId: claim.id,
      claimNumber: claim.claimNumber ?? null,
      desiredSurveyorName: surveyorName || null,
      priority, // NORMAL | HIGH | URGENT
      estimatedArrivalMinutes: etaMinutes ? Number(etaMinutes) : null,
    };
  }, [claim, surveyorName, etaMinutes, priority]);

  const copyJSON = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      alert("Assignment JSON copied to clipboard.");
    } catch {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `assignment_${claim?.id ?? "payload"}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className={`fixed inset-0 z-40 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`absolute right-0 top-0 h-full w-full sm:w-[560px] bg-white shadow-2xl transition-transform p-6 overflow-y-auto
        ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-violet-700">Assignment Center</h2>
          <button onClick={onClose} className="px-3 py-1 rounded-lg border hover:bg-violet-50">
            Close
          </button>
        </div>

        {!claim ? (
          <p className="text-gray-500">Select a claim to assign a surveyor.</p>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border p-4">
              <div className="text-sm text-gray-500 mb-2">Claim</div>
              <div className="font-medium">{claim.claimNumber ?? `ID ${claim.id}`}</div>
              <div className="text-sm text-gray-600">
                Status: {claim.claimStatus ?? "-"} • Severity: {claim.claimSeverity ?? "-"}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Adjustor Name (free text)</label>
                <input
                  className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="e.g., John Tan"
                  value={surveyorName}
                  onChange={(e) => setSurveyorName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Priority</label>
                <select
                  className="w-full rounded-xl border px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="NORMAL">NORMAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">ETA (minutes)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="e.g., 25"
                  value={etaMinutes}
                  onChange={(e) => setEtaMinutes(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-500">Generated payload</div>
                <button className="text-sm px-3 py-1 rounded-lg border hover:bg-violet-50" onClick={copyJSON}>
                  Copy JSON
                </button>
              </div>
              <pre className="bg-gray-50 rounded-xl p-3 text-xs overflow-x-auto">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================
   Main Claims Dashboard (violet + search + pagination + restored drawer)
   ========================= */
export default function ClaimsDashboard() {
  const { data, loading, error, refetch } = useQuery(GET_ALL_CLAIMS, {
    fetchPolicy: "cache-and-network",
  });

  const [selectedClaim, setSelectedClaim] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Search Filters
  const [searchNumber, setSearchNumber] = useState("");
  const [searchSeverity, setSearchSeverity] = useState("");

  const claims = useMemo(() => data?.getAllClaims ?? data?.get_all_claims ?? [], [data]);

  // KPI
  const kpis = useMemo(() => {
    const total = claims.length;
    const byStatus = claims.reduce((acc, c) => {
      const s = c.claimStatus ?? c.status ?? "UNKNOWN";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    const totalAmount = claims.reduce((sum, c) => sum + safeNum(c.claimAmount ?? c.claim_amount), 0);
    return { total, byStatus, totalAmount };
  }, [claims]);

  // Filtered Data
  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      const num = (c.claimNumber ?? `ID ${c.id}`)?.toLowerCase();
      const matchNumber = searchNumber ? num.includes(searchNumber.toLowerCase()) : true;
      const sev = (c.claimSeverity ?? "").toLowerCase();
      const matchSeverity = searchSeverity ? sev === searchSeverity.toLowerCase() : true;
      return matchNumber && matchSeverity;
    });
  }, [claims, searchNumber, searchSeverity]);

  // Pagination after filter
  const totalPages = Math.max(1, Math.ceil(filteredClaims.length / pageSize));
  const startIdx = (page - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filteredClaims.length);
  const pageRows = filteredClaims.slice(startIdx, endIdx);

  // Adjust page if data/pageSize changes
  useEffect(() => {
    const total = Math.max(1, Math.ceil(filteredClaims.length / pageSize));
    if (page > total) setPage(total);
  }, [filteredClaims.length, pageSize]); // eslint-disable-line

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-violet-700">Assign Claim</h1>
        <button
          className="px-3 py-2 rounded-xl border border-violet-300 text-violet-700 hover:bg-violet-50"
          onClick={() => refetch()}
        >
          Refresh
        </button>
      </div>

      {/* KPI Cards (violet) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl p-4 bg-violet-100 text-violet-800">
          <div className="text-sm">Total Claims</div>
          <div className="text-2xl font-semibold mt-1">{kpis.total}</div>
        </div>
        <div className="rounded-2xl p-4 bg-violet-200 text-violet-900">
          <div className="text-sm">Total Amount</div>
          <div className="text-2xl font-semibold mt-1">{formatCurrencyTHB(kpis.totalAmount)}</div>
        </div>
        <div className="rounded-2xl p-4 bg-violet-300 text-violet-900">
          <div className="text-sm">Open by Status</div>
          <div className="mt-1 text-sm">
            {Object.entries(kpis.byStatus).map(([s, n]) => (
              <span
                key={s}
                className="inline-flex items-center mr-2 mb-1 px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-xs font-medium"
              >
                {s}: {n}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Search Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by Claim Number"
          value={searchNumber}
          onChange={(e) => {
            setPage(1);
            setSearchNumber(e.target.value);
          }}
          className="flex-1 rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <select
          value={searchSeverity}
          onChange={(e) => {
            setPage(1);
            setSearchSeverity(e.target.value);
          }}
          className="flex-1 rounded-xl border px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="">All Severities</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-violet-50">
            <tr className="text-left">
              <th className="px-4 py-2">Claim #</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Severity</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Incident</th>
              <th className="px-4 py-2">Surveyor</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="text-center py-6 text-gray-500">Loading...</td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={7} className="text-center py-6 text-red-600">Error loading claims</td>
              </tr>
            )}
            {!loading && !error && pageRows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-6 text-gray-500">No matching claims found</td>
              </tr>
            )}
            {pageRows.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-2">{c.claimNumber ?? `ID ${c.id}`}</td>
                <td className="px-4 py-2">
                  <Badge>{c.claimStatus ?? c.status ?? "-"}</Badge>
                </td>
                <td className="px-4 py-2">{c.claimSeverity ?? "-"}</td>
                <td className="px-4 py-2">{formatCurrencyTHB(c.claimAmount ?? c.claim_amount)}</td>
                <td className="px-4 py-2">{fmtDate(c.incidentDate ?? c.incident_date)}</td>
                <td className="px-4 py-2">{c?.surveyor?.name ?? "-"}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1.5 rounded-xl border border-violet-300 text-violet-700 hover:bg-violet-50"
                      onClick={() => { setSelectedClaim(c); setDetailOpen(true); }}
                    >
                      View
                    </button>
                    <button
                      className="px-3 py-1.5 rounded-xl border border-violet-300 text-violet-700 hover:bg-violet-50"
                      onClick={() => { setSelectedClaim(c); setAssignOpen(true); }}
                    >
                      Assign
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-white text-sm">
          <div className="text-gray-600">
            Showing <span className="font-medium">{filteredClaims.length === 0 ? 0 : startIdx + 1}</span>–<span className="font-medium">{endIdx}</span> of <span className="font-medium">{filteredClaims.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Rows</label>
            <select
              className="rounded-xl border px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <div className="hidden sm:block w-px h-5 bg-gray-200 mx-1" />
            <button
              className="px-2 py-1 rounded-lg border hover:bg-violet-50 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              ‹ Prev
            </button>
            <span>Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span></span>
            <button
              className="px-2 py-1 rounded-lg border hover:bg-violet-50 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next ›
            </button>
          </div>
        </div>
      </div>

      {/* Drawers */}
      <ClaimDetailDrawer claim={selectedClaim} open={detailOpen} onClose={() => setDetailOpen(false)} />
      <AssignmentCenter claim={selectedClaim} open={assignOpen} onClose={() => setAssignOpen(false)} />
    </div>
  );
}
