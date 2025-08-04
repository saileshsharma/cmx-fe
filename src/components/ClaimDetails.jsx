import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { GET_CLAIM_BY_ID, UPDATE_CLAIM } from "../graphql/claims";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ✅ Currency Formatter
const formatCurrencyTHB = (amount) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);

export default function ClaimDetail() {
  const { claimID } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const mode = new URLSearchParams(location.search).get("mode"); // view | edit

  const { loading, error, data } = useQuery(GET_CLAIM_BY_ID, { variables: { claimID } });
  const [updateClaim, { loading: updating }] = useMutation(UPDATE_CLAIM);

  const [claimStatus, setClaimStatus] = useState("");
  const [claimAmount, setClaimAmount] = useState("");

  useEffect(() => {
    if (data?.claimById) {
      setClaimStatus(data.claimById.claimStatus);
      setClaimAmount(data.claimById.claimAmount);
    }
  }, [data]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await updateClaim({
        variables: {
          claimID,
          claimStatus,
          claimAmount: parseFloat(claimAmount),
        },
      });
      toast.success("✅ Claim updated successfully!");
      setTimeout(() => navigate("/claims-dashboard"), 1500); // ✅ Redirect to dashboard
    } catch {
      toast.error("❌ Failed to update claim.");
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="bg-white p-6 rounded-lg shadow max-w-3xl mx-auto">
        {loading && <p className="text-blue-600 text-center">Loading claim details...</p>}
        {error && <p className="text-red-500 text-center">Error fetching claim details.</p>}

        {data?.claimById && (
          <>
            <h2 className="text-2xl font-semibold mb-4">
              {mode === "view" ? "🔍 View Claim" : "✏️ Edit Claim"}
            </h2>

            {/* Policy Details */}
            <div className="border p-4 rounded mb-4 bg-gray-50">
              <h3 className="font-semibold text-lg mb-2">Policy Details</h3>
              <p><strong>Policy ID:</strong> {data.claimById.policy.policyID}</p>
              <p><strong>Holder:</strong> {data.claimById.policy.policyHolder.fullName}</p>
              <p><strong>Agent:</strong> {data.claimById.policy.agent.fullName}</p>
              <p><strong>Status:</strong> {data.claimById.policy.status}</p>
            </div>

            {/* Claim Details Form */}
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block font-medium">Claim ID</label>
                <input
                  type="text"
                  value={data.claimById.claimID}
                  disabled
                  className="w-full p-2 border rounded bg-gray-100"
                />
              </div>

              <div>
                <label className="block font-medium">Incident Date</label>
                <input
                  type="text"
                  value={data.claimById.incidentDate}
                  disabled
                  className="w-full p-2 border rounded bg-gray-100"
                />
              </div>

              <div>
                <label className="block font-medium">Claim Amount (THB)</label>
                <input
                  type="number"
                  value={claimAmount}
                  onChange={(e) => setClaimAmount(e.target.value)}
                  disabled={mode === "view"}
                  className={`w-full p-2 border rounded ${mode === "view" ? "bg-gray-100" : ""}`}
                />
              </div>

              <div>
                <label className="block font-medium">Claim Status</label>
                {mode === "view" ? (
                  <input
                    type="text"
                    value={claimStatus}
                    disabled
                    className="w-full p-2 border rounded bg-gray-100"
                  />
                ) : (
                  <select
                    value={claimStatus}
                    onChange={(e) => setClaimStatus(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="Open">Open</option>
                    <option value="Pending">Pending</option>
                    <option value="Closed">Closed</option>
                  </select>
                )}
              </div>

              {mode === "edit" && (
                <button
                  type="submit"
                  disabled={updating}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow"
                >
                  {updating ? "Updating..." : "Update Claim"}
                </button>
              )}
            </form>
          </>
        )}
      </div>
      <ToastContainer />
    </div>
  );
}
