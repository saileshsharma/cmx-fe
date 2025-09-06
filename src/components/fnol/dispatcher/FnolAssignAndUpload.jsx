// src/components/fnol/FnolAssignAndUpload.jsx
/* eslint-disable no-console */

/* =============================================================================
   React + Apollo
   ============================================================================= */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { gql, useLazyQuery, useMutation, useSubscription } from "@apollo/client";
import { useNavigate, useParams } from "react-router-dom";

/* =============================================================================
   🎨 Theme
   ============================================================================= */
const PALETTE = {
  primary: "#5B6CFF",
  primaryDark: "#3A46D4",
  accent: "#8B5CF6",
  pink: "#EC4899",
  ink: "#334155",
};
const cssVars = {
  "--brand-primary": PALETTE.primary,
  "--brand-primary-dark": PALETTE.primaryDark,
  "--brand-accent": PALETTE.accent,
  "--brand-pink": PALETTE.pink,
  "--brand-ink": PALETTE.ink,
};

/* =============================================================================
   Uploader Config
   ============================================================================= */
const UPLOADER_URL = import.meta.env.VITE_UPLOADER_URL || "http://localhost:8081";
const UPLOADER_FIELD = import.meta.env.VITE_UPLOADER_FIELD || "file";
const SHOULD_ATTACH = String(import.meta.env.VITE_ATTACH_MEDIA || "1") === "1";

/* =============================================================================
   GraphQL: Queries / Mutations / Subscriptions
   Adjust names/fields if your schema differs.
   ============================================================================= */

// Minimal FNOL details needed for this page
const GET_FNOL_BY_REFERENCE = gql`
  query GetFnolByReference($fnolReferenceNo: String!) {
    getFnolByReference(fnolReferenceNo: $fnolReferenceNo) {
      id
      fnolReferenceNo
      policyNumber
      registrationNumber
      severity
      description
      accidentDate
      status
      assignedSurveyor {
        id
        name
        phone
        status
      }
      createdAt
    }
  }
`;

// Trigger assignment (e.g., dispatcher logic kicks in server-side)
const ASSIGN_SURVEYOR = gql`
  mutation AssignSurveyor($fnolReferenceNo: String!) {
    assignSurveyor(fnolReferenceNo: $fnolReferenceNo) {
      id
      fnolReferenceNo
      status
      assignedSurveyor {
        id
        name
        phone
        status
      }
      message
    }
  }
`;

// Live updates during assignment workflow
const FNOL_ASSIGNMENT_NOTICE = gql`
  subscription FnolAssignmentNotice($fnolReferenceNo: String!) {
    fnolAssignmentNotice(fnolReferenceNo: $fnolReferenceNo) {
      fnolReferenceNo
      status
      message
      timestamp
    }
  }
`;

/* =============================================================================
   Small UI helpers
   ============================================================================= */
function Badge({ tone = "slate", children }) {
  const toneMap = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-100 text-blue-700",
    violet: "bg-violet-100 text-violet-700",
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-700",
    red: "bg-red-100 text-red-700",
    pink: "bg-pink-100 text-pink-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneMap[tone] || toneMap.slate}`}>
      {children}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <div className="grid grid-cols-12 gap-3 items-start py-2">
      <div className="col-span-4 md:col-span-3 text-sm text-slate-500">{label}</div>
      <div className="col-span-8 md:col-span-9">{children}</div>
    </div>
  );
}

function Section({ title, children, right = null }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/* =============================================================================
   Main Component
   ============================================================================= */
export default function FnolAssignAndUpload() {
  const navigate = useNavigate();
  const { fnolReferenceNo: refFromRoute } = useParams(); // support route: /fnol/:fnolReferenceNo
  const fileInputRef = useRef(null);

  // Apply theme tokens to :root
  useEffect(() => {
    Object.entries(cssVars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
    return () => {
      Object.keys(cssVars).forEach((k) => document.documentElement.style.removeProperty(k));
    };
  }, []);

  // Local UI state
  const [noticeLog, setNoticeLog] = useState([]); // subscription messages
  const [uploading, setUploading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Resolve the FNOL reference to use (route param preferred; else optional query string ?ref=)
  const resolvedRef = useMemo(() => {
    if (refFromRoute && String(refFromRoute).trim().length > 0) return String(refFromRoute).trim();
    const sp = new URLSearchParams(window.location.search);
    const qref = sp.get("ref");
    return qref ? String(qref).trim() : "";
  }, [refFromRoute]);

  // Fetch FNOL details
  const [loadFnol, { data, loading, error, refetch }] = useLazyQuery(GET_FNOL_BY_REFERENCE, {
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    if (resolvedRef) {
      loadFnol({ variables: { fnolReferenceNo: resolvedRef } });
    }
  }, [resolvedRef, loadFnol]);

  const fnol = data?.getFnolByReference || null;

  // Subscription for live assignment updates
  useSubscription(FNOL_ASSIGNMENT_NOTICE, {
    variables: { fnolReferenceNo: resolvedRef || "" },
    skip: !resolvedRef,
    onData: ({ data }) => {
      const payload = data?.data?.fnolAssignmentNotice;
      if (!payload) return;
      setNoticeLog((prev) => [
        {
          ts: payload.timestamp || new Date().toISOString(),
          status: payload.status,
          message: payload.message || "",
        },
        ...prev,
      ]);
    },
  });

  // Mutation: Assign Surveyor
  const [mutateAssign] = useMutation(ASSIGN_SURVEYOR);

  async function onAssignSurveyor() {
    if (!resolvedRef) return;
    try {
      setAssigning(true);
      const res = await mutateAssign({ variables: { fnolReferenceNo: resolvedRef } });
      const msg = res?.data?.assignSurveyor?.message || "Assignment triggered.";
      setNoticeLog((prev) => [
        { ts: new Date().toISOString(), status: res?.data?.assignSurveyor?.status || "PENDING", message: msg },
        ...prev,
      ]);
      // Refresh FNOL block to reflect assignedSurveyor if immediately set
      await refetch?.();
    } catch (e) {
      console.error("[assignSurveyor] failed:", e);
      setNoticeLog((prev) => [
        { ts: new Date().toISOString(), status: "ERROR", message: e?.message || "Failed to assign surveyor." },
        ...prev,
      ]);
    } finally {
      setAssigning(false);
    }
  }

  /* -----------------------------------------------------------------------------
     Uploader (images → cmx-uploader)
     - Prefer business ref; fall back to id
     - Endpoint:  {UPLOADER_URL}/api/fnol/{fnolRef}/images
     ---------------------------------------------------------------------------*/
  const uploaderUrl = useMemo(() => {
    if (!fnol) return null;
    const fnolRef = (fnol?.fnolReferenceNo || fnol?.id) ? String(fnol.fnolReferenceNo || fnol.id) : null;
    const base = String(UPLOADER_URL || "").replace(/\/+$/, "");
    const url = fnolRef ? `${base}/api/fnol/${encodeURIComponent(fnolRef)}/images` : null;
    console.debug("[uploader] POST", url, "ref=", fnolRef);
    return url;
  }, [fnol]);

  async function onUploadImages(e) {
    e.preventDefault();
    if (!uploaderUrl) return;
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) {
      alert("Please choose one or more image files.");
      return;
    }
    try {
      setUploading(true);
      const fd = new FormData();
      // Support multiple files by appending the same field multiple times
      [...files].forEach((f) => fd.append(UPLOADER_FIELD, f));

      const resp = await fetch(uploaderUrl, {
        method: "POST",
        body: fd,
        // If your uploader needs credentials for dev:
        // credentials: "include",
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(`Upload failed (${resp.status}). ${txt}`);
      }

      const json = await resp.json().catch(() => ({}));
      console.log("[uploader] response:", json);
      alert("Upload successful.");
      fileInputRef.current.value = ""; // reset
    } catch (err) {
      console.error("[uploader] error:", err);
      alert(err?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  /* =============================================================================
     Render
     ============================================================================= */
  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-800">
            FNOL – Assign Surveyor & Upload
          </h1>
          <p className="text-sm text-slate-500">
            Reference: <span className="font-mono">{resolvedRef || "–"}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch?.()}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            title="Refresh FNOL"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Back
          </button>
        </div>
      </div>

      {/* FNOL block */}
      <Section
        title="FNOL Details"
        right={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAssignSurveyor}
              disabled={!resolvedRef || assigning}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-primary-dark)] disabled:opacity-50"
            >
              {assigning ? (
                <svg aria-hidden="true" className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.3" />
                  <path d="M12 2 a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" fill="none" />
                </svg>
              ) : null}
              Assign Surveyor
            </button>
          </div>
        }
      >
        {loading && <div className="text-sm text-slate-500">Loading FNOL…</div>}
        {error && (
          <div className="text-sm text-red-600">
            Failed to load FNOL. {error.message}
          </div>
        )}
        {!loading && !error && !fnol && (
          <div className="text-sm text-slate-500">No FNOL found for this reference.</div>
        )}
        {fnol && (
          <div className="space-y-2">
            <Field label="Reference">
              <span className="font-mono text-sm">{fnol.fnolReferenceNo}</span>
            </Field>
            <Field label="Policy">
              <span className="font-mono text-sm">{fnol.policyNumber}</span>
            </Field>
            <Field label="Registration">
              <span className="font-mono text-sm">{fnol.registrationNumber}</span>
            </Field>
            <Field label="Severity">
              <Badge tone="red">{fnol.severity}</Badge>
            </Field>
            <Field label="Accident Date">
              <span className="text-sm">{fnol.accidentDate}</span>
            </Field>
            <Field label="Status">
              <Badge tone="blue">{fnol.status}</Badge>
            </Field>
            <Field label="Assigned Surveyor">
              {fnol.assignedSurveyor ? (
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{fnol.assignedSurveyor.name}</span>
                  <span className="text-xs text-slate-500">Phone: {fnol.assignedSurveyor.phone}</span>
                  <div className="mt-1">
                    <Badge tone="green">{fnol.assignedSurveyor.status}</Badge>
                  </div>
                </div>
              ) : (
                <span className="text-sm text-slate-500">Not assigned</span>
              )}
            </Field>
          </div>
        )}
      </Section>

      {/* Uploader */}
      {SHOULD_ATTACH && (
        <Section title="Attach Images">
          <form onSubmit={onUploadImages} className="space-y-3">
            <div className="text-xs text-slate-500">
              Endpoint:&nbsp;
              <code className="font-mono">{uploaderUrl || "(waiting for FNOL…)"}</code>
            </div>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-200"
                disabled={!uploaderUrl || uploading}
              />
              <button
                type="submit"
                disabled={!uploaderUrl || uploading}
                className="rounded-xl bg-[var(--brand-accent)] px-3 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Upload"}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              You can select multiple images. Files are posted as <code className="font-mono">{UPLOADER_FIELD}</code>.
            </p>
          </form>
        </Section>
      )}

      {/* Live assignment feed */}
      <Section title="Assignment Activity (Live)">
        {noticeLog.length === 0 ? (
          <div className="text-sm text-slate-500">No activity yet.</div>
        ) : (
          <ul className="space-y-2">
            {noticeLog.map((n, idx) => (
              <li key={`${n.ts}-${idx}`} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <Badge tone={n.status === "ERROR" ? "red" : n.status === "ASSIGNED" ? "green" : "yellow"}>
                    {n.status}
                  </Badge>
                  <span className="text-xs text-slate-400 font-mono">{n.ts}</span>
                </div>
                {n.message ? <p className="mt-1 text-sm text-slate-700">{n.message}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
