// controllers/appointmentsController.js
const { createClient } = require('@supabase/supabase-js');

const supabaseForReq = (req) =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.authorization } },
  });

const sbError = (res, error, status = 400) =>
  res.status(status).json({ error: error?.message || String(error) });

const asHHMM = (v) => {
  if (!v) return v;
  const m = String(v).match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return v;
  const h = String(Math.min(23, Math.max(0, parseInt(m[1], 10)))).padStart(2, '0');
  const mm = String(Math.min(59, Math.max(0, parseInt(m[2], 10)))).padStart(2, '0');
  return `${h}:${mm}`;
};

const mapCreate = (body = {}, userId) => ({
  created_by: userId,
  patient_id: body.patient_id || null,
  patient_name: String(body.patient_name || '').trim(),
  phone: String(body.phone || '').trim(),
  date: body.date || null,
  time_slot: asHHMM(body.time_slot || null),
  service_type: body.service_type || 'Checkup',
  status: body.status || 'Pending',
  rescheduled_date: body.rescheduled_date ?? null,
  rescheduled_time: body.rescheduled_time ? asHHMM(body.rescheduled_time) : null,
  notes: body.notes ?? null,
});

const mapPatch = (body = {}) => {
  const row = {};
  const set = (k, v) => v !== undefined && (row[k] = v);

  set('patient_id', body.patient_id ?? undefined);
  set('patient_name', body.patient_name ? String(body.patient_name).trim() : undefined);
  set('phone', body.phone ? String(body.phone).trim() : undefined);
  set('date', body.date ?? undefined);
  set('time_slot', body.time_slot ? asHHMM(body.time_slot) : undefined);
  set('service_type', body.service_type ?? undefined);
  set('status', body.status ?? undefined);
  set('rescheduled_date', body.rescheduled_date === null ? null : body.rescheduled_date);
  set('rescheduled_time', body.rescheduled_time ? asHHMM(body.rescheduled_time) : (body.rescheduled_time === null ? null : undefined));
  set('notes', body.notes === undefined ? undefined : (body.notes ?? null));

  return row;
};

// GET /appointments?date=YYYY-MM-DD
// GET /appointments?from=YYYY-MM-DD&to=YYYY-MM-DD
const listAppointments = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { date, from, to, limit, offset } = req.query;

    let q = supabase.from('appointments').select('*');

    if (date) {
      q = q.eq('date', date);
    } else if (from && to) {
      q = q.gte('date', from).lte('date', to);
    } else {
      // default to current month range
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      q = q.gte('date', first).lte('date', last);
    }

    q = q.order('date', { ascending: true }).order('time_slot', { ascending: true });

    if (limit) {
      const l = Number(limit);
      const o = Number(offset || 0);
      q = q.range(o, o + l - 1);
    }

    const { data, error } = await q;
    if (error) return sbError(res, error);
    return res.json(data || []);
  } catch (err) {
    return sbError(res, err);
  }
};

// POST /appointments
const createAppointment = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const row = mapCreate(req.body || {}, userId);

    // Basic guardrails before DB checks
    if (!row.patient_name) return res.status(400).json({ error: 'patient_name is required' });
    if (!row.phone) return res.status(400).json({ error: 'phone is required' });
    if (!row.date) return res.status(400).json({ error: 'date is required' });
    if (!row.time_slot) return res.status(400).json({ error: 'time_slot is required' });

    const { data, error } = await supabase
      .from('appointments')
      .insert(row)
      .select('*')
      .single();

    if (error) return sbError(res, error);
    return res.status(201).json(data);
  } catch (err) {
    return sbError(res, err);
  }
};

// PATCH /appointments/:id
const updateAppointment = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Missing id' });

    const row = mapPatch(req.body || {});
    if (Object.keys(row).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabase
      .from('appointments')
      .update(row)
      .eq('id', id)
      .select('*')
      .single();

    if (error?.code === 'PGRST116' || (!data && !error)) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    if (error) return sbError(res, error);
    return res.json(data);
  } catch (err) {
    return sbError(res, err);
  }
};

// DELETE /appointments/:id
const deleteAppointment = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Missing id' });

    const { data, error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)
      .select('*')
      .single();

    if (error?.code === 'PGRST116' || (!data && !error)) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    if (error) return sbError(res, error);
    return res.json({ message: 'Appointment deleted successfully' });
  } catch (err) {
    return sbError(res, err);
  }
};

module.exports = {
  listAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
};
