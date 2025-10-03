// controllers/auditController.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

/** Supabase client bound to the caller's JWT (Authorization header). */
const supabaseForReq = (req) =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.authorization || '' } },
    auth: { persistSession: false },
  });

const sbError = (res, error, status = 400) =>
  res.status(status).json({ error: error?.message || String(error) });

const getLimitOffset = (req, defLimit = 50, maxLimit = 200) => {
  const limit = Math.max(1, Math.min(Number(req.query.limit || defLimit), maxLimit));
  const offset = Math.max(0, Number(req.query.offset || 0));
  return { limit, offset, range: [offset, offset + limit - 1] };
};

/**
 * GET /audit/recent?table_schema=public&table_name=patients&action=UPDATE&limit=50&offset=0
 * Recent audit events (optionally filtered by schema/table/action).
 */
const getAuditRecent = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { limit, range } = getLimitOffset(req);
    const { table_schema, table_name, action } = req.query;

    let q = supabase
      .from('audit.event_log')
      .select('*')
      .order('happened_at', { ascending: false })
      .range(range[0], range[1]);

    if (table_schema) q = q.eq('table_schema', String(table_schema));
    if (table_name)  q = q.eq('table_name', String(table_name));
    if (action)      q = q.eq('action', String(action).toUpperCase());

    const { data, error } = await q;
    if (error) return sbError(res, error);
    return res.json({ limit, items: data || [] });
  } catch (err) {
    return sbError(res, err, 500);
  }
};

/**
 * GET /audit/patients/:id?limit=100&offset=0
 * Full audit history for a specific patient row.
 */
const getPatientAudit = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { limit, range } = getLimitOffset(req, 100);

    const { data, error } = await supabase
      .from('audit.event_log')
      .select('*')
      .eq('table_schema', 'public')
      .eq('table_name', 'patients')
      .eq('row_id', String(id))
      .order('happened_at', { ascending: false })
      .range(range[0], range[1]);

    if (error) return sbError(res, error);
    return res.json({ patientId: id, limit, items: data || [] });
  } catch (err) {
    return sbError(res, err, 500);
  }
};

/**
 * GET /audit/actors/:actorId?limit=50&offset=0
 * Events performed by a specific actor (user).
 */
const getActorAudit = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { actorId } = req.params;
    const { limit, range } = getLimitOffset(req);

    const { data, error } = await supabase
      .from('audit.event_log')
      .select('*')
      .eq('actor_id', String(actorId))
      .order('happened_at', { ascending: false })
      .range(range[0], range[1]);

    if (error) return sbError(res, error);
    return res.json({ actorId, limit, items: data || [] });
  } catch (err) {
    return sbError(res, err, 500);
  }
};

/**
 * GET /audit/:schema/:table/:rowId?limit=100&offset=0
 * Generic row audit for any table you decide to track.
 */
const getRowAudit = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { schema, table, rowId } = req.params;
    const { limit, range } = getLimitOffset(req, 100);

    const { data, error } = await supabase
      .from('audit.event_log')
      .select('*')
      .eq('table_schema', String(schema))
      .eq('table_name', String(table))
      .eq('row_id', String(rowId))
      .order('happened_at', { ascending: false })
      .range(range[0], range[1]);

    if (error) return sbError(res, error);
    return res.json({ schema, table, rowId, limit, items: data || [] });
  } catch (err) {
    return sbError(res, err, 500);
  }
};

/**
 * GET /patients/:id/provenance
 * Quick provenance for a patient: created_by, updated_by, and first/last actors from audit.
 */
const getPatientProvenance = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // Basic row info
    const { data: patient, error: pErr } = await supabase
      .from('patients')
      .select('id, created_at, created_by, updated_at, updated_by')
      .eq('id', id)
      .single();
    if (pErr) return sbError(res, pErr);

    // First INSERT and latest UPDATE/DELETE from audit
    const { data: firstInsert, error: fErr } = await supabase
      .from('audit.event_log')
      .select('*')
      .eq('table_schema', 'public')
      .eq('table_name', 'patients')
      .eq('row_id', String(id))
      .eq('action', 'INSERT')
      .order('happened_at', { ascending: true })
      .limit(1);
    if (fErr) return sbError(res, fErr);

    const { data: lastChange, error: lErr } = await supabase
      .from('audit.event_log')
      .select('*')
      .eq('table_schema', 'public')
      .eq('table_name', 'patients')
      .eq('row_id', String(id))
      .in('action', ['UPDATE', 'DELETE'])
      .order('happened_at', { ascending: false })
      .limit(1);
    if (lErr) return sbError(res, lErr);

    return res.json({
      patientId: id,
      row: patient,
      createdByFromRow: patient?.created_by || null,
      updatedByFromRow: patient?.updated_by || null,
      firstInsert: firstInsert?.[0] || null,
      lastChange: lastChange?.[0] || null,
    });
  } catch (err) {
    return sbError(res, err, 500);
  }
};

module.exports = {
  getAuditRecent,
  getPatientAudit,
  getActorAudit,
  getRowAudit,
  getPatientProvenance,
};
