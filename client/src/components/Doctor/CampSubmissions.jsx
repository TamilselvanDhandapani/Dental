// src/components/CampSubmissions.jsx
import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { FiEdit, FiTrash2 } from "react-icons/fi";
import {
  listCampSubmissions,
  createCampSubmission,
  updateCampSubmission,
  deleteCampSubmission,
  getAuditRecent,
} from "../../utils/api"; // adjust path if needed

/* ------------------------------- Helpers -------------------------------- */

const ACTION_DB_TO_UI = { INSERT: "Added", UPDATE: "Edited", DELETE: "Deleted" };
const ACTION_UI_TO_DB = { Added: "INSERT", Edited: "UPDATE", Deleted: "DELETE" };

const INST_TYPE_OPTIONS = [
  { value: "Hospital", label: "Hospital" },
  { value: "Clinic", label: "Clinic" },
  { value: "School", label: "School" },
  { value: "College", label: "College" },
  { value: "NGO", label: "NGO" },
  { value: "Other", label: "Other" },
];

const ACTION_OPTIONS = [
  { value: "All", label: "All" },
  { value: "Added", label: "Added" },
  { value: "Edited", label: "Edited" },
  { value: "Deleted", label: "Deleted" },
];

const cls = (...parts) => parts.filter(Boolean).join(" ");
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
const badge = (a) =>
  a === "INSERT"
    ? "bg-green-100 text-green-700"
    : a === "UPDATE"
    ? "bg-blue-100 text-blue-700"
    : a === "DELETE"
    ? "bg-rose-100 text-rose-700"
    : "bg-gray-100 text-gray-700";

/* ------------------------------- Form ----------------------------------- */

const SubmissionForm = ({
  initial = null,
  onSubmit,
  submitting = false,
  submitLabel = "Save",
}) => {
  const [name, setName] = useState(initial?.name || "");
  const [dob, setDob] = useState(initial?.dob || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [institution, setInstitution] = useState(initial?.institution || "");
  const [institutionType, setInstitutionType] = useState(
    initial?.institution_type || initial?.institutionType || ""
  );
  const [comments, setComments] = useState(initial?.comments || "");
  const [err, setErr] = useState("");

  useEffect(() => {
    setName(initial?.name || "");
    setDob(initial?.dob || "");
    setEmail(initial?.email || "");
    setPhone(initial?.phone || "");
    setInstitution(initial?.institution || "");
    setInstitutionType(initial?.institution_type || initial?.institutionType || "");
    setComments(initial?.comments || "");
    setErr("");
  }, [initial]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    // Basic validation
    if (!name.trim()) return setErr("Name is required");
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter a valid email");

    // Always send BOTH snake_case and camelCase for maximum backend compatibility.
    // Also normalize empty strings to null where appropriate.
    const safeDob = dob || null;

    const payload = {
      // camelCase
      name: name.trim(),
      dob: safeDob,
      email: email || null,
      phone: phone || null,
      comments: comments || null,
      institution: institution || null,
      institutionType: institutionType || null,

      // snake_case mirrors
      institution_type: institutionType || null,
    };

    try {
      await onSubmit(payload);
      // Parent (create/edit modal caller) decides what to do after success
    } catch (e) {
      setErr(e?.message || "Failed to submit");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!!err && (
        <div className="p-2 rounded border border-rose-200 bg-rose-50 text-rose-700 text-sm">
          {err}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Name *</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">DOB</label>
          <input
            type="date"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={dob || ""}
            onChange={(e) => setDob(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Email</label>
          <input
            type="email"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={email || ""}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Phone</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={phone || ""}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="9876543210"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Institution</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={institution || ""}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="City Hospital"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Institution Type</label>
          <Select
            classNamePrefix="rs"
            options={INST_TYPE_OPTIONS}
            value={
              institutionType
                ? INST_TYPE_OPTIONS.find((o) => o.value === institutionType) || null
                : null
            }
            onChange={(opt) => setInstitutionType(opt?.value || "")}
            placeholder="Select type..."
            isClearable
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-600 mb-1">Comments</label>
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm"
            rows={3}
            value={comments || ""}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Any notes..."
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting}
          className={cls(
            "px-4 py-2 rounded-lg text-white",
            submitting ? "bg-sky-300 cursor-not-allowed" : "bg-sky-600 hover:bg-sky-700"
          )}
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
};

/* ------------------------------- Modals ---------------------------------- */

const Modal = ({ open, onClose, title, children, footer }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-gray-200">
          <div className="px-4 py-3 border-b">
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <div className="p-4">{children}</div>
          {footer && <div className="px-4 py-3 border-t bg-gray-50">{footer}</div>}
        </div>
      </div>
    </div>
  );
};

const ConfirmDeleteModal = ({ open, onCancel, onConfirm, item, loading }) => {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Delete submission?"
      footer={
        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 rounded-lg border" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            className="px-3 py-2 rounded-lg text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      }
    >
      <div className="text-sm text-gray-700 space-y-1">
        <p>
          This will permanently delete{" "}
          <span className="font-medium">{item?.name || "this record"}</span>.
        </p>
        <p className="text-gray-500">This action cannot be undone.</p>
      </div>
    </Modal>
  );
};

const EditSubmissionModal = ({ open, onClose, onSaved, item }) => {
  const [saving, setSaving] = useState(false);
  const onSubmit = async (payload) => {
    setSaving(true);
    try {
      await updateCampSubmission(item.id, payload);
      onSaved?.();
      onClose?.();
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit: ${item?.name || ""}`}
      footer={null}
    >
      {/* key forces form to fully re-mount when switching items */}
      <SubmissionForm
        key={item?.id || "new"}
        initial={item}
        onSubmit={onSubmit}
        submitting={saving}
        submitLabel="Update"
      />
    </Modal>
  );
};

/* ----------------------------- Audit Panel ------------------------------- */

const AuditLogsPanel = () => {
  const [items, setItems] = useState([]);
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [actionOpt, setActionOpt] = useState(ACTION_OPTIONS[0]); // All

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const action = actionOpt?.value === "All" ? undefined : ACTION_UI_TO_DB[actionOpt.value];
      const r = await getAuditRecent({ action, limit, offset });
      const raw = Array.isArray(r?.items) ? r.items : [];
      // safety filter (in case backend isn't filtering by table_name):
      const onlyCamp = raw.filter((ev) => ev?.table_name === "camp_submissions");
      setItems(onlyCamp);
    } catch (e) {
      setErr(e?.message || "Failed to load logs");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionOpt, limit, offset]);

  useEffect(() => setOffset(0), [actionOpt]);

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Show</label>
            <Select
              classNamePrefix="rs"
              options={ACTION_OPTIONS}
              value={actionOpt}
              onChange={(opt) => setActionOpt(opt || ACTION_OPTIONS[0])}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Page size</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Number(e.target.value) || 25))}
            >
              {[10, 25, 50, 100, 200].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={load}
              className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {err && (
        <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm">
          {err}
        </div>
      )}
      {!err && loading && (
        <div className="p-8 rounded-xl border bg-white text-center text-gray-600">
          Loading logs…
        </div>
      )}

      {!err && !loading && (
        <>
          {items.length === 0 ? (
            <div className="p-8 rounded-xl border bg-white text-center text-gray-600">
              No events found.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((ev) => (
                <div
                  key={`${ev.id}-${ev.happened_at}`}
                  className="rounded-lg border bg-white p-4 flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cls("px-2 py-0.5 rounded text-xs font-medium", badge(ev.action))}>
                        {ACTION_DB_TO_UI[ev.action] || ev.action}
                      </span>
                      <span className="text-sm text-gray-700">
                        Camp Submission
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      By{" "}
                      <span className="font-medium text-gray-700">
                        {ev.actor_email || ev.actor_id || "Unknown"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-800">
                    {formatDateTime(ev.happened_at)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-gray-500">Showing up to {limit} events</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOffset((o) => Math.max(0, o - limit))}
                className="px-3 py-1.5 bg-white border rounded-lg text-sm hover:bg-gray-50"
                disabled={loading || offset === 0}
              >
                Previous
              </button>
              <button
                onClick={() => setOffset((o) => o + limit)}
                className="px-3 py-1.5 bg-white border rounded-lg text-sm hover:bg-gray-50"
                disabled={loading || items.length < limit}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ----------------------------- Main Page --------------------------------- */

const CampSubmissions = () => {
  const [tab, setTab] = useState("form"); // 'form' | 'list' | 'audit'
  const [creating, setCreating] = useState(false);

  // list state
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(null);
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [errList, setErrList] = useState("");

  // edit/delete modals
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [delOpen, setDelOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deletingNow, setDeletingNow] = useState(false);

  const tabs = useMemo(
    () => [
      { key: "form", label: "Add / Edit" },
      { key: "list", label: "Submissions" },
      { key: "audit", label: "Audit Logs" },
    ],
    []
  );

  const loadList = async () => {
    setLoadingList(true);
    setErrList("");
    try {
      const res = await listCampSubmissions({
        q: q || undefined,
        limit,
        offset,
        sort: "created_at.desc",
      });
      setRows(res?.items || []);
      setTotal(Number.isFinite(res?.total) ? res.total : null);
    } catch (e) {
      setErrList(e?.message || "Failed to load submissions");
      setRows([]);
      setTotal(null);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (tab === "list") loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q, limit, offset]);

  const handleCreate = async (payload) => {
    setCreating(true);
    try {
      await createCampSubmission(payload);
      // move to list and refresh
      setTab("list");
      setOffset(0);
      await loadList();
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (row) => {
    setEditing(row);
    setEditOpen(true);
  };

  const confirmDelete = (row) => {
    setDeleting(row);
    setDelOpen(true);
  };

  const doDelete = async () => {
    if (!deleting?.id) return;
    setDeletingNow(true);
    try {
      await deleteCampSubmission(deleting.id);
      setDelOpen(false);
      setDeleting(null);
      await loadList();
    } finally {
      setDeletingNow(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border">
          <div className="flex flex-wrap">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cls(
                  "px-4 py-3 text-sm font-medium border-b-2",
                  tab === t.key
                    ? "border-sky-600 text-sky-700"
                    : "border-transparent text-gray-600 hover:text-gray-800"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6">
            {tab === "form" && (
              <>
                <h2 className="text-lg font-semibold mb-3">Add New Submission</h2>
                <SubmissionForm onSubmit={handleCreate} submitting={creating} submitLabel="Create" />
              </>
            )}

            {tab === "list" && (
              <>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
                  <h2 className="text-lg font-semibold">Submissions</h2>
                  <div className="flex gap-2">
                    <input
                      value={q}
                      onChange={(e) => {
                        setOffset(0);
                        setQ(e.target.value);
                      }}
                      placeholder="Search name/email/institution…"
                      className="w-full sm:w-72 border rounded-lg px-3 py-2 text-sm"
                    />
                    <select
                      value={limit}
                      onChange={(e) => {
                        setOffset(0);
                        setLimit(Math.max(1, Number(e.target.value) || 10));
                      }}
                      className="border rounded-lg px-2 py-2 text-sm"
                    >
                      {[10, 20, 50, 100].map((n) => (
                        <option key={n} value={n}>
                          {n}/page
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={loadList}
                      disabled={loadingList}
                      className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
                    >
                      {loadingList ? "Refreshing…" : "Refresh"}
                    </button>
                  </div>
                </div>

                {errList && (
                  <div className="p-3 rounded border border-rose-200 bg-rose-50 text-rose-700 text-sm mb-3">
                    {errList}
                  </div>
                )}

                <div className="overflow-auto border rounded-xl">
                  <table className="min-w-[800px] w-full">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-xs text-gray-600">
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">DOB</th>
                        <th className="px-3 py-2 font-medium">Email</th>
                        <th className="px-3 py-2 font-medium">Phone</th>
                        <th className="px-3 py-2 font-medium">Institution</th>
                        <th className="px-3 py-2 font-medium">Type</th>
                        <th className="px-3 py-2 font-medium">Created</th>
                        <th className="px-3 py-2 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {loadingList ? (
                        <tr>
                          <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                            Loading…
                          </td>
                        </tr>
                      ) : rows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                            No records found.
                          </td>
                        </tr>
                      ) : (
                        rows.map((r) => (
                          <tr key={r.id} className="border-t">
                            <td className="px-3 py-2">{r.name}</td>
                            <td className="px-3 py-2">{r.dob || "—"}</td>
                            <td className="px-3 py-2">{r.email || "—"}</td>
                            <td className="px-3 py-2">{r.phone || "—"}</td>
                            <td className="px-3 py-2">{r.institution || "—"}</td>
                            <td className="px-3 py-2">{r.institution_type || r.institutionType || "—"}</td>
                            <td className="px-3 py-2">{formatDateTime(r.created_at)}</td>
                            <td className="px-3 py-2">
                              <div className="flex gap-2 justify-end">
                                <button
                                  className="p-2 rounded hover:bg-gray-100"
                                  title="Edit"
                                  onClick={() => startEdit(r)}
                                >
                                  <FiEdit />
                                </button>
                                <button
                                  className="p-2 rounded hover:bg-rose-50 text-rose-600"
                                  title="Delete"
                                  onClick={() => confirmDelete(r)}
                                >
                                  <FiTrash2 />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mt-3 text-sm">
                  <div className="text-gray-600">
                    {Number.isFinite(total)
                      ? `Showing ${rows.length} of ${total}`
                      : `Showing ${rows.length}`}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setOffset((o) => Math.max(0, o - limit))}
                      className="px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-50"
                      disabled={loadingList || offset === 0}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setOffset((o) => o + limit)}
                      className="px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-50"
                      disabled={loadingList || rows.length < limit}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}

            {tab === "audit" && <AuditLogsPanel />}
          </div>
        </div>
      </div>

      {/* Modals */}
      <EditSubmissionModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={loadList}
        item={editing}
      />
      <ConfirmDeleteModal
        open={delOpen}
        onCancel={() => {
          setDelOpen(false);
          setDeleting(null);
        }}
        onConfirm={doDelete}
        item={deleting}
        loading={deletingNow}
      />
    </div>
  );
};

export default CampSubmissions;
