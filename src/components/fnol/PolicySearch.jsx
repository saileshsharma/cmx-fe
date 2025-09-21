import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLazyQuery } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import {
  POLICY_BY_LICENSE_PLATE,
  POLICIES_BY_LICENSE_PLATE,
  GET_POLICY_BY_NUMBER
} from "../../graphql/policies";

/* ========= UI helpers ========= */
const normPlate = (s) => (s || "").toUpperCase().replace(/[\s-]/g, "");
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString() : "-");
const Status = ({ s }) => {
  const map = {
    IN_FORCE: "bg-green-600",
    BIND: "bg-blue-600",
    PAYMENT_DUE: "bg-amber-600",
    QUOTED: "bg-sky-600",
    CANCELLED: "bg-red-600",
    INVALID: "bg-gray-600",
    EXPIRED: "bg-stone-600",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-white text-xs ${map[s] || "bg-gray-500"}`}>
      {s || "-"}
    </span>
  );
};

function PolicySearch() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("policy"); // "policy" | "plate"
  const [policyInput, setPolicyInput] = useState("");
  const [plateInput, setPlateInput] = useState("");
  const [allMatches, setAllMatches] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [best, setBest] = useState(null);
  const [selectedPolicyNumber, setSelectedPolicyNumber] = useState(null); // <— NEW
  const inputRef = useRef(null);
  const tRef = useRef(null);

  const [fetchBest, { loading: loadingBest, error: errorBest }] = useLazyQuery(POLICY_BY_LICENSE_PLATE, {
    fetchPolicy: "no-cache",
    onCompleted: (d) => setBest(d?.policyByLicensePlate ?? null),
  });

  const [fetchAll] = useLazyQuery(POLICIES_BY_LICENSE_PLATE, {
    fetchPolicy: "no-cache",
    onCompleted: (d) => setAllMatches(d?.policiesByLicensePlate ?? []),
  });

  const [checkPolicy, { loading: loadingPolicy, error: errPolicy }] = useLazyQuery(GET_POLICY_BY_NUMBER, {
    fetchPolicy: "no-cache",
    onCompleted: (d) => {
      if (d?.getPolicyByNumber?.policyNumber) {
        navigate(`/policy/${encodeURIComponent(d.getPolicyByNumber.policyNumber)}`);
      }
    },
  });

  /* keyboard '/' focus */
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

  // keep radio selection aligned with results
  useEffect(() => {
    if (allMatches?.length) setSelectedPolicyNumber(allMatches[0]?.policyNumber ?? null);
    else if (best?.policyNumber) setSelectedPolicyNumber(best.policyNumber);
    else setSelectedPolicyNumber(null);
  }, [allMatches, best]);

  const triggerBest = useCallback(
    (plate) => {
      if (normPlate(plate).length < 3) {
        setBest(null);
        return;
      }
      fetchBest({ variables: { plate: normPlate(plate) } });
    },
    [fetchBest]
  );

  const onPlateChange = (e) => {
    const v = e.target.value;
    setPlateInput(v);
    if (tRef.current) window.clearTimeout(tRef.current);
    if (normPlate(v).length >= 3) {
      tRef.current = window.setTimeout(() => triggerBest(v), 400);
    } else {
      setBest(null);
      setAllMatches([]);
    }
  };

  const submitPolicy = (e) => {
    e.preventDefault();
    const n = (policyInput || "").toUpperCase().replace(/\s+/g, "");
    if (!n) return;
    checkPolicy({ variables: { policyNumber: n } });
  };

  const submitPlate = (e) => {
    e.preventDefault();
    const cleaned = normPlate(plateInput);
    if (cleaned.length < 3) return;
    if (best?.policyNumber) {
      navigate(`/policy/${encodeURIComponent(best.policyNumber)}`);
    } else {
      fetchBest({
        variables: { plate: cleaned },
        onCompleted: (d) => {
          const b = d?.policyByLicensePlate;
          if (b?.policyNumber) navigate(`/policy/${encodeURIComponent(b.policyNumber)}`);
        },
      });
    }
  };

  const showAll = () => {
    const cleaned = normPlate(plateInput);
    if (cleaned.length < 3) return;
    setLoadingAll(true);
    fetchAll({ variables: { plate: cleaned, includeInactive: true } }).finally(() => setLoadingAll(false));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b bg-white/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Policy Search</h1>
          <p className="text-sm text-gray-600">
            Search by Policy Number or License Plate. Press <kbd>/</kbd> to focus.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Mode toggle */}
        <div className="inline-flex rounded-xl border bg-white p-1 shadow-sm">
          {[
            { id: "policy", label: "Policy Number" },
            { id: "plate", label: "License Plate" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`px-4 py-2 rounded-lg text-sm ${
                mode === m.id ? "bg-indigo-600 text-white" : "text-gray-800"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Inputs */}
        {mode === "policy" ? (
          <form onSubmit={submitPolicy} className="max-w-xl">
            <label className="block text-sm font-medium mb-1">Policy Number</label>
            <div className="relative">
              <input
                ref={inputRef}
                value={policyInput}
                onChange={(e) => setPolicyInput(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                placeholder="Enter Policy #"
                className="w-full rounded-xl border px-3 py-3 focus:outline-none focus:ring-2 ring-indigo-500/30 tracking-widest"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg bg-indigo-600 text-white"
                disabled={!policyInput || loadingPolicy}
              >
                {loadingPolicy ? "Checking…" : "View"}
              </button>
            </div>
            {errPolicy && <p className="mt-2 text-sm text-red-600">{errPolicy.message}</p>}
          </form>
        ) : (
          <>
            <form onSubmit={submitPlate} className="max-w-xl">
              <label className="block text-sm font-medium mb-1">License Plate</label>
              <div className="relative">
                <input
                  ref={inputRef}
                  value={plateInput}
                  onChange={onPlateChange}
                  placeholder="e.g., SGP1234A"
                  className="w-full rounded-xl border px-3 py-3 focus:outline-none focus:ring-2 ring-indigo-500/30"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
                  <button type="button" onClick={showAll} className="px-3 py-1.5 rounded-lg border bg-white">
                    {loadingAll ? "Loading…" : "View All"}
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white">
                    {loadingBest ? "Looking…" : "Open Best"}
                  </button>
                </div>
              </div>
              {errorBest && <p className="mt-2 text-sm text-red-600">{errorBest.message}</p>}
            </form>

            {/* Best match (selectable) */}
            {best && (
              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="policyPick"
                    className="mt-1 accent-indigo-600"
                    checked={selectedPolicyNumber === best.policyNumber}
                    onChange={() => setSelectedPolicyNumber(best.policyNumber)}
                  />
                  <div className="flex-1">
                    <div className="text-sm">
                      Best match: <span className="font-semibold">{best.policyNumber}</span> • {best.insuredName}
                    </div>
                    <div className="text-xs text-gray-500">
                      Plate {best.registrationNumber} • {fmtDate(best.startDate)} → {fmtDate(best.endDate)}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/policy/${best.policyNumber}`)}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg"
                  >
                    Open
                  </button>
                </label>
              </div>
            )}

            {/* All matches as radio group */}
            {allMatches.length > 0 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (selectedPolicyNumber) navigate(`/policy/${encodeURIComponent(selectedPolicyNumber)}`);
                }}
                className="rounded-2xl border bg-white p-4 shadow-sm"
              >
                <div className="text-sm font-semibold mb-3">
                  Matching Policies ({allMatches.length})
                </div>

                <fieldset className="space-y-2" role="radiogroup" aria-label="Matching policies">
                  {allMatches.map((p) => {
                    const id = `pol-${p.policyNumber}`;
                    const checked = selectedPolicyNumber === p.policyNumber;
                    return (
                      <label
                        key={p.policyNumber}
                        htmlFor={id}
                        className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                          checked ? "border-indigo-500 ring-2 ring-indigo-200" : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          id={id}
                          type="radio"
                          name="policyPick"
                          className="mt-1 accent-indigo-600"
                          checked={checked}
                          onChange={() => setSelectedPolicyNumber(p.policyNumber)}
                          value={p.policyNumber}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-slate-900 flex items-center gap-2">
                            {p.policyNumber} <Status s={p.policyStatus} />
                          </div>
                          <div className="text-xs text-slate-600">
                            {p.insuredName} • Plate {p.registrationNumber} • {fmtDate(p.startDate)} → {fmtDate(p.endDate)}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </fieldset>

                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPolicyNumber(null)}
                    className="px-3 py-1.5 rounded-lg border bg-white"
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedPolicyNumber}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white disabled:opacity-50"
                  >
                    Open Selected
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default PolicySearch;
