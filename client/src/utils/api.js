// src/api.js
import { supabase } from '../CreateClient';

const API_BASE = 'http://localhost:5000/api';
const DEFAULT_TIMEOUT_MS = 20000;

/* -------------------------------- Utils ---------------------------------- */
function buildUrl(path, query) {
  const url = new URL(`${API_BASE}${path}`);
  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }
  return url.toString();
}

function assertId(id, label = 'id') {
  if (!id || typeof id !== 'string') {
    throw new Error(`Missing or invalid ${label}`);
  }
}

/**
 * Fetch with Supabase JWT, JSON by default, timeout, and better error messages.
 */
export async function authedFetch(
  path,
  { method = 'GET', body, headers, query, timeoutMs } = {}
) {
  // Always grab the fresh token
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');

  // Timeout / Abort
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs ?? DEFAULT_TIMEOUT_MS);

  const isFormData =
    typeof FormData !== 'undefined' && body instanceof FormData;
  const url = buildUrl(path, query);

  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        Authorization: `Bearer ${token}`,
        ...headers,
      },
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    // 204 No Content
    if (res.status === 204) return null;

    const ct = res.headers.get('content-type') || '';
    const isJson = ct.includes('application/json');
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
    if (err?.name === 'AbortError') throw new Error('Request timed out');
    throw err;
  } finally {
    clearTimeout(to);
  }
}

/* ------------------------------ Patients --------------------------------- */
export const createPatient = (data) =>
  authedFetch('/patients', { method: 'POST', body: data });

export const getPatients = (q = {}) =>
  authedFetch('/patients', { query: q });

export const getPatient = (id) => {
  assertId(id, 'patientId');
  return authedFetch(`/patients/${id}`);
};

export const updatePatient = (id, data) => {
  assertId(id, 'patientId');
  return authedFetch(`/patients/${id}`, { method: 'PUT', body: data });
};

export const deletePatient = (id) => {
  assertId(id, 'patientId');
  return authedFetch(`/patients/${id}`, { method: 'DELETE' });
};

/* -------------------------- Medical History ------------------------------ */

export const upsertMedicalHistory = (patientId, data) => {
  assertId(patientId, 'patientId');
  return authedFetch(`/medicalhistory/${patientId}/medical-history`, {
    method: 'PUT',
    body: data,
  });
};

export const getMedicalHistory = (patientId) => {
  assertId(patientId, 'patientId');
  return authedFetch(`/medicalhistory/${patientId}/medical-history`);
};

/* -------------------------------- Visits --------------------------------- */

export const createVisit = (patientId, data) => {
  assertId(patientId, 'patientId');
  return authedFetch(`/visits/${patientId}/visits`, {
    method: 'POST',
    body: data,
  });
};

export const listVisitsByPatient = (patientId, q = {}) => {
  assertId(patientId, 'patientId');
  return authedFetch(`/visits/${patientId}/visits`, { query: q });
};

export const getVisit = (visitId) => {
  assertId(visitId, 'visitId');
  return authedFetch(`/visits/${visitId}`);
};

export const updateVisit = (visitId, data) => {
  assertId(visitId, 'visitId');
  return authedFetch(`/visits/${visitId}`, { method: 'PATCH', body: data });
};

export const deleteVisit = (visitId) => {
  assertId(visitId, 'visitId');
  return authedFetch(`/visits/${visitId}`, { method: 'DELETE' });
};

/* --------------------------- Appointments (opt) --------------------------- */
export const getNextApptForVisit = (visitId) => {
  assertId(visitId, 'visitId');
  return authedFetch(`/visits/${visitId}/next-appt`);
};

export const getNextApptsForVisit = (visitId) => {
  assertId(visitId, 'visitId');
  return authedFetch(`/visits/${visitId}/next-appts`);
};

export const getOverallNextAppts = (q = {}) =>
  authedFetch(`/visits/appointments/next`, { query: q });

/* -------------------------------- Analytics ------------------------------ */


export const getPatientsByYear = () =>
  authedFetch('/analytics/by-year');

export const getPatientsByYearMonth = (year) =>
  authedFetch('/analytics/by-year-month', {
    query: year ? { year } : {},
  });

export const getPatientsByYearGender = (year) =>
  authedFetch('/analytics/by-year-gender', {
    query: year ? { year } : {},
  });

export const getPatientsByAgeGroup = () =>
  authedFetch('/analytics/by-age-group');

export const getVisitsByYear = () =>
  authedFetch('/analytics/by-year');

export const getVisitsByMonth = (year) =>
  authedFetch('/analytics/by-month', {
    query: year ? { year } : {},
  });

// Appointments API List


export const listAppointments = (q = {}) =>
  authedFetch('/appointments', { query: q });

export const getAppointmentsByDate = (date) =>
  authedFetch('/appointments', { query: { date } });

export const getAppointmentsByRange = (from, to, extra = {}) =>
  authedFetch('/appointments', { query: { from, to, ...extra } });

export const createAppointment = (data) =>
  authedFetch('/appointments', { method: 'POST', body: data });

export const updateAppointment = (appointmentId, data) => {
  assertId(appointmentId, 'appointmentId');
  return authedFetch(`/appointments/${appointmentId}`, {
    method: 'PATCH',
    body: data,
  });
};

export const deleteAppointment = (appointmentId) => {
  assertId(appointmentId, 'appointmentId');
  return authedFetch(`/appointments/${appointmentId}`, { method: 'DELETE' });
};