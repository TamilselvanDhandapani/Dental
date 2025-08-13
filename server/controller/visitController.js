// controllers/visit.controller.js
const { createClient } = require('@supabase/supabase-js');

// Build an anon client bound to THIS request's JWT
const supabaseForReq = (req) =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.authorization } },
  });

// ---------- helpers ----------
const toIso = (v) => {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

const mapVisitBodyToRow = (body = {}, { forUpdate = false } = {}) => {
  const row = {};
  const set = (k, v) => { if (v !== undefined) row[k] = v; };

  if (!forUpdate) {
    set('created_by', body.created_by || body.createdBy); // will be overridden with req.user.id
    set('patient_id', body.patient_id || body.patient);
  }

  set('chief_complaint', body.chiefComplaint);
  set('duration_onset', body.durationOnset);
  set('trigger_factors', Array.isArray(body.triggerFactors) ? body.triggerFactors : undefined);
  set('diagnosis_notes', body.diagnosisNotes);
  set('treatment_plan_notes', body.treatmentPlanNotes);

  // findings & procedures come as JSON; DB trigger will normalize and compute "due"
  if (body.findings) set('findings', body.findings);
  if (body.procedures) set('procedures', body.procedures);

  set('visit_at', toIso(body.visitAt));

  return row;
};

const sbError = (res, error, status = 400) =>
  res.status(status).json({ error: error?.message || String(error) });

// ---------- controllers ----------

// Create a new Visit
const createVisit = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { patientId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Ensure patient exists & is visible under RLS (owned by this user)
    const { data: patient, error: pErr } = await supabase
      .from('patients')
      .select('id')
      .eq('id', patientId)
      .single();

    if (pErr?.code === 'PGRST116' || (!patient && !pErr)) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    if (pErr) return sbError(res, pErr);

    const row = mapVisitBodyToRow(req.body || {});
    row.created_by = userId;      // RLS WITH CHECK requires this to match auth.uid()
    row.patient_id = patientId;

    const { data, error } = await supabase
      .from('visits')
      .insert(row)
      .select('*')
      .single();

    if (error) return sbError(res, error);
    return res.status(201).json(data);
  } catch (err) {
    return sbError(res, err);
  }
};

// List visits for a patient (most recent first)
const listVisitsByPatient = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { patientId } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    // Optional: 404 if patient doesn't exist/visible
    const { data: patient, error: pErr } = await supabase
      .from('patients')
      .select('id')
      .eq('id', patientId)
      .single();
    if (pErr?.code === 'PGRST116' || (!patient && !pErr)) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    if (pErr) return sbError(res, pErr);

    const { data, error } = await supabase
      .from('visits')
      .select('*')
      .eq('patient_id', patientId)
      .order('visit_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) return sbError(res, error);
    return res.json(data);
  } catch (err) {
    return sbError(res, err);
  }
};

// Get one visit
const getVisit = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { visitId } = req.params;

    const { data, error } = await supabase
      .from('visits')
      .select('*')
      .eq('id', visitId)
      .single();

    if (error?.code === 'PGRST116' || (!data && !error)) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    if (error) return sbError(res, error);

    return res.json(data);
  } catch (err) {
    return sbError(res, err);
  }
};

// Update a visit
const updateVisit = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { visitId } = req.params;

    const row = mapVisitBodyToRow(req.body || {}, { forUpdate: true });
    if (Object.keys(row).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const { data, error } = await supabase
      .from('visits')
      .update(row)
      .eq('id', visitId)
      .select('*')
      .single();

    if (error?.code === 'PGRST116' || (!data && !error)) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    if (error) return sbError(res, error);

    return res.json(data);
  } catch (err) {
    return sbError(res, err);
  }
};

module.exports = {
  createVisit,
  listVisitsByPatient,
  getVisit,
  updateVisit,
};
