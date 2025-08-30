// src/components/AuditLogs.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  getAuditRecent,
  getPatientAudit,
  getActorAudit,
  getRowAudit,
  getPatientProvenance,
} from "../../utils/api";

/**
 * AuditLogs
 * A single arrow-function component to display audit logs.
 *
 * Props:
 *  - mode: 'recent' | 'patient' | 'actor' | 'row'  (default: 'recent')
 *  - tableSchema, tableName, action   (recent mode filters)
 *  - pageSize (default 25)
 *  - patientId (patient mode)
 *  - actorId   (actor mode)
 *  - schema, table, rowId (row mode)
 */
const AuditLogs = ({
  mode = "recent",
  tableSchema = "public",
  tableName = "patients",
  action = "",
  pageSize = 25,
  patientId,
  actorId,
  schema,
  table,
  rowId,
}) => {
  const [items, setItems] = useState([]);
  const [limit, setLimit] = useState(pageSize);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [filters, setFilters] = useState({
    tableSchema,
    tableName,
    action,
  });

  // Extra data for patient provenance
  const [prov, setProv] = useState(null);

  const formatDateTime = (v) => {
    if (!v) return "—";
    const d = new Date(v);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      let res;
      if (mode === "patient") {
        if (!patientId) throw new Error("Missing patientId");
        // history
        const hist = await getPatientAudit(patientId, { limit, offset });
        res = hist?.items ?? [];
        // provenance (best-effort)
        try {
          const p = await getPatientProvenance(patientId);
          setProv(p || null);
        } catch {
          setProv(null);
        }
      } else if (mode === "actor") {
        if (!actorId) throw new Error("Missing actorId");
        const r = await getActorAudit(actorId, { limit, offset });
        res = r?.items ?? [];
      } else if (mode === "row") {
        if (!schema || !table || !rowId) throw new Error("Missing schema/table/rowId");
        const r = await getRowAudit(schema, table, rowId, { limit, offset });
        res = r?.items ?? [];
      } else {
        // recent (default)
        const r = await getAuditRecent({
          tableSchema: filters.tableSchema || undefined,
          tableName: filters.tableName || undefined,
          action: filters.action || undefined,
          limit,
          offset,
        });
        res = r?.items ?? [];
      }
      setItems(Array.isArray(res) ? res : []);
    } catch (e) {
      setErr(e?.message || "Failed to load logs");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Reload when mode/filters/pagination change
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, limit, offset, filters.tableSchema, filters.tableName, filters.action, patientId, actorId, schema, table, rowId]);

  // Reset pagination when relevant props change
  useEffect(() => {
    setOffset(0);
  }, [mode, filters.tableSchema, filters.tableName, filters.action, patientId, actorId, schema, table, rowId]);

  const onChangeFilter = (e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  };

  const onChangeAction = (e) => {
    setFilters((f) => ({ ...f, action: e.target.value.toUpperCase() }));
  };

  const actionBadge = (a) => {
    const base = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium";
    if (a === "INSERT") return `${base} bg-green-100 text-green-800`;
    if (a === "UPDATE") return `${base} bg-blue-100 text-blue-800`;
    if (a === "DELETE") return `${base} bg-red-100 text-red-800`;
    return `${base} bg-gray-100 text-gray-800`;
    };

  const headerTitle = useMemo(() => {
    if (mode === "patient") return "Patient Audit History";
    if (mode === "actor") return "Actor Activity";
    if (mode === "row") return "Row History";
    return "Recent Audit Events";
  }, [mode]);

  const Subhead = () => {
    if (mode === "recent") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Schema</label>
            <input
              name="tableSchema"
              value={filters.tableSchema}
              onChange={onChangeFilter}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="public"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Table</label>
            <input
              name="tableName"
              value={filters.tableName}
              onChange={onChangeFilter}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="patients"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Action</label>
            <select
              value={filters.action}
              onChange={onChangeAction}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Page size</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Number(e.target.value) || 25))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {[10, 25, 50, 100, 200].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
      );
    }
    if (mode === "patient") {
      return (
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <div><span className="font-medium text-gray-900">Patient:</span> {patientId || "—"}</div>
          <div className="ml-auto">
            <label className="mr-2">Page size</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Number(e.target.value) || 25))}
              className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
            >
              {[25, 50, 100, 200].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
      );
    }
    if (mode === "actor") {
      return (
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <div><span className="font-medium text-gray-900">Actor:</span> {actorId || "—"}</div>
          <div className="ml-auto">
            <label className="mr-2">Page size</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Number(e.target.value) || 25))}
              className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
            >
              {[25, 50, 100, 200].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
      );
    }
    if (mode === "row") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Schema</label>
            <input disabled value={schema || ""} className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Table</label>
            <input disabled value={table || ""} className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-600 mb-1">Row ID</label>
            <input disabled value={rowId || ""} className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2" />
          </div>
        </div>
      );
    }
    return null;
  };

  const Row = ({ ev }) => {
    const [open, setOpen] = useState(false);
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={actionBadge(ev.action)}>{ev.action}</span>
              <span className="text-sm text-gray-700 font-medium truncate">
                {ev.table_schema}.{ev.table_name}
              </span>
              {ev.row_id && (
                <span className="text-xs text-gray-500 truncate">row: {ev.row_id}</span>
              )}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Actor: <span className="font-medium text-gray-700">{ev.actor_email || ev.actor_id || "Unknown"}</span>
            </div>
            {Array.isArray(ev.changed_cols) && ev.changed_cols.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {ev.changed_cols.map((c, i) => (
                  <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs">{c}</span>
                ))}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">When</div>
            <div className="text-sm font-medium text-gray-800">{formatDateTime(ev.happened_at)}</div>
            <button
              onClick={() => setOpen((o) => !o)}
              className="mt-2 text-xs text-indigo-600 hover:text-indigo-800"
            >
              {open ? "Hide details" : "View details"}
            </button>
          </div>
        </div>

        {open && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">Old Data</div>
              <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-2 overflow-auto max-h-72">
                {ev.old_data ? JSON.stringify(ev.old_data, null, 2) : "—"}
              </pre>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">New Data</div>
              <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-2 overflow-auto max-h-72">
                {ev.new_data ? JSON.stringify(ev.new_data, null, 2) : "—"}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 min-h-[60vh] p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{headerTitle}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Mode-specific header / filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <Subhead />
        </div>

        {/* Patient provenance (mode=patient) */}
        {mode === "patient" && prov && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Provenance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="text-gray-500">Created By</div>
                <div className="font-medium text-gray-900 break-words">{prov?.createdByFromRow || "—"}</div>
                <div className="text-xs text-gray-500 mt-1">at {formatDateTime(prov?.row?.created_at)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="text-gray-500">Last Updated By</div>
                <div className="font-medium text-gray-900 break-words">{prov?.updatedByFromRow || "—"}</div>
                <div className="text-xs text-gray-500 mt-1">at {formatDateTime(prov?.row?.updated_at)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="text-gray-500">Last Change (Audit)</div>
                <div className="font-medium text-gray-900 break-words">
                  {prov?.lastChange?.actor_email || prov?.lastChange?.actor_id || "—"}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {prov?.lastChange?.action || "—"} at {formatDateTime(prov?.lastChange?.happened_at)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error & Empty states */}
        {err && (
          <div className="bg-white rounded-xl border border-red-200 p-4">
            <div className="text-sm text-red-700">{err}</div>
          </div>
        )}

        {!err && loading && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-600">
            Loading logs…
          </div>
        )}

        {!err && !loading && items.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-600">
            No events found.
          </div>
        )}

        {/* List */}
        {!err && !loading && items.length > 0 && (
          <div className="space-y-3">
            {items.map((ev) => (
              <Row key={`${ev.id}-${ev.happened_at}`} ev={ev} />
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-gray-500">Showing up to {limit} events</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              disabled={loading || offset === 0}
            >
              Previous
            </button>
            <button
              onClick={() => setOffset((o) => o + limit)}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              disabled={loading || items.length < limit}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
