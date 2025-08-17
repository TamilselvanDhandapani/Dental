// src/pages/PatientDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getPatient,
  getMedicalHistory,
  listVisitsByPatient,
} from "../../utils/api";

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

const calcAge = (dob) => {
  if (!dob) return "";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "";
  const today = new Date();
  let a = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) a--;
  return a >= 0 ? String(a) : "";
};

const displayText = (v) => {
  if (v === null || v === undefined) return "—";
  const s = String(v).trim();
  if (!s) return "—";
  if (s.toLowerCase() === "null") return "—";
  return s;
};

const displayYesNo = (v) => (v === "Yes" || v === "No" ? v : "—");

/* ---------- page ---------- */
const PatientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [mh, setMh] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    if (!id) {
      setErr("Missing patient id");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const [{ patient: p }, mhRowOrNull, vRows] = await Promise.all([
          getPatient(id),
          getMedicalHistory(id).catch(() => null),
          listVisitsByPatient(id, { limit: 200 }).catch(() => []),
        ]);
        if (!mounted) return;
        setPatient(p || null);
        setMh(mhRowOrNull || null);
        setVisits(Array.isArray(vRows) ? vRows : []);
      } catch (e) {
        if (!mounted) return;
        setErr(e?.message || "Failed to load patient detail");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const address = useMemo(() => {
    if (!patient) return "";
    const parts = [
      patient.address_line1,
      patient.address_line2,
      patient.city,
      patient.state,
    ].filter(Boolean);
    const line = parts.join(", ");
    return patient.pincode ? `${line}${line ? " - " : ""}${patient.pincode}` : line;
  }, [patient]);

  const problemChips = useMemo(() => {
    if (!mh) return [];
    const chips = [];
    const add = (ok, label) => ok && chips.push(label);

    add(!!mh.artificial_valves_pacemaker, "Artificial Valves/Pacemakers");
    add(!!mh.asthma, "Asthma");
    add(!!mh.allergy, "Allergy");
    add(!!mh.bleeding_tendency, "Bleeding Tendency");
    add(!!mh.epilepsy_seizure, "Epilepsy/Seizure");
    add(!!mh.heart_disease, "Heart Disease");
    add(!!mh.hyp_hypertension, "Hypertension/Hypotension");
    add(!!mh.hormone_disorder, "Hormone Disorder");
    add(!!mh.jaundice_liver, "Jaundice/Liver Disease");
    add(!!mh.stomach_ulcer, "Stomach Ulcer");
    add(!!mh.low_high_pressure, "Low/High Pressure");
    add(!!mh.arthritis_joint, "Arthritis/Joint Problem");
    add(!!mh.kidney_problems, "Kidney Problems");
    add(!!mh.thyroid_problems, "Thyroid Problems");
    if (mh.other_problem) {
      chips.push(`Other: ${displayText(mh.other_problem_text)}`);
    }
    return chips;
  }, [mh]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between px-6 mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Patient Details</h1>
            {patient && (
              <p className="text-sm text-gray-500">
                {patient.first_name} {patient.last_name}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate("/patients")}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to list
          </button>
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

        {!loading && !err && !patient && (
          <div className="mx-6 bg-white border border-gray-100 rounded-xl p-8 text-center text-sm text-gray-500">
            Patient not found.
          </div>
        )}

        {patient && (
          <div className="mx-6 space-y-8">
            {/* Patient Profile */}
            <section className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Patient Profile</h2>
              </div>
              <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-medium">
                    {patient.first_name} {patient.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="font-medium">{formatDate(patient.dob)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Age</p>
                  <p className="font-medium">
                    {calcAge(patient.dob) || "—"}{calcAge(patient.dob) ? " years" : ""}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gender</p>
                  <p className="font-medium">{displayText(patient.gender)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{displayText(patient.phone)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{displayText(patient.email)}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium">{address || "—"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Occupation</p>
                  <p className="font-medium">{displayText(patient.occupation)}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Emergency Contact</p>
                  <p className="font-medium">
                    {displayText(patient.emergency_contact?.name)}
                    {patient.emergency_contact?.relation ? ` (${patient.emergency_contact.relation})` : ""}
                    {patient.emergency_contact?.phone ? ` — ${patient.emergency_contact.phone}` : ""}
                  </p>
                </div>
              </div>
            </section>

            {/* Medical History */}
            <section className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Medical History</h2>
              </div>

              {!mh ? (
                <div className="px-6 py-6 text-sm text-gray-500">No medical history on file.</div>
              ) : (
                <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Surgery/Hospitalization (last 5y)</p>
                    <p className="font-medium">
                      {displayYesNo(mh.surgery_or_hospitalized)}
                      {mh.surgery_or_hospitalized === "Yes" && mh.surgery_details
                        ? ` — ${displayText(mh.surgery_details)}`
                        : ""}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Fever/Cold/Cough (current)</p>
                    <p className="font-medium">
                      {displayYesNo(mh.fever_cold_cough)}
                      {mh.fever_cold_cough === "Yes" && mh.fever_details
                        ? ` — ${displayText(mh.fever_details)}`
                        : ""}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Abnormal Bleeding</p>
                    <p className="font-medium">
                      {displayYesNo(mh.abnormal_bleeding_history)}
                      {mh.abnormal_bleeding_history === "Yes" && mh.abnormal_bleeding_details
                        ? ` — ${displayText(mh.abnormal_bleeding_details)}`
                        : ""}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Taking Medicine</p>
                    <p className="font-medium">
                      {displayYesNo(mh.taking_medicine)}
                      {mh.taking_medicine === "Yes" && mh.medicine_details
                        ? ` — ${displayText(mh.medicine_details)}`
                        : ""}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Medication Allergy</p>
                    <p className="font-medium">
                      {displayYesNo(mh.medication_allergy)}
                      {mh.medication_allergy === "Yes" && mh.medication_allergy_details
                        ? ` — ${displayText(mh.medication_allergy_details)}`
                        : ""}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500">Past Dental History</p>
                    <p className="font-medium">{displayText(mh.past_dental_history)}</p>
                  </div>

                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500 mb-2">Medical Problems</p>
                    <div className="flex flex-wrap gap-2">
                      {problemChips.length ? (
                        problemChips.map((label, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {label}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500">None reported</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Visits */}
            <section className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Visits</h2>
                <span className="text-xs text-gray-500">{visits.length} record(s)</span>
              </div>

              {visits.length === 0 ? (
                <div className="px-6 py-6 text-sm text-gray-500">No visits recorded.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {visits.map((v) => {
                    const procs = Array.isArray(v.procedures) ? v.procedures : [];
                    const sum = procs.reduce(
                      (acc, r) => {
                        const t = Number(r.total || 0);
                        const p = Number(r.paid || 0);
                        return { total: acc.total + t, paid: acc.paid + p, due: acc.due + Math.max(t - p, 0) };
                      },
                      { total: 0, paid: 0, due: 0 }
                    );
                    return (
                      <div key={v.id} className="px-6 py-5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="font-medium text-gray-900" title={v.id}>
                            {formatDateTime(v.visit_at)}
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate(`/visits/${v.id}`)}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                            title="View visit details"
                          >
                            View
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Chief Complaint</p>
                            <p className="font-medium">{displayText(v.chief_complaint)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Duration & Onset</p>
                            <p className="font-medium">{displayText(v.duration_onset)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Trigger Factors</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {Array.isArray(v.trigger_factors) && v.trigger_factors.length ? (
                                v.trigger_factors.map((t, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                                  >
                                    {t}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-500">None</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {procs.length > 0 && (
                          <div className="mt-4 overflow-x-auto border rounded-lg">
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
                                    <td className="px-4 py-3 text-sm">
                                      {formatDate(r.visitDate || r.visit_date)}
                                    </td>
                                    <td className="px-4 py-3 text-sm">{displayText(r.procedure)}</td>
                                    <td className="px-4 py-3 text-sm">
                                      {formatDate(r.nextApptDate || r.next_appt_date)}
                                    </td>
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
                                  <th colSpan={3} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Totals</th>
                                  <th className="px-4 py-3 text-right text-sm font-semibold">{inr(sum.total)}</th>
                                  <th className="px-4 py-3 text-right text-sm font-semibold text-green-700">{inr(sum.paid)}</th>
                                  <th className="px-4 py-3 text-right text-sm font-semibold">
                                    <span className={`${sum.due > 0 ? "text-red-700" : "text-green-700"}`}>
                                      {inr(sum.due)}
                                    </span>
                                  </th>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDetail;
