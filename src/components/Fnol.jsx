import React, { useState, useEffect } from "react";
import { gql, useMutation, useLazyQuery } from "@apollo/client";

// ✅ GraphQL Queries & Mutations
const GET_POLICY_BY_ID = gql`
  query ($policyId: String!) {
    policyById(policyId: $policyId) {
      policySeqID
      policyID
      policyType
      status
      startDate
      endDate
      policyHolder {
        fullName
        email
      }
      agent {
        fullName
        licenseNo
      }
    }
  }
`;

const CREATE_CLAIM = gql`
  mutation CreateClaim($policySeqID: Long!, $incidentDate: String!, $claimAmount: Float!) {
    createClaim(policySeqID: $policySeqID, incidentDate: $incidentDate, claimAmount: $claimAmount, claimStatus: "Open") {
      claimID
      claimStatus
      claimAmount
    }
  }
`;

export default function CreateClaim() {
  const [policyId, setPolicyId] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [statusError, setStatusError] = useState("");

  const [getPolicy, { data: policyData, error: policyError }] = useLazyQuery(GET_POLICY_BY_ID);
  const [createClaim, { loading, error: claimError, data: claimData }] = useMutation(CREATE_CLAIM);

  // ✅ Auto-populate today's date for incident date
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setIncidentDate(today);
  }, []);

  const handlePolicyLookup = (e) => {
    e.preventDefault();
    setStatusError("");
    if (policyId.trim() !== "") {
      getPolicy({ variables: { policyId } });
    }
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!policyData?.policyById) return;

    if (policyData.policyById.status.toLowerCase() !== "active") {
      setStatusError("❌ Claim cannot be created. Policy status must be ACTIVE.");
      return;
    }

    await createClaim({
      variables: {
        policySeqID: policyData.policyById.policySeqID,
        incidentDate,
        claimAmount: parseFloat(claimAmount),
      },
    });
  };

  const isPolicyActive =
    policyData?.policyById?.status &&
    policyData.policyById.status.toLowerCase() === "active";

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="bg-white p-6 rounded-lg shadow-md max-w-3xl w-full mx-auto">
        <h2 className="text-2xl font-semibold mb-6 text-left text-chubb-blue">📝 Create New Claim</h2>

        {/* Policy Lookup */}
        <form onSubmit={handlePolicyLookup} className="space-y-4 mb-6 text-left">
          <label className="block font-medium text-gray-700">Enter Policy ID</label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={policyId}
              onChange={(e) => setPolicyId(e.target.value)}
              placeholder="Policy ID"
              className="flex-grow p-2 border rounded focus:ring-2 focus:ring-chubb-blue"
              required
            />
            <button
              type="submit"
              className="bg-chubb-blue text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Lookup
            </button>
          </div>
          {policyError && <p className="text-red-500">Error fetching policy.</p>}
        </form>

        {/* Display Policy Details */}
        {policyData?.policyById && (
          <div className="p-4 border rounded bg-gray-50 mb-6 text-left">
            <h3 className="font-semibold text-lg mb-2 text-chubb-darkBlue">Policy Details</h3>
            <p><strong>Policy ID:</strong> {policyData.policyById.policyID}</p>
            <p><strong>Type:</strong> {policyData.policyById.policyType}</p>
            <p>
              <strong>Status:</strong>{" "}
              <span
                className={`px-2 py-1 rounded text-white ${
                  isPolicyActive ? "bg-green-600" : "bg-red-600"
                }`}
              >
                {policyData.policyById.status}
              </span>
            </p>
            <p><strong>Holder:</strong> {policyData.policyById.policyHolder.fullName} ({policyData.policyById.policyHolder.email})</p>
            <p><strong>Agent:</strong> {policyData.policyById.agent.fullName} (License: {policyData.policyById.agent.licenseNo})</p>
          </div>
        )}

        {/* Claim Form (Only if policy exists) */}
        {policyData?.policyById && (
          <>
            {statusError && <p className="text-red-500 mb-4 font-semibold">{statusError}</p>}

            <form onSubmit={handleClaimSubmit} className="space-y-4 text-left">
              <fieldset disabled={!isPolicyActive} className="space-y-4">
                <div>
                  <label className="block font-medium text-gray-700">Incident Date</label>
                  <input
                    type="date"
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-chubb-blue"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700">Claim Amount (THB)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={claimAmount}
                    onChange={(e) => setClaimAmount(e.target.value)}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-chubb-blue"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !isPolicyActive}
                  className={`w-full px-4 py-2 rounded shadow ${
                    isPolicyActive ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  {loading ? "Creating Claim..." : "Create Claim"}
                </button>
              </fieldset>
            </form>
          </>
        )}

        {/* Claim Response */}
        {claimError && <p className="text-red-500 mt-4 text-center">Error: {claimError.message}</p>}
        {claimData && (
          <div className="mt-6 p-4 border rounded bg-green-50 text-left">
            <p className="font-semibold text-green-700">✅ Claim Created Successfully!</p>
            <p><strong>Claim ID:</strong> {claimData.createClaim.claimID}</p>
            <p><strong>Status:</strong> {claimData.createClaim.claimStatus}</p>
            <p><strong>Amount:</strong> ฿{claimData.createClaim.claimAmount.toLocaleString("th-TH")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
