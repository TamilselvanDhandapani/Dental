// src/components/AuditLogs.jsx
import React, { useEffect, useMemo, useState } from "react";
import { getAuditRecent } from "../../utils/api";

const ACTION_UI_TO_DB = {
  Added: "INSERT",
  Edited: "UPDATE",
  Deleted: "DELETE",
};
const ACTION_DB_TO_UI = {
  INSERT: "Added",
  UPDATE: "Edited",
  DELETE: "Deleted",
};

const AuditLogs = () => {
  const [items, setItems] = useState([]);
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [actionUi, setActionUi] = useState("All"); // All | Added | Edited | Deleted

  const formatDateTime = (v) => {
    if (!v) return "—";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "—";
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
      const dbAction = actionUi === "All" ? undefined : ACTION_UI_TO_DB[actionUi];
      const r = await getAuditRecent({
        // only pass action; no schema/table filters
        action: dbAction,
        limit,
        offset,
      });
      setItems(Array.isArray(r?.items) ? r.items : []);
    } catch (e) {
      setErr(e?.message || "Failed to load logs");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial + whenever filters/pagination change
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionUi, limit, offset]);

  // Reset page when action filter changes
  useEffect(() => {
    setOffset(0);
  }, [actionUi]);

  const badgeClass = (dbAction) => {
    const base = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium";
    if (dbAction === "INSERT") return `${base} bg-green-100 text-green-800`;
    if (dbAction === "UPDATE") return `${base} bg-blue-100 text-blue-800`;
    if (dbAction === "DELETE") return `${base} bg-red-100 text-red-800`;
    return `${base} bg-gray-100 text-gray-800`;
  };

  const Row = ({ ev }) => {
    const [open, setOpen] = useState(false);
    const friendly = ACTION_DB_TO_UI[ev.action] || ev.action;
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={badgeClass(ev.action)}>{friendly}</span>
              {/* (No schema/table shown) */}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              By{" "}
              <span className="font-medium text-gray-700">
                {ev.actor_email || ev.actor_id || "Unknown"}
              </span>
            </div>
            {Array.isArray(ev.changed_cols) && ev.changed_cols.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {ev.changed_cols.map((c, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">When</div>
            <div className="text-sm font-medium text-gray-800">
              {formatDateTime(ev.happened_at)}
            </div>
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

  const headerTitle = useMemo(() => "Audit Logs", []);

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

        {/* Filters: only Action + Page size */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Show</label>
              <select
                value={actionUi}
                onChange={(e) => setActionUi(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {["All", "Added", "Edited", "Deleted"].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
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
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

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
