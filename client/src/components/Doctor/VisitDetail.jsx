// src/pages/VisitDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getVisit } from "../../utils/api";

/* ---------- helpers ---------- */
const formatDate = (v) => {
  if (!v) return "Not specified";
  const d = new Date(v);
  return isNaN(d.getTime())
    ? "Not specified"
    : d.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
};

const formatDateTime = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const inr = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(Number(value || 0))
    .replace("₹", "₹ ");

const displayText = (v) => {
  if (v === null || v === undefined) return "—";
  const s = String(v).trim();
  if (!s) return "—";
  if (s.toLowerCase() === "null") return "—";
  return s;
};

const getGradeClass = (grade) => {
  switch (grade) {
    case "A":
      return "bg-green-100 text-green-800";
    case "B":
      return "bg-yellow-100 text-yellow-800";
    case "C":
      return "bg-orange-100 text-orange-800";
    case "D":
      return "bg-red-100 text-red-800";
    case "E":
      return "bg-red-200 text-red-900";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

/* ---------- page ---------- */
const VisitDetail = () => {
  const { visitId } = useParams();
  const navigate = useNavigate();

  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;

    if (!visitId) {
      setErr("Missing visit id");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setErr("");
        const v = await getVisit(visitId);
        if (!mounted) return;
        setVisit(v || null);
      } catch (e) {
        if (!mounted) return;
        setErr(e?.message || "Failed to load visit");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [visitId]);

  const procs = useMemo(() => (Array.isArray(visit?.procedures) ? visit.procedures : []), [visit]);
  const procSummary = useMemo(
    () =>
      procs.reduce(
        (acc, r) => {
          const t = Number(r.total || 0);
          const p = Number(r.paid || 0);
          return {
            total: acc.total + t,
            paid: acc.paid + p,
            due: acc.due + Math.max(t - p, 0),
          };
        },
        { total: 0, paid: 0, due: 0 }
      ),
    [procs]
  );

  const renderFindings = (arr = [], jawLabel) => {
    const shown = (arr || []).filter((f) => f?.grade || f?.status);
    if (!shown.length) {
      return (
        <div className="mt-2 text-sm text-gray-500">
          No {jawLabel.toLowerCase()} jaw findings recorded.
        </div>
      );
    }
    return (
      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
        {shown.map((f, i) => (
          <div key={`${jawLabel}-${i}`} className="border rounded-lg p-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Tooth {f.tooth}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getGradeClass(f.grade || "")}`}>
                {f.grade || "—"}
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-600">Status: {displayText(f.status)}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between px-6 mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Visit Details</h1>
            {visit && (
              <p className="text-sm text-gray-500">Visited on {formatDateTime(visit.visit_at)}</p>
            )}
          </div>
          <div className="flex gap-2">
            {visit?.patient_id && (
              <button
                type="button"
                onClick={() => navigate(`/patients/${visit.patient_id}`)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back to Patient
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
          </div>
        </div>

        {loading && (
          <div className="mx-6 bg-white border border-gray-100 rounded-xl p-8 text-center text-sm text-gray-500">
            Loading…
          </div>
        )}

        {err && !loading && (
          <div className="mx-6 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {err}
          </div>
        )}

        {!loading && !err && !visit && (
          <div className="mx-6 bg-white border border-gray-100 rounded-xl p-8 text-center text-sm text-gray-500">
            Visit not found.
          </div>
        )}

        {visit && (
          <div className="mx-6 space-y-8">
            {/* Exam */}
            <section className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Dental Examination</h2>
              </div>
              <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Chief Complaint</p>
                  <p className="font-medium">{displayText(visit.chief_complaint)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Duration & Onset</p>
                  <p className="font-medium">{displayText(visit.duration_onset)}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Trigger Factors</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Array.isArray(visit.trigger_factors) && visit.trigger_factors.length ? (
                      visit.trigger_factors.map((t, i) => (
                        <span key={i} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500">None</span>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Diagnosis Notes</p>
                  <p className="font-medium">{displayText(visit.diagnosis_notes)}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Treatment Plan Notes</p>
                  <p className="font-medium">{displayText(visit.treatment_plan_notes)}</p>
                </div>
              </div>
            </section>

            {/* Findings */}
            <section className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Findings</h2>
              </div>
              <div className="px-6 py-5">
                {renderFindings(visit.findings?.upper, "Upper")}
                {renderFindings(visit.findings?.lower, "Lower")}
              </div>
            </section>

            {/* Procedures */}
            <section className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Procedures & Payments</h2>
                <div className="text-xs text-gray-500">
                  Total: <span className="font-medium">{inr(procSummary.total)}</span> • Paid:{" "}
                  <span className="font-medium text-green-700">{inr(procSummary.paid)}</span> • Due:{" "}
                  <span className={`font-medium ${procSummary.due > 0 ? "text-red-700" : "text-green-700"}`}>
                    {inr(procSummary.due)}
                  </span>
                </div>
              </div>

              {procs.length === 0 ? (
                <div className="px-6 py-6 text-sm text-gray-500">No procedures recorded.</div>
              ) : (
                <div className="px-6 py-5 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Procedure</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Appt</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Due</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {procs.map((r, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3 text-sm">{formatDate(r.visitDate || r.visit_date)}</td>
                          <td className="px-4 py-3 text-sm">{displayText(r.procedure)}</td>
                          <td className="px-4 py-3 text-sm">{formatDate(r.nextApptDate || r.next_appt_date)}</td>
                          <td className="px-4 py-3 text-sm text-right">{inr(r.total)}</td>
                          <td className="px-4 py-3 text-sm text-right text-green-700">{inr(r.paid)}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span className={`${Number(r.due || 0) > 0 ? "text-red-600" : "text-green-600"}`}>
                              {inr(r.due)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <th colSpan={3} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Totals
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">{inr(procSummary.total)}</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-green-700">{inr(procSummary.paid)}</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">
                          <span className={`${procSummary.due > 0 ? "text-red-700" : "text-green-700"}`}>
                            {inr(procSummary.due)}
                          </span>
                        </th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisitDetail;
