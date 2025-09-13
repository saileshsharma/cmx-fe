// src/components/fnol/FnolInquiry.jsx
import React, { useEffect, useMemo, useState, useRef, createContext, useContext } from "react";
import { useMutation, useQuery, useSubscription } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import {
  GET_ALL_FNOL,
  UPDATE_FNOL,
  ATTACH_FNOL_MEDIA,
  ASSIGN_SURVEYOR,
  FNOL_ASSIGNMENT_NOTICE,
} from "../../graphql/fnol";

/* =============================================================================
   🎨 Theme
   ============================================================================= */
const PALETTE = { primary: "#5B6CFF", primaryDark: "#3A46D4", accent: "#8B5CF6", pink: "#EC4899", ink: "#334155" };
const cssVars = { "--brand-primary": PALETTE.primary, "--brand-primary-dark": PALETTE.primaryDark, "--brand-accent": PALETTE.accent, "--brand-pink": PALETTE.pink, "--brand-ink": PALETTE.ink };

/* =============================================================================
   Uploader Config
   ============================================================================= */
const UPLOADER_URL = import.meta.env.VITE_UPLOADER_URL || "http://localhost:8081";
const UPLOADER_FIELD = import.meta.env.VITE_UPLOADER_FIELD || "file";
const SHOULD_ATTACH = String(import.meta.env.VITE_ATTACH_MEDIA || "1") === "1";

/* =============================================================================
   Helpers & UI bits
   ============================================================================= */
const SEVERITY_OPTIONS = ["Low", "Medium", "High"];
const STATE_OPTIONS = ["SUBMITTED", "ENRICHING", "VALIDATED", "REJECTED"];

function classNames(...arr) { return arr.filter(Boolean).join(" "); }
function formatDate(d) { if (!d) return "-"; const date = new Date(d); return isNaN(date.getTime()) ? "-" : date.toLocaleString(); }
function matches(v, q) { return String(v ?? "").toLowerCase().includes(String(q ?? "").toLowerCase()); }
function downloadCSV(rows, filename = "fnol_export.csv") {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]); const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))];
  const csv = "\uFEFF" + lines.join("\n"); const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = filename; link.click();
}

function sortKeyForRec(r) {
  const created = r.createdAt || r.created_at || r.createdOn || r.createdDate || r.createdAtUtc || r.created_at_utc || r.created;
  if (created) {
    const t = Date.parse(created);
    if (!Number.isNaN(t)) return t;
  }
  const acc = Date.parse(r.accidentDate || "");
  if (!Number.isNaN(acc)) return acc;
  const idNum = Number(String(r.id ?? "").replace(/\D/g, ""));
  if (!Number.isNaN(idNum) && idNum > 0) return idNum;
  return -Infinity;
}

function FancyKpi({ label, value, color }) {
  return (
    <div className="rounded-2xl p-4 ring-1 shadow-sm" style={{ background: `linear-gradient(180deg, ${color}1A, #ffffff)`, borderColor: `${color}33` }}>
      <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function SkeletonRow({ cols = 12 }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded" /></td>
      ))}
    </tr>
  );
}

/* =============================================================================
   Toasts
   ============================================================================= */
const ToastCtx = createContext(null);
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const add = (type, msg) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, type, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500);
  };
  return (
    <ToastCtx.Provider value={{ success: (m) => add("success", m), error: (m) => add("error", m) }}>
      {children}
      <div className="fixed top-4 right-4 z-[200] space-y-2">
        {toasts.map(t => (
          <div key={t.id}
               className={classNames("px-4 py-2 rounded-xl shadow text-sm",
                 t.type === "success" ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-1 ring-rose-200")}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
function useToast() { return useContext(ToastCtx); }

/* =============================================================================
   Slide-over for quick edit
   ============================================================================= */
function EditDrawer({ open, onClose, initial, onSave, saving, error }) {
  const [form, setForm] = useState(() => ({ severity: initial?.severity ?? "", fnolState: initial?.fnolState ?? "", description: initial?.description ?? "" }));
  useEffect(() => { if (open) setForm({ severity: initial?.severity ?? "", fnolState: initial?.fnolState ?? "", description: initial?.description ?? "" }); }, [open, initial]);
  useEffect(() => { if (!open) return; const p = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = p; }; }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[110]">
      <div className="absolute inset-0 bg-black/30" onClick={saving ? undefined : onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl border-l border-gray-200 flex flex-col">
        <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit FNOL</h3>
          <button onClick={onClose} disabled={saving} className="px-2 py-1 rounded hover:bg-gray-100">✕</button>
        </div>
        <div className="flex-1 p-5 space-y-4 overflow-auto">
          <div>
            <label className="block text-sm text-gray-700">Severity</label>
            <select className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={form.severity} onChange={(e) => setForm((s) => ({ ...s, severity: e.target.value }))}>
              <option value="">(unchanged)</option>
              {SEVERITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700">State</label>
            <select className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={form.fnolState} onChange={(e) => setForm((s) => ({ ...s, fnolState: e.target.value }))}>
              <option value="">(unchanged)</option>
              {STATE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700">Description</label>
            <textarea rows={5} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} placeholder="Optional notes/updates…" />
          </div>
          {error && <div className="p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-sm">{error.message}</div>}
        </div>
        <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-end gap-2">
          <button onClick={onClose} disabled={saving} className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-100">Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving} className="px-4 py-2 rounded-lg text-white hover:opacity-90 disabled:opacity-50" style={{ background: "var(--brand-primary)" }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </aside>
    </div>
  );
}

/* =============================================================================
   📤 Upload Images Modal
   ============================================================================= */
function UploadModal({ open, onClose, fnol, onUploaded }) {
  const toast = useToast();
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { if (!open) { setFiles([]); setBusy(false); } }, [open]);
  useEffect(() => { if (!open) return; const prev = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = prev; }; }, [open]);
  if (!open) return null;

  const pick = () => inputRef.current && inputRef.current.click();
  const onFile = (list) => {
    const arr = Array.from(list || []).filter((f) => f && f.type && f.type.startsWith("image/")).slice(0, 20);
    const key = (f) => `${f.name}::${f.size}`;
    setFiles((prev) => {
      const prevKeys = new Set(prev.map(key));
      return [...prev, ...arr.filter((f) => !prevKeys.has(key(f)))];
    });
  };
  const removeAt = (i) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  // Prefer business ref; fall back to id
  const fnolReferenceNo = (fnol?.fnolReferenceNo || fnol?.id) ? String(fnol.fnolReferenceNo || fnol.id) : null;
  const base = String(UPLOADER_URL || "").replace(/\/+$/, "");
  const url = fnolReferenceNo ? `${base}/api/fnol/${encodeURIComponent(fnolReferenceNo)}/images` : null;

  const uploadOne = async (file) => {
    if (!url || !fnolReferenceNo) throw new Error("Missing FNOL reference");
    const fd = new FormData();
    fd.append(UPLOADER_FIELD, file);
    fd.append("context", JSON.stringify({
      scope: "fnol",
      fnolId: String(fnol?.id || ""),
      fnolReferenceNo,
      filename: file.name,
      mimeType: file.type || "image/jpeg",
    }));
    fd.append("fnolReferenceNo", fnolReferenceNo);

    const res = await fetch(url, { method: "POST", body: fd, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
    const json = await res.json();
    if (!json || !json.url) throw new Error("Uploader did not return a URL");
    return json;
  };

  const doUpload = async () => {
    if (!files.length) return;
    setBusy(true);
    try {
      const results = [];
      for (const f of files) {
        // eslint-disable-next-line no-await-in-loop
        const r = await uploadOne(f);
        results.push({ url: r.url, type: f.type || "image/jpeg", label: f.name });
      }
      if (SHOULD_ATTACH && fnol?.id) {
        try {
          await onUploaded(results);
          toast.success(`Uploaded ${files.length} image(s) to FNOL ${fnolReferenceNo} and attached ✅`);
        } catch (e) {
          console.error(e);
          toast.error(`Uploaded to FNOL ${fnolReferenceNo}, but attach failed`);
        }
      } else {
        const text = results.map((x) => x.url).join("\n");
        try { await navigator.clipboard.writeText(text); } catch {}
        toast.success(`Uploaded ${files.length} image(s) to FNOL ${fnolReferenceNo} ✓`);
      }
      try { window.dispatchEvent(new CustomEvent("fnol:uploaded", { detail: { fnolId: fnol?.id, fnolReferenceNo } })); } catch {}
      onClose();
    } catch (e) {
      console.error(e);
      toast.error(e?.message || `Upload failed for FNOL ${fnolReferenceNo}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/40" onClick={busy ? undefined : onClose} />
      <div className="absolute inset-x-3 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 top-10 md:top-16 w-auto md:w-[780px]">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Upload Images to cmx-uploader</h3>
            <button onClick={onClose} disabled={busy} className="px-2 py-1 rounded-lg hover:bg-gray-100">✕</button>
          </div>

          <div className="p-5 space-y-4">
            <div className="text-sm text-gray-600">
              FNOL:&nbsp;<span className="font-mono font-medium">{fnolReferenceNo || "-"}</span>
            </div>

            <div
              className={classNames("mt-2 border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer", busy ? "opacity-60" : "hover:bg-gray-50")}
              onClick={pick}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onFile(e.dataTransfer.files); }}
            >
              <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFile(e.target.files)} />
              <div className="text-gray-700 font-medium">Drag & drop images here, or click to browse</div>
              <div className="text-xs text-gray-500 mt-1">Max 20 images per batch. JPG/PNG/WEBP recommended.</div>
            </div>

            {files.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {files.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="relative group">
                    <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-32 object-cover rounded-xl border" />
                    <button type="button" onClick={() => removeAt(i)} className="absolute top-1 right-1 hidden group-hover:block text-xs px-1.5 py-0.5 rounded bg-black/60 text-white">Remove</button>
                    <div className="mt-1 text-xs text-gray-600 truncate" title={f.name}>{f.name}</div>
                  </div>
                ))}
              </div>
            )}

            {files.length > 0 && (
              <div className="flex items-center justify-end gap-2 pt-2">
                <button onClick={() => setFiles([])} disabled={busy} className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50">Clear</button>
                <button onClick={doUpload} disabled={busy} className="px-4 py-2 rounded-lg text-white hover:opacity-90 disabled:opacity-50" style={{ background: "var(--brand-primary)" }}>
                  {busy ? "Uploading…" : `Upload ${files.length} file(s)`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   ✅ Assigned Surveyor Dialog
   ============================================================================= */
function AssignedSurveyorDialog({ open, onClose, payload, onGoDashboard }) {
  if (!open) return null;
  const p = payload || {};
  const sv = p.assignedSurveyor || {};
  return (
    <div className="fixed inset-0 z-[130]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-3 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 top-16 w-auto md:w-[560px]">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Surveyor Assigned</h3>
            <button onClick={onClose} className="px-2 py-1 rounded-lg hover:bg-gray-100">✕</button>
          </div>
          <div className="p-5 space-y-4">
            <div className="text-sm text-gray-600">
              <div><span className="font-medium">FNOL Ref:</span> <span className="font-mono">{p.fnolReferenceNo || "-"}</span></div>
              <div className="mt-1"><span className="font-medium">Status:</span> <span className="px-2 py-0.5 rounded-full ring-1 ring-gray-200 text-xs">{p.status || "-"}</span></div>
              {p.message && <div className="mt-2 text-gray-700">{p.message}</div>}
            </div>
            <div className="border rounded-xl p-4 bg-gray-50">
              <div className="text-sm text-gray-500 mb-1">Assigned Surveyor</div>
              <div className="text-gray-900 font-medium">{sv.name || "-"}</div>
              <div className="text-sm text-gray-600">
                <div>ID: <span className="font-mono">{sv.id || "-"}</span></div>
                {sv.email && <div>Email: {sv.email}</div>}
                {sv.phone && <div>Phone: {sv.phone}</div>}
                {sv.status && <div>Status: {sv.status}</div>}
              </div>
            </div>
          </div>
          <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-end gap-2">
            <button onClick={onClose} className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-100">Close</button>
            <button onClick={onGoDashboard} className="px-4 py-2 rounded-lg text-white hover:opacity-90"
              style={{ background: "var(--brand-primary)" }}>
              Go to Surveyor Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   Main component wrappers
   ============================================================================= */
function EditableSelect({ value, options, onChange, label, busy }) {
  return (
    <div className="inline-flex items-center gap-2">
      <select
        className="rounded-lg border border-gray-300 px-2 py-1 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
        value={value || ""}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={busy}
        title={`Change ${label}`}
      >
        {["", ...options].map((o, i) => <option key={i} value={o}>{o || "(select)"}</option>)}
      </select>
      {busy && <span className="text-xs text-gray-400">Saving…</span>}
    </div>
  );
}

export default function FnolInquiry() {
  return (
    <ToastProvider>
      <FnolInquiryInner />
    </ToastProvider>
  );
}

function FnolInquiryInner() {
  const navigate = useNavigate();
  const toast = useToast();

  const { data, loading, error, refetch } = useQuery(GET_ALL_FNOL, { fetchPolicy: "cache-and-network" });

  const rows = useMemo(() => {
    const list = (data?.getAllFnol ?? []).slice();
    list.sort((a, b) => sortKeyForRec(b) - sortKeyForRec(a));
    return list;
  }, [data]);

  const [selectedId, setSelectedId] = useState(null);
  const selectedRow = useMemo(() => rows.find(r => String(r.id) === String(selectedId)) ?? null, [rows, selectedId]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [savingRowIds, setSavingRowIds] = useState(new Set());

  const [doUpdate, { error: updateErrorGlobal }] = useMutation(UPDATE_FNOL, {
    onError: () => {},
    update: (cache, { data: m }) => {
      if (!m?.updateFnol) return;
      const updated = m.updateFnol;
      const prev = cache.readQuery({ query: GET_ALL_FNOL });
      if (!prev?.getAllFnol) return;
      cache.writeQuery({
        query: GET_ALL_FNOL,
        data: {
          getAllFnol: prev.getAllFnol.map((x) => (String(x.id) === String(updated.id) ? { ...x, ...updated } : x)),
        },
      });
    },
  });

  const [attachMedia] = useMutation(ATTACH_FNOL_MEDIA);
  const [assignSurveyor, { loading: assigning }] = useMutation(ASSIGN_SURVEYOR, { onError: () => {} });

  // Filters
  const [qRaw, setQRaw] = useState(""); 
  const [q, setQ] = useState("");
  useEffect(() => { const t = setTimeout(() => setQ(qRaw), 300); return () => clearTimeout(t); }, [qRaw]);
  const [city, setCity] = useState("");
  const [severity, setSeverity] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const invalidRange = dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo);

  useEffect(() => { 
    if (!selectedId) return; 
    if (!rows.some(r => String(r.id) === String(selectedId))) setSelectedId(null); 
  }, [rows, selectedId]);

  const [page, setPage] = useState(1); 
  const [pageSize, setPageSize] = useState(10);
  useEffect(() => { setPage(1); }, [q, city, severity, dateFrom, dateTo, pageSize]);

  const counts = useMemo(() => {
    const s = (x) => (x || "").toUpperCase();
    const submitted  = rows.filter(r => s(r.fnolState) === "SUBMITTED").length;
    const enriching  = rows.filter(r => s(r.fnolState) === "ENRICHING").length;
    const validated  = rows.filter(r => s(r.fnolState) === "VALIDATED").length;
    const rejected   = rows.filter(r => s(r.fnolState) === "REJECTED").length;
    return { submitted, enriching, validated, rejected, total: rows.length };
  }, [rows]);

  const filtered = useMemo(() => {
    if (invalidRange) return rows;
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toTs = dateTo ? new Date(dateTo).getTime() : null;

    return rows.filter(f => {
      const dt = f?.accidentDate ? new Date(f.accidentDate).getTime() : null;
      if (fromTs && (dt == null || dt < fromTs)) return false;
      if (toTs && (dt == null || dt > (toTs + 24 * 60 * 60 * 1000 - 1))) return false;
      if (severity && f.severity !== severity) return false;

      const anyText = [
        f.id, f.fnolReferenceNo, f.description,
        f.vehicle?.registrationNumber, f.vehicle?.make, f.vehicle?.model,
        f.accidentLocation?.city, f.accidentLocation?.province, f.accidentLocation?.postalCode,
        f.surveyor?.name, f.surveyor?.status
      ].some(v => matches(v, q));
      if (q && !anyText) return false;
      if (city && !matches(f.accidentLocation?.city, city)) return false;
      return true;
    });
  }, [rows, q, city, severity, dateFrom, dateTo, invalidRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

  const exportRows = () => {
    const flat = filtered.map(f => ({
      id: f.id,
      fnolReferenceNo: f.fnolReferenceNo,
      fnolState: f.fnolState,
      accidentDate: f.accidentDate,
      severity: f.severity,
      registrationNumber: f.vehicle?.registrationNumber,
      make: f.vehicle?.make,
      model: f.vehicle?.model,
      year: f.vehicle?.year,
      city: f.accidentLocation?.city,
      province: f.accidentLocation?.province,
      postalCode: f.accidentLocation?.postalCode,
      surveyor: f.surveyor?.name,
      surveyorStatus: f.surveyor?.status,
      description: (f.description ?? "").replace(/\n/g, " "),
    }));
    downloadCSV(flat);
  };

  const clearFilters = () => { setQRaw(""); setCity(""); setSeverity(""); setDateFrom(""); setDateTo(""); };

  const handleOpenDrawer = () => { if (selectedRow) setDrawerOpen(true); };
  const openFnolEdit = (id) => { if (!id) return; navigate(`/register-fnol?id=${encodeURIComponent(id)}`); };

  const savePartial = async (id, patch) => {
    setSavingRowIds(prev => new Set(prev).add(id));
    const current = rows.find(r => String(r.id) === String(id));
    const optimisticResponse = {
      updateFnol: {
        __typename: "FnolDetails",
        id,
        fnolState: patch.fnolState != null ? patch.fnolState : current?.fnolState,
        severity: patch.severity != null ? patch.severity : current?.severity,
        description: patch.description != null ? patch.description : current?.description,
      },
    };
    try {
      await doUpdate({ variables: { id, ...patch }, optimisticResponse });
      toast.success("Saved");
    } catch (e) {
      toast.error(e.message || "Save failed");
    } finally {
      setSavingRowIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const handleSaveDrawer = async (form) => {
    if (!selectedRow) return;
    await savePartial(selectedRow.id, {
      fnolState: form.fnolState || null,
      severity: form.severity || null,
      description: form.description ?? null,
    });
    setDrawerOpen(false);
  };

  const attachUploaded = async (items) => {
    if (!SHOULD_ATTACH || !selectedRow?.id) return;
    await attachMedia({ variables: { fnolId: selectedRow.id, items } });
    try { await refetch(); } catch {}
  };

  const subscribedRef = selectedRow ? String(selectedRow.fnolReferenceNo || selectedRow.id) : null;
  useSubscription(FNOL_ASSIGNMENT_NOTICE, {
    skip: !subscribedRef,
    variables: { fnolReferenceNo: subscribedRef },
    onData: ({ data, client }) => {
      const notice = data?.data?.fnolAssignmentNotice;
      if (!notice) return;
      toast.success(notice.message || "FNOL has been sent to surveyor");
      try {
        client.cache.modify({ id: "ROOT_QUERY", fields: { unreadCount(existing = 0) { return existing + 1; } } });
      } catch {
        window.dispatchEvent(new CustomEvent("app:notifications:refresh"));
      }
      try { refetch(); } catch {}
    },
    onError: (e) => console.error("[WS] fnolAssignmentNotice error", e),
  });

  // Dialog state for assignment result
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignPayload, setAssignPayload] = useState(null);

  const onAssignSurveyor = async () => {
    if (!selectedRow) return;
    const fnolReferenceNo = String(selectedRow.fnolReferenceNo || selectedRow.id);
    try {
      const res = await assignSurveyor({ variables: { fnolReferenceNo } });
      const payload = res?.data?.assignSurveyor || { fnolReferenceNo, status: "SUCCESS", message: `Assignment triggered for ${fnolReferenceNo}` };
      setAssignPayload(payload);
      setAssignDialogOpen(true);
      toast.success(payload.message || "Surveyor assignment successful");
      try { await refetch(); } catch {}
    } catch (e) {
      toast.error(e?.message || "Failed to assign surveyor");
    }
  };

  return (
    <div className="p-6 space-y-6" style={cssVars}>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl p-5 md:p-6 text-white shadow"
           style={{ background: `linear-gradient(90deg,var(--brand-primary),var(--brand-accent),var(--brand-pink))` }}>
        <div className="flex flex-wrap items-center gap-2 md:gap-3 justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">FNOL Management</h1>
            <p className="text-white/80 text-sm">Search, filter, export and quickly edit FNOLs.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => refetch()} className="px-3 py-2 rounded-lg bg-white/90 text-indigo-700 hover:bg-white font-medium shadow">Refresh</button>
            <button onClick={clearFilters} className="px-3 py-2 rounded-lg bg-white text-indigo-700 hover:bg-indigo-50 font-medium shadow">Clear filters</button>
            <button onClick={exportRows} className="px-3 py-2 rounded-lg font-medium shadow"
                    style={{ background: "white", color: "var(--brand-primary-dark)", border: "1px solid rgba(0,0,0,.06)" }}>Export CSV</button>
            <button onClick={handleOpenDrawer} disabled={!selectedRow} className="px-3 py-2 rounded-lg font-medium shadow text-white disabled:opacity-50"
                    style={{ background: "var(--brand-primary)" }} title={!selectedRow ? "Select a FNOL row to edit" : "Edit selected FNOL inline"}>
              Edit Inline
            </button>
            <button
              onClick={onAssignSurveyor}
              disabled={!selectedRow || assigning}
              className="px-3 py-2 rounded-lg font-medium shadow text-white disabled:opacity-50 inline-flex items-center gap-2"
              style={{ background: "var(--brand-primary-dark)" }}
              title={!selectedRow ? "Select a FNOL row to assign" : `Assign surveyor for ${selectedRow.fnolReferenceNo || selectedRow.id}`}
            >
              {assigning && (
                <svg aria-hidden="true" className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.3" />
                  <path d="M12 2 a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" fill="none" />
                </svg>
              )}
              Assign Surveyor
            </button>
            <button onClick={() => setUploadOpen(true)} disabled={!selectedRow}
                    className="px-3 py-2 rounded-lg font-medium shadow text-white disabled:opacity-50"
                    style={{ background: "#0ea5e9" }} title={!selectedRow ? "Select a FNOL row first" : `Upload images for ${selectedRow.fnolReferenceNo || selectedRow.id}`}>
              Upload Images
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <FancyKpi label="Submitted" value={counts.submitted}  color="#0EA5E9" />
        <FancyKpi label="Enriching" value={counts.enriching}  color="#8B5CF6" />
        <FancyKpi label="Validated" value={counts.validated}   color="#10B981" />
        <FancyKpi label="Rejected"  value={counts.rejected}    color="#EF4444" />
        <FancyKpi label="Total"     value={counts.total}       color="#334155" />
      </div>

      {/* Filters */}
      <FiltersCard
        qRaw={qRaw} setQRaw={setQRaw} q={q}
        city={city} setCity={setCity}
        severity={severity} setSeverity={setSeverity}
        dateFrom={dateFrom} setDateFrom={setDateFrom}
        dateTo={dateTo} setDateTo={setDateTo}
        invalidRange={invalidRange}
      />

      {/* Legend */}
      <div className="text-xs text-gray-500">Severity:
        <span className="ml-2 px-1 rounded bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Low</span> •
        <span className="px-1 rounded bg-amber-50 text-amber-700 ring-1 ring-amber-200"> Medium</span> •
        <span className="px-1 rounded bg-rose-50 text-rose-700 ring-1 ring-rose-200"> High</span>
      </div>

      {/* Results */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700 sticky top-0 z-10">
              <tr>
                {["","Reference No.","Description","State","Accident Date","Vehicle","City","Province","Postal Code","Severity","Surveyor","Surveyor Status"].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && !data && Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={12} />)}
              {error && (
                <tr>
                  <td colSpan={12} className="px-4 py-6 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                      <span>⚠</span><span>Error: {error.message}</span>
                      <button onClick={() => refetch()} className="ml-2 underline">Retry</button>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && !error && pageItems.length === 0 && (
                <tr><td colSpan={12} className="px-4 py-6 text-center text-gray-500">No results</td></tr>
              )}
              {pageItems.map((f) => {
                const isChecked = String(selectedId) === String(f.id);
                const rowBusy = savingRowIds.has(f.id);
                return (
                  <tr key={f.id}
                      className={classNames("group", isChecked ? "bg-indigo-50/60" : "hover:bg-indigo-50/40")}
                      onDoubleClick={() => setSelectedId(f.id)}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input type="radio" name="fnol-select" aria-label={`Select FNOL ${f.fnolReferenceNo || f.id}`}
                             checked={isChecked} onChange={() => setSelectedId(f.id)} className="h-4 w-4 accent-indigo-600 cursor-pointer"/>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap font-mono">
                      <button type="button" onClick={() => openFnolEdit(f.id)}
                              className="underline decoration-dotted hover:decoration-solid"
                              title="Open FNOL" style={{ color: "var(--brand-primary-dark)" }}>
                        {f.fnolReferenceNo || f.id}
                      </button>
                    </td>

                    <td className="px-4 py-3">{f.description ?? "-"}</td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <EditableSelect value={f.fnolState} options={STATE_OPTIONS} label="state" busy={rowBusy}
                                      onChange={(val) => savePartial(f.id, { fnolState: val })} />
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(f.accidentDate)}</td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{f.vehicle?.registrationNumber ?? "-"}</span>
                        <span className="text-gray-500">{[f.vehicle?.make, f.vehicle?.model, f.vehicle?.year].filter(Boolean).join(" ")}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">{f.accidentLocation?.city ?? "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{f.accidentLocation?.province ?? "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{f.accidentLocation?.postalCode ?? "-"}</td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <EditableSelect value={f.severity} options={SEVERITY_OPTIONS} label="severity" busy={rowBusy}
                                      onChange={(val) => savePartial(f.id, { severity: val })} />
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {f.surveyor?.name ? <span>{f.surveyor.name}</span> : "-"}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {f.surveyor?.status ? <span className="px-2 py-0.5 rounded-full ring-1 ring-gray-200 text-xs">{f.surveyor.status}</span> : "-"}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination
          filteredLen={filtered.length}
          page={page} setPage={setPage}
          pageSize={pageSize} setPageSize={setPageSize}
          totalPages={totalPages}
        />
      </div>

      <EditDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} initial={selectedRow}
                  saving={savingRowIds.has(selectedRow?.id)} error={updateErrorGlobal} onSave={handleSaveDrawer} />

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} fnol={selectedRow} onUploaded={attachUploaded} />

      {/* Surveyor assignment details */}
      <AssignedSurveyorDialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        payload={assignPayload}
        onGoDashboard={() => { setAssignDialogOpen(false); navigate("/dispatcher_surveyor"); }}
      />
    </div>
  );
}

/* --- Presentational helpers --- */
function FiltersCard(props) {
  const {
    qRaw, setQRaw, q,
    city, setCity,
    severity, setSeverity,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    invalidRange
  } = props;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 bg-white/70 backdrop-blur p-4 rounded-2xl shadow-sm border border-gray-200">
      <div className="lg:col-span-5">
        <label className="block text-sm text-gray-700">Global search</label>
        <div className="relative mt-1">
          <input
            value={qRaw}
            onChange={e => setQRaw(e.target.value)}
            placeholder="ID, reference, vehicle, city/province/postal…"
            className="w-full rounded-xl border border-gray-300 pl-9 pr-9 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔎</span>
          {qRaw !== q && <div className="text-xs text-gray-400 mt-1">Searching…</div>}
          {qRaw && (<button onClick={() => setQRaw("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" title="Clear">✖</button>)}
        </div>
      </div>
      <div className="lg:col-span-2">
        <label className="block text-sm text-gray-700">City</label>
        <input value={city} onChange={e => setCity(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
      </div>
      <div className="lg:col-span-2">
        <label className="block text-sm text-gray-700">Severity</label>
        <select value={severity} onChange={e => setSeverity(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
          <option value="">All</option>
          {SEVERITY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="lg:col-span-1">
        <label className="block text-sm text-gray-700">Date from</label>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
      </div>
      <div className="lg:col-span-2">
        <label className="block text-sm text-gray-700">Date to</label>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
      </div>
      {invalidRange && <div className="lg:col-span-12 text-sm text-rose-600">"Date from" must be earlier than or equal to "Date to". Filters paused.</div>}
    </div>
  );
}

function Pagination({ filteredLen, page, setPage, pageSize, setPageSize, totalPages }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-gray-50 border-t border-gray-200">
      <div className="text-sm text-gray-600">{filteredLen} record(s) • Page {page} of {totalPages}</div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Rows per page</label>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); }}
                  className="border border-gray-300 rounded-xl px-2 py-1 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(1)} className="px-3 py-1.5 rounded-xl border border-gray-200 disabled:opacity-50">« First</button>
          <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-xl border border-gray-200 disabled:opacity-50">‹ Prev</button>
          <span className="text-sm">{page}</span>
          <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 rounded-xl border border-gray-200 disabled:opacity-50">Next ›</button>
          <button disabled={page === totalPages} onClick={() => setPage(totalPages)} className="px-3 py-1.5 rounded-xl border border-gray-200 disabled:opacity-50">Last »</button>
        </div>
      </div>
    </div>
  );
}