import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { GoogleMap, MarkerF, InfoWindowF, useLoadScript } from "@react-google-maps/api";
import { gql, useLazyQuery } from "@apollo/client";

/* =========================
   GraphQL
   ========================= */
const GET_ALL_SURVEYORS = gql`
  query GetAllSurveyors {
    getAllSurveyors {
      id
      name
      email
      phoneNumber
      status            # AVAILABLE | UNAVAILABLE | INACTIVE
      surveyorJobStatus # Accepted | Working | Pending | Closed | On_The_Way
      currentLat
      currentLng
    }
  }
`;

const GET_SURVEYORS_BY_JOB_STATUS = gql`
  query GetSurveyorsByJobStatus($jobStatus: SurveyorJobStatus) {
    getSurveyorsByJobStatus(jobStatus: $jobStatus) {
      id
      name
      email
      phoneNumber
      status
      surveyorJobStatus
      currentLat
      currentLng
    }
  }
`;

const GET_SURVEYORS_BY_STATUS = gql`
  query GetSurveyorsByStatus($status: SurveyorStatus) {
    getSurveyorsByStatus(status: $status) {
      id
      name
      email
      phoneNumber
      status
      surveyorJobStatus
      currentLat
      currentLng
    }
  }
`;

/* =========================
   Constants & helpers
   ========================= */
const JOB_STATUSES = ["Accepted", "Working", "Pending", "Closed", "On_The_Way"];
const AVAILABILITIES = ["All", "AVAILABLE", "UNAVAILABLE", "INACTIVE"];

const normalizeJobStatus = (val = "") => {
  const v = String(val).toUpperCase().replace(/\s|-/g, "_");
  if (v === "ON_THE_WAY" || v === "ONTHEWAY" || v === "ON_THE-WAY") return "On_The_Way";
  if (v === "ACCEPTED") return "Accepted";
  if (v === "WORKING") return "Working";
  if (v === "CLOSED") return "Closed";
  return "Pending";
};

const JOB_STATUS_MAP = {
  Accepted: "Accepted",
  Working: "Working",
  Pending: "Pending",
  Closed: "Closed",
  On_The_Way: "On_The_Way",
};
const toBackendJobStatus = (display = "") => JOB_STATUS_MAP[display] ?? display;

const badgeClass = (js) =>
  "px-2 py-0.5 rounded text-xs " +
  (js === "Working"
    ? "bg-amber-100 text-amber-700"
    : js === "Accepted"
    ? "bg-blue-100 text-blue-700"
    : js === "On_The_Way"
    ? "bg-indigo-100 text-indigo-700"
    : js === "Closed"
    ? "bg-gray-200 text-gray-700"
    : "bg-green-100 text-green-700");

/** Safe numeric parse that preserves null/undefined */
const toNum = (v) => (v === null || v === undefined || v === "" ? NaN : Number(v));

/* small util */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
}

export default function DispatcherSurveyor() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });

  const center = useMemo(() => ({ lat: 15.87, lng: 100.9925 }), []);
  const mapRef = useRef(null);
  const [selectedSurveyor, setSelectedSurveyor] = useState(null);

  // Filters
  const [jobFilter, setJobFilter] = useState("All");            // job status filter
  const [availabilityFilter, setAvailabilityFilter] = useState("All"); // availability/status filter

  // toast
  const [toast, setToast] = useState(null);
  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 1800);
  };

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Queries
  const [fetchAll, { data: allData, loading: loadingAll, error: errorAll }] = useLazyQuery(
    GET_ALL_SURVEYORS,
    { fetchPolicy: "cache-and-network", notifyOnNetworkStatusChange: true }
  );
  const [fetchByJob, { data: byJobData, loading: loadingByJob, error: errorByJob }] = useLazyQuery(
    GET_SURVEYORS_BY_JOB_STATUS,
    { fetchPolicy: "cache-and-network", notifyOnNetworkStatusChange: true }
  );
  const [fetchByStatus, { data: byStatusData, loading: loadingByStatus, error: errorByStatus }] =
    useLazyQuery(GET_SURVEYORS_BY_STATUS, {
      fetchPolicy: "cache-and-network",
      notifyOnNetworkStatusChange: true,
    });

  // initial load
  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Refetch based on filters
  useEffect(() => {
    setSelectedSurveyor(null);
    setPage(1);

    if (jobFilter !== "All") {
      fetchByJob({ variables: { jobStatus: toBackendJobStatus(jobFilter) } });
    } else if (availabilityFilter !== "All") {
      fetchByStatus({ variables: { status: availabilityFilter } });
    } else {
      fetchAll();
    }
  }, [jobFilter, availabilityFilter, fetchAll, fetchByJob, fetchByStatus]);

  // Build list
  const rawList = useMemo(() => {
    if (jobFilter !== "All") return byJobData?.getSurveyorsByJobStatus;
    if (availabilityFilter !== "All") return byStatusData?.getSurveyorsByStatus;
    return allData?.getAllSurveyors;
  }, [jobFilter, availabilityFilter, allData, byJobData, byStatusData]);

  const surveyors = useMemo(() => {
    if (!rawList) return [];
    return rawList
      .map((s) => {
        const lat = toNum(s.currentLat);
        const lng = toNum(s.currentLng);
        const has =
          s.currentLat !== null &&
          s.currentLat !== undefined &&
          s.currentLng !== null &&
          s.currentLng !== undefined &&
          Number.isFinite(lat) &&
          Number.isFinite(lng);

        return {
          id: s.id,
          name: s.name,
          email: s.email,
          phoneNumber: s.phoneNumber,
          status: s.status, // AVAILABLE | UNAVAILABLE | INACTIVE
          jobStatus: normalizeJobStatus(s.surveyorJobStatus),
          lat,
          lng,
          hasCoord: has,
          location: has ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : "-",
        };
      })
      // Apply both filters client-side as a safety net
      .filter((s) => (jobFilter === "All" ? true : s.jobStatus === jobFilter))
      .filter((s) => (availabilityFilter === "All" ? true : s.status === availabilityFilter));
  }, [rawList, jobFilter, availabilityFilter]);

  // Pagination math
  const total = surveyors.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, total);
  const paginated = useMemo(() => surveyors.slice(startIdx, endIdx), [surveyors, startIdx, endIdx]);

  // Fit markers to view (debounced)
  const fitTimeout = useRef(null);
  const fitToMarkers = useCallback(() => {
    if (!mapRef.current || !window.google) return;
    if (fitTimeout.current) clearTimeout(fitTimeout.current);
    fitTimeout.current = setTimeout(() => {
      const bounds = new window.google.maps.LatLngBounds();
      paginated.forEach((s) => s.hasCoord && bounds.extend({ lat: s.lat, lng: s.lng }));
      const hasAny = paginated.some((s) => s.hasCoord);
      if (hasAny) mapRef.current.fitBounds(bounds, 80);
    }, 120);
  }, [paginated]);

  useEffect(() => {
    if (isLoaded) fitToMarkers();
  }, [isLoaded, paginated.length, jobFilter, availabilityFilter, page, pageSize, fitToMarkers]);

  const markerIcon = useCallback((status) => {
    const sp = window.google?.maps?.SymbolPath?.CIRCLE;
    if (!sp) return undefined;
    const fill =
      status === "AVAILABLE" ? "#16a34a" : status === "UNAVAILABLE" ? "#f59e0b" : "#6b7280";
    return {
      path: sp,
      scale: 8,
      fillColor: fill,
      fillOpacity: 1,
      strokeColor: "#1f2937",
      strokeWeight: 1,
    };
  }, []);

  const loading = loadingAll || loadingByJob || loadingByStatus;
  const error = errorAll || errorByJob || errorByStatus;

  useEffect(() => {
    if (error) {
      // eslint-disable-next-line no-console
      console.error("Surveyor query error:", {
        message: error.message,
        graphQLErrors: error.graphQLErrors,
        networkError: error.networkError,
      });
    }
  }, [error]);

  const focusOn = useCallback((s, zoom = 13) => {
    setSelectedSurveyor(s);
    if (s?.hasCoord && mapRef.current) {
      mapRef.current.panTo({ lat: s.lat, lng: s.lng });
      mapRef.current.setZoom(zoom);
    }
  }, []);

  const googleMapsUrl = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

  // Keyboard shortcut: press "c" to copy selected pin coords
  useEffect(() => {
    const handler = async (e) => {
      if (e.key.toLowerCase() === "c" && selectedSurveyor?.hasCoord) {
        const ok = await copyToClipboard(`${selectedSurveyor.lat}, ${selectedSurveyor.lng}`);
        showToast(ok ? "Copied coordinates" : "Copy failed");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedSurveyor]);

  if (loadError) return <div className="p-6 text-red-600">Failed to load Google Maps.</div>;

  return (
    <div className="p-6 space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[9999] bg-gray-900 text-white text-sm px-3 py-2 rounded shadow">
          {toast}
        </div>
      )}

      <header>
        <h1 className="text-xl sm:text-2xl font-bold text-violet-700">🚗 Surveyor Dispatcher Dashboard</h1>
        <p className="text-gray-700">Filter surveyors by job status and availability.</p>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Job status filter */}
        <div className="inline-block">
          <label className="mr-2 text-sm text-gray-600">Job status:</label>
          <select
            className="px-2 py-1 border rounded text-sm"
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
          >
            <option value="All">All</option>
            {JOB_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Availability filter */}
        <div className="inline-block">
          <label className="ml-4 mr-2 text-sm text-gray-600">Availability:</label>
          <select
            className="px-2 py-1 border rounded text-sm"
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
          >
            {AVAILABILITIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <button
          className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
          onClick={() => {
            setJobFilter("All");
            setAvailabilityFilter("All");
            setSelectedSurveyor(null);
            fetchAll();
            setTimeout(() => fitToMarkers(), 0);
          }}
        >
          Reset view
        </button>

        {/* Page size */}
        <div className="inline-flex items-center gap-2 ml-auto">
          <span className="text-sm text-gray-600">Rows per page:</span>
          <select
            className="px-2 py-1 border rounded text-sm"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Map */}
      <section className="relative h-[560px] w-full border border-gray-200 rounded-lg overflow-hidden">
        {/* Legend */}
        <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur p-2 rounded shadow text-xs space-y-1">
          <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full bg-green-600" /> AVAILABLE</div>
          <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full bg-amber-500" /> UNAVAILABLE</div>
          <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full bg-gray-500" /> INACTIVE</div>
        </div>

        {!isLoaded ? (
          <div className="h-full w-full flex items-center justify-center text-gray-600">Loading map…</div>
        ) : loading ? (
          <div className="h-full w-full flex items-center justify-center text-gray-600">Loading surveyors…</div>
        ) : error ? (
          <div className="h-full w-full flex items-center justify-center text-red-600 px-4 text-center">
            <div>
              <div className="font-semibold">Failed to load surveyors.</div>
              <div className="mt-1 text-sm text-red-500/80">
                {(error.graphQLErrors?.[0]?.message) || error.message}
              </div>
            </div>
          </div>
        ) : (
          <GoogleMap
            onLoad={(map) => {
              mapRef.current = map;
              fitToMarkers();
            }}
            mapContainerStyle={{ height: "100%", width: "100%" }}
            center={center}
            zoom={6}
            options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false, gestureHandling: "greedy" }}
          >
            {paginated.map((s) =>
              s.hasCoord ? (
                <MarkerF
                  key={s.id}
                  position={{ lat: s.lat, lng: s.lng }}
                  icon={markerIcon(s.status)}
                  onClick={() => focusOn(s, 12)}
                />
              ) : null
            )}

            {selectedSurveyor && (
              <InfoWindowF
                position={{ lat: selectedSurveyor.lat, lng: selectedSurveyor.lng }}
                onCloseClick={() => setSelectedSurveyor(null)}
              >
                <div className="text-sm space-y-2">
                  {/* Header + quick actions */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{selectedSurveyor.name}</div>
                    {selectedSurveyor.hasCoord && (
                      <div className="flex items-center gap-2">
                        <button
                          className="px-2 py-1 border rounded hover:bg-gray-50"
                          onClick={async () => {
                            const ok = await copyToClipboard(`${selectedSurveyor.lat}, ${selectedSurveyor.lng}`);
                            showToast(ok ? "Copied coordinates" : "Copy failed");
                          }}
                          title="Copy coordinates (shortcut: c)"
                        >
                          Copy
                        </button>
                        <a
                          className="px-2 py-1 border rounded hover:bg-gray-50"
                          href={googleMapsUrl(selectedSurveyor.lat, selectedSurveyor.lng)}
                          target="_blank"
                          rel="noreferrer"
                          title="Open in Google Maps"
                        >
                          Maps
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="text-gray-700">
                    <div>Status: {selectedSurveyor.status}</div>
                    <div>
                      Job: <span className={badgeClass(selectedSurveyor.jobStatus)}>{selectedSurveyor.jobStatus || "-"}</span>
                    </div>
                    <div className="pt-1">
                      Location: <span className="font-mono">{selectedSurveyor.location}</span>
                    </div>
                  </div>
                </div>
              </InfoWindowF>
            )}
          </GoogleMap>
        )}
      </section>

      {/* Table */}
      <section className="space-y-3">
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-2 text-left">Surveyor</th>
                <th className="border px-4 py-2 text-left">Availability</th>
                <th className="border px-4 py-2 text-left">Job Status</th>
                <th className="border px-4 py-2 text-left">Location</th>
                <th className="border px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="border px-4 py-2 font-medium">{s.name}</td>
                  <td
                    className={`border px-4 py-2 font-semibold ${
                      s.status === "AVAILABLE"
                        ? "text-green-600"
                        : s.status === "UNAVAILABLE"
                        ? "text-amber-600"
                        : "text-gray-500"
                    }`}
                  >
                    {s.status}
                  </td>
                  <td className="border px-4 py-2">
                    <span className={badgeClass(s.jobStatus)}>{s.jobStatus}</span>
                  </td>
                  <td className="border px-4 py-2">
                    {s.hasCoord ? (
                      <div className="flex items-center gap-2">
                        {/* center map on click */}
                        <button
                          type="button"
                          className="text-blue-600 hover:underline font-mono"
                          onClick={() => focusOn(s, 13)}
                          title="Center map here"
                          aria-label={`Center map on ${s.location}`}
                        >
                          {s.location}
                        </button>

                        {/* copy */}
                        <button
                          type="button"
                          className="px-2 py-0.5 border rounded hover:bg-gray-50"
                          onClick={async () => {
                            const ok = await copyToClipboard(`${s.lat}, ${s.lng}`);
                            showToast(ok ? "Copied coordinates" : "Copy failed");
                          }}
                          title="Copy coordinates"
                          aria-label="Copy coordinates"
                        >
                          Copy
                        </button>

                        {/* open maps */}
                        <a
                          className="px-2 py-0.5 border rounded hover:bg-gray-50"
                          href={googleMapsUrl(s.lat, s.lng)}
                          target="_blank"
                          rel="noreferrer"
                          title="Open in Google Maps"
                          aria-label="Open in Google Maps"
                        >
                          Maps
                        </a>
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="border px-4 py-2 space-x-2">
                    <button
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      onClick={() => focusOn(s, 13)}
                    >
                      Focus
                    </button>
                  </td>
                </tr>
              ))}
              {!paginated.length && (
                <tr>
                  <td colSpan={5} className="border px-4 py-3 text-gray-500">
                    {loading ? "Loading surveyors..." : "No surveyors for the selected filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-600">
            Showing <span className="font-medium">{total ? startIdx + 1 : 0}</span>–
            <span className="font-medium">{endIdx}</span> of{" "}
            <span className="font-medium">{total}</span>
          </div>
          <div className="inline-flex items-center gap-2">
            <button
              className="px-2 py-1 border rounded disabled:opacity-50"
              onClick={() => setPage(1)}
              disabled={safePage <= 1}
              aria-label="First page"
              title="First page"
            >
              « First
            </button>
            <button
              className="px-2 py-1 border rounded disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              aria-label="Previous page"
              title="Previous page"
            >
              ‹ Prev
            </button>
            <span className="px-2">
              Page <span className="font-medium">{safePage}</span> / {totalPages}
            </span>
            <button
              className="px-2 py-1 border rounded disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              aria-label="Next page"
              title="Next page"
            >
              Next ›
            </button>
            <button
              className="px-2 py-1 border rounded disabled:opacity-50"
              onClick={() => setPage(totalPages)}
              disabled={safePage >= totalPages}
              aria-label="Last page"
              title="Last page"
            >
              Last »
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
