import React, { useEffect, useMemo, useState, useCallback } from "react";
import { getOverallNextAppts } from "../../utils/api"; // should call /visits/appointments/next

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const formatDateYYYYMMDDToLocal = (d) => {
  if (!d || typeof d !== "string") return "—";
  const parts = d.split("-");
  if (parts.length !== 3) return "—";
  const [y, m, day] = parts.map(Number);
  if (!y || !m || !day) return "—";
  const dt = new Date(Date.UTC(y, m - 1, day));
  if (Number.isNaN(dt.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(dt);
};

const FollowUps = () => {
  const [rows, setRows] = useState([]); // [{ patientName, date, chiefComplaint, procedure, visitId, patientId }]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [searchText, setSearchText] = useState("");

  const offset = page * pageSize;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOverallNextAppts({ limit: pageSize, offset });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg = String(e?.message || "").toLowerCase();
      if (msg.includes("no upcoming") || msg.includes("not found")) {
        setRows([]);
      } else {
        setError(e?.message || "Failed to load follow-ups");
      }
    } finally {
      setLoading(false);
    }
  }, [pageSize, offset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    if (!searchText) return rows;
    const q = searchText.toLowerCase();
    return rows.filter((r) => {
      const patient = String(r.patientName || "").toLowerCase();
      const cc = String(r.chiefComplaint || "").toLowerCase();
      const proc = String(r.procedure || "").toLowerCase();
      const pid = String(r.patientId || "").toLowerCase();
      const vid = String(r.visitId || "").toLowerCase();
      const dateStr = String(r.date || "");
      return (
        patient.includes(q) ||
        cc.includes(q) ||
        proc.includes(q) ||
        pid.includes(q) ||
        vid.includes(q) ||
        dateStr.includes(q)
      );
    });
  }, [rows, searchText]);

  const canPrev = page > 0;
  const canNext = rows.length === pageSize;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 py-10 px-4">
      <div className="w-full max-w-5xl mx-auto rounded-2xl shadow-xl border border-gray-200 bg-white/80 backdrop-blur-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="bg-indigo-100 text-indigo-600 rounded-full p-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 2v4" />
                <path d="M16 2v4" />
                <rect width="18" height="18" x="3" y="4" rx="2" />
                <path d="M3 10h18" />
              </svg>
            </span>
            <h2 className="text-2xl font-bold text-gray-900">
              Upcoming Follow-ups
            </h2>
          </div>
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <svg
                className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-300 bg-white shadow-sm"
                placeholder="Search patient, complaint, procedure, ID, date..."
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="w-full md:w-28 rounded-lg border border-gray-200 bg-white shadow-sm px-3 py-2"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition px-4 py-2"
            >
              {loading ? (
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 16h5v5" />
                </svg>
              )}
              Refresh
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="overflow-x-auto rounded-lg border border-gray-100 shadow-sm">
            <table className="w-full text-sm text-gray-700">
              <thead>
                <tr className="bg-indigo-50 text-indigo-700 border-b">
                  <th className="py-3 px-4 font-semibold text-left">Date</th>
                  <th className="py-3 px-4 font-semibold text-left">Patient</th>
                  <th className="py-3 px-4 font-semibold text-left">Chief Complaint</th>
                  <th className="py-3 px-4 font-semibold text-left">Procedure</th>
                 
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td className="py-8 text-center" colSpan={6}>
                      <div className="flex items-center justify-center gap-2 text-indigo-500">
                        <svg
                          className="h-5 w-5 animate-spin"
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        Loading...
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && !error && (
                  <tr>
                    <td className="py-10 text-center text-gray-400" colSpan={6}>
                      No upcoming Follow-ups
                    </td>
                  </tr>
                )}
                {!loading && error && (
                  <tr>
                    <td className="py-10 text-center text-red-500" colSpan={6}>
                      {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && filtered.map((r) => (
                  <tr
                    key={`${r.visitId}-${r.date}-${r.procedure || ""}`}
                    className="border-b last:border-0 hover:bg-indigo-50/40 transition"
                  >
                    <td className="py-3 px-4 whitespace-nowrap font-medium">
                      {formatDateYYYYMMDDToLocal(r.date)}
                    </td>
                    <td className="py-3 px-4">
                      {r.patientName || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-3 px-4">
                      {r.chiefComplaint || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-3 px-4">
                      {r.procedure || <span className="text-gray-400">—</span>}
                    </td>
                    
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-500">
              Page <span className="font-semibold text-indigo-700">{page + 1}</span>
            </div>
            <div className="flex gap-2">
              <button
                disabled={!canPrev || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded-lg border border-gray-200 bg-white hover:bg-indigo-50 text-gray-700 transition px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <button
                disabled={!canNext || loading}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FollowUps;
