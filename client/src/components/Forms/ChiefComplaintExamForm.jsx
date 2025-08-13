import React, { useEffect, useMemo, useRef, useState } from "react";

/* ========================
   Config & helpers
   ======================== */
const teethNumbers = [8,7,6,5,4,3,2,1, 1,2,3,4,5,6,7,8];
const gradeOptions = ["A", "B", "C", "D", "E"];
const statusOptions = [
  "Intact",
  "Caries",
  "Filled",
  "Missing",
  "Crown",
  "Fractured",
  "Root Canal Treated",
];

const getColorClass = (grade) => {
  switch (grade) {
    case "A": return "bg-green-100 border-green-300 text-green-800";
    case "B": return "bg-yellow-100 border-yellow-300 text-yellow-800";
    case "C": return "bg-orange-100 border-orange-300 text-orange-800";
    case "D": return "bg-red-100 border-red-300 text-red-800";
    case "E": return "bg-red-200 border-red-400 text-red-900";
    default:  return "bg-white border-gray-200 text-gray-500 hover:bg-gray-50";
  }
};

const Grid16 = ({ children, className = "" }) => (
  <div className={`grid [grid-template-columns:repeat(16,minmax(0,1fr))] gap-1.5 ${className}`}>
    {children}
  </div>
);

const Modal = ({ open, title, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 rounded-full p-1 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

const MAX_NOTES = 600;

/* ========================
   Main Form (no backend writes here)
   ======================== */
const ChiefComplaintExamForm = ({
  patientId,          // only used to scope local draft key
  visitId,            // ignored for writes here; real save happens in Review
  initial = {},
  onBack,
  onNext,
  onSave,
}) => {
  // Per-patient draft key so forms don't collide
  const DRAFT_KEY = useMemo(
    () => `dental:chiefComplaintExam:${patientId || "new"}:draft`,
    [patientId]
  );

  // Chief Complaint
  const [chiefComplaint, setChiefComplaint] = useState(initial.chiefComplaint || "");
  const [durationOnset, setDurationOnset] = useState(initial.durationOnset || "");
  const [triggerFactors, setTriggerFactors] = useState(initial.triggerFactors || []);
  const [otherTrigger, setOtherTrigger] = useState(initial.otherTrigger || "");

  // diagnosis & plan
  const [diagnosisNotes, setDiagnosisNotes] = useState(initial.diagnosisNotes || "");
  const [treatmentPlanNotes, setTreatmentPlanNotes] = useState(initial.treatmentPlanNotes || "");

  // Grid state (grade + status per tooth)
  const [upperGrades, setUpperGrades] = useState(
    initial.upperGrades?.length === 16 ? initial.upperGrades : Array(16).fill("")
  );
  const [lowerGrades, setLowerGrades] = useState(
    initial.lowerGrades?.length === 16 ? initial.lowerGrades : Array(16).fill("")
  );
  const [upperStatus, setUpperStatus] = useState(
    initial.upperStatus?.length === 16 ? initial.upperStatus : Array(16).fill("")
  );
  const [lowerStatus, setLowerStatus] = useState(
    initial.lowerStatus?.length === 16 ? initial.lowerStatus : Array(16).fill("")
  );

  // Selection modal
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  // Inline validation
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});

  // Submit state (UI only)
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Keyboard nav
  const gridRefsUpper = useRef(Array.from({ length: 16 }, () => React.createRef()));
  const gridRefsLower = useRef(Array.from({ length: 16 }, () => React.createRef()));

  const openPicker = (jaw, index) => {
    setSelected({ jaw, index });
    setPickerOpen(true);
  };

  const applySelection = (grade, status) => {
    if (!selected) return;
    const { jaw, index } = selected;
    if (jaw === "upper") {
      const g = [...upperGrades]; g[index] = grade; setUpperGrades(g);
      const s = [...upperStatus]; s[index] = status; setUpperStatus(s);
    } else {
      const g = [...lowerGrades]; g[index] = grade; setLowerGrades(g);
      const s = [...lowerStatus]; s[index] = status; setLowerStatus(s);
    }
    setPickerOpen(false);
  };

  const toggleTrigger = (factor) => {
    setTriggerFactors((prev) =>
      prev.includes(factor) ? prev.filter((f) => f !== factor) : [...prev, factor]
    );
  };

  // Build payload (UI state)
  const payload = useMemo(() => {
    const upper = teethNumbers.map((num, idx) => ({
      tooth: num,
      grade: upperGrades[idx],
      status: upperStatus[idx],
    }));
    const lower = teethNumbers.map((num, idx) => ({
      tooth: num,
      grade: lowerGrades[idx],
      status: lowerStatus[idx],
    }));
    const triggers =
      otherTrigger && triggerFactors.includes("Other")
        ? [...triggerFactors.filter((t) => t !== "Other"), `Other: ${otherTrigger}`]
        : triggerFactors;

    return {
      chiefComplaint: chiefComplaint.trim(),
      durationOnset: durationOnset.trim(),
      triggerFactors: triggers,
      otherTrigger: triggerFactors.includes("Other") ? otherTrigger.trim() : "",
      findings: { upper, lower },
      // keep UI helpers locally; not persisted from this step
      upperGrades,
      lowerGrades,
      upperStatus,
      lowerStatus,
      diagnosisNotes: diagnosisNotes.trim(),
      treatmentPlanNotes: treatmentPlanNotes.trim(),
      // the review page can attach patientId/visitId and submit
    };
  }, [
    chiefComplaint,
    durationOnset,
    triggerFactors,
    otherTrigger,
    upperGrades,
    lowerGrades,
    upperStatus,
    lowerStatus,
    diagnosisNotes,
    treatmentPlanNotes,
  ]);

  /* ========================
     Draft: Auto-save + Restore
     ======================== */
  // Auto-save (debounced)
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
        }
      } catch {}
    }, 1200);
    return () => clearTimeout(id);
  }, [payload, DRAFT_KEY]);

  // Restore on mount; merge with initial
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) || {};

      setChiefComplaint(draft.chiefComplaint ?? initial.chiefComplaint ?? "");
      setDurationOnset(draft.durationOnset ?? initial.durationOnset ?? "");
      setTriggerFactors(draft.triggerFactors ?? initial.triggerFactors ?? []);
      setOtherTrigger(draft.otherTrigger ?? initial.otherTrigger ?? "");

      setDiagnosisNotes(draft.diagnosisNotes ?? initial.diagnosisNotes ?? "");
      setTreatmentPlanNotes(draft.treatmentPlanNotes ?? initial.treatmentPlanNotes ?? "");

      const dUpperGrades =
        draft.upperGrades?.length === 16
          ? draft.upperGrades
          : draft.findings?.upper?.map((t) => t.grade) ?? [];
      const dLowerGrades =
        draft.lowerGrades?.length === 16
          ? draft.lowerGrades
          : draft.findings?.lower?.map((t) => t.grade) ?? [];
      const dUpperStatus =
        draft.upperStatus?.length === 16
          ? draft.upperStatus
          : draft.findings?.upper?.map((t) => t.status) ?? [];
      const dLowerStatus =
        draft.lowerStatus?.length === 16
          ? draft.lowerStatus
          : draft.findings?.lower?.map((t) => t.status) ?? [];

      const iUpperGrades = initial.upperGrades?.length === 16 ? initial.upperGrades : Array(16).fill("");
      const iLowerGrades = initial.lowerGrades?.length === 16 ? initial.lowerGrades : Array(16).fill("");
      const iUpperStatus = initial.upperStatus?.length === 16 ? initial.upperStatus : Array(16).fill("");
      const iLowerStatus = initial.lowerStatus?.length === 16 ? initial.lowerStatus : Array(16).fill("");

      setUpperGrades(dUpperGrades.length === 16 ? dUpperGrades : iUpperGrades);
      setLowerGrades(dLowerGrades.length === 16 ? dLowerGrades : iLowerGrades);
      setUpperStatus(dUpperStatus.length === 16 ? dUpperStatus : iUpperStatus);
      setLowerStatus(dLowerStatus.length === 16 ? dLowerStatus : iLowerStatus);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ========================
     Validation
     ======================== */
  const validate = (data = payload) => {
    const e = {};
    if (!data.chiefComplaint) e.chiefComplaint = "Please enter the chief complaint";
    if (triggerFactors.includes("Other") && !otherTrigger.trim()) e.otherTrigger = "Please specify other trigger";
    // Soft caps
    const tooLong = (s) => s && s.length > MAX_NOTES;
    if (tooLong(data.diagnosisNotes)) e.diagnosisNotes = `Keep under ${MAX_NOTES} characters`;
    if (tooLong(data.treatmentPlanNotes)) e.treatmentPlanNotes = `Keep under ${MAX_NOTES} characters`;
    return e;
  };

  useEffect(() => {
    setErrors(validate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  const isFormValid = Object.keys(validate()).length === 0;
  const setFieldTouched = (name) => setTouched((t) => ({ ...t, [name]: true }));
  const count = (s) => (s ? s.length : 0);

  /* ========================
     Actions (No backend here)
     ======================== */
  const handleSaveDraft = () => onSave?.(payload);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError("");

    const emap = validate();
    setErrors(emap);
    setTouched({
      chiefComplaint: true,
      otherTrigger: true,
      diagnosisNotes: true,
      treatmentPlanNotes: true,
    });
    if (Object.keys(emap).length) return;

    // Just pass up; Review step will POST/PUT
    setSaving(true);
    try {
      onSave?.(payload);
      onNext?.(payload, payload);
    } catch (err) {
      setSubmitError(err?.message || "Failed to continue");
    } finally {
      setSaving(false);
    }
  };

  const clearGrid = () => {
    setUpperGrades(Array(16).fill("")); setLowerGrades(Array(16).fill(""));
    setUpperStatus(Array(16).fill("")); setLowerStatus(Array(16).fill(""));
  };

  const copyUpperToLower = () => {
    setLowerGrades([...upperGrades]);
    setLowerStatus([...upperStatus]);
  };

  const exportJSON = () => {
    try {
      const data = JSON.stringify(payload, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dental-exam.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  // Helpers to read currently selected tooth's values
  const currentGrade =
    selected?.jaw === "upper"
      ? upperGrades[selected.index]
      : selected?.jaw === "lower"
      ? lowerGrades[selected.index]
      : "";
  const currentStatus =
    selected?.jaw === "upper"
      ? upperStatus[selected.index]
      : selected?.jaw === "lower"
      ? lowerStatus[selected.index]
      : "";

  const toothLabel = selected
    ? `${selected.jaw === "upper" ? "Upper" : "Lower"} — ${teethNumbers[selected.index]}`
    : "";

  // Keyboard navigation for cells
  const handleKey = (e, jaw, idx) => {
    const isUpper = jaw === "upper";
    const refs = isUpper ? gridRefsUpper.current : gridRefsLower.current;
    const otherRefs = isUpper ? gridRefsLower.current : gridRefsUpper.current;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault(); openPicker(jaw, idx); return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault(); (refs[idx + 1] || refs[idx])?.current?.focus(); return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault(); (refs[idx - 1] || refs[idx])?.current?.focus(); return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault(); (otherRefs[idx] || otherRefs[0])?.current?.focus(); return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault(); (otherRefs[idx] || otherRefs[0])?.current?.focus(); return;
    }
  };

  // Quick summary of marked findings
  const markedCount = useMemo(() => {
    const g = [...upperGrades, ...lowerGrades].filter(Boolean).length;
    const s = [...upperStatus, ...lowerStatus].filter(Boolean).length;
    return { g, s };
  }, [upperGrades, lowerGrades, upperStatus, lowerStatus]);

  return (
    <form
      className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
      onSubmit={handleSubmit}
      noValidate
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-white px-6 py-6 border-b border-gray-100">
        <h2 className="text-2xl font-semibold text-gray-800">Dental Examination</h2>
        <p className="mt-1 text-sm text-gray-500">
          Record patient's chief complaint and dental findings
        </p>
      </div>

      {/* Submit error */}
      {submitError && (
        <div className="px-6 pt-4">
          <p className="text-sm text-red-600">{submitError}</p>
        </div>
      )}

      <div className="px-6 py-6 space-y-8">
        {/* Chief Complaint */}
        <div className="space-y-2">
          <label htmlFor="chief" className="block text-sm font-medium text-gray-700">
            Patient's main reason for visit <span className="text-red-500">*</span>
          </label>
          <textarea
            id="chief"
            className={`w-full rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
              touched.chiefComplaint && errors.chiefComplaint ? "border-red-500" : "border-gray-300"
            }`}
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value.slice(0, MAX_NOTES))}
            onBlur={() => setFieldTouched("chiefComplaint")}
            placeholder="Describe the main problem"
            rows={3}
            aria-invalid={!!(touched.chiefComplaint && errors.chiefComplaint)}
            aria-describedby="chief-error chief-help"
          />
          <p id="chief-help" className="text-xs text-gray-500">{count(chiefComplaint)}/{MAX_NOTES}</p>
          {touched.chiefComplaint && (
            <p id="chief-error" role="alert" className="text-xs text-red-600">{errors.chiefComplaint}</p>
          )}
        </div>

        {/* Duration & onset */}
        <div className="space-y-2">
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
            Duration & Onset
          </label>
          <input
            id="duration"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            value={durationOnset}
            onChange={(e) => setDurationOnset(e.target.value)}
            placeholder="e.g., 2 weeks, gradual onset"
          />
        </div>

        {/* Trigger factors */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Trigger factors (select all that apply)</label>
          <div className="flex flex-wrap gap-2">
            {["Hot", "Cold", "Sweets", "Biting", "Chewing", "Other"].map((factor) => {
              const active = triggerFactors.includes(factor);
              return (
                <button
                  type="button"
                  key={factor}
                  onClick={() => toggleTrigger(factor)}
                  className={`px-4 py-2 rounded-full border text-sm font-medium transition-all flex items-center
                    ${active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"}`}
                  aria-pressed={active}
                >
                  {active && (
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {factor}
                </button>
              );
            })}
          </div>
          {triggerFactors.includes("Other") && (
            <div className="mt-3">
              <label htmlFor="otherTrigger" className="sr-only">Specify other trigger</label>
              <input
                id="otherTrigger"
                className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  touched.otherTrigger && errors.otherTrigger ? "border-red-500" : "border-gray-300"
                }`}
                value={otherTrigger}
                onChange={(e) => setOtherTrigger(e.target.value)}
                onBlur={() => setFieldTouched("otherTrigger")}
                placeholder="Specify other trigger"
                aria-invalid={!!(touched.otherTrigger && errors.otherTrigger)}
                aria-describedby="otherTrigger-error"
              />
              {touched.otherTrigger && (
                <p id="otherTrigger-error" role="alert" className="mt-1 text-xs text-red-600">{errors.otherTrigger}</p>
              )}
            </div>
          )}
        </div>

        {/* Teeth Findings Grid */}
        <div className="p-5 border border-gray-200 rounded-xl bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Dental Findings</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded">
                Tip: Use ← → ↑ ↓ to move, Enter to edit
              </span>
              <button
                type="button"
                onClick={copyUpperToLower}
                className="text-xs rounded-md border px-2.5 py-1.5 bg-white hover:bg-gray-50"
                title="Copy upper grades & status to lower row"
              >
                Copy Upper → Lower
              </button>
              <button
                type="button"
                onClick={clearGrid}
                className="text-xs rounded-md border px-2.5 py-1.5 bg-white hover:bg-gray-50"
                title="Clear all grades & status"
              >
                Clear Grid
              </button>
              <button
                type="button"
                onClick={exportJSON}
                className="text-xs rounded-md border px-2.5 py-1.5 bg-white hover:bg-gray-50"
                title="Export current exam as JSON"
              >
                Export JSON
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Upper (Right → Left)</span>
            <span className="rounded bg-white px-2 py-0.5">Marked: {markedCount.g} grades / {markedCount.s} status</span>
          </div>

          {/* Upper Grade cells */}
          <Grid16 className="mb-2" role="row">
            {upperGrades.map((grade, idx) => (
              <button
                key={`u-${idx}`}
                type="button"
                ref={gridRefsUpper.current[idx]}
                onClick={() => openPicker("upper", idx)}
                onKeyDown={(e) => handleKey(e, "upper", idx)}
                className={`h-10 rounded-md border text-sm font-medium flex items-center justify-center transition-all
                  ${getColorClass(grade)} ${grade ? "shadow-sm" : ""} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                aria-label={`Upper tooth ${teethNumbers[idx]} grade/status`}
                title={upperStatus[idx] ? `Status: ${upperStatus[idx]}` : "Set Grade/Status"}
                tabIndex={0}
              >
                {grade || "-"}
              </button>
            ))}
          </Grid16>

          {/* Upper tooth numbers */}
          <Grid16 className="mb-5">
            {teethNumbers.map((num, idx) => (
              <div key={`un-${idx}`} className="text-center text-sm font-medium text-gray-700 select-none">
                {num}
              </div>
            ))}
          </Grid16>

          <div className="text-xs text-gray-500 mb-2">Lower (Right ← Left)</div>

          {/* Lower tooth numbers */}
          <Grid16 className="mb-2">
            {teethNumbers.map((num, idx) => (
              <div key={`ln-${idx}`} className="text-center text-sm font-medium text-gray-700 select-none">
                {num}
              </div>
            ))}
          </Grid16>

          {/* Lower Grade cells */}
          <Grid16 role="row">
            {lowerGrades.map((grade, idx) => (
              <button
                key={`l-${idx}`}
                type="button"
                ref={gridRefsLower.current[idx]}
                onClick={() => openPicker("lower", idx)}
                onKeyDown={(e) => handleKey(e, "lower", idx)}
                className={`h-10 rounded-md border text-sm font-medium flex items-center justify-center transition-all
                  ${getColorClass(grade)} ${grade ? "shadow-sm" : ""} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                aria-label={`Lower tooth ${teethNumbers[idx]} grade/status`}
                title={lowerStatus[idx] ? `Status: ${lowerStatus[idx]}` : "Set Grade/Status"}
                tabIndex={0}
              >
                {grade || "-"}
              </button>
            ))}
          </Grid16>

          {/* Legend */}
          <div className="mt-6">
            <h4 className="font-medium text-sm text-gray-700 mb-3">GRADE LEGEND</h4>
            <div className="flex gap-6 flex-col md:flex-row justify-center text-sm">
              <div className="flex items-center">
                <span className="w-5 h-5 rounded bg-green-100 border border-green-300 mr-2 flex-shrink-0"></span>
                <span>A — No issue</span>
              </div>
              <div className="flex items-center">
                <span className="w-5 h-5 rounded bg-yellow-100 border border-yellow-300 mr-2 flex-shrink-0"></span>
                <span>B — Mild</span>
              </div>
              <div className="flex items-center">
                <span className="w-5 h-5 rounded bg-orange-100 border border-orange-300 mr-2 flex-shrink-0"></span>
                <span>C — Moderate</span>
              </div>
              <div className="flex items-center">
                <span className="w-5 h-5 rounded bg-red-100 border border-red-300 mr-2 flex-shrink-0"></span>
                <span>D — Severe</span>
              </div>
              <div className="flex items-center">
                <span className="w-5 h-5 rounded bg-red-200 border border-red-400 mr-2 flex-shrink-0"></span>
                <span>E — Extensive</span>
              </div>
            </div>
          </div>
        </div>

        {/* Diagnosis Notes */}
        <div className="space-y-1">
          <label htmlFor="diag" className="block text-sm font-medium text-gray-700">Diagnosis Notes</label>
          <textarea
            id="diag"
            className={`w-full rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
              touched.diagnosisNotes && errors.diagnosisNotes ? "border-red-500" : "border-gray-300"
            }`}
            value={diagnosisNotes}
            onChange={(e) => setDiagnosisNotes(e.target.value.slice(0, MAX_NOTES))}
            onBlur={() => setFieldTouched("diagnosisNotes")}
            placeholder="Enter diagnosis details"
            rows={3}
            aria-invalid={!!(touched.diagnosisNotes && errors.diagnosisNotes)}
            aria-describedby="diag-help diag-error"
          />
          <p id="diag-help" className="text-xs text-gray-500">{count(diagnosisNotes)}/{MAX_NOTES}</p>
          {touched.diagnosisNotes && <p id="diag-error" className="text-xs text-red-600" role="alert">{errors.diagnosisNotes}</p>}
        </div>

        {/* Treatment Plan Notes */}
        <div className="space-y-1">
          <label htmlFor="plan" className="block text-sm font-medium text-gray-700">Treatment Plan Notes</label>
          <textarea
            id="plan"
            className={`w-full rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
              touched.treatmentPlanNotes && errors.treatmentPlanNotes ? "border-red-500" : "border-gray-300"
            }`}
            value={treatmentPlanNotes}
            onChange={(e) => setTreatmentPlanNotes(e.target.value.slice(0, MAX_NOTES))}
            onBlur={() => setFieldTouched("treatmentPlanNotes")}
            placeholder="Enter treatment plan details"
            rows={3}
            aria-invalid={!!(touched.treatmentPlanNotes && errors.treatmentPlanNotes)}
            aria-describedby="plan-help plan-error"
          />
          <p id="plan-help" className="text-xs text-gray-500">{count(treatmentPlanNotes)}/{MAX_NOTES}</p>
          {touched.treatmentPlanNotes && <p id="plan-error" className="text-xs text-red-600" role="alert">{errors.treatmentPlanNotes}</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="sticky bottom-0 border-t border-gray-200 bg-white/90 px-6 py-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => onBack?.(payload)}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
          >
            Back
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
            >
              Save Draft
            </button>
            <button
              type="submit"
              className={`rounded-lg px-5 py-2.5 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors ${
                isFormValid && !saving ? "bg-indigo-600 hover:bg-indigo-700" : "bg-indigo-400 cursor-not-allowed"
              }`}
              disabled={!isFormValid || saving}
            >
              {saving ? "Continuing…" : "Next"}
            </button>
          </div>
        </div>
      </div>

      {/* Picker Modal */}
      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={selected ? `Tooth ${teethNumbers[selected.index]} (${selected.jaw === "upper" ? "Upper" : "Lower"})` : "Set Grade & Status"}
      >
        {selected && (
          <PickerContent
            toothLabel={toothLabel}
            currentGrade={currentGrade}
            currentStatus={currentStatus}
            onApply={applySelection}
          />
        )}
      </Modal>
    </form>
  );
};

/* ========================
   Picker Content
   ======================== */
const PickerContent = ({ toothLabel, currentGrade, currentStatus, onApply }) => {
  const [g, setG] = useState(currentGrade || "");
  const [s, setS] = useState(currentStatus || "");

  useEffect(() => {
    setG(currentGrade || "");
    setS(currentStatus || "");
  }, [currentGrade, currentStatus]);

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600 mb-4">
        Select grade and status for <span className="font-medium text-gray-800">{toothLabel}</span>
      </div>

      {/* Grade buttons */}
      <div>
        <div className="text-sm font-medium text-gray-700 mb-3">Grade</div>
        <div className="flex flex-wrap gap-2">
          {["", ...gradeOptions].map((opt) => {
            const active = g === opt || (!g && opt === "");
            const label = opt || "None";
            return (
              <button
                key={opt || "clear"}
                type="button"
                onClick={() => setG(opt)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all flex items-center
                  ${opt ? getColorClass(opt) : "bg-white border-gray-200"}
                  ${active ? "ring-2 ring-offset-1 ring-indigo-500" : "hover:bg-gray-50"}
                `}
              >
                {active && opt && (
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status pills */}
      <div>
        <div className="text-sm font-medium text-gray-700 mb-3">Status</div>
        <div className="flex flex-wrap gap-2">
          {["", ...statusOptions].map((opt) => {
            const active = s === opt || (!s && opt === "");
            const label = opt || "None";
            return (
              <button
                key={opt || "clear-status"}
                type="button"
                onClick={() => setS(opt)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                  ${active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}
                `}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={() => onApply("", "")}
        >
          Clear
        </button>
        <button
          type="button"
          className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          onClick={() => onApply(g, s)}
        >
          Apply Selection
        </button>
      </div>
    </div>
  );
};

export default ChiefComplaintExamForm;
