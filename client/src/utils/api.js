// src/api.js
import { supabase } from '../CreateClient';

const API_BASE ='http://localhost:5000/api';
const DEFAULT_TIMEOUT_MS = 20000;

function buildUrl(path, query) {
  const url = new URL(`${API_BASE}${path}`);
  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }
  return url.toString();
}

export async function authedFetch(path, { method = 'GET', body, headers, query, timeoutMs } = {}) {
  // Always grab the fresh token
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');

  // Timeout / Abort
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs ?? DEFAULT_TIMEOUT_MS);

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
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
        // await supabase.auth.signOut(); // uncomment if you want auto logout
      }
      const msg = (isJson ? (payload?.error || payload?.message) : payload) || res.statusText;
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

/* ---------------- Patients ---------------- */
export const createPatient   = (data)      => authedFetch('/patients', { method: 'POST', body: data });
export const getPatients     = (q = {})    => authedFetch('/patients', { query: q });
export const getPatient      = (id)        => authedFetch(`/patients/${id}`);
export const updatePatient   = (id, data)  => authedFetch(`/patients/${id}`, { method: 'PUT', body: data });
export const deletePatient   = (id)        => authedFetch(`/patients/${id}`, { method: 'DELETE' });

/* ------------- Medical History (one per patient) ------------- */
export const upsertMedicalHistory = (patientId, data) =>
  authedFetch(`/patients/${patientId}/medical-history`, { method: 'PUT', body: data });

export const getMedicalHistory = (patientId) =>
  authedFetch(`/patients/${patientId}/medical-history`);

/* --------------------- Visits --------------------- */
export const createVisit = (patientId, data) =>
  authedFetch(`/patients/${patientId}/visits`, { method: 'POST', body: data });

export const listVisitsByPatient = (patientId, q = {}) =>
  authedFetch(`/patients/${patientId}/visits`, { query: q });

export const getVisit = (visitId) =>
  authedFetch(`/visits/${visitId}`);

export const updateVisit = (visitId, data) =>
  authedFetch(`/visits/${visitId}`, { method: 'PUT', body: data });
