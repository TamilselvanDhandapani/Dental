// src/components/CampSubmissions.jsx
import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { FiEdit, FiTrash2, FiSearch, FiRefreshCw, FiPlus, FiList, FiFileText, FiClock, FiChevronDown, FiX } from "react-icons/fi";
import {
  listCampSubmissions,
  createCampSubmission,
  updateCampSubmission,
  deleteCampSubmission,
  getAuditRecent,
} from "../../utils/api";

const ACTION_DB_TO_UI = { INSERT: "Added", UPDATE: "Edited", DELETE: "Deleted" };
const ACTION_UI_TO_DB = { Added: "INSERT", Edited: "UPDATE", Deleted: "DELETE" };

const INST_TYPE_OPTIONS = [
  { value: "Hospital", label: "Hospital" },
  { value: "Clinic", label: "Clinic" },
  { value: "College", label: "College" },
  { value: "Company", label: "Company" },
  { value: "Government", label: "Government" },
  { value: "School", label: "School" },
  { value: "NGO", label: "NGO" },
  { value: "Other", label: "Other" },
];

const ACTION_OPTIONS = [
  { value: "All", label: "All Actions" },
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
  });
};

const badge = (a) =>
  a === "INSERT"
    ? "bg-green-100 text-green-800 border-green-200"
    : a === "UPDATE"
    ? "bg-blue-100 text-blue-800 border-blue-200"
    : a === "DELETE"
    ? "bg-red-100 text-red-800 border-red-200"
    : "bg-gray-100 text-gray-800 border-gray-200";

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
    {children}
  </div>
);

const Button = ({ children, variant = "primary", size = "md", className = "", icon: Icon, ...props }) => {
  const baseClasses = "rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 inline-flex items-center justify-center";
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base"
  };
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500"
  };

  return (
    <button
      className={cls(baseClasses, sizeClasses[size], variantClasses[variant], className)}
      {...props}
    >
      {Icon && <Icon className={children ? "mr-2" : ""} />}
      {children}
    </button>
  );
};

const Input = ({ label, className = "", ...props }) => (
  <div className={className}>
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      {...props}
    />
  </div>
);

const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-8">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
  </div>
);

const EmptyState = ({ message = "No data found", icon: Icon = FiList }) => (
  <div className="text-center py-12 px-4">
    <Icon className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-2 text-sm font-medium text-gray-900">{message}</h3>
    <p className="mt-1 text-sm text-gray-500">Get started by creating a new record.</p>
  </div>
);

// Custom Select Styles for react-select
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: '42px',
    borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? '#3b82f6' : '#9ca3af'
    }
  }),
  menu: (base) => ({
    ...base,
    zIndex: 50,
    borderRadius: '0.5rem',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#eff6ff' : 'white',
    color: state.isSelected ? 'white' : '#374151',
    '&:active': {
      backgroundColor: '#3b82f6',
      color: 'white'
    }
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: '#6b7280',
    '&:hover': {
      color: '#374151'
    }
  }),
  clearIndicator: (base) => ({
    ...base,
    color: '#6b7280',
    '&:hover': {
      color: '#374151'
    }
  }),
  indicatorSeparator: (base) => ({
    ...base,
    backgroundColor: '#e5e7eb'
  })
};

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

    if (!name.trim()) return setErr("Name is required");
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter a valid email");

    const payload = {
      name: name.trim(),
      dob: dob || null,
      email: email || null,
      phone: phone || null,
      institution: institution || null,
      institutionType: institutionType || null,
      comments: comments || null,
    };

    try {
      await onSubmit(payload);
    } catch (e) {
      setErr(e?.message || "Failed to submit");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!!err && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {err}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          required
        />
        
        <Input
          label="Date of Birth"
          type="date"
          value={dob || ""}
          onChange={(e) => setDob(e.target.value)}
        />
        
        <Input
          label="Email"
          type="email"
          value={email || ""}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
        />
        
        <Input
          label="Phone"
          value={phone || ""}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="9876543210"
        />
        
        <Input
          label="Institution"
          value={institution || ""}
          onChange={(e) => setInstitution(e.target.value)}
          placeholder="City Hospital"
        />
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Institution Type</label>
          <Select
            classNamePrefix="react-select"
            options={INST_TYPE_OPTIONS}
            value={institutionType ? INST_TYPE_OPTIONS.find((o) => o.value === institutionType) : null}
            onChange={(opt) => setInstitutionType(opt?.value || "")}
            placeholder="Select institution type..."
            isClearable
            styles={customSelectStyles}
            components={{
              DropdownIndicator: () => <FiChevronDown className="h-5 w-5 mr-2 text-gray-400" />,
              ClearIndicator: () => <FiX className="h-4 w-4 mr-2 text-gray-400 hover:text-gray-600" />
            }}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          rows={3}
          value={comments || ""}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Any notes or additional information..."
        />
      </div>

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={submitting}
          className="min-w-[120px]"
          icon={submitting ? FiRefreshCw : null}
        >
          {submitting ? (
            "Saving..."
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
};

const Modal = ({ open, onClose, title, children, size = "md" }) => {
  if (!open) return null;
  
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl"
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${sizeClasses[size]} w-full`}>
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  {title}
                </h3>
                {children}
              </div>
            </div>
          </div>
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
      title="Confirm Deletion"
      size="sm"
    >
      <div className="bg-white px-4 py-5 sm:p-6">
        <div className="sm:flex sm:items-start">
          <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
            <FiTrash2 className="h-6 w-6 text-red-600" />
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Delete submission
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete <span className="font-medium">{item?.name || "this record"}</span>? 
                This action cannot be undone.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
        <Button
          variant="danger"
          onClick={onConfirm}
          disabled={loading}
          className="sm:ml-3 sm:w-auto"
          icon={loading ? FiRefreshCw : null}
        >
          {loading ? "Deleting..." : "Delete"}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="mt-3 sm:mt-0 sm:w-auto"
        >
          Cancel
        </Button>
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
      title={`Edit Submission: ${item?.name || ""}`}
      size="lg"
    >
      <SubmissionForm
        initial={item}
        onSubmit={onSubmit}
        submitting={saving}
        submitLabel="Update Submission"
      />
    </Modal>
  );
};

const AuditLogsPanel = () => {
  const [items, setItems] = useState([]);
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [actionOpt, setActionOpt] = useState(ACTION_OPTIONS[0]);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const action = actionOpt?.value === "All" ? undefined : ACTION_UI_TO_DB[actionOpt.value];
      const r = await getAuditRecent({ action, limit, offset });
      const rows = (Array.isArray(r?.items) ? r.items : []).filter(
        (ev) => ev?.table_name === "camp_submissions"
      );
      setItems(rows);
    } catch (e) {
      setErr(e?.message || "Failed to load logs");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [actionOpt, limit, offset]);

  useEffect(() => setOffset(0), [actionOpt]);

  return (
    <div className="space-y-6">
      <Card>
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Audit Logs</h3>
          <p className="mt-1 text-sm text-gray-500">Track all changes made to camp submissions</p>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
              <Select
                classNamePrefix="react-select"
                options={ACTION_OPTIONS}
                value={actionOpt}
                onChange={setActionOpt}
                styles={customSelectStyles}
                components={{
                  DropdownIndicator: () => <FiChevronDown className="h-5 w-5 mr-2 text-gray-400" />,
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Items per page</label>
              <Select
                classNamePrefix="react-select"
                options={[10, 25, 50, 100].map(n => ({ value: n, label: n }))}
                value={{ value: limit, label: limit }}
                onChange={(opt) => setLimit(opt.value)}
                styles={customSelectStyles}
                components={{
                  DropdownIndicator: () => <FiChevronDown className="h-5 w-5 mr-2 text-gray-400" />,
                }}
              />
            </div>
            
            <div className="flex justify-end">
              <Button
                onClick={load}
                disabled={loading}
                icon={FiRefreshCw}
                className="w-full md:w-auto"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {err && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {err}
            </div>
          )}
          
          {loading && <LoadingSpinner />}
          
          {!loading && !err && items.length === 0 && (
            <EmptyState message="No audit logs found" icon={FiClock} />
          )}
          
          {!loading && !err && items.length > 0 && (
            <div className="space-y-3">
              {items.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <span className={cls("px-2 py-1 rounded-full text-xs font-medium border", badge(ev.action))}>
                      {ACTION_DB_TO_UI[ev.action] || ev.action}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Camp Submission</p>
                      <p className="text-sm text-gray-500">
                        By {ev.actor_email || ev.actor_id || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">{formatDateTime(ev.happened_at)}</div>
                </div>
              ))}
            </div>
          )}
          
          {!loading && items.length > 0 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Showing {items.length} of {limit} events
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset((o) => Math.max(0, o - limit))}
                  disabled={loading || offset === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset((o) => o + limit)}
                  disabled={loading || items.length < limit}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

const CampSubmissions = () => {
  const [tab, setTab] = useState("form");
  const [creating, setCreating] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(null);
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [errList, setErrList] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [delOpen, setDelOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deletingNow, setDeletingNow] = useState(false);

  const tabs = useMemo(() => [
    { key: "form", label: "Add Submission", icon: FiPlus },
    { key: "list", label: "View Submissions", icon: FiList },
    { key: "audit", label: "Audit Logs", icon: FiFileText },
  ], []);

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
  }, [tab, q, limit, offset]);

  const handleCreate = async (payload) => {
    setCreating(true);
    try {
      await createCampSubmission(payload);
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Camp Submissions</h1>
          <p className="mt-2 text-lg text-gray-600">Manage camp registration submissions</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cls(
                    "group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm",
                    tab === t.key
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  <Icon className={cls(
                    "-ml-0.5 mr-2 h-5 w-5",
                    tab === t.key ? "text-blue-500" : "text-gray-400 group-hover:text-gray-500"
                  )} />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {tab === "form" && (
          <Card className="max-w-4xl mx-auto">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add New Submission</h2>
              <p className="mt-1 text-sm text-gray-500">Fill out the form below to register a new camp participant</p>
            </div>
            <div className="p-6">
              <SubmissionForm onSubmit={handleCreate} submitting={creating} submitLabel="Create Submission" />
            </div>
          </Card>
        )}

        {tab === "list" && (
          <Card>
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Camp Submissions</h2>
              <p className="mt-1 text-sm text-gray-500">View and manage all camp registration submissions</p>
            </div>
            
            <div className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 mb-6 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      value={q}
                      onChange={(e) => {
                        setOffset(0);
                        setQ(e.target.value);
                      }}
                      placeholder="Search by name, email, or institution..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 items-end">
                  <div className="w-32">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Items per page</label>
                    <Select
                      classNamePrefix="react-select"
                      options={[10, 20, 50, 100].map(n => ({ value: n, label: n }))}
                      value={{ value: limit, label: limit }}
                      onChange={(opt) => {
                        setOffset(0);
                        setLimit(opt.value);
                      }}
                      styles={customSelectStyles}
                      components={{
                        DropdownIndicator: () => <FiChevronDown className="h-5 w-5 mr-2 text-gray-400" />,
                      }}
                    />
                  </div>
                  
                  <Button
                    onClick={loadList}
                    disabled={loadingList}
                    variant="outline"
                    icon={FiRefreshCw}
                    className="h-[42px]"
                  >
                    Refresh
                  </Button>
                </div>
              </div>

              {errList && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {errList}
                </div>
              )}

              <div className="overflow-hidden border border-gray-200 rounded-lg">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {["Name", "DOB", "Email", "Phone", "Institution", "Type", "Created", "Actions"].map((header) => (
                          <th
                            key={header}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loadingList ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-8 text-center">
                            <LoadingSpinner />
                          </td>
                        </tr>
                      ) : rows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-12">
                            <EmptyState message="No submissions found" />
                          </td>
                        </tr>
                      ) : (
                        rows.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {r.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {r.dob || "—"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {r.email || "—"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {r.phone || "—"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {r.institution || "—"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {r.institution_type || r.institutionType || "—"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDateTime(r.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => startEdit(r)}
                                  className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                                  title="Edit"
                                >
                                  <FiEdit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => confirmDelete(r)}
                                  className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                                  title="Delete"
                                >
                                  <FiTrash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {!loadingList && rows.length > 0 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    {Number.isFinite(total)
                      ? `Showing ${offset + 1} to ${Math.min(offset + limit, total)} of ${total} entries`
                      : `Showing ${rows.length} entries`}
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOffset((o) => Math.max(0, o - limit))}
                      disabled={loadingList || offset === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOffset((o) => o + limit)}
                      disabled={loadingList || rows.length < limit}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {tab === "audit" && <AuditLogsPanel />}
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