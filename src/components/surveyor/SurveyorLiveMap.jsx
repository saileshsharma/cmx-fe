import React, { useEffect, useMemo, useState } from "react";
import { useLazyQuery, useQuery } from "@apollo/client";
import { Link } from "react-router-dom";
import { GET_ALL_FNOL } from "../../graphql/fnol";
import { GET_POLICY_BY_NUMBER } from "../../graphql/policies";


/* =============================================================================
   Helpers & UI bits
   ============================================================================= */
const SEVERITY_OPTIONS = ["Low", "Medium", "High"]; // DB: only these

function classNames(...arr) {
  return arr.filter(Boolean).join(" ");
}

function formatDate(d) {
  if (!d) return "-";
  const date = new Date(d);
  return isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function matches(v, q) {
  return String(v ?? "").toLowerCase().includes(String(q ?? "").toLowerCase());
}

function downloadCSV(rows, filename = "fnol_export.csv") {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = String(v ?? "");
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ];
  const csv = "\uFEFF" + lines.join("\n"); // BOM for Excel
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

const StateBadge = ({ state }) => {
  if (!state) return "-";
  const style =
    state === "VALIDATED" ? "bg-emerald-100 text-emerald-800" :
    state === "ENRICHING" ? "bg-violet-100 text-violet-800" :
    state === "SUBMITTED" ? "bg-sky-100 text-sky-800" :
    state === "REJECTED"  ? "bg-rose-100 text-rose-800" :
    /* DRAFT & fallback */  "bg-gray-100 text-gray-800";

  return (
    <span className={classNames("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", style)}>
      {state}
    </span>
  );
};

/* =============================================================================
   Polished Policy details modal
   ============================================================================= */
function PolicyModal({ open, onClose, loading, error, policy }) {
  const dialogRef = React.useRef(null);
  const closeBtnRef = React.useRef(null);

  // Lock page scroll & focus initial button
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [open]);

  // Esc to close + basic focus trap
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const list = Array.from(focusables);
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus(); e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus(); e.preventDefault();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const Field = ({ label, children, mono }) => (
    <div className="flex items-start gap-3">
      <div className="w-40 shrink-0 text-sm text-gray-500">{label}</div>
      <div className={classNames("text-sm", mono && "font-mono")}>{children ?? "-"}</div>
    </div>
  );

  const fmtMoney = (v, currency = "SGD", locale = "en-SG") =>
    (v ?? null) === null ? "-" : new Intl.NumberFormat(locale, { style: "currency", currency }).format(v);

  const Skel = () => <div className="h-4 w-full rounded bg-gray-200 animate-pulse" />;

  return (
    <div className="fixed inset-0 z-[100]" aria-labelledby="policy-modal-title" role="dialog" aria-modal="true">
      {/* Dim background */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Dialog */}
      <div className="absolute inset-x-3 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 top-10 md:top-20 w-auto md:w-[760px]">
        <div ref={dialogRef} className="bg-white rounded-2xl shadow-2xl border overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3 border-b flex items-center justify-between bg-gray-50">
            <h3 id="policy-modal-title" className="text-lg font-semibold">Policy Details</h3>
            <button ref={closeBtnRef} onClick={onClose} className="px-2 py-1 rounded-lg hover:bg-gray-100" aria-label="Close policy details">✕</button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-6">
            {loading && (
              <div className="space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  {[...Array(7)].map((_, i) => <Skel key={i} />)}
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  {[...Array(4)].map((_, i) => <Skel key={i} />)}
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
                Failed to load policy: {error.message}
              </div>
            )}

            {!loading && !error && policy && (
              <>
                <div className="grid md:grid-cols-2 gap-5">
                  <Field label="Policy Number" mono>
                    <div className="flex items-center gap-2">
                      <span>{policy.policyNumber}</span>
                      <button
                        className="text-xs px-2 py-0.5 border rounded hover:bg-gray-50"
                        onClick={() => navigator.clipboard.writeText(policy.policyNumber)}
                        title="Copy policy number"
                      >
                        Copy
                      </button>
                    </div>
                  </Field>
                  <Field label="Status">{policy.policyStatus ?? "-"}</Field>
                  <Field label="Type">{policy.policyType ?? "-"}</Field>
                  <Field label="Coverage">{fmtMoney(policy.coverageAmount)}</Field>
                  <Field label="Start Date">{formatDate(policy.startDate)}</Field>
                  <Field label="End Date">{formatDate(policy.endDate)}</Field>
                  <Field label="Premium">{fmtMoney(policy.premiumAmount)}</Field>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <div className="text-sm font-semibold">Insured</div>
                    <Field label="Name">{policy.insured?.firstName}</Field>
                    <Field label="Email" mono>{policy.insured?.email}</Field>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-semibold">Vehicle</div>
                    <Field label="Reg. No" mono>{policy.vehicle?.registrationNo}</Field>
                    <Field label="Make/Model">
                      {[policy.vehicle?.make, policy.vehicle?.model].filter(Boolean).join(" ") || "-"}
                    </Field>
                    <Field label="Year">{policy.vehicle?.year}</Field>
                  </div>
                </div>
              </>
            )}

            {!loading && !error && !policy && (
              <div className="py-8 text-center text-gray-600">No policy found.</div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t bg-gray-50 flex flex-wrap gap-2 justify-between">
            <div className="text-xs text-gray-500 self-center">
              Press <kbd className="px-1 border rounded">Esc</kbd> to close
            </div>
            <div className="flex gap-2">
              {!!policy?.id && (
                <a
                  href={`/policy/${policy.id}`}
                  className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-100"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Policy
                </a>
              )}
              {policy && (
                <button
                  className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-100"
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(policy, null, 2))}
                >
                  Copy JSON
                </button>
              )}
              <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   Main component
   ============================================================================= */
export default function FnolInquiry() {
  const { data, loading, error, refetch } = useQuery(GET_ALL_FNOL, { fetchPolicy: "cache-and-network" });

  // Filters
  const [qRaw, setQRaw] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(qRaw), 300);
    return () => clearTimeout(t);
  }, [qRaw]);

  const [policyNumber, setPolicyNumber] = useState("");
  const [registrationNo, setRegistrationNo] = useState("");
  const [insuredName, setInsuredName] = useState("");
  const [city, setCity] = useState("");
  const [severity, setSeverity] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const invalidRange = dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Policy modal
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [selectedPolicyNumber, setSelectedPolicyNumber] = useState(null);
  const [fetchPolicy, { data: policyData, loading: policyLoading, error: policyError }] =
    useLazyQuery(GET_POLICY_BY_NUMBER, { fetchPolicy: "cache-first" });

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [q, policyNumber, registrationNo, insuredName, city, severity, dateFrom, dateTo, pageSize]);

  const rows = useMemo(() => data?.getAllFnol ?? [], [data]);

  const filtered = useMemo(() => {
    if (invalidRange) return rows;
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toTs = dateTo ? new Date(dateTo).getTime() : null;

    return rows.filter(f => {
      const dt = f?.accidentDate ? new Date(f.accidentDate).getTime() : null;
      if (fromTs && (dt == null || dt < fromTs)) return false;
      if (toTs && (dt == null || dt > (toTs + 24 * 60 * 60 * 1000 - 1))) return false; // inclusive end

      if (severity && f.severity !== severity) return false;

      const fullName = [f.insured?.firstName, f.insured?.lastName].filter(Boolean).join(" ").trim();
      const anyText = [
        f.id,
        f.fnolReferenceNo,
        f.description,
        f.policy?.policyNumber,
        fullName,
        f.insured?.email,
        f.vehicle?.registrationNo,
        f.vehicle?.make,
        f.vehicle?.model,
        f.accidentLocation?.city,
        f.surveyor?.name,
      ].some(v => matches(v, q));
      if (q && !anyText) return false;

      if (policyNumber && !matches(f.policy?.policyNumber, policyNumber)) return false;
      if (registrationNo && !matches(f.vehicle?.registrationNo, registrationNo)) return false;
      if (insuredName && !matches(fullName, insuredName)) return false;
      if (city && !matches(f.accidentLocation?.city, city)) return false;

      return true;
    });
  }, [rows, q, policyNumber, registrationNo, insuredName, city, severity, dateFrom, dateTo, invalidRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  const exportRows = () => {
    const flat = filtered.map(f => {
      const insuredFullName = [f.insured?.firstName, f.insured?.lastName].filter(Boolean).join(" ").trim() || "";
      return {
        id: f.id,
        fnolReferenceNo: f.fnolReferenceNo,
        fnolState: f.fnolState,
        accidentDate: f.accidentDate,
        severity: f.severity,
        policyNumber: f.policy?.policyNumber,
        insured: insuredFullName,
        registrationNo: f.vehicle?.registrationNo,
        make: f.vehicle?.make,
        model: f.vehicle?.model,
        year: f.vehicle?.year,
        city: f.accidentLocation?.city,
        surveyor: f.surveyor?.name,
        surveyorStatus: f.surveyor?.status,
        description: (f.description ?? "").replace(/\n/g, " "),
      };
    });
    downloadCSV(flat);
  };

  const openPolicyModal = async (pNumber) => {
    if (!pNumber) return;
    setSelectedPolicyNumber(pNumber);
    setPolicyModalOpen(true);
    try {
      await fetchPolicy({ variables: { policyNumber: pNumber } });
    } catch {
      /* handled by policyError */
    }
  };

  const clearFilters = () => {
    setQRaw("");
    setPolicyNumber("");
    setRegistrationNo("");
    setInsuredName("");
    setCity("");
    setSeverity("");
    setDateFrom("");
    setDateTo("");
  };

  const policy = policyData?.getPolicyByNumber ?? null;

  /* =========================
     Render
     ========================= */
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">FNOL Inquiry</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800">Refresh</button>
          <button onClick={clearFilters} className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50">Clear filters</button>
          <button onClick={exportRows} className="px-3 py-2 rounded-lg bg-white border hover:bg-gray-50">Export CSV</button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 bg-white p-4 rounded-2xl shadow-sm border">
        <div className="lg:col-span-3">
          <label className="block text-sm font-medium text-gray-700">Global search</label>
          <input
            value={qRaw}
            onChange={e => setQRaw(e.target.value)}
            placeholder="ID, ref, policy, insured, vehicle, city..."
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
          {qRaw !== q && <div className="text-xs text-gray-400 mt-1">Searching…</div>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Policy #</label>
          <input value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Reg. No</label>
          <input value={registrationNo} onChange={e => setRegistrationNo(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Insured</label>
          <input value={insuredName} onChange={e => setInsuredName(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">City</label>
          <input value={city} onChange={e => setCity(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Severity</label>
          <select value={severity} onChange={e => setSeverity(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 bg-white">
            <option value="">All</option>
            {SEVERITY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Date from</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Date to</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </div>
        {invalidRange && (
          <div className="lg:col-span-12 text-sm text-red-600">
            “Date from” must be earlier than or equal to “Date to”. Filters paused.
          </div>
        )}
      </div>

      {/* Severity legend */}
      <div className="text-xs text-gray-500">
        Severity:
        <span className="ml-2 px-1 rounded bg-emerald-100 text-emerald-800">Low</span> •
        <span className="px-1 rounded bg-amber-100 text-amber-800"> Medium</span> •
        <span className="px-1 rounded bg-red-100 text-red-800"> High</span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">ID</th>
                <th className="px-4 py-3 text-left font-semibold">Reference No.</th>
                <th className="px-4 py-3 text-left font-semibold">Description</th>
                <th className="px-4 py-3 text-left font-semibold">State</th>
                <th className="px-4 py-3 text-left font-semibold">Accident Date</th>
                <th className="px-4 py-3 text-left font-semibold">Policy</th>
                <th className="px-4 py-3 text-left font-semibold">Insured</th>
                <th className="px-4 py-3 text-left font-semibold">Vehicle</th>
                <th className="px-4 py-3 text-left font-semibold">City</th>
                <th className="px-4 py-3 text-left font-semibold">Severity</th>
                <th className="px-4 py-3 text-left font-semibold">Surveyor</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && (
                <tr><td colSpan={11} className="px-4 py-6 text-center text-gray-500">Loading…</td></tr>
              )}
              {error && (
                <tr><td colSpan={11} className="px-4 py-6 text-center text-red-600">Error: {error.message}</td></tr>
              )}
              {!loading && !error && pageItems.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-6 text-center text-gray-500">No results</td></tr>
              )}
              {pageItems.map((f) => {
                const insuredFullName = [f.insured?.firstName, f.insured?.lastName].filter(Boolean).join(" ").trim() || "-";
                return (
                  <tr key={f.id} className="hover:bg-gray-50 group">
                    <td className="px-4 py-3 whitespace-nowrap">{f.id}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono">{f.fnolReferenceNo ?? "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono">{f.description ?? "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><StateBadge state={f.fnolState} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(f.accidentDate)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {f.policy?.policyNumber ? (
                        <button
                          type="button"
                          onClick={() => openPolicyModal(f.policy.policyNumber)}
                          className="text-blue-600 hover:underline"
                          title="View policy details"
                        >
                          {f.policy.policyNumber}
                        </button>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{insuredFullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{f.vehicle?.registrationNo ?? "-"}</span>
                        <span className="text-gray-500">
                          {[f.vehicle?.make, f.vehicle?.model, f.vehicle?.year].filter(Boolean).join(" ")}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{f.accidentLocation?.city ?? "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {f.severity ? (
                        <span className={classNames(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          f.severity === "High" && "bg-red-100 text-red-800",
                          f.severity === "Medium" && "bg-amber-100 text-amber-800",
                          f.severity === "Low" && "bg-emerald-100 text-emerald-800",
                          !["High","Medium","Low"].includes(f.severity) && "bg-gray-100 text-gray-800",
                        )}>{f.severity}</span>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {f.surveyor?.name ? (
                        <div className="flex items-center gap-2">
                          <span>{f.surveyor.name}</span>
                          <span className={classNames(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            f.surveyor.status === "AVAILABLE" && "bg-emerald-100 text-emerald-800",
                            f.surveyor.status === "ASSIGNED" && "bg-amber-100 text-amber-800",
                            f.surveyor.status === "ON_SITE" && "bg-sky-100 text-sky-800",
                            f.surveyor.status === "INSPECTION_DONE" && "bg-indigo-100 text-indigo-800",
                            f.surveyor.status === "UNAVAILABLE" && "bg-gray-100 text-gray-800",
                            !["AVAILABLE","ASSIGNED","ON_SITE","INSPECTION_DONE","UNAVAILABLE"].includes(f.surveyor.status) && "bg-gray-100 text-gray-800"
                          )}>{f.surveyor.status}</span>
                        </div>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                        <Link to={`/fnol/${f.id}`} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">View</Link>
                        <button className="px-3 py-1.5 rounded-lg border hover:bg-gray-50" onClick={() => navigator.clipboard.writeText(String(f.id))}>Copy ID</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-gray-50 border-t">
          <div className="text-sm text-gray-600">
            {filtered.length} record(s) • Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Rows per page</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); }}
                className="border rounded-lg px-2 py-1 bg-white text-sm"
              >
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button disabled={page === 1} onClick={() => setPage(1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-50">« First</button>
              <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-lg border disabled:opacity-50">‹ Prev</button>
              <span className="text-sm">{page}</span>
              <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 rounded-lg border disabled:opacity-50">Next ›</button>
              <button disabled={page === totalPages} onClick={() => setPage(totalPages)} className="px-3 py-1.5 rounded-lg border disabled:opacity-50">Last »</button>
            </div>
          </div>
        </div>
      </div>

      {/* Policy details modal */}
      <PolicyModal
        open={policyModalOpen}
        onClose={() => setPolicyModalOpen(false)}
        loading={policyLoading}
        error={policyError}
        policy={policy}
      />
    </div>
  );
}
