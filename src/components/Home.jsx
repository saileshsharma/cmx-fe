import React, { useState } from "react";
import { useQuery } from "@apollo/client";
import { Pie, Bar } from "react-chartjs-2";
import { GET_CLAIMS_PAGED, GET_CLAIM_KPIS } from "../graphql/claims";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const formatCurrencyTHB = (amount) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 2 }).format(amount);

export default function ClaimsDashboard() {
  const [currentPage, setCurrentPage] = useState(1);
  const claimsPerPage = 10;

  const { data: kpiData, loading: kpiLoading } = useQuery(GET_CLAIM_KPIS);
  const { data: claimsData, loading: claimsLoading } = useQuery(GET_CLAIMS_PAGED, {
    variables: { page: currentPage - 1, size: claimsPerPage },
  });

  const kpi = kpiData?.claimKPI || { openCount: 0, closedCount: 0, pendingAmount: 0, statusDistribution: [] };
  const claims = claimsData?.claims?.content || [];
  const totalPages = claimsData?.claims?.totalPages || 1;

  // ✅ Pie Chart (Status Distribution)
  const pieData = {
    labels: kpi.statusDistribution.map((s) => s.status),
    datasets: [
      {
        data: kpi.statusDistribution.map((s) => s.count),
        backgroundColor: ["#00A9CE", "#78BE20", "#F58220", "#9B26B6", "#FFC107"],
      },
    ],
  };

  return (
    <div className="p-6 max-w-6xl mx-auto bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-6">📊 Claims Dashboard</h2>

      {/* KPIs */}
      {kpiLoading ? <p>Loading KPIs...</p> : (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-100 p-4 rounded text-center">
            <h3>Open Claims</h3>
            <p className="text-xl font-bold">{kpi.openCount}</p>
          </div>
          <div className="bg-green-100 p-4 rounded text-center">
            <h3>Closed Claims</h3>
            <p className="text-xl font-bold">{kpi.closedCount}</p>
          </div>
          <div className="bg-red-100 p-4 rounded text-center">
            <h3>Pending Amount</h3>
            <p className="text-xl font-bold">{formatCurrencyTHB(kpi.pendingAmount)}</p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="text-lg font-semibold mb-4 text-center">Claims by Status</h3>
          <Pie data={pieData} />
        </div>
      </div>

      {/* Claims Table */}
      {claimsLoading ? <p>Loading claims...</p> : (
        <div>
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2">Claim ID</th>
                <th className="border px-4 py-2">Status</th>
                <th className="border px-4 py-2">Amount</th>
                <th className="border px-4 py-2">Incident Date</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c.claimID} className="text-center">
                  <td className="border px-4 py-2">{c.claimID}</td>
                  <td className="border px-4 py-2">{c.claimStatus}</td>
                  <td className="border px-4 py-2">{formatCurrencyTHB(c.claimAmount)}</td>
                  <td className="border px-4 py-2">{c.incidentDate}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex justify-between mt-4">
            <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>
              Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
