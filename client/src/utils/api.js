// src/api.js — ImageKit-ready front-end API layer (Supabase storage removed)
// - Keeps Supabase Auth for API calls (authedFetch)
// - Replaces file upload helpers with ImageKit client upload via backend auth

import { supabase } from "../CreateClient";

const API_BASE = "https://dentalserver-6uja.onrender.com/api";
const DEFAULT_TIMEOUT_MS = 20000;

/* ------------------------------ ImageKit envs ---------------------------- */
// Required on the client:
//  VITE_IK_URL_ENDPOINT=https://ik.imagekit.io/<your_ik_id>
//  VITE_IK_PUBLIC_KEY=public_<...>
//  VITE_IK_AUTH_ENDPOINT=/api/imagekit-auth
const IK_URL_ENDPOINT =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_IK_URL_ENDPOINT) ||
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_IK_URL_ENDPOINT) ||
  null;
const IK_PUBLIC_KEY =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_IK_PUBLIC_KEY) ||
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_IK_PUBLIC_KEY) ||
  null;
const DEFAULT_IK_AUTH = `${API_BASE}/imagekit-auth`;
const IK_AUTH_ENDPOINT =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_IK_AUTH_ENDPOINT) ||
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_IK_AUTH_ENDPOINT) ||
  DEFAULT_IK_AUTH; // backend route that returns { token, signature, expire }

// Legacy envs kept for compatibility with call sites, but no longer used for storage
const STORAGE_BUCKET =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_PATIENT_BUCKET) ||
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_PATIENT_BUCKET) ||
  "patient-photos";

/* -------------------------------- Utils ---------------------------------- */
function buildUrl(path, query) {
  const url = new URL(`${API_BASE}${path}`);
  if (query && typeof query === "object") {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    });
  }
  return url.toString();
}

function assertId(id, label = "id") {
  if (!id || typeof id !== "string") {
    throw new Error(`Missing or invalid ${label}`);
  }
}

function assertIndex(index, label = "index") {
  const n = Number(index);
  if (!Number.isInteger(n) || n < 0) throw new Error(`Invalid ${label}`);
  return n;
}

const slug = (s = "") =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeExt = (file) => {
  // Derive extension from mime or filename; fix oddities like .jpegjpeg
  let ext = "jpg";
  const mime = file?.type || "";
  if (mime.startsWith("image/")) {
    ext = mime.split("/")[1] || ext;
  } else if (file?.name) {
    const maybe = file.name.split(".").pop()?.toLowerCase();
    if (maybe) ext = maybe;
  }
  ext = ext
    .replace(/(?:jpeg)+$/i, "jpeg")
    .replace(/(?:jpg)+$/i, "jpg")
    .replace(/(?:png)+$/i, "png")
    .replace(/(?:webp)+$/i, "webp");
  if (!["jpg", "jpeg", "png", "webp"].includes(ext)) ext = "jpg";
  return ext;
};

const isFile = (v) => typeof File !== "undefined" && v instanceof File;

function dataUrlToFile(dataUrl, fileName = "photo") {
  if (!dataUrl?.startsWith("data:")) return null;
  const [meta, b64] = dataUrl.split(",");
  const m = /^data:([^;]+);base64$/i.exec(meta || "");
  const mime = m?.[1] || "image/jpeg";
  const binStr = atob(b64 || "");
  const len = binStr.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = binStr.charCodeAt(i);
  const ext = mime.split("/")[1] || "jpg";
  const safe = `${slug(fileName)}.${ext}`;
  try {
    return new File([u8], safe, { type: mime });
  } catch {
    // Safari < 14 fallback
    return new Blob([u8], { type: mime });
  }
}

export const utils = { slug, normalizeExt, isFile, dataUrlToFile };

/* ------------------------ Auth'd fetch via Supabase ----------------------- */
/**
 * Fetch with Supabase JWT, JSON by default, timeout, and better error messages.
 */
export async function authedFetch(
  path,
  { method = "GET", body, headers, query, timeoutMs } = {}
) {
  // Always grab the fresh token
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated");

  // Timeout / Abort
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs ?? DEFAULT_TIMEOUT_MS);

  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  const url = buildUrl(path, query);

  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        Authorization: `Bearer ${token}`,
        ...headers,
      },
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    // 204 No Content
    if (res.status === 204) return null;

    const ct = res.headers.get("content-type") || "";
    const isJson = ct.includes("application/json");
    const payload = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      // Optional: auto sign out on 401
      if (res.status === 401) {
        // await supabase.auth.signOut();
      }
      const msg =
        (isJson ? payload?.error || payload?.message : payload) ||
        res.statusText;
      throw new Error(msg);
    }
    return isJson ? payload : { raw: payload };
  } catch (err) {
    if (err?.name === "AbortError") throw new Error("Request timed out");
    throw err;
  } finally {
    clearTimeout(to);
  }
}

/* ------------------------------ Patients --------------------------------- */
export const createPatient = (data) =>
  authedFetch("/patients", { method: "POST", body: data });

export const getPatients = (q = {}) =>
  authedFetch("/patients", { query: q });

export const getPatient = (id) => {
  assertId(id, "patientId");
  return authedFetch(`/patients/${id}`);
};

// Plain JSON update (no file)
export const updatePatient = (id, data) => {
  assertId(id, "patientId");
  return authedFetch(`/patients/${id}`, { method: "PUT", body: data });
};

export const deletePatient = (id) => {
  assertId(id, "patientId");
  return authedFetch(`/patients/${id}`, { method: "DELETE" });
};

export const patchPatient = (id, data) => {
  assertId(id, 'patientId');
  return authedFetch(`/patients/${id}`, { method: 'PATCH', body: data });
};

/**
 * Smart updater (ImageKit version): uploads photo to ImageKit if provided, 
 * otherwise preserves existing photo by omitting `photoUrl`.
 *
 * Usage:
 *   await updatePatientSmart(id, { ...form, photoFile: form._photoFile })
 *   // or if you only have a data URL:
 *   await updatePatientSmart(id, { ...form, photoUrl: form.photoUrl })
 */
export async function updatePatientSmart(id, data = {}) {
  assertId(id, "patientId");

  const payload = { ...data };

  // 1) If the caller added a File (recommended path)
  let file = null;
  if (isFile(payload.photoFile)) file = payload.photoFile;

  // 2) If they only have a data URL, convert it to a Blob/File for upload
  if (!file && typeof payload.photoUrl === "string" && payload.photoUrl.startsWith("data:")) {
    const f = dataUrlToFile(payload.photoUrl, "photo");
    if (f) file = f;
  }

  // Upload file first if present, then set payload.photoUrl to the ImageKit URL
  if (file) {
    const ext = normalizeExt(file);
    const baseName = slug((file.name || "photo").replace(/\.[^.]+$/, "")) || "photo";
    const fileName = `${baseName}.${ext}`;

    const ik = await uploadImageKitFile(file, fileName, { folder: "/patients" });
    payload.photoUrl = ik?.url || null; // store full CDN url
    // Optionally send metadata to your API as well (if your backend supports it):
    // payload.photoMeta = { filePath: ik?.filePath, thumbnailUrl: ik?.thumbnailUrl };

    delete payload.photoFile;
  } else {
    // No new file supplied; do not send `photoUrl` at all so server keeps existing value
    if (!payload.photoUrl) delete payload.photoUrl;
  }

  return updatePatient(id, payload);
}

/* -------------------------- Medical History ------------------------------ */
export const upsertMedicalHistory = (patientId, data) => {
  assertId(patientId, "patientId");
  return authedFetch(`/medicalhistory/${patientId}/medical-history`, {
    method: "PUT",
    body: data,
  });
};

export const getMedicalHistory = (patientId) => {
  assertId(patientId, "patientId");
  return authedFetch(`/medicalhistory/${patientId}/medical-history`);
};

/* -------------------------------- Visits --------------------------------- */
export const createVisit = (patientId, data) => {
  assertId(patientId, "patientId");
  return authedFetch(`/visits/${patientId}/visits`, {
    method: "POST",
    body: data,
  });
};

export const listVisitsByPatient = (patientId, q = {}) => {
  assertId(patientId, "patientId");
  return authedFetch(`/visits/${patientId}/visits`, { query: q });
};

export const getVisit = (visitId) => {
  assertId(visitId, "visitId");
  return authedFetch(`/visits/${visitId}`);
};

export const updateVisit = (visitId, data) => {
  assertId(visitId, "visitId");
  return authedFetch(`/visits/${visitId}`, { method: "PATCH", body: data });
};

export const deleteVisit = (visitId) => {
  assertId(visitId, "visitId");
  return authedFetch(`/visits/${visitId}`, { method: "DELETE" });
};

/* ---------- Procedures on a Visit (JSON array; zero-based index) ---------- */
/**
 * Append a procedure to a visit.
 * Server recalculates numeric fields (total, paid, due) via trigger.
 * @param {string} visitId
 * @param {{procedure?:string, total?:number, paid?:number, notes?:string, visitDate?:string, nextApptDate?:string}} data
 */
export const addVisitProcedure = (visitId, data) => {
  assertId(visitId, "visitId");
  return authedFetch(`/visits/${visitId}/procedures`, {
    method: "POST",
    body: data,
  });
};

/**
 * Patch/merge an existing procedure by its array index (0-based).
 * @param {string} visitId
 * @param {number|string} index
 * @param {object} data
 */
export const updateVisitProcedureByIndex = (visitId, index, data) => {
  assertId(visitId, "visitId");
  const idx = assertIndex(index, "procedure index");
  return authedFetch(`/visits/${visitId}/procedures/${idx}`, {
    method: "PATCH",
    body: data,
  });
};

/**
 * Delete a procedure by its array index (0-based).
 * @param {string} visitId
 * @param {number|string} index
 */
export const deleteVisitProcedureByIndex = (visitId, index) => {
  assertId(visitId, "visitId");
  const idx = assertIndex(index, "procedure index");
  return authedFetch(`/visits/${visitId}/procedures/${idx}`, {
    method: "DELETE",
  });
};

/* --------------------------- Appointments (opt) --------------------------- */
export const getNextApptForVisit = (visitId) => {
  assertId(visitId, "visitId");
  return authedFetch(`/visits/${visitId}/next-appt`);
};

export const getNextApptsForVisit = (visitId) => {
  assertId(visitId, "visitId");
  return authedFetch(`/visits/${visitId}/next-appts`);
};

export const getOverallNextAppts = (q = {}) =>
  authedFetch(`/visits/appointments/next`, { query: q });

/* -------------------------------- Analytics ------------------------------ */
/* Patients */
export const getPatientsByYear = () =>
  authedFetch("/analytics/patients/by-year");

export const getPatientsByYearMonth = (year) =>
  authedFetch("/analytics/patients/by-year-month", { query: year ? { year } : {} });

export const getPatientsByYearGender = (year) =>
  authedFetch("/analytics/patients/by-year-gender", { query: year ? { year } : {} });

export const getPatientsByAgeGroup = () =>
  authedFetch("/analytics/patients/by-age-group");

/* Visits (now support optional tz) */
export const getVisitsByYear = ({ tz } = {}) =>
  authedFetch("/analytics/visits/by-year", { query: tz ? { tz } : {} });

export const getVisitsByMonth = ({ year, tz } = {}) =>
  authedFetch("/analytics/visits/by-month", {
    query: {
      ...(year ? { year } : {}),
      ...(tz ? { tz } : {}),
    },
  });

/* Revenue (improved set) */
export const getRevenueByMonth = ({ year, tz } = {}) =>
  authedFetch("/analytics/revenue/by-month", {
    query: {
      ...(year ? { year } : {}),
      ...(tz ? { tz } : {}),
    },
  });

export const getRevenueByYear = ({ tz } = {}) =>
  authedFetch("/analytics/revenue/by-year", { query: tz ? { tz } : {} });

export const getCollectionsRateByMonth = ({ year, tz } = {}) =>
  authedFetch("/analytics/revenue/collections-rate-by-month", {
    query: {
      ...(year ? { year } : {}),
      ...(tz ? { tz } : {}),
    },
  });

export const getRevenueRolling12m = ({ end, tz } = {}) =>
  authedFetch("/analytics/revenue/rolling-12m", {
    query: {
      ...(end ? { end } : {}),
      ...(tz ? { tz } : {}),
    },
  });

/* ------------------------ Appointments API List -------------------------- */
export const listAppointments = (q = {}) =>
  authedFetch("/appointments", { query: q });

export const getAppointmentsByDate = (date) =>
  authedFetch("/appointments", { query: { date } });

export const getAppointmentsByRange = (from, to, extra = {}) =>
  authedFetch("/appointments", { query: { from, to, ...extra } });

export const createAppointment = (data) =>
  authedFetch("/appointments", { method: "POST", body: data });

export const updateAppointment = (appointmentId, data) => {
  assertId(appointmentId, "appointmentId");
  return authedFetch(`/appointments/${appointmentId}`, {
    method: "PATCH",
    body: data,
  });
};

export const deleteAppointment = (appointmentId) => {
  assertId(appointmentId, "appointmentId");
  return authedFetch(`/appointments/${appointmentId}`, { method: "DELETE" });
};

/* ---------------------------- Photos / ImageKit --------------------------- */
/**
 * Upload a patient's photo to ImageKit and return { url, filePath, thumbnailUrl }.
 * (This replaces the old Supabase Storage path flow.)
 */
export async function uploadPatientPhoto(
  patientId,
  file,
  { folder = "/patients", fileName } = {}
) {
  assertId(patientId, "patientId");
  if (!file) return { url: null, filePath: null, thumbnailUrl: null, fileId: null };

  const ext = normalizeExt(file);
  const baseName = slug((file.name || fileName || "photo").replace(/\.[^.]+$/, "")) || "photo";
  const finalName = `${Date.now()}-${baseName}.${ext}`;

  const res = await uploadImageKitFile(file, finalName, { folder });
  console.log("🖼️ ImageKit upload complete", {
    patientId,
    url: res?.url,
    filePath: res?.filePath,
    thumbnailUrl: res?.thumbnailUrl,
    fileId: res?.fileId,
  });
  return {
    url: res?.url || null,
    filePath: res?.filePath || null,
    thumbnailUrl: res?.thumbnailUrl || null,
    fileId: res?.fileId || null,
  };
}

/**
 * Update the patients.photo_url with the given URL by calling your API (NOT direct DB).
 * NOTE: Prefer using `updatePatientSmart` which calls the API with the full payload.
  */
// src/api.js
export async function updatePatientPhotoUrl(patientId, url) {
  assertId(patientId, "patientId");
  return authedFetch(`/patients/${patientId}/photo`, {
    method: 'PATCH',
    body: { photoUrl: url },
  });
}


/**
 * Create a display URL from a path or a full URL. If `tr` is provided, applies IK transformations.
 * Works with either `filePath` ("/patients/.../file.jpg") or a full `https://` url.
 */
export async function getSignedPhotoUrl(pathOrUrl, { tr } = {}) {
  if (!pathOrUrl) return null;
  const make = (u) => (tr ? `${u}${u.includes("?") ? "&" : "?"}tr=${encodeURIComponent(tr)}` : u);
  if (/^https?:\/\//i.test(pathOrUrl)) return make(pathOrUrl);
  if (IK_URL_ENDPOINT) return make(`${IK_URL_ENDPOINT}/${pathOrUrl.replace(/^\/+/, "")}`);
  return make(pathOrUrl);
}

/**
 * Delete a photo from ImageKit — must be done server-side (requires private key).
 * This client helper calls your backend route to perform the deletion.
 */
export async function deletePatientPhoto(
  filePath,
  { backendEndpoint = "/api/imagekit-delete", fileId } = {}
) {
  if (!filePath && !fileId) return { ok: true };
  // Prefer fileId if available; fallback to filePath
  const body = fileId ? { fileId } : { filePath };
  return authedFetch(backendEndpoint, { method: "POST", body });
}

/** Low-level helper to upload to ImageKit via backend-signed auth. */
async function uploadImageKitFile(file, fileName, { folder = "/patients" } = {}) {
  if (!IK_PUBLIC_KEY) throw new Error("ImageKit public key missing (VITE_IK_PUBLIC_KEY)");
  // 1) Get signature from backend
  // Optionally send Supabase bearer so your backend can auth the request
  const { data: { session } } = await supabase.auth.getSession();
  const bearer = session?.access_token;

  const authRes = await fetch(IK_AUTH_ENDPOINT, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    },
  });
  const authText = await authRes.text();
  if (!authRes.ok) {
    throw new Error(`ImageKit auth endpoint error ${authRes.status}: ${authText.slice(0,200)}`);
  }
  let authJson;
  try {
    authJson = JSON.parse(authText);
  } catch (e) {
    throw new Error(`ImageKit auth endpoint did not return JSON. Body starts with: ${authText.slice(0,80)}`);
  }
  const { token, signature, expire } = authJson;

  // 2) Upload to ImageKit Upload API
  const fd = new FormData();
  fd.append("file", file, fileName || file.name || "upload"); // File/Blob
  fd.append("fileName", fileName || file.name || "upload");
  fd.append("publicKey", IK_PUBLIC_KEY);
  fd.append("signature", signature);
  fd.append("expire", String(expire));
  fd.append("token", token);
  if (folder) fd.append("folder", folder);
  fd.append("useUniqueFileName", "true");
  fd.append("responseFields", "url,thumbnailUrl,filePath,fileId");

  const up = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    body: fd,
  });
  if (!up.ok) {
    const t = await up.text().catch(() => "");
    throw new Error(`ImageKit upload failed ${up.status}: ${t}`);
  }
  return up.json();
}
