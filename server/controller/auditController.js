// controllers/auditController.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

/** Supabase client bound to caller's JWT (Authorization header). */
const supabaseForReq = (req) =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.authorization || '' } },
    auth: { persistSession: false },
  });

const sbError = (res, error, status = 400) => {
  const msg = error?.message || String(error);
  const hint = /relation .* does not exist|schema cache|permission denied|not found|rpc/i.test(msg)
    ? ' (ensure RPC functions exist and/or the public view public.audit_event_log is granted to authenticated/anon, then reload PostgREST cache)'
    : '';
  return res.status(status).json({ error: msg + hint });
};

const getLimitOffset = (req, defLimit = 50, maxLimit = 200) => {
  const limit = Math.max(1, Math.min(Number(req.query.limit || defLimit), maxLimit));
  const offset = Math.max(0, Number(req.query.offset || 0));
  return { limit, offset, range: [offset, offset + limit - 1] };
};

/** Helper: try an RPC; if it doesn’t exist (or perms), fallback to a view query builder. */
async function rpcOrView({ supabase, rpcName, rpcArgs, viewQueryBuilder }) {
  // 1) Try RPC first (best for permissions & performance)
  const rpc = await supabase.rpc(rpcName, rpcArgs);
  if (!rpc.error) {
    return { data: rpc.data || [], error: null, count: null };
  }
  // If RPC truly unavailable or denied, fall back to the view
  const msg = rpc.error?.message || '';
  const allowFallback =
    /function .* does not exist|rpc|not found|permission denied|cached schema/i.test(msg);
  if (!allowFallback) {
    return { data: null, error: rpc.error, count: null };
  }

  // 2) Fallback to view
  const viewQuery = viewQueryBuilder(supabase);
  const { data, error, count } = await viewQuery;
  return { data, error, count: count ?? null };
}

/**
 * GET /audit/recent?action=INSERT|UPDATE|DELETE&limit=50&offset=0
 * Prefers RPC: public.audit_recent(p_action,p_limit,p_offset)
 * Fallback: SELECT from public.audit_event_log view.
 */
const getAuditRecent = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    if (!req.headers.authorization) return res.status(401).json({ error: 'Unauthorized' });

    const { limit, offset, range } = getLimitOffset(req);
    const action = (req.query.action || '').toString().toUpperCase();
    const p_action = ['INSERT', 'UPDATE', 'DELETE'].includes(action) ? action : null;

    const { data, error, count } = await rpcOrView({
      supabase,
      rpcName: 'audit_recent',
      rpcArgs: { p_action, p_limit: limit, p_offset: offset },
      viewQueryBuilder: (sb) => {
        let q = sb
          .from('audit_event_log')
          .select('*', { count: 'exact' })
          .order('happened_at', { ascending: false })
          .order('id', { ascending: false })
          .range(range[0], range[1]);
        if (p_action) q = q.eq('action', p_action);
        return q;
      },
    });

    if (error) return sbError(res, error);
    return res.json({
      limit,
      offset,
      total: count,
      items: Array.isArray(data) ? data : [],
    });
  } catch (err) {
    return sbError(res, err, 500);
  }
};

/**
 * GET /audit/patients/:id?limit=100&offset=0
 * Prefers RPC: public.audit_for_row('public','patients', :id, NULL, limit, offset)
 * Fallback: SELECT from public.audit_event_log view.
 */
const getPatientAudit = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    if (!req.headers.authorization) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { limit, offset, range } = getLimitOffset(req, 100);

    const { data, error, count } = await rpcOrView({
      supabase,
      rpcName: 'audit_for_row',
      rpcArgs: {
        p_schema: 'public',
        p_table: 'patients',
        p_row_id: String(id),
        p_action: null,
        p_limit: limit,
        p_offset: offset,
      },
      viewQueryBuilder: (sb) =>
        sb
          .from('audit_event_log')
          .select('*', { count: 'exact' })
          .eq('table_schema', 'public')
          .eq('table_name', 'patients')
          .eq('row_id', String(id))
          .order('happened_at', { ascending: false })
          .order('id', { ascending: false })
          .range(range[0], range[1]),
    });

    if (error) return sbError(res, error);
    return res.json({
      patientId: id,
      limit,
      offset,
      total: count,
      items: Array.isArray(data) ? data : [],
    });
  } catch (err) {
    return sbError(res, err, 500);
  }
};

/**
 * GET /audit/actors/:actorId?limit=50&offset=0
 * Prefers RPC: public.audit_for_actor(:actorId, limit, offset)
 * Fallback: SELECT from public.audit_event_log view.
 */
const getActorAudit = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    if (!req.headers.authorization) return res.status(401).json({ error: 'Unauthorized' });

    const { actorId } = req.params;
    const { limit, offset, range } = getLimitOffset(req);

    const { data, error, count } = await rpcOrView({
      supabase,
      rpcName: 'audit_for_actor',
      rpcArgs: { p_actor_id: String(actorId), p_limit: limit, p_offset: offset },
      viewQueryBuilder: (sb) =>
        sb
          .from('audit_event_log')
          .select('*', { count: 'exact' })
          .eq('actor_id', String(actorId))
          .order('happened_at', { ascending: false })
          .order('id', { ascending: false })
          .range(range[0], range[1]),
    });

    if (error) return sbError(res, error);
    return res.json({
      actorId,
      limit,
      offset,
      total: count,
      items: Array.isArray(data) ? data : [],
    });
  } catch (err) {
    return sbError(res, err, 500);
  }
};

/**
 * GET /audit/:schema/:table/:rowId?limit=100&offset=0
 * Prefers RPC: public.audit_for_row(schema, table, rowId, NULL, limit, offset)
 * Fallback: SELECT from public.audit_event_log view.
 */
const getRowAudit = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    if (!req.headers.authorization) return res.status(401).json({ error: 'Unauthorized' });

    const { schema, table, rowId } = req.params;
    const { limit, offset, range } = getLimitOffset(req, 100);

    const { data, error, count } = await rpcOrView({
      supabase,
      rpcName: 'audit_for_row',
      rpcArgs: {
        p_schema: String(schema),
        p_table: String(table),
        p_row_id: String(rowId),
        p_action: null,
        p_limit: limit,
        p_offset: offset,
      },
      viewQueryBuilder: (sb) =>
        sb
          .from('audit_event_log')
          .select('*', { count: 'exact' })
          .eq('table_schema', String(schema))
          .eq('table_name', String(table))
          .eq('row_id', String(rowId))
          .order('happened_at', { ascending: false })
          .order('id', { ascending: false })
          .range(range[0], range[1]),
    });

    if (error) return sbError(res, error);
    return res.json({
      schema,
      table,
      rowId,
      limit,
      offset,
      total: count,
      items: Array.isArray(data) ? data : [],
    });
  } catch (err) {
    return sbError(res, err, 500);
  }
};

/**
 * GET /patients/:id/provenance
 * Prefers RPCs:
 *   - audit_for_row('public','patients', id, 'INSERT', 1, 0)  --> firstInsert (ascending in SQL)
 *   - audit_for_row('public','patients', id, NULL, 1, 0)      --> lastChange (most recent)
 * Falls back to view when RPCs aren’t available.
 */
const getPatientProvenance = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    if (!req.headers.authorization) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;

    // Row (requires you have RLS/select on patients)
    const { data: patient, error: pErr } = await supabase
      .from('patients')
      .select('id, created_at, created_by, updated_at, updated_by')
      .eq('id', id)
      .single();
    if (pErr) return sbError(res, pErr);

    // First INSERT
    const first = await rpcOrView({
      supabase,
      rpcName: 'audit_for_row',
      rpcArgs: {
        p_schema: 'public',
        p_table: 'patients',
        p_row_id: String(id),
        p_action: 'INSERT',
        p_limit: 1,
        p_offset: 0,
      },
      viewQueryBuilder: (sb) =>
        sb
          .from('audit_event_log')
          .select('*')
          .eq('table_schema', 'public')
          .eq('table_name', 'patients')
          .eq('row_id', String(id))
          .eq('action', 'INSERT')
          .order('happened_at', { ascending: true })
          .order('id', { ascending: true })
          .limit(1),
    });

    if (first.error) return sbError(res, first.error);

    // Last change (UPDATE/DELETE), most recent
    const last = await rpcOrView({
      supabase,
      rpcName: 'audit_for_row',
      rpcArgs: {
        p_schema: 'public',
        p_table: 'patients',
        p_row_id: String(id),
        p_action: null,
        p_limit: 1,
        p_offset: 0,
      },
      viewQueryBuilder: (sb) =>
        sb
          .from('audit_event_log')
          .select('*')
          .eq('table_schema', 'public')
          .eq('table_name', 'patients')
          .eq('row_id', String(id))
          .in('action', ['UPDATE', 'DELETE'])
          .order('happened_at', { ascending: false })
          .order('id', { ascending: false })
          .limit(1),
    });

    if (last.error) return sbError(res, last.error);

    return res.json({
      patientId: id,
      row: patient,
      createdByFromRow: patient?.created_by || null,
      updatedByFromRow: patient?.updated_by || null,
      firstInsert: Array.isArray(first.data) ? first.data[0] || null : null,
      lastChange: Array.isArray(last.data) ? last.data[0] || null : null,
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
