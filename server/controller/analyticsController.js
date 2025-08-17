// controllers/analyticsController.js
const { createClient } = require('@supabase/supabase-js');

// Supabase client bound to request JWT
const supabaseForReq = (req) =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.authorization } },
  });

const sbError = (res, error, status = 400) =>
  res.status(status).json({ error: error?.message || String(error) });

/**
 * GET /api/analytics/patients/by-year
 */
const patientsByYear = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { data, error } = await supabase.rpc('analytics_patients_by_year');
    if (error) return sbError(res, error);
    return res.json(data || []);
  } catch (err) {
    return sbError(res, err);
  }
};

/**
 * GET /api/analytics/patients/by-year-month?year=2025
 */
const patientsByYearMonth = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const year = req.query.year ? Number(req.query.year) : null;
    const { data, error } = await supabase.rpc('analytics_patients_by_year_month', { p_year: year });
    if (error) return sbError(res, error);
    return res.json(data || []);
  } catch (err) {
    return sbError(res, err);
  }
};

/**
 * GET /api/analytics/patients/by-year-gender?year=2025
 */
const patientsByYearGender = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const year = req.query.year ? Number(req.query.year) : null;
    const { data, error } = await supabase.rpc('analytics_patients_by_year_gender', { p_year: year });
    if (error) return sbError(res, error);
    return res.json(data || []);
  } catch (err) {
    return sbError(res, err);
  }
};

/**
 * GET /api/analytics/visits/by-year
 */
const visitsByYear = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { data, error } = await supabase.rpc('analytics_visits_by_year');
    if (error) return sbError(res, error);
    return res.json(data || []);
  } catch (err) {
    return sbError(res, err);
  }
};

/**
 * GET /api/analytics/visits/by-month?year=2025
 */
const visitsByMonth = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const year = req.query.year ? Number(req.query.year) : null;
    const { data, error } = await supabase.rpc('analytics_visits_by_month', { p_year: year });
    if (error) return sbError(res, error);
    return res.json(data || []);
  } catch (err) {
    return sbError(res, err);
  }
};

/**
 * GET /api/analytics/patients/by-age-group
 */
const patientsByAgeGroup = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { data, error } = await supabase.rpc('analytics_patients_by_age_group');
    if (error) return sbError(res, error);
    return res.json(data || []);
  } catch (err) {
    return sbError(res, err);
  }
};

module.exports = {
  patientsByYear,
  patientsByYearMonth,
  patientsByYearGender,
  visitsByYear,
  visitsByMonth,
  patientsByAgeGroup,
};
