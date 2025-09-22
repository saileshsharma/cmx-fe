import React, { useMemo } from "react";
import { useQuery } from "@apollo/client";
import { useNavigate, useParams } from "react-router-dom";
import { GET_POLICY_BY_NUMBER } from "../../graphql/policies";


const fmtDate = (v) => (v ? new Date(v).toLocaleDateString() : "-");
const money = (n) => (n == null ? "-" : new Intl.NumberFormat("en-SG", { style: "currency", currency: "SGD" }).format(Number(n)));
const fullName = (i) => [i?.firstName, i?.lastName].filter(Boolean).join(" ").trim() || "-";
const normStatus = (s) => String(s || "").trim().toUpperCase().replace(/\s+/g, "_");
const canFnol = (s) => {
  const v = normStatus(s);
  return v === "IN_FORCE" || v === "BIND";
};

function PolicyDetails() {
  const { policyNumber } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(GET_POLICY_BY_NUMBER, { variables: { policyNumber } });
  const policy = data?.getPolicyByNumber ?? null;

  const eligible = useMemo(() => canFnol(policy?.policyStatus), [policy?.policyStatus]);

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

  if (loading) return <p className="p-6">Loading…</p>;
  if (error) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!policy) return <p className="p-6">Policy not found.</p>;

  const statusNorm = normStatus(policy.policyStatus);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Policy {policy.policyNumber}</h1>
        <button onClick={() => navigate("/search")} className="px-3 py-1.5 border rounded-lg">← Back</button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border p-3"><div className="text-xs">Sum Insured</div><div className="font-semibold">{money(policy.sumInsured)}</div></div>
        <div className="rounded-xl border p-3"><div className="text-xs">Premium</div><div className="font-semibold">{money(policy.premium)}</div></div>
        <div className="rounded-xl border p-3"><div className="text-xs">Term</div><div>{fmtDate(policy.startDate)} → {fmtDate(policy.endDate)}</div></div>
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="font-semibold mb-2">Insured</h2>
        {policy.insured ? (
          <div>{fullName(policy.insured)} • {policy.insured.email || "-"} • {policy.insured.phoneNumber || "-"}</div>
        ) : <p className="text-sm text-gray-500">—</p>}
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="font-semibold mb-2">Vehicle</h2>
        {policy.vehicle ? (
          <div>{policy.vehicle.registrationNumber} • {policy.vehicle.make} {policy.vehicle.model} ({policy.vehicle.year})</div>
        ) : <p className="text-sm text-gray-500">—</p>}
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-3 bg-white border rounded-xl p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <span>Status: {statusNorm || "—"}</span>
        <button
          onClick={goToFnol}
          disabled={!eligible}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
        >
          Proceed to FNOL
        </button>
      </div>
    </div>
  );
}

export default PolicyDetails;
