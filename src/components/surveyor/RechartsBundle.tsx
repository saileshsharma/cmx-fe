import React from "react";
import {
  ResponsiveContainer, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, LineChart, Line
} from "recharts";

function Empty() { return <p className="text-gray-500 text-sm">No data to chart.</p>; }

export default function RechartsBundle(props: any) {
  const {
    activeTab, compact, CHART_H, allLoading,
    pieDataAll, barDataAll, severityPieData,
    timeBucket, setTimeBucket, timeSeriesData,
    allClaims, STATUS_COLOR, SEVERITY_COLOR,
    StatusLabel, SeverityLabel, formatCurrencyTHB
  } = props;

  return (
    <>
      {/* OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between p-3">
              <h4 className="font-semibold">Claims by Status — All</h4>
            </div>
            <div className="p-3 pt-0" style={{ height: CHART_H }}>
              {allLoading ? <Empty/> : pieDataAll?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieDataAll}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={compact ? 90 : 110}
                      label={({ name, value }: any) => `${name}: ${value}`}
                    >
                      {pieDataAll.map((d: any, i: number) => (
                        <Cell key={i} fill={STATUS_COLOR[d.status] || "#64748B"} />
                      ))}
                    </Pie>
                    <Tooltip wrapperStyle={{ fontSize: 12 }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (<Empty />)}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between p-3">
              <h4 className="font-semibold">Total Amount by Status — All</h4>
            </div>
            <div className="p-3 pt-0" style={{ height: CHART_H }}>
              {allLoading ? <Empty/> : barDataAll?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barDataAll}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis tickFormatter={(v: number) => String(formatCurrencyTHB(v)).replace("฿","")} />
                    <Tooltip formatter={(v: number) => formatCurrencyTHB(v)} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="amount">
                      {barDataAll.map((d: any, i: number) => (
                        <Cell key={i} fill={STATUS_COLOR[d.rawStatus] || "#64748B"} />
                      ))}
                    </Bar>
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              ) : (<Empty />)}
            </div>
          </div>
        </div>
      )}

      {/* TRENDS */}
      {activeTab === "trends" && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between p-3">
            <h4 className="font-semibold">
              Reported Claims Over Time ({timeBucket === "MONTH" ? "Monthly" : "Weekly"})
            </h4>
            <select
              value={timeBucket}
              onChange={(e) => setTimeBucket(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="WEEK">Weekly</option>
              <option value="MONTH">Monthly</option>
            </select>
          </div>
          <div className="p-3 pt-0" style={{ height: CHART_H }}>
            {timeSeriesData?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} />
                  <Tooltip wrapperStyle={{ fontSize: 12 }} />
                  <Legend />
                  <Line type="monotone" dataKey="count" name="Claims" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (<Empty />)}
          </div>
        </div>
      )}

      {/* BREAKDOWN */}
      {activeTab === "breakdown" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between p-3">
              <h4 className="font-semibold">Claims by Severity — All</h4>
            </div>
            <div className="p-3 pt-0" style={{ height: CHART_H }}>
              {severityPieData?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityPieData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={compact ? 90 : 110}
                      label={({ name, value }: any) => `${name}: ${value}`}
                    >
                      {severityPieData.map((d: any, i: number) => (
                        <Cell key={i} fill={SEVERITY_COLOR[d.severity] || "#64748B"} />
                      ))}
                    </Pie>
                    <Tooltip wrapperStyle={{ fontSize: 12 }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (<Empty />)}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-center text-sm text-gray-500">
            Add another claim-only chart here (e.g., Amount distribution, Top vehicles, etc.)
          </div>
        </div>
      )}

      {/* MATRIX */}
      {activeTab === "matrix" && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between p-3">
            <h4 className="font-semibold">Status × Severity — Counts</h4>
          </div>
          <div className="p-3 pt-0" style={{ height: (CHART_H + 40) }}>
            <StatusSeverityMatrix allClaims={allClaims} SEVERITY_COLOR={SEVERITY_COLOR} SeverityLabel={SeverityLabel} StatusLabel={StatusLabel}/>
          </div>
        </div>
      )}
    </>
  );
}

/* Matrix chart kept local to bundle so Recharts only loads once */
function StatusSeverityMatrix({ allClaims, SEVERITY_COLOR, SeverityLabel, StatusLabel }: any) {
  const STATUS_ORDER = ["REGISTERED","UNDER_REVIEW","APPROVED","REJECTED","PAID"];
  const SEVERITY_ORDER = ["LOW","MEDIUM","HIGH"];

  const data = React.useMemo(() => {
    const seed = STATUS_ORDER.map((st) => {
      const row: any = { status: StatusLabel[st] ?? st };
      SEVERITY_ORDER.forEach((sev) => (row[sev] = 0));
      return { key: st, row };
    });
    const byStatus = new Map(seed.map((s) => [s.key, s.row]));
    (allClaims || []).forEach((c: any) => {
      const st = c.claimStatus;
      const sev = String(c.claimSeverity || "").toUpperCase();
      if (!SEVERITY_ORDER.includes(sev)) return;
      if (!byStatus.has(st)) {
        const row: any = { status: StatusLabel[st] ?? st };
        SEVERITY_ORDER.forEach((s) => (row[s] = 0));
        byStatus.set(st, row);
      }
      byStatus.get(st)![sev] += 1;
    });
    return STATUS_ORDER.map((st) => byStatus.get(st)).filter(Boolean);
  }, [allClaims]);

  return data.length ? (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="status" />
        <YAxis allowDecimals={false} />
        <Tooltip wrapperStyle={{ fontSize: 12 }} />
        <Legend />
        {SEVERITY_ORDER.map((sev) => (
          <Bar key={sev} dataKey={sev} name={SeverityLabel[sev] ?? sev} stackId="a"
               fill={SEVERITY_COLOR[sev] || "#64748B"} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  ) : (<Empty />);
}
