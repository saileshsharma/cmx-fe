import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLazyQuery, useMutation, gql } from "@apollo/client";
import { useLocation, useNavigate } from "react-router-dom";
import { GET_SURVEYOR, UPDATE_SURVEYOR } from "../../graphql/surveyors";


/* =========================================================================
   Constants
   ========================================================================= */
const AVAILS = ["UNAVAILABLE", "AVAILABLE"];



const emptyDraft = {
  id: "",
  name: "",
  email: "",
  phoneNumber: "",
  rating_avg: "",
  app_version: "",
  capacityPerDay: "",
  activeJobsCount: "",
  skills: "",
  city: "",
  province: "",
  country: "",
  internal: false,
  status: "",
};

/* =========================================================================
   Component
   ========================================================================= */
export default function SurveyorEdit() {
  const navigate = useNavigate();
  const location = useLocation();

  const [draft, setDraft] = useState(emptyDraft);
  const [loadedId, setLoadedId] = useState(null);
  const [prefilledFromEvent, setPrefilledFromEvent] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState(null);

  const qs = new URLSearchParams(location.search);
  const idFromQuery = qs.get("id");

  const [loadSurveyor, { data: qData, loading: qLoading, error: qError }] =
    useLazyQuery(GET_SURVEYOR, { fetchPolicy: "network-only" });

  const [updateSurveyor, { loading: mLoading }] = useMutation(UPDATE_SURVEYOR, {
    onCompleted: (res) => {
      setToast({ type: "success", msg: "Surveyor updated." });
      if (res?.updateSurveyor) {
        setDraft(toDraft(res.updateSurveyor));
        setDirty(false);
      }
    },
    onError: (e) => setToast({ type: "error", msg: e.message || "Update failed" }),
    update: (cache, { data: mutationData }) => {
      const updated = mutationData?.updateSurveyor;
      if (!updated) return;
      try {
        cache.modify({
          fields: {
            getAllSurveyors(existingRefs = [], { readField }) {
              return existingRefs.map((ref) =>
                readField("id", ref) === updated.id
                  ? cache.writeFragment({
                      data: updated,
                      fragment: gql`
                        fragment _SurveyorFrag on Surveyor {
                          id
                          name
                          email
                          phoneNumber
                          rating_avg
                          app_version
                          capacityPerDay
                          activeJobsCount
                          skills
                          createdAt
                          updatedAt
                          city
                          province
                          country
                          internal
                          isActive
                          status
                        }
                      `,
                    })
                  : ref
              );
            },
          },
        });
      } catch {
        /* cache may not have list */
      }
    },
  });

  // Prefill from CustomEvent fired by list page
  useEffect(() => {
    const handler = (e) => {
      if (!e?.detail) return;
      const s = e.detail;
      setDraft(toDraft(s));
      setLoadedId(String(s.id));
      setPrefilledFromEvent(true);
      setDirty(false);
    };
    window.addEventListener("surveyors:selected", handler, { once: true });
    return () => window.removeEventListener("surveyors:selected", handler);
  }, []);

  // If opening directly or refreshing; fetch by id in URL
  useEffect(() => {
    if (!prefilledFromEvent && idFromQuery) {
      setLoadedId(String(idFromQuery));
      loadSurveyor({ variables: { id: idFromQuery } });
    }
  }, [prefilledFromEvent, idFromQuery, loadSurveyor]);

  // Put query data into draft
  useEffect(() => {
    if (!prefilledFromEvent && qData?.getSurveyor) {
      setDraft(toDraft(qData.getSurveyor));
      setDirty(false);
    }
  }, [prefilledFromEvent, qData]);

  // Helpers
  const onChange = (key, transform = (v) => v) => (e) => {
    const value = e?.target?.type === "checkbox" ? e.target.checked : e?.target?.value ?? e;
    setDraft((d) => ({ ...d, [key]: transform(value) }));
    setDirty(true);
  };

  const canSave = useMemo(() => {
    if (!draft?.name) return false;
    if (!draft?.id && !loadedId) return false;
    return !mLoading;
  }, [draft, loadedId, mLoading]);

  const handleSave = async () => {
    const id = draft?.id || loadedId;
    if (!id) return;

    // Only include fields defined in UpdateSurveyorInput
    let input = {
      name: draft.name || null,
      email: draft.email || null,
      phoneNumber: draft.phoneNumber || null,
      rating_avg: coerceIntOrNull(draft.rating_avg),
      app_version: draft.app_version || null,
      capacityPerDay: coerceIntOrNull(draft.capacityPerDay), // service converts Int -> String
      activeJobsCount: coerceIntOrNull(draft.activeJobsCount),
      skills: draft.skills || null,
      city: draft.city || null,
      province: draft.province || null,
      country: draft.country || null,
      internal: !!draft.internal,
      status: draft.status || null, // includes INACTIVE when toggled
    };

    // Remove null/undefined keys
    input = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== null && v !== undefined));

    await updateSurveyor({
      variables: { id, input },
      optimisticResponse: {
        updateSurveyor: {
          __typename: "Surveyor",
          id,
          name: input.name || draft.name,
          email: input.email || draft.email,
          phoneNumber: input.phoneNumber || draft.phoneNumber,
          rating_avg: input.rating_avg || draft.rating_avg,
          app_version: input.app_version || draft.app_version,
          capacityPerDay: input.capacityPerDay || draft.capacityPerDay,
          activeJobsCount: input.activeJobsCount || draft.activeJobsCount,
          skills: input.skills || draft.skills,
          city: input.city || draft.city,
          province: input.province || draft.province,
          country: input.country || draft.country,
          internal: input.internal !== undefined ? input.internal : draft.internal,
          status: input.status || draft.status,
          // Keep optimistic values consistent with query selection
          isActive: (input.status || draft.status || "").toUpperCase() !== "INACTIVE",
          createdAt: draft.createdAt || null,
          updatedAt: new Date().toISOString(),
        },
      },
    });
  };

  const handleCancel = () => navigate("/surveyors-inquiry");

  // === Inactive helpers ===
  const isInactive = (draft.status || "").toUpperCase() === "INACTIVE";
  const toggleActive = () => {
    setDraft((d) => ({
      ...d,
      status: isInactive ? "AVAILABLE" : "INACTIVE", // reactivate to AVAILABLE by default
    }));
    setDirty(true);
  };
  const quickDeactivate = () => {
    setDraft((d) => ({ ...d, status: "INACTIVE" }));
    setDirty(true);
  };
  const quickReactivate = () => {
    setDraft((d) => ({ ...d, status: "AVAILABLE" }));
    setDirty(true);
  };

  const title = draft?.name ? `Edit: ${draft.name}` : "Edit Surveyor";

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-screen-xl mx-auto px-2 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">{title}</h1>
            <div className="text-xs text-gray-500">
              ID: <span className="font-mono">{draft.id || loadedId || "—"}</span>
              {qLoading && " • Loading…"}
              {qError && ` • Error: ${qError.message}`}
              {dirty && " • Unsaved changes"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Quick action to toggle inactive */}
            {isInactive ? (
              <button
                onClick={quickReactivate}
                className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
                type="button"
                title="Set status to AVAILABLE"
              >
                Reactivate
              </button>
            ) : (
              <button
                onClick={quickDeactivate}
                className="px-3 py-2 rounded-lg border bg-rose-600 text-white hover:bg-rose-700"
                type="button"
                title="Set status to INACTIVE"
              >
                Deactivate
              </button>
            )}
            <button
              onClick={handleCancel}
              className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50"
              type="button"
              title={!canSave ? "Fill required fields" : "Save changes"}
            >
              {mLoading ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-screen-xl mx-auto grid gap-4">
        {/* Basics */}
        <Section title="Basics">
          <div className="grid md:grid-cols-3 gap-3">
            <LabeledInput label="Name *" value={draft.name} onChange={onChange("name")} />
            <LabeledInput label="Email" value={draft.email} onChange={onChange("email")} />
            <LabeledInput label="Phone" value={draft.phoneNumber} onChange={onChange("phoneNumber")} />
          </div>
        </Section>

        {/* Type & Status */}
        <Section title="Type & Status">
          <div className="grid md:grid-cols-3 gap-3 items-end">
            <LabeledSwitch
              label="Internal"
              checked={!!draft.internal}
              onChange={onChange("internal")}
              hint={draft.internal ? "Internal surveyor" : "External vendor"}
            />
            <LabeledSelect
              label="Availability"
              value={draft.status || ""}
              onChange={onChange("status")}
              options={AVAILS}
              placeholder="Select availability"
            />
            {/* Active toggle (writes status INACTIVE when turned off) */}
            <LabeledSwitch
              label="Active"
              checked={!isInactive}
              onChange={toggleActive}
              hint={isInactive ? "Inactive users cannot receive jobs" : "Active and eligible for assignment"}
            />
          </div>
        </Section>

        {/* Metrics */}
        <Section title="Metrics">
          <div className="grid md:grid-cols-4 gap-3">
            <LabeledInput
              label="Rating Avg"
              value={draft.rating_avg}
              onChange={onChange("rating_avg")}
              type="number"
              step="1"
            />
            <LabeledInput
              label="Capacity / Day"
              value={draft.capacityPerDay}
              onChange={onChange("capacityPerDay")}
              type="number"
            />
            <LabeledInput
              label="Active Jobs Count"
              value={draft.activeJobsCount}
              onChange={onChange("activeJobsCount")}
              type="number"
            />
            <LabeledInput
              label="App Version"
              value={draft.app_version}
              onChange={onChange("app_version")}
              placeholder="e.g. 1.6.2"
            />
          </div>
        </Section>

        {/* Location */}
        <Section title="Location">
          <div className="grid md:grid-cols-3 gap-3">
            <LabeledInput label="City" value={draft.city} onChange={onChange("city")} />
            <LabeledInput label="Province" value={draft.province} onChange={onChange("province")} />
            <LabeledInput label="Country" value={draft.country} onChange={onChange("country")} />
          </div>
        </Section>

        {/* Skills */}
        <Section title="Skills">
          <LabeledTextArea
            label="Skills (comma or pipe separated)"
            value={draft.skills}
            onChange={onChange("skills")}
            rows={3}
          />
        </Section>

        {/* Timestamps (readonly) */}
        <Section title="Timestamps">
          <div className="grid md:grid-cols-2 gap-3">
            <LabeledReadonly label="Created At" value={fmtDate(draft.createdAt)} />
            <LabeledReadonly label="Updated At" value={fmtDate(draft.updatedAt)} />
          </div>
        </Section>
      </div>

      {/* Toast */}
      {toast && (
        <Toast type={toast.type} onClose={() => setToast(null)}>
          {toast.msg}
        </Toast>
      )}
    </div>
  );
}

/* =========================================================================
   UI helpers
   ========================================================================= */
function Section({ title, children }) {
  return (
    <div className="bg-white border rounded-2xl shadow-sm p-4">
      <div className="text-sm font-medium text-gray-800 mb-3">{title}</div>
      {children}
    </div>
  );
}

function LabeledInput({ label, value, onChange, type = "text", step, placeholder }) {
  return (
    <label className="block">
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <input
        value={value ?? ""}
        onChange={onChange}
        type={type}
        step={step}
        placeholder={placeholder}
        className="w-full border rounded-lg px-3 py-2"
      />
    </label>
  );
}

function LabeledTextArea({ label, value, onChange, rows = 3 }) {
  return (
    <label className="block">
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <textarea
        value={value ?? ""}
        onChange={onChange}
        rows={rows}
        className="w-full border rounded-lg px-3 py-2"
      />
    </label>
  );
}

function LabeledSelect({ label, value, onChange, options, placeholder = "Select…" }) {
  return (
    <label className="block">
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <select value={value} onChange={onChange} className="w-full border rounded-lg px-3 py-2 bg-white">
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function LabeledSwitch({ label, checked, onChange, hint }) {
  return (
    <div>
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <label className="inline-flex items-center gap-2">
        <input type="checkbox" checked={!!checked} onChange={onChange} />
        <span className="text-sm">{checked ? "Yes" : "No"}</span>
      </label>
      {hint && <div className="text-xs text-gray-500 mt-1">{hint}</div>}
    </div>
  );
}

function LabeledReadonly({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <div className="px-3 py-2 border rounded-lg bg-gray-50 text-gray-700">{value ?? "—"}</div>
    </div>
  );
}

function Toast({ type = "info", children, onClose }) {
  const colors = {
    success: "bg-emerald-50 text-emerald-900 border-emerald-200",
    error: "bg-red-50 text-red-900 border-red-200",
    info: "bg-blue-50 text-blue-900 border-blue-200",
  }[type] || "bg-gray-50 text-gray-900 border-gray-200";

  const timerRef = useRef(null);
  useEffect(() => {
    timerRef.current = setTimeout(onClose, 2500);
    return () => timerRef.current && clearTimeout(timerRef.current);
  }, [onClose]);

  return (
    <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg border shadow ${colors}`}>
      <div className="flex items-start gap-3">
        <div className="text-sm">{children}</div>
        <button onClick={onClose} className="text-sm underline">Close</button>
      </div>
    </div>
  );
}

/* =========================================================================
   Utilities
   ========================================================================= */
function toDraft(s) {
  return {
    id: String(s?.id ?? ""),
    name: s?.name ?? "",
    email: s?.email ?? "",
    phoneNumber: s?.phoneNumber ?? "",
    rating_avg: s?.rating_avg ?? "",
    app_version: s?.app_version ?? "",
    capacityPerDay: s?.capacityPerDay ?? "",
    activeJobsCount: s?.activeJobsCount ?? "",
    skills: s?.skills ?? "",
    createdAt: s?.createdAt ?? "",
    updatedAt: s?.updatedAt ?? "",
    city: s?.city ?? "",
    province: s?.province ?? "",
    country: s?.country ?? "",
    internal: !!s?.internal,
    status: s?.status ?? "",
  };
}

function coerceIntOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.valueOf())) return String(v);
  return d.toLocaleString();
}
