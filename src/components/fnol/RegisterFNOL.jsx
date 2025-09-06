/* global google */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { gql, useMutation, useSubscription } from "@apollo/client";
import { GoogleMap, MarkerF, Autocomplete, useLoadScript } from "@react-google-maps/api";

/* =========================================================================
   GraphQL
   ========================================================================= */
const FNOL_ASSIGNMENT_NOTICE = gql`
  subscription FnolAssignmentNotice($fnolReferenceNo: String!) {
    fnolAssignmentNotice(fnolReferenceNo: $fnolReferenceNo) {
      fnolReferenceNo
      status
      message
      timestamp
    }
  }
`;

const CREATE_FNOL = gql`
  mutation CreateFnol(
    $policyNumber: String!
    $registrationNumber: String!
    $accidentLocationId: ID!
    $description: String!
    $severity: ClaimSeverity!
    $accidentDate: String!
  ) {
    createFnol(
      policyNumber: $policyNumber
      registrationNumber: $registrationNumber
      accidentLocationId: $accidentLocationId
      description: $description
      severity: $severity
      accidentDate: $accidentDate
    ) {
      fnol {
        id
        fnolReferenceNo
        accidentDate
        description
        accidentLocation {
          id
          addressLine1
          addressLine2
          city
          province
          postalCode
          country
          latitude
          longitude
          googlePlaceId
          locationType
          createdAt
        }
      }
    }
  }
`;

export const CREATE_ADDRESS = gql`
  mutation CreateAddress($input: CreateAddressInput!) {
    createAddress(input: $input) {
      id
      addressLine1
      addressLine2
      city
      province
      postalCode
      country
      latitude
      longitude
      googlePlaceId
      locationType
      createdAt
    }
  }
`;

/* =========================================================================
   Helpers
   ========================================================================= */
const pad2 = (n) => String(n).padStart(2, "0");
const toLocalDatetimeInput = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}T${pad2(dt.getHours())}:${pad2(
    dt.getMinutes()
  )}`;
};
const localInputToIsoWithOffset = (localInputStr) => {
  const d = new Date(localInputStr);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const MM = pad2(d.getMonth() + 1);
  const DD = pad2(d.getDate());
  const HH = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  const ss = "00";
  const tzMin = -d.getTimezoneOffset();
  const sign = tzMin >= 0 ? "+" : "-";
  const offH = pad2(Math.floor(Math.abs(tzMin) / 60));
  const offM = pad2(Math.abs(tzMin) % 60);
  return `${yyyy}-${MM}-${DD}T${HH}:${mm}:${ss}${sign}${offH}:${offM}`;
};

const normStatus = (s) => String(s || "").trim().toUpperCase().replace(/\s+/g, "_");
const canRegister = (status) => {
  const v = normStatus(status);
  return v === "BIND" || v === "IN_FORCE";
};
const normalizeRegistration = (raw) => (raw || "").replace(/[-\s]/g, "").toUpperCase().trim();

/** Map our suggestion (HIGH/MEDIUM/LOW) -> backend enum ("High"/"Medium"/"Low") */
const SEVERITY_MAP = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

const SEVERITY_OPTIONS = [
  { label: "High", value: "High" },
  { label: "Medium", value: "Medium" },
  { label: "Low", value: "Low" },
];

// SG center; change if your primary market differs
const SG_DEFAULT = { lat: 1.3521, lng: 103.8198 };
const MAP_LIBRARIES = ["places"];

function computeSeveritySuggestion(usageType, description) {
  const txt = (description || "").toLowerCase();
  const strong = [
    "injury",
    "injured",
    "ambulance",
    "hospital",
    "fatal",
    "rollover",
    "rolled over",
    "fire",
    "flames",
    "airbag",
    "air bag",
    "pedestrian",
    "cyclist",
    "motorcyclist",
    "total loss",
    "unconscious",
  ];
  if (strong.some((s) => txt.includes(s)))
    return { value: "HIGH", reason: "Keywords indicating injuries or severe impact." };
  const commercialish = /(commercial|taxi|ride|delivery|logistics|bus|van|fleet)/i.test(usageType || "");
  let base = commercialish ? "MEDIUM" : "LOW";
  let reason = commercialish ? "Commercial usage generally implies higher exposure." : "No high-risk indicators detected.";
  const moderate = ["towed", "heavy damage", "hit and run", "multi", "pile", "highway", "expressway", "police", "intersection", "rear-ended", "rear ended"];
  if (moderate.some((s) => txt.includes(s))) {
    if (base === "LOW") base = "MEDIUM";
    reason = "Context suggests notable impact (e.g., tow/police/highway).";
  }
  return { value: base, reason };
}

/* Google Places → address components */
function pick(comp, ...types) {
  return comp?.find((c) => types.every((t) => c.types.includes(t)));
}
function componentsToAddress(ac) {
  const comps = ac?.address_components || [];
  const streetNum = pick(comps, "street_number")?.long_name || "";
  const route = pick(comps, "route")?.long_name || "";
  const sublocality = pick(comps, "sublocality", "sublocality_level_1")?.long_name || pick(comps, "neighborhood")?.long_name || "";
  const locality = pick(comps, "locality")?.long_name || "";
  const admin1 = pick(comps, "administrative_area_level_1")?.long_name || "";
  const postal = pick(comps, "postal_code")?.long_name || "";
  const countryLong = pick(comps, "country")?.long_name || "";
  const countryShort = pick(comps, "country")?.short_name || "";
  const line1FromStreet = [streetNum, route].filter(Boolean).join(" ").trim();

  return {
    addressLine1: line1FromStreet || ac.formatted_address || ac.name || "",
    addressLine2: sublocality || "",
    city: locality || "",
    province: admin1 || "",
    postalCode: postal || "",
    country: countryLong || countryShort || "Singapore",
  };
}

/* =========================================================================
   Dirty form guard (browser-level only)
   ========================================================================= */
function useUnsavedChangesWarning(shouldBlock) {
  useEffect(() => {
    const handler = (e) => {
      if (!shouldBlock) return;
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [shouldBlock]);
}

/* =========================================================================
   Error extraction
   ========================================================================= */
function extractErrorInfo(err) {
  if (!err) return { title: "Unknown error", friendly: "Something went wrong.", tech: "" };
  const gerr = Array.isArray(err.graphQLErrors) && err.graphQLErrors.length ? err.graphQLErrors[0] : null;
  const code = gerr?.extensions?.code ?? err?.extensions?.code;
  const rawMessage = gerr?.message || err?.message || "Unexpected error";
  let friendly;
  switch (code) {
    case "FNOL_LOCATION_CONFLICT":
      friendly = "An FNOL already exists for this accident location.";
      break;
    case "POLICY_NOT_FOUND":
      friendly = "Policy not found. Please check the policy number.";
      break;
    case "VEHICLE_NOT_ON_POLICY":
      friendly = "This vehicle registration is not associated with the policy.";
      break;
    case "FNOL_DUPLICATE":
      friendly = "An FNOL already exists around this time for the same policy & registration.";
      break;
    case "FNOL_OPEN_EXISTS":
      friendly = "There is already an active FNOL for this policy & registration.";
      break;
    case "VALIDATION_ERROR":
      friendly = gerr?.message || "Validation error. Please review your input.";
      break;
    default:
      if (/IllegalStateException/i.test(rawMessage))
        friendly = rawMessage.replace(/^.*IllegalStateException:\s*/i, "") || "Business rule violated.";
      else friendly = "We couldn't create the FNOL due to a server error.";
  }
  const parts = [];
  if (code) parts.push(`code: ${code}`);
  if (gerr?.path) parts.push(`path: ${gerr.path.join(".")}`);
  if (err?.networkError?.statusCode) parts.push(`http: ${err.networkError.statusCode}`);
  const netMsg = err?.networkError?.result?.errors?.[0]?.message;
  if (netMsg && netMsg !== rawMessage) parts.push(`backend: ${netMsg}`);
  parts.push(`message: ${rawMessage}`);
  return { title: "An error has occured...", friendly, tech: parts.join("\n") };
}

/* =========================================================================
   Address validation
   ========================================================================= */
function validateAddress(data, { requireLatLng } = { requireLatLng: true }) {
  const errs = {};
  const must = (v) => !!String(v || "").trim();

  if (!must(data.addressLine1)) errs.addressLine1 = "Address line 1 is required.";
  if (!must(data.city)) errs.city = "City is required.";
  if (!must(data.country)) errs.country = "Country is required.";

  if (requireLatLng) {
    const latOk = Number.isFinite(Number(data.lat));
    const lngOk = Number.isFinite(Number(data.lng));
    if (!latOk || !lngOk) errs.latlng = "Pick a location on the map (lat/lng required).";
  }
  return errs;
}

/* =========================================================================
   Google Maps Location Picker
   ========================================================================= */
function LocationPicker({ value, onChange, onGeocodingChange }) {
  const [center, setCenter] = useState(value?.lat ? { lat: value.lat, lng: value.lng } : SG_DEFAULT);
  const [marker, setMarker] = useState(value?.lat ? { lat: value.lat, lng: value.lng } : SG_DEFAULT);
  const [addr, setAddr] = useState(value?.formattedAddress || "");
  const [placeId, setPlaceId] = useState(value?.placeId || "");
  const acRef = useRef(null);
  const mapRef = useRef(null);
  const geocodeTimerRef = useRef(null);

  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: mapsKey, libraries: MAP_LIBRARIES });

  const geocoder = useMemo(() => {
    const g = typeof window !== "undefined" ? window.google : undefined;
    if (!isLoaded || !g?.maps?.Geocoder) return null;
    return new g.maps.Geocoder();
  }, [isLoaded]);

  const emit = useCallback((next) => onChange?.(next), [onChange]);

  useEffect(() => {
    emit({
      ...value,
      lat: center.lat,
      lng: center.lng,
      formattedAddress: addr || "",
      placeId: placeId || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng]);

  useEffect(() => () => clearTimeout(geocodeTimerRef.current), []);

  const handlePlaceChanged = () => {
    const place = acRef.current?.getPlace?.();
    if (!place || !place.geometry) return;
    const loc = place.geometry.location;
    const lat = loc.lat();
    const lng = loc.lng();

    const formattedAddress = place.formatted_address || place.name || "";
    const pid = place.place_id || "";
    const parts = componentsToAddress(place);

    setCenter({ lat, lng });
    setMarker({ lat, lng });
    setAddr(formattedAddress);
    setPlaceId(pid);

    emit({
      lat,
      lng,
      formattedAddress,
      placeId: pid,
      addressLine1: parts.addressLine1,
      addressLine2: parts.addressLine2,
      city: parts.city,
      province: parts.province,
      postalCode: parts.postalCode,
      country: parts.country || value?.country || "Singapore",
    });

    mapRef.current?.panTo({ lat, lng });
  };

  const handleDragEnd = (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarker({ lat, lng });
    setCenter({ lat, lng });

    if (!geocoder) {
      emit({ ...value, lat, lng, formattedAddress: "", placeId: "" });
      return;
    }

    clearTimeout(geocodeTimerRef.current);
    onGeocodingChange?.(true);
    geocodeTimerRef.current = setTimeout(() => {
      geocoder.geocode({ location: { lat, lng } }, (res, status) => {
        onGeocodingChange?.(false);
        if (status === "OK" && res && res[0]) {
          const ga = res[0];
          const formattedAddress = ga.formatted_address || "";
          const pid = ga.place_id || "";
          const parts = componentsToAddress(ga);

          setAddr(formattedAddress);
          setPlaceId(pid);
          emit({
            lat,
            lng,
            formattedAddress,
            placeId: pid,
            addressLine1: parts.addressLine1,
            addressLine2: parts.addressLine2,
            city: parts.city,
            province: parts.province,
            postalCode: parts.postalCode,
            country: parts.country,
          });
        } else {
          emit({ ...value, lat, lng, formattedAddress: "", placeId: "" });
        }
      });
    }, 400);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCenter({ lat, lng });
        setMarker({ lat, lng });
        emit({ ...value, lat, lng });
        mapRef.current?.panTo({ lat, lng });
      },
      () => {}
    );
  };

  if (!mapsKey) {
    return (
      <div className="space-y-2">
        <p className="text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded">
          Google Maps is not configured. You can still proceed by entering an <b>Address ID</b> above.
          <button
            type="button"
            className="ml-2 underline"
            onClick={() =>
              alert("Ask your admin for an Address ID or create one via the Addresses page, then paste the ID here.")
            }
          >
            How to find Address ID?
          </button>
        </p>
      </div>
    );
  }
  if (loadError) return <p className="text-red-600">Map failed to load. Check API key/domain restrictions.</p>;
  if (!isLoaded) return <div className="h-64 w-full bg-gray-100 animate-pulse rounded" />;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Autocomplete onLoad={(ac) => (acRef.current = ac)} onPlaceChanged={handlePlaceChanged}>
          <input
            type="text"
            placeholder="Search location"
            className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-300"
            defaultValue={addr}
            aria-label="Search accident location"
          />
        </Autocomplete>
        <button type="button" onClick={useMyLocation} className="px-3 py-2 rounded border hover:bg-gray-50" aria-label="Use my current location">
          Use my location
        </button>
      </div>

      <div className="w-full h-[280px] sm:h-[320px] md:h-[360px] rounded overflow-hidden">
        <GoogleMap center={center} zoom={marker ? 16 : 12} mapContainerStyle={{ width: "100%", height: "100%" }} onLoad={(m) => (mapRef.current = m)}>
          {marker && <MarkerF position={marker} draggable onDragEnd={handleDragEnd} />}
        </GoogleMap>
      </div>

      <div className="text-sm text-gray-700 space-y-1">
        <p>
          <span className="font-medium">Address:</span> {addr || "-"}
        </p>
        <p>
          <span className="font-medium">Place ID:</span> {placeId || "-"}
        </p>
        <p>
          <span className="font-medium">Lat/Lng:</span> {marker ? `${marker.lat.toFixed(6)}, ${marker.lng.toFixed(6)}` : "-"}
        </p>
      </div>
    </div>
  );
}

/* =========================================================================
   Reusable: Address form fields with validation
   ========================================================================= */
function AddressInputs({ data, setData, errors, setTouched }) {
  const bind = (key) => ({
    value: data[key] ?? "",
    onChange: (e) => setData((d) => ({ ...d, [key]: e.target.value })),
    onBlur: () => setTouched((t) => ({ ...t, [key]: true })),
  });
  const cls = (key) =>
    `w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 ${errors[key] ? "border-red-500" : "border-gray-300"}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700">
          Address Line 1 <span className="text-red-600">*</span>
        </label>
        <input className={cls("addressLine1")} placeholder="e.g., 30 Simei St 3" {...bind("addressLine1")} required />
        {errors.addressLine1 && <p className="text-xs text-red-600 mt-1">{errors.addressLine1}</p>}
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700">Address Line 2</label>
        <input className={cls("addressLine2")} placeholder="Apartment, suite, etc." {...bind("addressLine2")} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          City <span className="text-red-600">*</span>
        </label>
        <input className={cls("city")} placeholder="City" {...bind("city")} required />
        {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city}</p>}
      </div>

      <div>
        <label className="block text sm font-medium text-gray-700">Province/State</label>
        <input className={cls("province")} placeholder="Province / State" {...bind("province")} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Postal Code</label>
        <input className={cls("postalCode")} placeholder="Postal code" {...bind("postalCode")} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Country <span className="text-red-600">*</span>
        </label>
        <input className={cls("country")} placeholder="Country" {...bind("country")} required />
        {errors.country && <p className="text-xs text-red-600 mt-1">{errors.country}</p>}
      </div>

      {errors.latlng && (
        <div className="md:col-span-2">
          <div className="text-xs text-red-600">{errors.latlng}</div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   Main FNOL page
   ========================================================================= */
export default function Fnol() {
  const navigate = useNavigate();
  const { state } = useLocation();

  // If user landed here without policy context, push them back to search/lookup.
  useEffect(() => {
    if (!state) navigate("/policy-lookup", { replace: true });
  }, [state, navigate]);
  if (!state) return null;

  // Normalize status for eligibility
  const rawStatus = state?.policyStatus;
  const normalizedStatus = normStatus(rawStatus);
  const eligible = canRegister(rawStatus);

  const [accidentDateTimeLocal, setAccidentDateTimeLocal] = useState(toLocalDatetimeInput(new Date()));
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("Medium"); // backend expects "High|Medium|Low"
  const [severityTouched, setSeverityTouched] = useState(false);
  const [severitySuggestion, setSeveritySuggestion] = useState(null);

  const [toast, setToast] = useState({ show: false, kind: "success", text: "" });
  const toastRef = useRef(null);

  const [showDialog, setShowDialog] = useState(false);
  const [createdFnol, setCreatedFnol] = useState(null);

  // Start the FNOL notice subscription only after we have a reference number
  const fnolRef = createdFnol?.fnolReferenceNo || null;
  const [assignNotice, setAssignNotice] = useState(null);

  const { data: subData, error: subError } = useSubscription(FNOL_ASSIGNMENT_NOTICE, {
    skip: !fnolRef,
    variables: { fnolReferenceNo: fnolRef },
    fetchPolicy: "no-cache",
  });

  useEffect(() => {
    const notice = subData?.fnolAssignmentNotice;
    if (!notice) return;
    setAssignNotice(notice);
    setToast({
      show: true,
      kind: notice.status?.toLowerCase() === "failed" ? "error" : "success",
      text: notice.message || "FNOL has been sent to surveyor",
    });
  }, [subData]);

  useEffect(() => {
    if (!subError) return;
    setToast({ show: true, kind: "error", text: "Live updates connection lost. Retrying…" });
  }, [subError]);

  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorInfo, setErrorInfo] = useState({ title: "", friendly: "", tech: "" });
  const [showTech, setShowTech] = useState(false);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  const [policyNumberVal, setPolicyNumberVal] = useState(state?.policyNumber ?? state?.policy?.policyNumber ?? "");
  const [registrationNumber, setRegistrationNumber] = useState(state?.vehicle?.registrationNumber ?? "");
  const normalizedReg = useMemo(() => normalizeRegistration(registrationNumber), [registrationNumber]);

  useEffect(() => {
    if (description) return;
    const v = state?.vehicle;
    const plate = v?.registrationNumber || "-";
    const make = v?.make || "-";
    const model = v?.model || "";
    const year = v?.year || "";
    const who = state?.insured?.fullName || "Insured";
    setDescription(`FNOL for ${who} — ${plate} • ${make} ${model} ${year}`.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const usage = state?.vehicle?.usageType || state?.vehicle?.usage_type;
    const suggestion = computeSeveritySuggestion(usage, description);
    setSeveritySuggestion(suggestion);
    if (!severityTouched && suggestion?.value) {
      const mapped = SEVERITY_MAP[suggestion.value] || "Medium";
      setSeverity(mapped);
    }
  }, [state?.vehicle?.usageType, state?.vehicle?.usage_type, description, severityTouched]);

  const [accidentLocationId, setAccidentLocationId] = useState("");
  const [locationData, setLocationData] = useState({
    ...SG_DEFAULT,
    formattedAddress: "",
    placeId: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    province: "",
    postalCode: "",
    country: "Singapore",
  });

  const [addrErrors, setAddrErrors] = useState({});
  const [addrTouched, setAddrTouched] = useState({});

  const [autoCreateAddress, setAutoCreateAddress] = useState(Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY));
  const [geocoding, setGeocoding] = useState(false);

  const [created, setCreated] = useState(false);
  const hasUnsaved =
    !created && (!!description.trim() || !!accidentLocationId || !!locationData || !!accidentDateTimeLocal);
  useUnsavedChangesWarning(hasUnsaved);

  const [createAddress, { loading: addrLoading }] = useMutation(CREATE_ADDRESS);
  const [createFnol, { loading: fnolLoading }] = useMutation(CREATE_FNOL, {
    onCompleted: async (res) => {
      const fnol = res?.createFnol?.fnol ?? null;
      setCreated(true);
      setCreatedFnol(fnol);
      setShowDialog(true);
      setToast({ show: true, kind: "success", text: "FNOL created successfully." });
    },
    onError: (e) => {
      const info = extractErrorInfo(e);
      setErrorInfo(info);
      setShowTech(false);
      setShowErrorDialog(true);
      setToast({ show: true, kind: "error", text: info.friendly });
      console.error("Create FNOL failed:", e);
    },
  });

  const creating = fnolLoading || addrLoading || geocoding;
  const mapsConfigured = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

  const idempotencyKey = useMemo(() => {
    if (locationData?.placeId) return locationData.placeId;
    const lat = Number(locationData?.lat);
    const lng = Number(locationData?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return `${lat.toFixed(5)},${lng.toFixed(5)}`;
    return null;
  }, [locationData?.placeId, locationData?.lat, locationData?.lng]);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const tryCreateAddress = async () => {
    const latitude = Number(locationData?.lat);
    const longitude = Number(locationData?.lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude))
      throw new Error("Invalid coordinates for address creation");

    const common = {
      addressLine1: locationData?.addressLine1 || locationData?.formattedAddress || null,
      addressLine2: locationData?.addressLine2 || null,
      city: locationData?.city || null,
      province: locationData?.province || null,
      postalCode: locationData?.postalCode || null,
      country: locationData?.country || "Singapore",
      latitude,
      longitude,
      googlePlaceId: locationData?.placeId || null,
      locationType: "ACCIDENT_SITE",
    };

    const attempts = [{ payload: common }, { payload: { ...common, locationType: "OTHER" } }];

    for (let i = 0; i < attempts.length; i++) {
      const { payload } = attempts[i];
      for (let retry = 0; retry < 3; retry++) {
        try {
          const resp = await createAddress({
            variables: { input: payload },
            context: idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : undefined,
          });
          const addr = resp?.data?.createAddress ?? null;
          if (addr?.id) return String(addr.id);
        } catch (err) {
          const msg = err?.graphQLErrors?.[0]?.message || "";
          if (/violates|not-null|validation/i.test(msg)) throw err;
          if (retry === 2) console.error("Address create failed:", err);
        }
        await sleep(200 * Math.pow(2, retry));
      }
    }
    throw new Error("Address creation returned null");
  };

  // recompute validation whenever inputs change (only when we rely on auto-create)
  useEffect(() => {
    if (accidentLocationId) {
      setAddrErrors({});
      return;
    }
    const errs = validateAddress(locationData, { requireLatLng: autoCreateAddress && mapsConfigured });
    setAddrErrors(errs);
  }, [locationData, autoCreateAddress, mapsConfigured, accidentLocationId]);

  const mapsConfiguredButMissingLatLng =
    !accidentLocationId && autoCreateAddress && mapsConfigured && addrErrors.latlng;

  const formInvalid =
    !isOnline ||
    !eligible ||
    !policyNumberVal ||
    !normalizedReg ||
    !accidentDateTimeLocal ||
    !description.trim() ||
    geocoding ||
    (!accidentLocationId && autoCreateAddress && Object.keys(addrErrors).length > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formInvalid) {
      setAddrTouched({
        addressLine1: true,
        city: true,
        country: true,
        province: true,
        postalCode: true,
      });
      setToast({ show: true, kind: "error", text: !eligible ? "Policy status is not eligible for FNOL." : "Please fix the highlighted address fields." });
      return;
    }

    let locationIdToUse = accidentLocationId || null;

    if (!locationIdToUse) {
      if (autoCreateAddress && mapsConfigured && locationData?.lat && locationData?.lng) {
        try {
          locationIdToUse = await tryCreateAddress();
        } catch (err) {
          const info = extractErrorInfo(err);
          setErrorInfo({
            title: "Address creation failed",
            friendly: info.friendly || "Failed to create address. Please try again.",
            tech: info.tech,
          });
          setShowTech(false);
          setShowErrorDialog(true);
          return;
        }
      } else {
        setErrorInfo({
          title: "Missing location",
          friendly: "Please pick a location or provide an Address ID.",
          tech: "No accidentLocationId and auto-create disabled or not configured.",
        });
        setShowTech(false);
        setShowErrorDialog(true);
        return;
      }
    }

    const isoWithOffset = localInputToIsoWithOffset(accidentDateTimeLocal);
    if (!isoWithOffset) {
      setErrorInfo({
        title: "Invalid date/time",
        friendly: "Please provide a valid accident date & time.",
        tech: `Could not parse '${accidentDateTimeLocal}'`,
      });
      setShowTech(false);
      setShowErrorDialog(true);
      return;
    }

    try {
      await createFnol({
        variables: {
          policyNumber: policyNumberVal,
          registrationNumber: normalizedReg,
          accidentLocationId: locationIdToUse,
          description: description.trim(),
          severity, // "High" | "Medium" | "Low" as expected by backend enum
          accidentDate: isoWithOffset,
        },
      });
    } catch (err) {
      const info = extractErrorInfo(err);
      setErrorInfo(info);
      setShowTech(false);
      setShowErrorDialog(true);
    }
  };

  const closeDialogAndGoInquiry = useCallback(() => {
    setShowDialog(false);
    navigate("/fnol-inquiry", { replace: true });
  }, [navigate]);

  const retryFromError = useCallback(() => {
    setShowErrorDialog(false);
  }, []);

  useEffect(() => {
    if (!toast.show) return;
    if (toast.kind !== "error") {
      const t = setTimeout(() => setToast((x) => ({ ...x, show: false })), 3500);
      return () => clearTimeout(t);
    } else {
      toastRef.current?.focus?.();
    }
  }, [toast.show, toast.kind]);

  const safeDate = (d) => {
    const s = toLocalDatetimeInput(d);
    return s ? s.slice(0, 10) : "-";
  };

  const confirmAddress = useMemo(() => {
    const a = createdFnol?.accidentLocation;
    if (a?.id) return a;
    return {
      id: "(local)",
      addressLine1: locationData.addressLine1 || locationData.formattedAddress || "",
      addressLine2: locationData.addressLine2 || "",
      city: locationData.city || "",
      province: locationData.province || "",
      postalCode: locationData.postalCode || "",
      country: locationData.country || "",
      latitude: locationData.lat,
      longitude: locationData.lng,
      googlePlaceId: locationData.placeId || "",
      locationType: "ACCIDENT_SITE",
      createdAt: "",
    };
  }, [createdFnol?.accidentLocation, locationData]);

  return (
    <div className="h-full w-full">
      <div className="mx-auto h-full p-4 md:p-6">
        {!isOnline && (
          <div className="mb-3 text-sm text-amber-900 bg-amber-50 border border-amber-200 p-3 rounded">
            You are offline. Reconnect to submit the FNOL.
          </div>
        )}

        <div className="bg-white h-full rounded-lg shadow-md flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl md:text-2xl font-semibold text-blue-800">📝 Create FNOL</h2>
            <div className="flex items-center gap-3">
              {assignNotice && (
                <span
                  className={`px-2 py-1 rounded text-xs border ${
                    assignNotice.status === "FAILED"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : assignNotice.status === "ASSIGNED"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}
                  title={assignNotice.timestamp}
                >
                  Assignment: {assignNotice.status ?? "PENDING"}
                </span>
              )}
              <button type="button" onClick={() => navigate(-1)} className="px-3 py-2 rounded border text-gray-700 hover:bg-gray-50">
                Back
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4 space-y-6">
            {/* Eligibility banner */}
            {rawStatus
              ? !eligible && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded">
                    ⚠️ FNOL allowed only when status is <b>BIND</b> or <b>IN_FORCE</b>. Current: <b>{normalizedStatus}</b>.
                  </div>
                )
              : (
                <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded">
                  ℹ️ Policy status not provided by the previous page. You can still fill the form, but submission requires an eligible policy.
                </div>
              )}

            {/* Policy */}
            <InfoCard title="Policy Details">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <Field label="Policy Number">
                  <div className="max-w-sm">
                    <PolicyNumberField value={policyNumberVal} onChange={setPolicyNumberVal} locked={Boolean(state?.policyNumber)} />
                  </div>
                </Field>
                <Field label="Status">{rawStatus ? normalizedStatus : "—"}</Field>
                <Field label="Type">{state?.policyType ?? "-"}</Field>
                <Field label="Start Date">{safeDate(state?.startDate)}</Field>
                <Field label="End Date">{safeDate(state?.endDate)}</Field>
              </dl>
            </InfoCard>

            {/* Insured */}
            <InfoCard title="Insured Details">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <Field label="Name">{(state?.insured?.firstName ?? "-") + " " + (state?.insured?.lastName ?? "-")}</Field>
                <Field label="Email">{state?.insured?.email ?? "-"}</Field>
                <Field label="Phone Number">{state?.insured?.phoneNumber ?? "-"}</Field>
              </dl>
            </InfoCard>

            {/* Vehicle */}
            <InfoCard title="Vehicle Details">
              {!state?.vehicle ? (
                <p className="text-gray-500 italic">No vehicle found.</p>
              ) : (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <Field label="Registration Number">{state.vehicle.registrationNumber ?? "-"}</Field>
                  <Field label="Chassis Number">{state.vehicle.chassis ?? "-"}</Field>
                  <Field label="Make / Model">{(state.vehicle.make ?? "-") + " " + (state.vehicle.model ?? "")}</Field>
                  <Field label="Year">{state.vehicle.year ?? "-"}</Field>
                  <Field label="Usage Type">{state.vehicle.usageType ?? "-"}</Field>
                  <Field label="Engine">{state.vehicle.engineNo ?? "-"}</Field>
                  <Field label="Fuel Type">{state.vehicle.fuelType ?? "-"}</Field>
                  <Field label="Body Type">{state.vehicle.bodyType ?? "-"}</Field>
                  <Field label="Color">{state.vehicle.color ?? "-"}</Field>
                </dl>
              )}
            </InfoCard>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Registration */}
              <div>
                <label htmlFor="reg" className="block font-medium text-gray-700">
                  Vehicle Registration Number
                </label>
                <input
                  id="reg"
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  onBlur={(e) => setRegistrationNumber(normalizeRegistration(e.target.value))}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-300"
                  placeholder="e.g., SGP1234A"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">This will be validated against the selected policy.</p>
                {!normalizedReg && <div className="text-xs text-rose-700 mt-1">Please enter a valid registration number.</div>}
              </div>

              {/* Single date & time picker */}
              <div>
                <label htmlFor="accidentDateTime" className="block font-medium text-gray-700">
                  Accident Date & Time
                </label>
                <input
                  id="accidentDateTime"
                  type="datetime-local"
                  value={accidentDateTimeLocal}
                  onChange={(e) => setAccidentDateTimeLocal(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-300"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">This will be sent as a single timestamp (with timezone offset) to the server.</p>
              </div>

              {/* Severity */}
              <div>
                <div className="flex items-center gap-2">
                  <label htmlFor="severity" className="block font-medium text-gray-700">
                    Severity
                  </label>
                  <span
                    title="We suggest severity based on keywords like 'injury', 'towed', 'highway', and vehicle usage."
                    className="text-gray-500 cursor-help"
                  >
                    ⓘ
                  </span>
                </div>
                <select
                  id="severity"
                  value={severity}
                  onChange={(e) => {
                    setSeverity(e.target.value); // "High" | "Medium" | "Low"
                    setSeverityTouched(true);
                  }}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-300"
                >
                  {SEVERITY_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {severitySuggestion && (
                  <div className="text-xs text-gray-500 mt-1" aria-live="polite">
                    Suggested: <b>{SEVERITY_MAP[severitySuggestion.value] || "Medium"}</b> — {severitySuggestion.reason}
                    {severity !== (SEVERITY_MAP[severitySuggestion.value] || "Medium") && (
                      <button
                        type="button"
                        onClick={() => {
                          setSeverity(SEVERITY_MAP[severitySuggestion.value] || "Medium");
                          setSeverityTouched(false);
                        }}
                        className="ml-2 text-blue-700 underline"
                      >
                        Use suggestion
                      </button>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">Sent to server as {severity}.</p>
              </div>

              {/* Location */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-gray-700">Accident Location</label>
                  <label className={`flex items-center gap-2 text-sm ${!mapsConfigured ? "opacity-50" : ""}`}>
                    <input
                      type="checkbox"
                      checked={autoCreateAddress && mapsConfigured}
                      onChange={(e) => setAutoCreateAddress(e.target.checked && mapsConfigured)}
                      disabled={!mapsConfigured}
                    />
                    Auto-create Address (if no ID)
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      value={accidentLocationId}
                      onChange={(e) => setAccidentLocationId(e.target.value)}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-300"
                      placeholder="Address ID (if known)"
                      aria-label="Existing Address ID"
                    />
                    <p className="text-xs text-gray-500 mt-1">Provide an existing Address ID to skip address entry.</p>
                  </div>
                  <input
                    type="text"
                    value={locationData?.formattedAddress || ""}
                    readOnly
                    className="w-full p-2 border rounded bg-gray-100"
                    placeholder="Selected address"
                    aria-label="Selected address"
                  />
                </div>

                {/* Editable address inputs */}
                {!accidentLocationId && (
                  <>
                    {Object.keys(addrErrors).length > 0 &&
                      (addrTouched.addressLine1 || addrTouched.city || addrTouched.country) && (
                        <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded">
                          Please correct the highlighted address fields.
                        </div>
                      )}
                    <AddressInputs data={locationData} setData={setLocationData} errors={addrErrors} setTouched={setAddrTouched} />
                  </>
                )}

                <LocationPicker value={locationData} onChange={setLocationData} onGeocodingChange={setGeocoding} />

                {mapsConfiguredButMissingLatLng && (
                  <div className="text-xs text-red-600">
                    A map location is required when auto-creating an address. Please search or drag the marker.
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="desc" className="block font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-300"
                  rows={4}
                  placeholder="Briefly describe the incident"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={formInvalid || creating}
                className={`w-full px-4 py-2 rounded shadow ${
                  !(formInvalid || creating) ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-400 cursor-not-allowed text-white"
                }`}
              >
                {creating ? (geocoding ? "Reverse geocoding location…" : "Submitting…") : "Submit FNOL"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast.show && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded shadow-lg text-sm flex items-start gap-3 ${
            toast.kind === "success" ? "bg-green-600 text-white" : toast.kind === "error" ? "bg-red-600 text-white" : "bg-gray-800 text-white"
          }`}
          role="status"
          ref={toastRef}
          tabIndex={-1}
        >
          <div className="font-semibold">{toast.kind === "success" ? "Success" : toast.kind === "error" ? "Error" : "Info"}</div>
          <div className="opacity-95">{toast.text}</div>
          <button className="ml-2 underline" onClick={() => setToast((t) => ({ ...t, show: false }))} type="button">
            Dismiss
          </button>
        </div>
      )}

      {/* =======================================
          FNOL Created Dialog
          ======================================= */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" aria-labelledby="fnol-dialog-title" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-black/40" onClick={closeDialogAndGoInquiry} />
          <div className="relative bg-white rounded-2xl shadow-xl w-[95%] max-w-2xl mx-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 id="fnol-dialog-title" className="text-xl font-semibold text-blue-800">
                ✅ FNOL Created
              </h3>
              <button type="button" className="text-gray-500 hover:text-gray-700" aria-label="Close" onClick={closeDialogAndGoInquiry}>
                ✕
              </button>
            </div>

            <div className="space-y-5">
              {assignNotice && (
                <div
                  className={`p-3 rounded border text-sm ${
                    assignNotice.status === "FAILED" ? "bg-red-50 border-red-200 text-red-800" : "bg-green-50 border-green-200 text-green-800"
                  }`}
                >
                  {assignNotice.message || "Assignment update received."}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-500">FNOL ID</div>
                  <div className="font-medium">{createdFnol?.id ?? "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Reference No</div>
                  <div className="font-medium">{createdFnol?.fnolReferenceNo ?? "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Accident Date</div>
                  <div className="font-medium">{createdFnol?.accidentDate ?? localInputToIsoWithOffset(accidentDateTimeLocal)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Severity</div>
                  <div className="font-medium">{severity}</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Incident Description</div>
                <div className="font-medium break-words">{createdFnol?.description ?? description}</div>
              </div>

              <div className="p-4 rounded-lg border bg-gray-50">
                <div className="text-sm font-semibold text-gray-800 mb-2">Accident Location (Address)</div>
                <ConfirmAddress addressObj={createdFnol?.accidentLocation} fallback={locationData} />
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button type="button" className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-50" onClick={closeDialogAndGoInquiry}>
                Close
              </button>
              <button type="button" className="px-4 py-2 rounded bg-blue-700 text-white hover:brightness-110" onClick={() => navigate("/fnol-inquiry", { replace: true })}>
                Go to FNOL Inquiry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================
          Backend Error Dialog
          ======================================= */}
      {showErrorDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" aria-labelledby="fnol-error-title" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowErrorDialog(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-[95%] max-w-xl mx-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 id="fnol-error-title" className="text-xl font-semibold text-red-600">
                ❌ {errorInfo.title || "Error"}
              </h3>
              <button type="button" className="text-gray-500 hover:text-gray-700" aria-label="Close" onClick={() => setShowErrorDialog(false)}>
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded bg-red-50 border border-red-200 text-red-800">
                {errorInfo.friendly || "Something went wrong while creating the FNOL."}
              </div>

              <button type="button" className="text-sm underline text-gray-700" onClick={() => setShowTech((v) => !v)} aria-expanded={showTech} aria-controls="error-tech-details">
                {showTech ? "Hide technical details" : "Show technical details"}
              </button>

              {showTech && (
                <pre id="error-tech-details" className="whitespace-pre-wrap text-xs p-3 rounded bg-gray-50 border border-gray-200 overflow-auto max-h-56">
{errorInfo.tech}
                </pre>
              )}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button type="button" className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-50" onClick={() => setShowErrorDialog(false)}>
                Dismiss
              </button>
              <button type="button" className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700" onClick={retryFromError}>
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   Subcomponents
   ========================================================================= */
function ConfirmAddress({ addressObj, fallback }) {
  const a = addressObj?.id ? addressObj : {
    id: "(local)",
    addressLine1: fallback.addressLine1 || fallback.formattedAddress || "",
    addressLine2: fallback.addressLine2 || "",
    city: fallback.city || "",
    province: fallback.province || "",
    postalCode: fallback.postalCode || "",
    country: fallback.country || "",
    latitude: fallback.lat,
    longitude: fallback.lng,
    googlePlaceId: fallback.placeId || "",
    locationType: "ACCIDENT_SITE",
    createdAt: "",
  };

  const Row = ({ label, value }) => (
    <div>
      <span className="text-gray-500">{label}:</span> <span className="font-medium">{value ?? "-"}</span>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
      <Row label="Address ID" value={a.id} />
      <Row label="Place ID" value={a.googlePlaceId} />
      <div className="md:col-span-2"><Row label="Line 1" value={a.addressLine1} /></div>
      <div className="md:col-span-2"><Row label="Line 2" value={a.addressLine2} /></div>
      <Row label="City" value={a.city} />
      <Row label="Province" value={a.province} />
      <Row label="Postal Code" value={a.postalCode} />
      <Row label="Country" value={a.country} />
      <Row label="Latitude" value={a.latitude} />
      <Row label="Longitude" value={a.longitude} />
      <Row label="Location Type" value={a.locationType} />
      <Row label="Created At" value={a.createdAt} />
    </div>
  );
}

function PolicyNumberField({ value, onChange, locked }) {
  const [editing, setEditing] = useState(!locked);
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium">Number:</span>
      {editing ? (
        <>
          <input value={value} onChange={(e) => onChange(e.target.value)} className="p-1 border rounded flex-1" placeholder="Enter policy number" />
          {locked && (
            <button type="button" className="text-sm underline" onClick={() => setEditing(false)} title="Lock">
              Lock
            </button>
          )}
        </>
      ) : (
        <>
          <span>{value}</span>
          <button type="button" className="text-sm underline" onClick={() => setEditing(true)} title="Change policy number">
            Change
          </button>
        </>
      )}
    </div>
  );
}

function InfoCard({ title, children }) {
  return (
    <section className="p-6 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow">
      <h3 className="font-semibold text-xl mb-4 text-blue-900 border-b pb-2">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="text-gray-900">{children}</dd>
    </div>
  );
}
