import React, { useState } from "react";
import { useLazyQuery, gql } from "@apollo/client";

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
        dob
        address
      }
      agent {
        fullName
        licenseNo
      }
    }
  }
`;

export default function PolicyLookup() {
  const [policyId, setPolicyId] = useState("");
  const [getPolicy, { loading, data, error }] = useLazyQuery(GET_POLICY_BY_ID);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (policyId.trim() !== "") {
      getPolicy({ variables: { policyId } });
    }
  };

  const isPolicyActive =
    data?.policyById?.status &&
    data.policyById.status.toLowerCase() === "active";

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="bg-white p-6 rounded-lg shadow-md max-w-3xl w-full mx-auto">
        <h2 className="text-2xl font-semibold mb-6 text-left text-chubb-blue">
          🔍 Policy Lookup
        </h2>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="flex space-x-2 mb-6 text-left">
          <input
            type="text"
            placeholder="Enter Policy ID"
            value={policyId}
            onChange={(e) => setPolicyId(e.target.value)}
            className="flex-grow p-3 border rounded focus:ring-2 focus:ring-chubb-blue focus:outline-none"
            required
          />
          <button
            type="submit"
            className="bg-chubb-blue hover:bg-blue-700 text-white px-6 py-3 rounded shadow"
          >
            Search
          </button>
        </form>

        {/* Status Messages */}
        {loading && <p className="text-chubb-blue font-semibold text-left">Loading...</p>}
        {error && <p className="text-red-500 text-left">Error: {error.message}</p>}

        {/* Policy Details */}
        {data?.policyById && (
          <div className="mt-6 p-6 border rounded bg-gray-50 text-left">
            <h3 className="text-lg font-semibold mb-4 text-chubb-darkBlue">
              Policy Details
            </h3>
            <p><strong>Policy ID:</strong> {data.policyById.policyID}</p>
            <p><strong>Type:</strong> {data.policyById.policyType}</p>
            <p>
              <strong>Status:</strong>{" "}
              <span
                className={`px-2 py-1 rounded text-white ${
                  isPolicyActive ? "bg-green-600" : "bg-red-600"
                }`}
              >
                {data.policyById.status}
              </span>
            </p>
            <p><strong>Start Date:</strong> {data.policyById.startDate}</p>
            <p><strong>End Date:</strong> {data.policyById.endDate}</p>
            <p>
              <strong>Holder:</strong> {data.policyById.policyHolder.fullName} 
              ({data.policyById.policyHolder.email})
            </p>
            <p><strong>DOB:</strong> {data.policyById.policyHolder.dob}</p>
            <p><strong>Address:</strong> {data.policyById.policyHolder.address}</p>
            <p>
              <strong>Agent:</strong> {data.policyById.agent.fullName} 
              (License: {data.policyById.agent.licenseNo})
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
