import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients } from "../../utils/api";

const calcAge = (dob) => {
  if (!dob) return "";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "";
  const today = new Date();
  let a = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) a--;
  return a >= 0 ? a : "";
};

const formatDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
};

const Patients = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        // Your backend supports limit/offset; add server search later if needed
        const rows = await getPatients({ limit: 500, offset: 0 });
        if (!mounted) return;
        setPatients(Array.isArray(rows) ? rows : []);
      } catch (e) {
        if (!mounted) return;
        setErr(e?.message || "Failed to load patients");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => {
      const fn = String(p.first_name ?? "").toLowerCase();
      const ln = String(p.last_name ?? "").toLowerCase();
      const ph = String(p.phone ?? "").toLowerCase();
      const em = String(p.email ?? "").toLowerCase();
      return fn.includes(q) || ln.includes(q) || ph.includes(q) || em.includes(q);
    });
  }, [patients, query]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between px-6 mb-5">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Patients</h1>
            <p className="text-sm text-gray-500">All patients you’ve created</p>
          </div>
          {/* space for future actions */}
        </div>

        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <div className="flex-1">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, phone, or email…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="text-xs text-gray-500">
              {filtered.length} of {patients.length}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                      Loading…
                    </td>
                  </tr>
                )}
                {err && !loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-red-600">
                      {err}
                    </td>
                  </tr>
                )}
                {!loading && !err && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                      No patients found.
                    </td>
                  </tr>
                )}
                {!loading &&
                  !err &&
                  filtered.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-indigo-50 cursor-pointer"
                      onClick={() => navigate(`/patients/${p.id}`)}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {p.first_name} {p.last_name}
                      </td>
                      <td className="px-4 py-3 text-sm">{p.gender || "—"}</td>
                      <td className="px-4 py-3 text-sm">{calcAge(p.dob) || "—"}</td>
                      <td className="px-4 py-3 text-sm">{p.phone || "—"}</td>
                      <td className="px-4 py-3 text-sm">{p.email || "—"}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(p.created_at)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Patients;
