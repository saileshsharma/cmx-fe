// src/pages/PolicyLookup.jsx
/* global navigator */
import React, { useState, useEffect, useMemo, useRef } from "react";
import { gql, useLazyQuery } from "@apollo/client";
import { useNavigate } from "react-router-dom";

/* =============================================================================
   ✨ Fresh Visual Design Tokens
   - Sleek gradient header, airy cards, soft shadows, rounded-2xl corners
   - Tight, legible typography and subtle separators
   ============================================================================= */
const THEME = {
  brand: {
    primary: "indigo-600",
    ring: "ring-indigo-500/40",
    gradFrom: "from-indigo-600",
    gradVia: "via-violet-500",
    gradTo: "to-fuchsia-500",
  },
  card: "rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow transition-shadow",
  kpi: "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm",
  tabActive:
    "bg-indigo-600 text-white border-indigo-600 shadow-sm",
  tabIdle:
    "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
};

/* Thin gradient header strip */
const AccentBar = () => (
  <div className={`h-1 -mt-5 -mx-5 mb-4 rounded-t-2xl bg-gradient-to-r ${THEME.brand.gradFrom} ${THEME.brand.gradVia} ${THEME.brand.gradTo}`} />
);

/* Generic section card with header */
const SectionCard = ({ title, right, children, tight = false }) => (
  <section className={`${THEME.card} ${tight ? "p-4" : "p-5"}`}>
    <AccentBar />
    <div className="flex items-start justify-between gap-3">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {right}
    </div>
    <div className="mt-4">{children}</div>
  </section>
);

/* =============================================================================
   GraphQL
   ============================================================================= */
const GET_POLICY_BY_NUMBER = gql`
  query GetPolicyByNumber($policyNumber: String!) {
    getPolicyByNumber(policyNumber: $policyNumber) {
      id
      policyNumber
      policyType
      policyStatus
      startDate
      endDate
      

      sumInsured
      premium

      insured {
        firstName
        lastName
        dob
        gender
        nationalId
        passportNumber
        email
        phoneNumber
        addressLine1
        addressLine2
        city
        province
        postalCode
        country
        driverLicenseNo
        licenseIssueDate
        licenseExpiryDate
        occupation
        maritalStatus
        yearsDriving
      }
      vehicle {
        registrationNumber
        chassis   
        make
        model
        year
        vin
        color
        bodyType
        engineNo
        fuelType
        usageType
        ownerName
        ownerContact
        registrationState
      }
      claims {
        id
        claimNumber
        claimStatus
        claimAmount
        incidentDate
        dateReported
        claimSeverity
      }
    }
  }
`;

/* =============================================================================
   UI helpers
   ============================================================================= */
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString() : "-");
const fmtDateISOBasic = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.valueOf())) return "";
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
};
const fmtNum = (n) => (n == null || Number.isNaN(Number(n)) ? "-" : Number(n).toLocaleString());
const fmtMoney = (n, currency = "SGD", locale = "en-SG") =>
  n == null || Number.isNaN(Number(n))
    ? "-"
    : new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(n));

const insuredFullName = (insured) =>
  insured?.fullName || [insured?.firstName, insured?.lastName].filter(Boolean).join(" ").trim() || "-";

const formatAddress = (i) => {
  if (!i) return "-";
  const lines = [
    [i.addressLine1, i.addressLine2].filter(Boolean).join(", "),
    [i.city, i.province, i.postalCode].filter(Boolean).join(" "),
    i.country,
  ].filter(Boolean);
  return lines.join(" · ");
};

const badgeBg = {
  IN_FORCE: "bg-green-600",
  BIND: "bg-blue-600",
  PAYMENT_DUE: "bg-amber-600",
  QUOTED: "bg-sky-600",
  CANCELLED: "bg-red-600",
  INVALID: "bg-gray-600",
  EXPIRED: "bg-stone-600",
};
const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-white text-xs font-semibold shadow-sm ${badgeBg[status] || "bg-gray-500"}`}>
    <span className="inline-block w-2 h-2 rounded-full bg-white/90" />
    {status || "-"}
  </span>
);

const ClaimStatusChip = ({ status }) => {
  const map = {
    REGISTERED: "bg-gray-100 text-gray-800",
    UNDER_REVIEW: "bg-sky-100 text-sky-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
    PAID: "bg-emerald-100 text-emerald-800",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || "bg-gray-100 text-gray-800"}`}>{status || "-"}</span>;
};

const SeverityChip = ({ level }) => {
  const map = {
    High: "bg-red-100 text-red-800",
    Medium: "bg-amber-100 text-amber-800",
    Low: "bg-green-100 text-green-800",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[level] || "bg-gray-100 text-gray-800"}`}>{level || "-"}</span>;
};

const Chip = ({ children }) => (
  <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-gray-50 text-gray-800 border border-gray-200">
    {children}
  </span>
);

const KeyVal = ({ label, value, mono = false, wide = false }) => (
  <div className={wide ? "sm:col-span-2" : ""}>
    <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
    <div className={`text-sm font-medium text-gray-900 ${mono ? "font-mono tabular-nums" : ""}`}>{value ?? "-"}</div>
  </div>
);

const CopyBtn = ({ text, label = "Copy" }) => {
  const [copied, setCopied] = useState(false);
  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(text || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    } catch {}
  };
  return (
    <button
      type="button"
      onClick={doCopy}
      className={`ml-2 text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 focus:outline-none focus-visible:${THEME.brand.ring}`}
      title={`Copy ${label}`}
    >
      {copied ? "✓" : label}
    </button>
  );
};

const VehicleLine = ({ v }) => {
  if (!v) return <span className="text-gray-500">No vehicle linked.</span>;
  const reg = v.registrationNumber;
  const makeModel = [v.make, v.model].filter(Boolean).join(" ");
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-900 font-medium mb-2">
      <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400" aria-hidden="true">
        <path d="M3 13l2.5-6A2 2 0 0 1 7.4 5h9.2a2 2 0 0 1 1.9 1.3L21 13v5h-2a2 2 0 1 1-4 0H9a2 2 0 1 1-4 0H3v-5zm3.5 0h11l-1.8-4.3a1 1 0 0 0-.9-.7H8.2a1 1 0 0 0-.9.7L6.5 13z" fill="currentColor" />
      </svg>
      {reg && <span className="px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-xs font-mono">{reg}</span>}
      {makeModel && <span className="truncate max-w-[12rem] sm:max-w-none" title={makeModel}>{makeModel}</span>}
      {v.year && <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[11px]">{v.year}</span>}
    </div>
  );
};

const MiniInsuredStrip = ({ insured }) => {
  if (!insured) return null;
  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5Z" fill="currentColor" />
          </svg>
          <span className="font-medium text-gray-900">{insuredFullName(insured)}</span>
        </div>

        {insured.phoneNumber && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6.6 10.2c1.3 2.5 3.3 4.5 5.8 5.8l2-2c.3-.3.8-.4 1.2-.3 1 .3 2 .5 3 .5.7 0 1.2.5 1.2 1.2V19c0 .7-.5 1.2-1.2 1.2C11.8 20.2 3.8 12.2 3.8 2.6 3.8 1.9 4.3 1.4 5 1.4h3.6c.7 0 1.2.5 1.2 1.2 0 1 .2 2 .5 3 .1.4 0 .9-.3 1.2l-2 2Z" fill="currentColor" />
            </svg>
            <a href={`tel:${insured.phoneNumber}`} className="text-indigo-600 hover:underline">
              {insured.phoneNumber}
            </a>
          </div>
        )}

        {insured.email && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M20 4H4a2 2 0 0 0-2 2v.4l10 6.1 10-6.1V6a2 2 0 0 0-2-2Zm0 4.3-8.6 5.2a1 1 0 0 1-1 0L2 8.3V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8.3Z" fill="currentColor" />
            </svg>
            <a href={`mailto:${insured.email}`} className="text-indigo-600 hover:underline">
              {insured.email}
            </a>
          </div>
        )}

        {(insured.addressLine1 || insured.city || insured.country) && (
          <div className="flex items-center gap-2 min-w-full sm:min-w-0 sm:flex-none sm:ml-auto">
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" fill="currentColor" />
            </svg>
            <span className="text-gray-700">{formatAddress(insured)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

/* vCard builder & downloader */
const buildVCard = (i) => {
  if (!i) return "";
  const first = (i.firstName || "").replace(/\n|\r/g, " ").trim();
  const last = (i.lastName || "").replace(/\n|\r/g, " ").trim();
  const full = insuredFullName(i).replace(/\n|\r/g, " ").trim();
  const email = (i.email || "").trim();
  const tel = (i.phoneNumber || "").trim();
  const adrParts = [
    "",
    "",
    [i.addressLine1, i.addressLine2].filter(Boolean).join(" ").trim(),
    (i.city || "").trim(),
    (i.province || "").trim(),
    (i.postalCode || "").trim(),
    (i.country || "").trim(),
  ];
  const bday = fmtDateISOBasic(i.dob);
  const noteLines = [
    i.nationalId ? `National ID: ${i.nationalId}` : "",
    i.passportNumber ? `Passport: ${i.passportNumber}` : "",
    i.driverLicenseNo ? `Driver License: ${i.driverLicenseNo}` : "",
    i.occupation ? `Occupation: ${i.occupation}` : "",
    i.maritalStatus ? `Marital: ${i.maritalStatus}` : "",
    Number.isFinite(Number(i.yearsDriving)) ? `Years Driving: ${i.yearsDriving}` : "",
  ].filter(Boolean);

  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${last};${first};;;`,
    `FN:${full}`,
    email ? `EMAIL;TYPE=INTERNET:${email}` : null,
    tel ? `TEL;TYPE=CELL:${tel}` : null,
    adrParts.join(";").trim().replace(/;+$/, "")
      ? `ADR;TYPE=HOME:;;${adrParts[2]};${adrParts[3]};${adrParts[4]};${adrParts[5]};${adrParts[6]}`
      : null,
    bday ? `BDAY:${bday}` : null,
    noteLines.length ? `NOTE:${noteLines.join(" \\n ")}` : null,
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\r\n");
};

const downloadVCard = (insured) => {
  const vcf = buildVCard(insured);
  if (!vcf) return;
  const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8" });
  const a = document.createElement("a");
  const full = insuredFullName(insured).replace(/[^a-z0-9_-]+/gi, "_") || "insured";
  a.href = URL.createObjectURL(blob);
  a.download = `${full}.vcf`;
  a.click();
  URL.revokeObjectURL(a.href);
};

/* =============================================================================
   Large Dialog
   ============================================================================= */
function PolicyDialog({ open, onClose, policy }) {
  const dialogRef = useRef(null);
  const closeBtnRef = useRef(null);

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

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && dialogRef.current) {
        const nodes = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const list = Array.from(nodes);
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !policy) return null;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="policy-dialog-title">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-3 md:left-1/2 md:-translate-x-1/2 md:w-[900px] top-10 md:top-16">
        <div ref={dialogRef} className="bg-white rounded-2xl border shadow-2xl overflow-hidden">
          <div className="px-5 py-3 border-b bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">Policy</div>
              <div className="text-base font-semibold text-gray-900" id="policy-dialog-title">
                {policy.policyNumber}
                <CopyBtn text={policy.policyNumber} label="Policy #" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={policy.policyStatus} />
              <button
                ref={closeBtnRef}
                onClick={onClose}
                className={`px-2 py-1 rounded-lg hover:bg-gray-100 focus:outline-none focus-visible:${THEME.brand.ring}`}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-5 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={THEME.kpi}>
                <div className="text-xs text-gray-500">Premium</div>
                <div className="text-xl font-semibold">{fmtMoney(policy.premium)}</div>
              </div>
              <div className={THEME.kpi}>
                <div className="text-xs text-gray-500">Sum Insured</div>
                <div className="text-xl font-semibold">{fmtMoney(policy.sumInsured)}</div>
              </div>
              <div className={THEME.kpi}>
                <div className="text-xs text-gray-500">Term</div>
                <div className="text-sm">{fmtDate(policy.startDate)} → {fmtDate(policy.endDate)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard title="Policy Details">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <KeyVal label="Policy #" value={<span className="flex items-center">{policy.policyNumber}<CopyBtn text={policy.policyNumber} /></span>} />
                  <KeyVal label="Status" value={<StatusBadge status={policy.policyStatus} />} />
                  <KeyVal label="Type" value={policy.policyType} />
                  <KeyVal label="Sum Insured" value={fmtMoney(policy.sumInsured)} />
                  <KeyVal label="Premium" value={fmtMoney(policy.premium)} />
                  <KeyVal label="Start Date" value={fmtDate(policy.startDate)} />
                  <KeyVal label="End Date" value={fmtDate(policy.endDate)} />
                  <KeyVal label="ID" value={policy.id} mono wide />
                </div>
              </SectionCard>

              <SectionCard title="Vehicle">
                {policy.vehicle ? (
                  <>
                    <VehicleLine v={policy.vehicle} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <KeyVal label="VIN" value={policy.vehicle.vin} mono />
                      <KeyVal label="Color" value={policy.vehicle.color} />
                      <KeyVal label="Body Type" value={policy.vehicle.bodyType} />
                      <KeyVal label="Year" value={policy.vehicle.year} />
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-500">No vehicle linked.</div>
                )}
              </SectionCard>
            </div>

            <SectionCard
              title="Insured Details"
              right={
                policy.insured ? (
                  <div className="flex gap-2">
                    <button
                      className={`px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 text-sm focus:outline-none focus-visible:${THEME.brand.ring}`}
                      onClick={() => navigator.clipboard.writeText(formatAddress(policy.insured))}
                    >
                      Copy Address
                    </button>
                    <button
                      className={`px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 text-sm focus:outline-none focus-visible:${THEME.brand.ring}`}
                      onClick={() => downloadVCard(policy.insured)}
                    >
                      Download vCard
                    </button>
                  </div>
                ) : null
              }
            >
              {policy.insured ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <KeyVal label="Full Name" value={insuredFullName(policy.insured)} />
                  <KeyVal label="Email" value={policy.insured.email} />
                  <KeyVal label="Phone" value={policy.insured.phoneNumber} />
                  <KeyVal label="Gender" value={policy.insured.gender} />
                  <KeyVal label="DOB" value={fmtDate(policy.insured.dob)} />
                  <KeyVal label="Marital Status" value={policy.insured.maritalStatus} />
                  <KeyVal label="Occupation" value={policy.insured.occupation} />
                  <KeyVal label="Years Driving" value={fmtNum(policy.insured.yearsDriving)} />
                  <KeyVal label="National ID" value={policy.insured.nationalId} mono />
                  <KeyVal label="Passport #" value={policy.insured.passportNumber} mono />
                  <KeyVal label="Driver License #" value={policy.insured.driverLicenseNo} mono />
                  <KeyVal label="License Issued" value={fmtDate(policy.insured.licenseIssueDate)} />
                  <KeyVal label="License Expiry" value={fmtDate(policy.insured.licenseExpiryDate)} />
                  <KeyVal label="Address" value={formatAddress(policy.insured)} wide />
                </div>
              ) : (
                <div className="text-sm text-gray-500">No insured linked.</div>
              )}
            </SectionCard>
          </div>

          <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-end gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(JSON.stringify(policy, null, 2))}
              className={`px-3 py-2 rounded-lg border bg-white hover:bg-gray-100 focus:outline-none focus-visible:${THEME.brand.ring}`}
            >
              Copy JSON
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   Page
   ============================================================================= */
export default function PolicyLookup() {
  const navigate = useNavigate();
  const [policyNumberInput, setPolicyNumberInput] = useState("");
  const [lastQueried, setLastQueried] = useState("");
  const [activeTab, setActiveTab] = useState("policy"); // policy | insured | vehicle | claims
  const [showDialog, setShowDialog] = useState(false);

  const [fetchPolicy, { data, loading, error, called }] = useLazyQuery(GET_POLICY_BY_NUMBER, {
    fetchPolicy: "network-only",
  });

  const handleLookup = (e) => {
    e.preventDefault();
    const policyNumber = (policyNumberInput || "").toUpperCase().replace(/\s+/g, "").trim();
    if (!policyNumber) return;
    setLastQueried(policyNumber);
    setActiveTab("policy");
    fetchPolicy({ variables: { policyNumber } });
  };

  const policy = data?.getPolicyByNumber ?? null;

  const goToFnol = () => {
    if (!policy) return;
    navigate("/register-fnol", {
      state: {
        policyId: policy.id,
        policyNumber: policy.policyNumber,
        policyType: policy.policyType,
        policyStatus: policy.policyStatus,
        startDate: policy.startDate,
        endDate: policy.endDate,
        insured: policy.insured ?? null,
        vehicle: policy.vehicle ?? null,
      },
    });
  };

  /* Keyboard shortcut: focus search (/) */
  const inputRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Top hero header */}
      <header className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-0 h-64 w-64 rounded-full bg-fuchsia-200/40 blur-3xl" />
        <div className="relative z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-gray-500">Policy Lookup</div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {policy?.policyNumber ? (
                    <span className="inline-flex items-center">
                      {policy.policyNumber}
                      <CopyBtn text={policy.policyNumber} label="Copy" />
                    </span>
                  ) : (
                    "Find a policy to view details"
                  )}
                </h1>
                {policy && <div className="mt-2">{policy.insured && <MiniInsuredStrip insured={policy.insured} />}</div>}
              </div>

              {/* Search box */}
              <form onSubmit={handleLookup} className="w-full md:w-[420px]">
                <div className="relative group">
                  <input
                    ref={inputRef}
                    type="text"
                    value={policyNumberInput}
                    onChange={(e) => setPolicyNumberInput(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                    placeholder="Enter Policy #  •  Press / to focus"
                    spellCheck={false}
                    autoCapitalize="characters"
                    className={`w-full pl-10 pr-28 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:${THEME.brand.ring} tracking-widest`}
                    required
                  />
                  <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" viewBox="0 0 24 24" fill="none">
                    <path d="M21 21l-4.3-4.3m1.3-5A7 7 0 1 1 7 5a7 7 0 0 1 11 6.7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                    disabled={loading}
                  >
                    {loading ? "Looking up…" : "Lookup"}
                  </button>
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded-lg">
                    {error.message}
                  </p>
                )}
                {called && !loading && !policy && !error && lastQueried && (
                  <p className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-lg">
                    No policy found for <span className="font-semibold">{lastQueried}</span>.
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-6xl w-full mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-44 rounded-2xl bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-[shimmer_1.1s_infinite]"
                style={{ backgroundSize: "400% 100%" }}
              />
            ))}
          </div>
        )}

        {/* Content */}
        {policy && !loading && (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={THEME.kpi}>
                <div className="text-xs text-gray-500">Sum Insured</div>
                <div className="text-xl font-semibold">{fmtMoney(policy.sumInsured)}</div>
              </div>
              <div className={THEME.kpi}>
                <div className="text-xs text-gray-500">Premium</div>
                <div className="text-xl font-semibold">{fmtMoney(policy.premium)}</div>
              </div>
              <div className={THEME.kpi}>
                <div className="text-xs text-gray-500">Term</div>
                <div className="text-sm">{fmtDate(policy.startDate)} → {fmtDate(policy.endDate)}</div>
              </div>
            </div>

            {/* Tabs */}
            <div role="tablist" aria-label="Policy tabs" className="flex flex-wrap gap-2">
              {[
                { id: "policy", label: "Policy" },
                { id: "insured", label: "Insured" },
                { id: "vehicle", label: "Vehicle" },
                { id: "claims", label: `Claims (${policy.claims?.length || 0})` },
              ].map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={activeTab === t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-3 py-2 rounded-xl text-sm border transition ${activeTab === t.id ? THEME.tabActive : THEME.tabIdle}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Panels */}
            {activeTab === "policy" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionCard title="Policy Overview" right={<StatusBadge status={policy.policyStatus} />}>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Chip>Type: {policy.policyType}</Chip>
                    <Chip>Start: {fmtDate(policy.startDate)}</Chip>
                    <Chip>End: {fmtDate(policy.endDate)}</Chip>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <span className="text-[11px] uppercase tracking-wide text-gray-500 mr-2">Policy #</span>
                      <span className="text-sm font-medium">{policy.policyNumber}</span>
                      <CopyBtn text={policy.policyNumber} />
                    </div>
                    <KeyVal label="ID" value={policy.id} mono />
                    <KeyVal label="Sum Insured" value={fmtMoney(policy.sumInsured)} />
                    <KeyVal label="Premium" value={fmtMoney(policy.premium)} />
                  </div>

                  {/* Action */}
                  <div className="mt-6">
                    {["IN_FORCE", "BIND"].includes(policy.policyStatus) ? (
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                        <div className="text-sm text-indigo-900 bg-indigo-50 border border-indigo-200 p-3 rounded-lg">
                          ✅ Policy status is <span className="font-semibold">{policy.policyStatus}</span>. FNOL creation is allowed.
                        </div>
                        
                      </div>
                    ) : (
                      <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">
                        ⚠️ FNOL is allowed only when status is <span className="font-semibold">BIND</span> or <span className="font-semibold">IN_FORCE</span>. Current: <span className="font-semibold">{policy.policyStatus || "-"}</span>.
                      </div>
                    )}
                  </div>
                </SectionCard>

                <SectionCard
                  title="Quick Peek"
                  right={
                    <button
                      type="button"
                      className={`px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 focus:outline-none focus-visible:${THEME.brand.ring}`}
                      onClick={() => setShowDialog(true)}
                      title="Open full-screen policy dialog"
                    >
                      View Details
                    </button>
                  }
                >
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800 mb-2">Insured (Summary)</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <KeyVal label="Name" value={insuredFullName(policy.insured)} />
                        <KeyVal label="Email" value={policy.insured?.email} />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800 mb-2">Vehicle (Summary)</h4>
                      {policy.vehicle ? (
                        <>
                          <VehicleLine v={policy.vehicle} />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <KeyVal label="VIN" value={policy.vehicle.vin} mono />
                            <KeyVal label="Fuel" value={policy.vehicle.fuelType} />
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">No vehicle linked.</p>
                      )}
                    </div>
                  </div>
                </SectionCard>
              </div>
            )}

            {activeTab === "insured" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionCard
                  title="Insured Details"
                  right={
                    policy.insured ? (
                      <div className="flex gap-2">
                        <button
                          className={`px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 text-sm focus:outline-none focus-visible:${THEME.brand.ring}`}
                          onClick={() => navigator.clipboard.writeText(formatAddress(policy.insured))}
                        >
                          Copy Address
                        </button>
                        <button
                          className={`px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 text-sm focus:outline-none focus-visible:${THEME.brand.ring}`}
                          onClick={() => downloadVCard(policy.insured)}
                        >
                          Download vCard
                        </button>
                      </div>
                    ) : null
                  }
                >
                  {policy.insured ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <KeyVal label="Full Name" value={insuredFullName(policy.insured)} />
                      <KeyVal label="Email" value={policy.insured.email} />
                      <KeyVal label="Phone" value={policy.insured.phoneNumber} />
                      <KeyVal label="Gender" value={policy.insured.gender} />
                      <KeyVal label="DOB" value={fmtDate(policy.insured.dob)} />
                      <KeyVal label="Marital Status" value={policy.insured.maritalStatus} />
                      <KeyVal label="Occupation" value={policy.insured.occupation} />
                      <KeyVal label="Years Driving" value={fmtNum(policy.insured.yearsDriving)} />
                      <KeyVal label="National ID" value={policy.insured.nationalId} mono />
                      <KeyVal label="Passport #" value={policy.insured.passportNumber} mono />
                      <KeyVal label="Driver License #" value={policy.insured.driverLicenseNo} mono />
                      <KeyVal label="License Issued" value={fmtDate(policy.insured.licenseIssueDate)} />
                      <KeyVal label="License Expiry" value={fmtDate(policy.insured.licenseExpiryDate)} />
                    </div>
                  ) : (
                    <p className="text-gray-500">No insured linked.</p>
                  )}
                </SectionCard>

                <SectionCard title="Address">
                  {policy.insured ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <KeyVal label="Address Line 1" value={policy.insured.addressLine1} wide />
                      <KeyVal label="Address Line 2" value={policy.insured.addressLine2} wide />
                      <KeyVal label="City" value={policy.insured.city} />
                      <KeyVal label="Province" value={policy.insured.province} />
                      <KeyVal label="Postal Code" value={policy.insured.postalCode} />
                      <KeyVal label="Country" value={policy.insured.country} />
                      <KeyVal label="Formatted" value={formatAddress(policy.insured)} wide />
                    </div>
                  ) : (
                    <p className="text-gray-500">—</p>
                  )}
                </SectionCard>
              </div>
            )}

            {activeTab === "vehicle" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionCard title="Vehicle Details">
                  {policy.vehicle ? (
                    <>
                      <VehicleLine v={policy.vehicle} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <KeyVal label="VIN" value={policy.vehicle.vin} mono />
                        <KeyVal label="Color" value={policy.vehicle.color} />
                        <KeyVal label="Body Type" value={policy.vehicle.bodyType} />
                        <KeyVal label="Engine No" value={policy.vehicle.engineNo} />
                        <KeyVal label="Fuel Type" value={policy.vehicle.fuelType} />
                        <KeyVal label="Usage Type" value={policy.vehicle.usageType} />
                        <KeyVal label="Owner Name" value={policy.vehicle.ownerName} />
                        <KeyVal label="Owner Contact" value={policy.vehicle.ownerContact} />
                        <KeyVal label="Registration State" value={policy.vehicle.registrationState} wide />
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-500">No vehicle linked.</p>
                  )}
                </SectionCard>

                <SectionCard title="Attachments (Coming Soon)">
                  <p className="text-gray-500 text-sm">Add photos or docs here later.</p>
                </SectionCard>
              </div>
            )}

            {activeTab === "claims" && (
              <div className="grid grid-cols-1 gap-6">
                <SectionCard title="Claims">
                  {policy.claims?.length ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-600 border-b">
                            <th className="py-2 pr-4">Claim #</th>
                            <th className="py-2 pr-4">Status</th>
                            <th className="py-2 pr-4">Severity</th>
                            <th className="py-2 pr-4">Amount</th>
                            <th className="py-2 pr-4">Incident</th>
                            <th className="py-2 pr-4">Reported</th>
                            <th className="py-2 pr-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {policy.claims.map((c) => (
                            <tr key={c.id} className="border-b last:border-0">
                              <td className="py-2 pr-4 font-medium text-gray-900">{c.claimNumber || "-"}</td>
                              <td className="py-2 pr-4"><ClaimStatusChip status={c.claimStatus} /></td>
                              <td className="py-2 pr-4"><SeverityChip level={c.claimSeverity} /></td>
                              <td className="py-2 pr-4 tabular-nums">{fmtMoney(c.claimAmount)}</td>
                              <td className="py-2 pr-4">{fmtDate(c.incidentDate)}</td>
                              <td className="py-2 pr-4">{fmtDate(c.dateReported)}</td>
                              <td className="py-2 pr-4">{c.claimNumber && <CopyBtn text={c.claimNumber} label="Copy #" />}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500">No claims linked to this policy.</p>
                  )}
                </SectionCard>
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating sticky action (CTA) */}
      {policy && !loading && (
        <div className="sticky bottom-3 z-20">
          <div className="max-w-6xl mx-auto px-4">
            <div className="rounded-2xl border bg-white/95 backdrop-blur shadow-lg p-3 flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
              <div className="flex-1 text-sm text-gray-700">
                Ready to create FNOL for <span className="font-semibold">{policy.policyNumber}</span>? &nbsp;
                <span className="text-gray-500">Status: </span>
                <StatusBadge status={policy.policyStatus} />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDialog(true)}
                  className={`px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 focus:outline-none focus-visible:${THEME.brand.ring}`}
                >
                  Review Details
                </button>
                <button
                  onClick={goToFnol}
                  disabled={!["IN_FORCE", "BIND"].includes(policy.policyStatus)}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  Proceed to FNOL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <PolicyDialog open={showDialog} onClose={() => setShowDialog(false)} policy={policy} />
    </div>
  );
}
