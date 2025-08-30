// controllers/auditController.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  // eslint-disable-next-line no-console
  console.warn('Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE envs');
}

/** Client bound to the caller’s JWT — only used to read/verify the user token if you prefer. */
const userClientForReq = (req) =>
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.authorization || '' } },
    auth: { persistSession: false },
  });

/** Admin client (service role) — used for the actual DB reads to bypass RLS. */
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/** Verify the Authorization bearer token using the admin client. */
async function requireUser(req) {
  const auth = (req.headers.authorization || '').trim();
  if (!auth.toLowerCase().startsWith('bearer ')) return null;
  const token = auth.slice(7);
  const { data, error } = await adminClient.auth.getUser(token);
  if (error) return null;
  return data?.user || null;
}

const sbError = (res, error, status = 400) => {
  const msg = error?.message || String(error);
  return res.status(status).json({ error: msg });
};

const getLimitOffset = (req, defLimit = 50, maxLimit = 200) => {
  const limit = Math.max(1, Math.min(Number(req.query.limit || defLimit), maxLimit));
  const offset = Math.max(0, Number(req.query.offset || 0));
  return { limit, offset, range: [offset, offset + limit - 1] };
};

/**
 * GET /audit/recent?action=INSERT|UPDATE|DELETE&limit=50&offset=0
 * Reads from public.audit_event_log with SERVICE ROLE.
 */
const getAuditRecent = async (req, res) => {
  try {
    const user = await requireUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { limit, range } = getLimitOffset(req);
    const action = (req.query.action || '').toString().toUpperCase();
    let q = adminClient
      .from('audit_event_log') // public view, not audit.event_log table
      .select('*', { count: 'exact' })
      .order('happened_at', { ascending: false })
      .order('id', { ascending: false })
      .range(range[0], range[1]);

    if (['INSERT', 'UPDATE', 'DELETE'].includes(action)) q = q.eq('action', action);

    const { data, error, count } = await q;
    if (error) return sbError(res, error);
    return res.json({ limit, offset: range[0], total: count ?? null, items: data || [] });
  } catch (err) {
    return sbError(res, err, 500);
  }
};

/**
 * GET /audit/patients/:id?limit=100&offset=0
 */
const getPatientAudit = async (req, res) => {
  try {
    const user = await requireUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { limit, range } = getLimitOffset(req, 100);

    const { data, error, count } = await adminClient
      .from('audit_event_log')
      .select('*', { count: 'exact' })
      .eq('table_schema', 'public')
      .eq('table_name', 'patients')
      .eq('row_id', String(id))
      .order('happened_at', { ascending: false })
      .order('id', { ascending: false })
      .range(range[0], range[1]);

    if (error) return sbError(res, error);
    return res.json({ patientId: id, limit, offset: range[0], total: count ?? null, items: data || [] });
  } catch (err) {
    return sbError(res, err, 500);
  }
};

/**
 * GET /audit/actors/:actorId?limit=50&offset=0
 */
const getActorAudit = async (req, res) => {
  try {
    const user = await requireUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { actorId } = req.params;
    const { limit, range } = getLimitOffset(req);

    const { data, error, count } = await adminClient
      .from('audit_event_log')
      .select('*', { count: 'exact' })
      .eq('actor_id', String(actorId))
      .order('happened_at', { ascending: false })
      .order('id', { ascending: false })
      .range(range[0], range[1]);

    if (error) return sbError(res, error);
    return res.json({ actorId, limit, offset: range[0], total: count ?? null, items: data || [] });
  } catch (err) {
    return sbError(res, err, 500);
  }
};

/**
 * GET /audit/:schema/:table/:rowId?limit=100&offset=0
 */
const getRowAudit = async (req, res) => {
  try {
    const user = await requireUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { schema, table, rowId } = req.params;
    const { limit, range } = getLimitOffset(req, 100);

    const { data, error, count } = await adminClient
      .from('audit_event_log')
      .select('*', { count: 'exact' })
      .eq('table_schema', String(schema))
      .eq('table_name', String(table))
      .eq('row_id', String(rowId))
      .order('happened_at', { ascending: false })
      .order('id', { ascending: false })
      .range(range[0], range[1]);

    if (error) return sbError(res, error);
    return res.json({ schema, table, rowId, limit, offset: range[0], total: count ?? null, items: data || [] });
  } catch (err) {
    return sbError(res, err, 500);
  }
};

/**
 * GET /patients/:id/provenance
 */
const getPatientProvenance = async (req, res) => {
  try {
    const user = await requireUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;

    // Read patient row via admin (or switch to userClient if you want RLS to apply here)
    const { data: patient, error: pErr } = await adminClient
      .from('patients')
      .select('id, created_at, created_by, updated_at, updated_by')
      .eq('id', id)
      .single();
    if (pErr) return sbError(res, pErr);

    const { data: firstInsert } = await adminClient
      .from('audit_event_log')
      .select('*')
      .eq('table_schema', 'public')
      .eq('table_name', 'patients')
      .eq('row_id', String(id))
      .eq('action', 'INSERT')
      .order('happened_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(1);

    const { data: lastChange } = await adminClient
      .from('audit_event_log')
      .select('*')
      .eq('table_schema', 'public')
      .eq('table_name', 'patients')
      .eq('row_id', String(id))
      .in('action', ['UPDATE', 'DELETE'])
      .order('happened_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(1);

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
