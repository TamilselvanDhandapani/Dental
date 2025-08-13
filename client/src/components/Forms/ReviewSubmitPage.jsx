import React, { useMemo, useState } from "react";
import {
  createPatient,
  upsertMedicalHistory,
  createVisit,
} from "../../utils/api";


const ReviewSubmitPage = ({ formData = {}, onEdit, onSubmit, onBack }) => {
  // ---------- Helpers ----------
  const formatDate = (dateString) => {
    if (!dateString) return "Not specified";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "Not specified";
    return d.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
      .format(Number(value || 0))
      .replace("₹", "₹ ");

  const getGradeColor = (grade) => {
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
        return "bg-gray-100 text-gray-800";
    }
  };

  const safeJoin = (...parts) => parts.filter(Boolean).join(", ");

  const calcAge = (dob) => {
    if (!dob) return "";
    const today = new Date();
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return "";
    let a = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
    return a >= 0 && Number.isFinite(a) ? String(a) : "";
  };

  // Prefer formData.dentalExam, but support chiefComplaintExam key too
  const dentalExam = formData.dentalExam || formData.chiefComplaintExam || {};

  const renderToothFindings = (findings = [], jawLabel) => {
    const filtered = (findings || []).filter((f) => f?.grade || f?.status);
    if (!filtered.length)
      return <p className="text-gray-500">No findings recorded</p>;

    return (
      <div className="mt-2">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          {jawLabel} Jaw Findings
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {filtered.map((f, i) => (
            <div key={`${jawLabel}-${i}`} className="border rounded-lg p-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Tooth {f.tooth}</span>
                {f.grade ? (
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${getGradeColor(
                      f.grade
                    )}`}
                  >
                    Grade: {f.grade}
                  </span>
                ) : (
                  <span className="text-xs text-gray-500">—</span>
                )}
              </div>
              <div className="mt-1 text-sm text-gray-600">
                Status: {f.status || "—"}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ---------- Shorthands ----------
  const profile = formData.patientProfile || {};
  const mh = formData.medicalHistory || {};
  const procs = formData.procedures || {};
  const address = safeJoin(
    profile.addressLine1,
    profile.addressLine2,
    profile.city,
    profile.state
  );
  const ageText = profile.age || calcAge(profile.dob);

  // Support either shape: {rows[]} from older step, or {procedures[]} from new step
  const procedureRows = Array.isArray(procs.rows)
    ? procs.rows
    : Array.isArray(procs.procedures)
    ? procs.procedures
    : [];

  // Problems chips
  const probs = mh.problems || {};
  const PROBLEM_LABELS = {
    artificialValvesPacemaker: "Artificial Valves/Pacemakers",
    asthma: "Asthma",
    allergy: "Allergy",
    bleedingTendency: "Bleeding Tendency",
    epilepsySeizure: "Epilepsy/Seizure",
    heartDisease: "Heart Disease",
    hypHypertension: "Hypertension/Hypotension",
    hormoneDisorder: "Hormone Disorder",
    jaundiceLiver: "Jaundice/Liver Disease",
    stomachUlcer: "Stomach Ulcer",
    lowHighPressure: "Low/High Pressure",
    arthritisJoint: "Arthritis/Joint Problem",
    kidneyProblems: "Kidney Problems",
    thyroidProblems: "Thyroid Problems",
  };
  const problemChips = Object.entries(PROBLEM_LABELS)
    .filter(([k]) => probs[k])
    .map(([key, label]) => (
      <span
        key={key}
        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
      >
        {label}
      </span>
    ));
  if (probs.otherProblem) {
    problemChips.push(
      <span
        key="other"
        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
      >
        Other: {probs.otherProblemText || "Not specified"}
      </span>
    );
  }

  // ---------- Issues banner (auto checks) ----------
  const issues = useMemo(() => {
    const list = [];

    if (!profile.firstName || !profile.lastName) {
      list.push({
        section: "Patient Profile",
        msg: "Full name is incomplete.",
        idx: 1,
        anchor: "#profile",
      });
    }
    if (!profile.dob) {
      list.push({
        section: "Patient Profile",
        msg: "Date of birth is missing.",
        idx: 1,
        anchor: "#profile",
      });
    }
    if (!profile.gender) {
      list.push({
        section: "Patient Profile",
        msg: "Gender is missing.",
        idx: 1,
        anchor: "#profile",
      });
    }
    if (!profile.phone) {
      list.push({
        section: "Patient Profile",
        msg: "Mobile number is missing.",
        idx: 1,
        anchor: "#profile",
      });
    }

    if (mh.surgeryOrHospitalized === "Yes" && !mh.surgeryDetails) {
      list.push({
        section: "Medical History",
        msg: "Add details for surgery/hospitalization.",
        idx: 2,
        anchor: "#medical",
      });
    }
    if (mh.feverColdCough === "Yes" && !mh.feverDetails) {
      list.push({
        section: "Medical History",
        msg: "Add current symptoms details.",
        idx: 2,
        anchor: "#medical",
      });
    }
    if (mh.abnormalBleedingHistory === "Yes" && !mh.abnormalBleedingDetails) {
      list.push({
        section: "Medical History",
        msg: "Add details for abnormal bleeding.",
        idx: 2,
        anchor: "#medical",
      });
    }
    if (mh.takingMedicine === "Yes" && !mh.medicineDetails) {
      list.push({
        section: "Medical History",
        msg: "List medicines (name, dose, frequency).",
        idx: 2,
        anchor: "#medical",
      });
    }
    if (mh.medicationAllergy === "Yes" && !mh.medicationAllergyDetails) {
      list.push({
        section: "Medical History",
        msg: "Specify medication allergies and reactions.",
        idx: 2,
        anchor: "#medical",
      });
    }
    if (probs.otherProblem && !probs.otherProblemText) {
      list.push({
        section: "Medical History",
        msg: "Describe the ‘Other’ medical problem.",
        idx: 2,
        anchor: "#medical",
      });
    }

    if (!dentalExam.chiefComplaint) {
      list.push({
        section: "Dental Examination",
        msg: "Chief complaint is missing.",
        idx: 3,
        anchor: "#dental",
      });
    }

    return list;
  }, [profile, mh, probs, dentalExam]);

  // ---------- Derived helpers for submission ----------
  const TEETH = [8,7,6,5,4,3,2,1, 1,2,3,4,5,6,7,8];
  const buildFindingsFromGrades = (upperGrades = [], lowerGrades = [], upperStatus = [], lowerStatus = []) => {
    const upper = Array.from({ length: 16 }).map((_, i) => ({
      tooth: TEETH[i],
      grade: upperGrades?.[i] || "",
      status: upperStatus?.[i] || "",
    }));
    const lower = Array.from({ length: 16 }).map((_, i) => ({
      tooth: TEETH[i],
      grade: lowerGrades?.[i] || "",
      status: lowerStatus?.[i] || "",
    }));
    return { upper, lower };
  };

  const assembledFindings =
    dentalExam.findings ||
    buildFindingsFromGrades(
      dentalExam.upperGrades,
      dentalExam.lowerGrades,
      dentalExam.upperStatus,
      dentalExam.lowerStatus
    );

  const hasDue =
    Number(procs?.summary?.due || 0) > 0 ||
    (Array.isArray(procedureRows) &&
      procedureRows.some((r) => Number(r?.due || 0) > 0));

  const [submitting, setSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState("");
  const [submitError, setSubmitError] = useState("");

  // Confirmation modal
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Normalize findings to exactly 16 each
  const normalize16 = (arr) =>
    Array.from({ length: 16 }, (_, i) => {
      const src = arr?.[i] || {};
      return {
        tooth: src.tooth ?? TEETH[i],
        grade: src.grade ?? "",
        status: src.status ?? "",
      };
    });

  // Robust extractor for patient ID from various server shapes
  const getNewPatientId = (obj) => {
    if (!obj) return undefined;
    if (obj.id) return obj.id;
    if (obj.patient?.id) return obj.patient.id;
    if (obj.patient_id) return obj.patient_id;
    if (obj.data?.id) return obj.data.id;
    if (obj.new_patient_id) return obj.new_patient_id; // RPC style
    if (obj.newPatientId) return obj.newPatientId;
    if (Array.isArray(obj)) return getNewPatientId(obj[0]);
    return undefined;
  };

  // Build payloads (so both modal + submit can use the same derived data)
  const findings = useMemo(
    () => ({
      upper: normalize16(assembledFindings?.upper),
      lower: normalize16(assembledFindings?.lower),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assembledFindings?.upper, assembledFindings?.lower]
  );

  const cleanRows = useMemo(
    () =>
      (procedureRows || []).map((r) => ({
        visitDate: r.visitDate || null,
        procedure: (r.procedure || "").trim(),
        nextApptDate: r.nextApptDate || null,
        total: Number(r.total || 0),
        paid: Number(r.paid || 0),
        due: Number(r.due || 0),
      })),
    [procedureRows]
  );

  const visitPayload = useMemo(
    () => ({
      chiefComplaint: (dentalExam.chiefComplaint || "").trim(),
      durationOnset: (dentalExam.durationOnset || "").trim(),
      triggerFactors: Array.isArray(dentalExam.triggerFactors)
        ? dentalExam.triggerFactors
        : [],
      diagnosisNotes: (dentalExam.diagnosisNotes || "").trim(),
      treatmentPlanNotes: (dentalExam.treatmentPlanNotes || "").trim(),
      findings,
      ...(cleanRows.length ? { procedures: cleanRows } : {}),
    }),
    [dentalExam, findings, cleanRows]
  );

  const mhPayload = useMemo(
    () => ({
      surgeryOrHospitalized: mh.surgeryOrHospitalized || "",
      surgeryDetails: mh.surgeryDetails || "",
      feverColdCough: mh.feverColdCough || "",
      feverDetails: mh.feverDetails || "",
      problems: mh.problems || {},
      abnormalBleedingHistory: mh.abnormalBleedingHistory || "",
      abnormalBleedingDetails: mh.abnormalBleedingDetails || "",
      takingMedicine: mh.takingMedicine || "",
      medicineDetails: mh.medicineDetails || "",
      medicationAllergy: mh.medicationAllergy || "",
      medicationAllergyDetails: mh.medicationAllergyDetails || "",
      pastDentalHistory: mh.pastDentalHistory || "",
    }),
    [mh]
  );

  // Open modal (with validation)
  const openConfirm = () => {
    if (!dentalExam.chiefComplaint || !dentalExam.chiefComplaint.trim()) {
      setSubmitError("Chief complaint is required for the initial visit.");
      onEdit?.(3);
      return;
    }
    setSubmitError("");
    setConfirmOpen(true);
  };

  // Actual submit (called from modal)
  const doSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");
    setSubmitStep("Submitting…");

    try {
      let patientId = formData.patientId || profile.id || null;

      if (!patientId) {
        setSubmitStep("Creating patient, medical history & initial visit…");
        const patientPayload = {
          firstName: profile.firstName?.trim(),
          lastName: profile.lastName?.trim(),
          dob: profile.dob || null,
          gender: profile.gender || "",
          phone: profile.phone || "",
          email: profile.email?.trim() || "",
          addressLine1: profile.addressLine1?.trim() || "",
          addressLine2: profile.addressLine2?.trim() || "",
          city: profile.city?.trim() || "",
          state: profile.state?.trim() || "",
          pincode: profile.pincode || "",
          occupation: profile.occupation?.trim() || "",
          emergencyContact: {
            name: profile.emergencyContact?.name?.trim() || "",
            relation: profile.emergencyContact?.relation || "",
            phone: profile.emergencyContact?.phone || "",
          },
          medicalHistory: mhPayload,
          initialVisit: visitPayload,
        };

        const created = await createPatient(patientPayload);
        patientId =
          getNewPatientId(created) ||
          created?.id ||
          created?.data?.id;

        if (!patientId) {
          console.error("createPatient response:", created);
          throw new Error("Could not determine new patient ID");
        }

        setSubmitStep("Finalizing…");
        onSubmit?.({
          patientId,
          visit: { id: created?.visit_id || created?.new_visit_id || null },
        });
        setSubmitStep("All done!");
        setSubmitting(false);
        setConfirmOpen(false);
        return;
      }

      // Existing patient path
      setSubmitStep("Saving medical history…");
      await upsertMedicalHistory(patientId, mhPayload);

      setSubmitStep("Saving dental exam & procedures…");
      const savedVisit = await createVisit(patientId, visitPayload);

      setSubmitStep("Finalizing…");
      onSubmit?.({
        patientId,
        visit: savedVisit,
        medicalHistory: { ok: true },
      });

      setSubmitStep("All done!");
      setSubmitting(false);
      setConfirmOpen(false);
    } catch (err) {
      setSubmitError(err?.message || "Failed to submit record");
      setSubmitting(false);
      setSubmitStep("");
      // keep modal open so user can retry or cancel
    }
  };

  const printPage = () => {
    if (typeof window !== "undefined") window.print();
  };

  const exportJSON = () => {
    try {
      const data = JSON.stringify(formData || {}, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "patient-record.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page-break { page-break-after: always; }
          .section { break-inside: avoid; }
        }
      `}</style>

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-white px-6 py-6 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">Review & Submit</h2>
            <p className="mt-1 text-sm text-gray-500">
              Please review all information before final submission
            </p>
          </div>
          <div className="no-print flex gap-2">
            <button
              type="button"
              onClick={exportJSON}
              className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              title="Export JSON"
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={printPage}
              className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              title="Print / Save as PDF"
            >
              Print / PDF
            </button>
          </div>
        </div>

        {/* Issues banner */}
        {issues.length > 0 && (
          <div className="no-print mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-amber-600 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v3m0 4h.01M10.29 3.86l-7.4 12.84A1 1 0 003.72 18h16.56a1 1 0 00.86-1.5L13.74 3.86a1 1 0 00-1.73 0z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">
                  {issues.length} item{issues.length > 1 ? "s" : ""} need your
                  attention
                </p>
                <ul className="mt-2 space-y-1">
                  {issues.map((it, i) => (
                    <li key={i} className="text-sm text-amber-800 flex items-center justify-between">
                      <span>
                        <span className="font-medium">{it.section}:</span>{" "}
                        {it.msg}
                      </span>
                      <span className="flex items-center gap-2">
                        <a
                          href={it.anchor}
                          className="text-amber-800/70 hover:underline hidden sm:inline"
                        >
                          Jump
                        </a>
                        <button
                          type="button"
                          onClick={() => onEdit?.(it.idx)}
                          className="rounded-md border border-amber-300 px-2 py-1 text-xs hover:bg-amber-100"
                        >
                          Fix
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Submit progress / errors */}
        {submitting && (
          <div className="no-print mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800 flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v2A6 6 0 004 12H2z"/>
            </svg>
            <span>{submitStep || "Submitting…"}</span>
          </div>
        )}
        {submitError && !submitting && (
          <div className="no-print mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {submitError}
          </div>
        )}
      </div>

      <div className="px-6 py-6 space-y-10">
        {/* Patient Profile */}
        <section id="profile" className="section border-b border-gray-200 pb-8">
          <div className="flex items-start justify-between mb-5">
            <h3 className="text-lg font-medium text-gray-800">Patient Profile</h3>
            <button
              type="button"
              onClick={() => onEdit?.(1)}
              className="no-print text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Edit
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-6">
            {/* Photo */}
            <div className="w-32">
              <div className="h-32 w-32 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                {profile.photoPreview ? (
                  <img
                    src={profile.photoPreview}
                    alt="Patient"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">
                    No Photo
                  </div>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="font-medium">
                  {(profile.firstName || "Not specified")}{" "}
                  {profile.lastName || ""}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date of Birth</p>
                <p className="font-medium">{formatDate(profile.dob)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Age</p>
                <p className="font-medium">
                  {ageText ? `${ageText} years` : "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Gender</p>
                <p className="font-medium">
                  {profile.gender || "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contact</p>
                <p className="font-medium">
                  {profile.phone || "Not specified"}
                  {profile.email ? ` (${profile.email})` : ""}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium">
                  {address || "Not specified"}
                  {profile.pincode ? ` - ${profile.pincode}` : ""}
                </p>
              </div>

              {/* Emergency Contact */}
              <div className="md:col-span-2 mt-2">
                <p className="text-sm text-gray-500">Emergency Contact</p>
                <p className="font-medium">
                  {profile.emergencyContact?.name || "Not specified"}
                  {profile.emergencyContact?.relation
                    ? ` (${profile.emergencyContact.relation})`
                    : ""}
                  {profile.emergencyContact?.phone
                    ? ` — ${profile.emergencyContact.phone}`
                    : ""}
                </p>
              </div>

              {/* Occupation */}
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">Occupation</p>
                <p className="font-medium">
                  {profile.occupation || "Not specified"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Medical History */}
        <section id="medical" className="section border-b border-gray-200 pb-8">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-medium text-gray-800">Medical History</h3>
            <button
              type="button"
              onClick={() => onEdit?.(2)}
              className="no-print text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Edit
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Surgery / Hospitalization */}
            <div>
              <p className="text-sm text-gray-500">
                Surgery/Hospitalization (last 5 years)
              </p>
              <p className="font-medium">
                {mh.surgeryOrHospitalized || "Not specified"}
                {mh.surgeryOrHospitalized === "Yes" && mh.surgeryDetails
                  ? ` — ${mh.surgeryDetails}`
                  : ""}
              </p>
            </div>

            {/* Fever/Cold/Cough */}
            <div>
              <p className="text-sm text-gray-500">Current Fever/Cold/Cough</p>
              <p className="font-medium">
                {mh.feverColdCough || "Not specified"}
                {mh.feverColdCough === "Yes" && mh.feverDetails
                  ? ` — ${mh.feverDetails}`
                  : ""}
              </p>
            </div>

            {/* Abnormal bleeding */}
            <div>
              <p className="text-sm text-gray-500">
                Abnormal Bleeding (injury/operation)
              </p>
              <p className="font-medium">
                {mh.abnormalBleedingHistory || "Not specified"}
                {mh.abnormalBleedingHistory === "Yes" &&
                mh.abnormalBleedingDetails
                  ? ` — ${mh.abnormalBleedingDetails}`
                  : ""}
              </p>
            </div>

            {/* Taking medicine */}
            <div>
              <p className="text-sm text-gray-500">Currently Taking Medicine</p>
              <p className="font-medium">
                {mh.takingMedicine || "Not specified"}
                {mh.takingMedicine === "Yes" && mh.medicineDetails
                  ? ` — ${mh.medicineDetails}`
                  : ""}
              </p>
            </div>

            {/* Medication allergy */}
            <div>
              <p className="text-sm text-gray-500">Medication Allergy</p>
              <p className="font-medium">
                {mh.medicationAllergy || "Not specified"}
                {mh.medicationAllergy === "Yes" && mh.medicationAllergyDetails
                  ? ` — ${mh.medicationAllergyDetails}`
                  : ""}
              </p>
            </div>

            {/* Past dental history */}
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500">Past Dental History</p>
              <p className="font-medium">
                {mh.pastDentalHistory || "Not specified"}
              </p>
            </div>

            {/* Problems */}
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500 mb-2">Medical Problems</p>
              <div className="flex flex-wrap gap-2">
                {problemChips.length ? (
                  problemChips
                ) : (
                  <span className="text-gray-500">No problems reported</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Dental Examination */}
        <section id="dental" className="section border-b border-gray-200 pb-8">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-medium text-gray-800">Dental Examination</h3>
            <button
              type="button"
              onClick={() => onEdit?.(3)}
              className="no-print text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Edit
            </button>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Chief Complaint</p>
                <p className="font-medium">
                  {dentalExam.chiefComplaint || "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Duration & Onset</p>
                <p className="font-medium">
                  {dentalExam.durationOnset || "Not specified"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500">Trigger Factors</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {Array.isArray(dentalExam.triggerFactors) &&
                dentalExam.triggerFactors.length ? (
                  dentalExam.triggerFactors.map((factor, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                    >
                      {factor}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500">None reported</span>
                )}
              </div>
            </div>

            {/* Tooth Findings */}
            <div>
              <p className="text-sm text-gray-500">Dental Findings</p>
              {renderToothFindings(assembledFindings?.upper || [], "Upper")}
              {renderToothFindings(assembledFindings?.lower || [], "Lower")}
            </div>

            <div>
              <p className="text-sm text-gray-500">Diagnosis Notes</p>
              <p className="font-medium">
                {dentalExam.diagnosisNotes || "No diagnosis notes"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Treatment Plan Notes</p>
              <p className="font-medium">
                {dentalExam.treatmentPlanNotes || "No treatment plan notes"}
              </p>
            </div>
          </div>
        </section>

        {/* Procedures & Payments */}
        <section id="procedures" className="section">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-medium text-gray-800">
              Procedures & Payments
            </h3>
            <button
              type="button"
              onClick={() => onEdit?.(4)}
              className="no-print text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Edit
            </button>
          </div>

          {Array.isArray(procedureRows) && procedureRows.length ? (
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Procedure
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Next Appt
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Paid
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {procedureRows.map((r, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(r.visitDate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {r.procedure || "Not specified"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(r.nextApptDate)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(r.total)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-green-600">
                        {formatCurrency(r.paid)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        <span
                          className={`${
                            Number(r.due || 0) > 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {formatCurrency(r.due)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <th
                      colSpan={3}
                      className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Totals
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      {formatCurrency(procs.summary?.total)}
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-green-700">
                      {formatCurrency(procs.summary?.paid)}
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">
                      <span
                        className={`${
                          Number(procs.summary?.due || 0) > 0
                            ? "text-red-700"
                            : "text-green-700"
                        }`}
                      >
                        {formatCurrency(procs.summary?.due)}
                      </span>
                    </th>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No procedures recorded</p>
          )}

          {hasDue && (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              There is an outstanding balance. You can still submit and update
              payments later.
            </div>
          )}
        </section>

        {/* Actions */}
        <div className="no-print mt-8 flex justify-between page-break">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            onClick={openConfirm}
            disabled={submitting}
            className={`rounded-lg px-5 py-2.5 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors ${
              submitting ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {submitting ? "Submitting…" : "Submit Patient Record"}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmOpen && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-lg rounded-xl bg-white shadow-xl border border-gray-200 p-6">
            <h3 id="confirm-title" className="text-lg font-semibold text-gray-800">
              Confirm submission
            </h3>

            <p className="mt-2 text-sm text-gray-600">
              Please confirm you want to submit this patient record. You can edit it later.
            </p>

            {hasDue && (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Note: There is an outstanding balance due.
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Patient</span>
                <span className="font-medium">
                  {(profile.firstName || "") + " " + (profile.lastName || "")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">DOB</span>
                <span className="font-medium">{formatDate(profile.dob)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Chief Complaint</span>
                <span className="font-medium">
                  {dentalExam.chiefComplaint || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Procedures</span>
                <span className="font-medium">
                  {procedureRows.length} item{procedureRows.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total</span>
                <span className="font-semibold">{formatCurrency(procs.summary?.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Paid</span>
                <span className="font-semibold text-green-700">{formatCurrency(procs.summary?.paid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Due</span>
                <span className={`font-semibold ${Number(procs.summary?.due || 0) > 0 ? "text-red-700" : "text-green-700"}`}>
                  {formatCurrency(procs.summary?.due)}
                </span>
              </div>
            </div>

            {submitError && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                {submitError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => (submitting ? null : setConfirmOpen(false))}
                disabled={submitting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doSubmit}
                disabled={submitting}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  submitting ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v2A6 6 0 004 12H2z"/>
                    </svg>
                    Submitting…
                  </span>
                ) : (
                  "Confirm & Submit"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewSubmitPage;
