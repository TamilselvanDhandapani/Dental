// controllers/patientController.js
const { createClient } = require('@supabase/supabase-js');

/* ---------------- Supabase client bound to incoming JWT ---------------- */
const supabaseForReq = (req) =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.authorization } },
  });

/* ---------------------------- small helpers ---------------------------- */
const sbError = (res, error, status = 400) =>
  res.status(status).json({ error: error?.message || String(error) });

const toDateOnly = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
};

const clampNum = (n) => (Number.isFinite(n) && n >= 0 ? n : 0);
const parseNum = (v) => {
  const n = parseFloat(String(v ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
};
const hasValue = (v) => String(v ?? '').trim() !== '';

/* --------------- body -> table row (used by UPDATE only) --------------- */
const mapPatientBodyToRow = (body = {}, { forUpdate = false } = {}) => {
  const row = {};
  const set = (k, v) => { if (v !== undefined) row[k] = v; };

  if (!forUpdate) {
    set('created_by', body.created_by || body.createdBy); // harmless if present
  }

  set('first_name', body.firstName);
  set('last_name', body.lastName);
  set('dob', toDateOnly(body.dob));
  set('gender', body.gender);
  set('phone', body.phone);
  set('email', body.email?.toLowerCase?.());
  set('address_line1', body.addressLine1);
  set('address_line2', body.addressLine2);
  set('city', body.city);
  set('state', body.state);
  set('pincode', body.pincode);
  set('occupation', body.occupation);
  set('emergency_contact', body.emergencyContact ?? null); // jsonb
  set('photo_url', body.photoUrl);

  return row;
};

/* ---------------- RPC mappers for atomic initial create ---------------- */
const mapPatientRPC = (body = {}) => ({
  first_name: body.firstName,
  last_name: body.lastName,
  dob: toDateOnly(body.dob),
  gender: body.gender,
  phone: body.phone,
  email: body.email?.toLowerCase?.(),
  address_line1: body.addressLine1,
  address_line2: body.addressLine2,
  city: body.city,
  state: body.state,
  pincode: body.pincode,
  occupation: body.occupation,
  emergency_contact: body.emergencyContact ?? null,
  photo_url: body.photoUrl,
});

const mapMedHistRPC = (mh = {}) => ({
  surgery_or_hospitalized: mh.surgeryOrHospitalized ?? '',
  surgery_details: mh.surgeryDetails ?? null,

  fever_cold_cough: mh.feverColdCough ?? '',
  fever_details: mh.feverDetails ?? null,

  artificial_valves_pacemaker: !!mh.artificialValvesPacemaker,
  asthma: !!mh.asthma,
  allergy: !!mh.allergy,
  bleeding_tendency: !!mh.bleedingTendency,
  epilepsy_seizure: !!mh.epilepsySeizure,
  heart_disease: !!mh.heartDisease,
  hyp_hypertension: !!mh.hypHypertension,
  hormone_disorder: !!mh.hormoneDisorder,
  jaundice_liver: !!mh.jaundiceLiver,
  stomach_ulcer: !!mh.stomachUlcer,
  low_high_pressure: !!mh.lowHighPressure,
  arthritis_joint: !!mh.arthritisJoint,
  kidney_problems: !!mh.kidneyProblems,
  thyroid_problems: !!mh.thyroidProblems,
  other_problem: !!mh.otherProblem,
  other_problem_text: mh.otherProblemText ?? null,

  abnormal_bleeding_history: mh.abnormalBleedingHistory ?? '',
  abnormal_bleeding_details: mh.abnormalBleedingDetails ?? null,

  taking_medicine: mh.takingMedicine ?? '',
  medicine_details: mh.medicineDetails ?? null,

  medication_allergy: mh.medicationAllergy ?? '',
  medication_allergy_details: mh.medicationAllergyDetails ?? null,

  past_dental_history: mh.pastDentalHistory ?? null,
});

/* -------------------- Normalizers for visit payload -------------------- */

// If findings not provided but grid arrays exist, build findings.
const TEETH = [8,7,6,5,4,3,2,1, 1,2,3,4,5,6,7,8];
const buildFindingsFromGrids = (upperGrades = [], lowerGrades = [], upperStatus = [], lowerStatus = []) => {
  const upper = Array.from({ length: 16 }).map((_, i) => ({
    tooth: TEETH[i],
    grade: upperGrades[i] || '',
    status: upperStatus[i] || '',
  }));
  const lower = Array.from({ length: 16 }).map((_, i) => ({
    tooth: TEETH[i],
    grade: lowerGrades[i] || '',
    status: lowerStatus[i] || '',
  }));
  return { upper, lower };
};

const normalizeFindings = (v = {}) => {
  if (v.findings && typeof v.findings === 'object') return v.findings;
  if (Array.isArray(v.upperGrades) || Array.isArray(v.lowerGrades)) {
    return buildFindingsFromGrids(v.upperGrades, v.lowerGrades, v.upperStatus, v.lowerStatus);
  }
  return null; // DB default/trigger will handle null
};

// Accept procedures either as `v.procedures` or in a sibling `procedures.rows`
const normalizeProcedures = (root = {}) => {
  // 1) If initialVisit already has procedures array, prefer it.
  if (Array.isArray(root.procedures)) {
    return root.procedures.map((r) => {
      const total = parseNum(r.total);
      const paid = parseNum(r.paid);
      return {
        visitDate: r.visitDate ? toDateOnly(r.visitDate) : null,
        procedure: String(r.procedure || '').trim(),
        nextApptDate: r.nextApptDate ? toDateOnly(r.nextApptDate) : null,
        total,
        paid,
        due: clampNum(total - paid),
      };
    });
  }

  // 2) Or accept multi-step “procedures.rows”
  const procs = root.procedures && Array.isArray(root.procedures.rows)
    ? root.procedures.rows
    : (Array.isArray(root.rows) ? root.rows : null);

  if (!procs) return null;

  const cleaned = procs
    .filter((r) => {
      const anyMoney = hasValue(r.total) || hasValue(r.paid);
      const anyContent =
        anyMoney ||
        hasValue(r.procedure) ||
        hasValue(r.visitDate) ||
        hasValue(r.nextApptDate);
      return anyContent;
    })
    .map((r) => {
      const total = parseNum(r.total);
      const paid  = parseNum(r.paid);
      return {
        visitDate: r.visitDate ? toDateOnly(r.visitDate) : null,
        procedure: String(r.procedure || '').trim(),
        nextApptDate: r.nextApptDate ? toDateOnly(r.nextApptDate) : null,
        total,
        paid,
        due: clampNum(total - paid),
      };
    });

  return cleaned.length ? cleaned : null;
};

const mapVisitRPC = (v = {}) => {
  const findings = normalizeFindings(v);
  const procedures = normalizeProcedures(v);

  const triggers =
    Array.isArray(v.triggerFactors)
      ? v.triggerFactors
      : (v.triggerFactors ? [String(v.triggerFactors)] : []);

  return {
    chief_complaint: (v.chiefComplaint ?? null)?.trim() || null,
    duration_onset: v.durationOnset ?? null,
    trigger_factors: triggers,
    diagnosis_notes: v.diagnosisNotes ?? null,
    treatment_plan_notes: v.treatmentPlanNotes ?? null,
    findings: findings ?? null,      // DB trigger normalizes defaults
    procedures: procedures ?? null,  // DB trigger normalizes numbers/dues
    visit_at: v.visitAt ? new Date(v.visitAt).toISOString() : null, // or null => default now()
  };
};

/* ---------------------------- Controllers ---------------------------- */

/**
 * Create patient + medical history + first visit (atomic via SQL RPC).
 *
 * Accepts either:
 *  - {
 *      firstName, lastName, dob, gender, phone, ...,
 *      medicalHistory: {...},
 *      initialVisit: { chiefComplaint, findings?, triggerFactors?, procedures?[] }
 *    }
 *
 *  OR the multi-step review shape:
 *  - {
 *      patientProfile: {...},     // merged at top-level on the client or server
 *      medicalHistory: {...},
 *      dentalExam: {...},         // chiefComplaint/duration/trigger/findings
 *      procedures: { rows: [...], summary: {...} }
 *    }
 */
const createPatient = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);

    // Optional: basic auth guard if your express middleware doesn’t set req.user
    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = req.body || {};

    // Support both shapes (merge patientProfile -> root if present)
    const rootProfile = body.patientProfile && typeof body.patientProfile === 'object'
      ? { ...body, ...body.patientProfile }
      : body;

    const p_patient = mapPatientRPC(rootProfile);

    // medical history
    const mhSrc = body.medicalHistory || rootProfile.medicalHistory || {};
    const p_medhist = mapMedHistRPC(mhSrc);

    // visit: prefer explicit initialVisit; otherwise derive from dentalExam + procedures
    const visitSrc = body.initialVisit
      ? body.initialVisit
      : {
          ...(body.dentalExam || {}),
          // allow procedures to be outside dentalExam (multi-step)
          procedures: normalizeProcedures(body) || (body.dentalExam ? normalizeProcedures(body.dentalExam) : null),
        };

    // If procedures weren’t picked in the line above, compute once more from `visitSrc`
    if (!visitSrc.procedures) {
      const p = normalizeProcedures(visitSrc);
      if (p) visitSrc.procedures = p;
    }

    // Ensure findings exist (build from grids if present)
    if (!visitSrc.findings) {
      visitSrc.findings = normalizeFindings(visitSrc);
    }

    const p_visit = mapVisitRPC(visitSrc);

    // Minimal required fields check (helps early)
    if (!p_patient.first_name || !p_patient.last_name || !p_patient.dob || !p_patient.gender || !p_patient.phone) {
      return res.status(400).json({ error: 'Missing required patient fields (firstName, lastName, dob, gender, phone)' });
    }
    if (!p_visit.chief_complaint) {
      return res.status(400).json({ error: 'Missing chief complaint for initial visit' });
    }

    // Atomic DB call (transaction inside Postgres function)
    const { data, error } = await supabase.rpc('create_patient_with_initials', {
      p_patient,
      p_medhist,
      p_visit,
    });

    if (error) return sbError(res, error);

    // RPC RETURNS TABLE => may come back as array
    const row = Array.isArray(data) ? data[0] : data;

    // Suggested shape (depends on your SQL function’s RETURN)
    // {
    //   patient: {...},
    //   medical_history: {...},
    //   visit: {...}
    // }
    return res.status(201).json(row);
  } catch (err) {
    return sbError(res, err);
  }
};

// List patients (RLS filters to owner)
const getAllPatients = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { limit = 100, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) return sbError(res, error);
    return res.json(data);
  } catch (err) {
    return sbError(res, err);
  }
};

// Fetch one + quick meta
const getPatient = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { id } = req.params;

    const { data: patient, error: pErr } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (pErr?.code === 'PGRST116' || (!patient && !pErr)) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    if (pErr) return sbError(res, pErr);

    const { data: mhRows, error: mhErr } = await supabase
      .from('medical_histories')
      .select('id')
      .eq('patient_id', id)
      .limit(1);
    if (mhErr) return sbError(res, mhErr);

    const { data: vRows, error: vErr } = await supabase
      .from('visits')
      .select('visit_at')
      .eq('patient_id', id)
      .order('visit_at', { ascending: false })
      .limit(1);
    if (vErr) return sbError(res, vErr);

    return res.json({
      patient,
      meta: {
        hasMedicalHistory: Array.isArray(mhRows) && mhRows.length > 0,
        lastVisitAt:
          Array.isArray(vRows) && vRows.length > 0 ? vRows[0].visit_at : null,
      },
    });
  } catch (err) {
    return sbError(res, err);
  }
};

// Update patient (direct table update)
const updatePatient = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { id } = req.params;
    const row = mapPatientBodyToRow(req.body || {}, { forUpdate: true });

    if (Object.keys(row).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const { data, error } = await supabase
      .from('patients')
      .update(row)
      .eq('id', id)
      .select('*')
      .single();

    if (error?.code === 'PGRST116' || (!data && !error)) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    if (error) return sbError(res, error);

    return res.json(data);
  } catch (err) {
    return sbError(res, err);
  }
};

// Delete patient
const deletePatient = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { id } = req.params;

    const { data, error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id)
      .select('*')
      .single();

    if (error?.code === 'PGRST116' || (!data && !error)) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    if (error) return sbError(res, error);

    return res.json({ message: 'Patient deleted successfully' });
  } catch (err) {
    return sbError(res, err);
  }
};

module.exports = {
  createPatient,
  getAllPatients,
  getPatient,
  updatePatient,
  deletePatient,
};
