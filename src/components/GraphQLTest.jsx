import React from 'react';
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

const HEALTH_QUERY = gql`
  query HealthCheck {
    health
  }
`;

const POLICIES_QUERY = gql`
  query GetAllPolicies {
    getAllPolicies {
      id
      policyNumber
      policyStatus
      startDate
      endDate
    }
  }
`;

export default function GraphQLTest() {
  const { data: healthData, loading: healthLoading, error: healthError } = useQuery(HEALTH_QUERY);
  const { data: policiesData, loading: policiesLoading, error: policiesError } = useQuery(POLICIES_QUERY);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md m-4">
      <h2 className="text-2xl font-bold mb-4">GraphQL Connection Test</h2>

      {/* Health Check */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">BFF Health Check</h3>
        {healthLoading ? (
          <p className="text-yellow-600">Loading health status...</p>
        ) : healthError ? (
          <p className="text-red-600">Health check failed: {healthError.message}</p>
        ) : (
          <p className="text-green-600">✓ BFF Health Status: {healthData?.health}</p>
        )}
      </div>

      {/* Policies Query */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Policies Query Test</h3>
        {policiesLoading ? (
          <p className="text-yellow-600">Loading policies...</p>
        ) : policiesError ? (
          <div className="text-red-600">
            <p>Policies query failed: {policiesError.message}</p>
            <details className="mt-2">
              <summary className="cursor-pointer">Error Details</summary>
              <pre className="text-xs mt-2 bg-gray-100 p-2 rounded">
                {JSON.stringify(policiesError, null, 2)}
              </pre>
            </details>
          </div>
        ) : (
          <div className="text-green-600">
            <p>✓ Policies loaded successfully</p>
            <p>Count: {policiesData?.getAllPolicies?.length || 0}</p>
          </div>
        )}
      </div>

      {/* Connection Info */}
      <div className="text-sm text-gray-600 border-t pt-4">
        <h4 className="font-semibold">Connection Configuration:</h4>
        <ul className="list-disc list-inside mt-2">
          <li>Frontend: http://localhost:5173</li>
          <li>BFF (GraphQL): http://localhost:4000/graphql</li>
          <li>Backend: http://localhost:8080 (via BFF)</li>
        </ul>
      </div>
    </div>
  );
}