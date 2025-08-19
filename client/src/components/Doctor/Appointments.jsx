import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import {
  // Appointments API (centralized)
  getAppointmentsByDate as apiGetAppointmentsByDate,
  getAppointmentsByRange as apiGetAppointmentsByRange,
  createAppointment as apiCreateAppointment,
  updateAppointment as apiUpdateAppointment,
  deleteAppointment as apiDeleteAppointment,
} from "../../utils/api";
import { IoIosToday } from "react-icons/io";
import { MdUpcoming, MdPendingActions, MdConfirmationNumber, MdReduceCapacity } from "react-icons/md";

/* ===================== CONSTANTS & HELPERS ===================== */
const MAX_APPTS_PER_DAY = 15;

const SERVICE_TYPES = [
  "Checkup",
  "Cleaning",
  "Filling",
  "Root Canal",
  "Extraction",
  "Whitening",
  "Braces Consult",
  "Implant Consult",
  "Crown/Bridge",
  "Denture",
  "Emergency",
];

const STATUSES = [
  "Pending",
  "Confirmed",
  "Cancelled",
  "Completed",
  "No Show",
  "Rescheduled",
];

const SLOT_DEFS = [
  "08:00", "08:30", "09:00", "09:30",
  "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "14:30", "15:00",
  "15:30", "16:00", "16:30",
];

const TZ = "Asia/Kolkata";

const isoInTZ = (d, tz = TZ) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year").value;
  const m = parts.find((p) => p.type === "month").value;
  const day = parts.find((p) => p.type === "day").value;
  return `${y}-${m}-${day}`;
};
const todayISO = () => isoInTZ(new Date());
const iso = (d) => isoInTZ(new Date(d));

const toLabel = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
};

const isValidPhone = (v) => /^\+?\d{10,14}$/.test(String(v || "").trim());
const cls = (...xs) => xs.filter(Boolean).join(" ");

// If rescheduled, prefer rescheduled_time in displays
const displayTime = (row) =>
  row?.status === "Rescheduled" && row?.rescheduled_time ? row.rescheduled_time : row?.time_slot;

const statusTint = (s) => {
  switch (s) {
    case "Pending": return "bg-amber-100 text-amber-800";
    case "Confirmed": return "bg-indigo-100 text-indigo-800";
    case "Cancelled": return "bg-rose-100 text-rose-800";
    case "Completed": return "bg-emerald-100 text-emerald-800";
    case "No Show": return "bg-rose-100 text-rose-800";
    case "Rescheduled": return "bg-slate-100 text-slate-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const fmtDatePretty = (isoStr) =>
  new Date(isoStr + "T00:00:00").toLocaleDateString("en-IN", {
    timeZone: TZ,
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "short",
  });

const cmpByDateTime = (a, b) =>
  String(a.date).localeCompare(String(b.date)) ||
  String(displayTime(a)).localeCompare(String(displayTime(b)));

const startOfWeek = (d) => {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = (day + 6) % 7; // Monday start
  dt.setDate(dt.getDate() - diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
};
const endOfWeek = (d) => {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  return e;
};
const firstOfMonthGrid = (d) => startOfWeek(new Date(d.getFullYear(), d.getMonth(), 1));
const lastOfMonthGrid = (d) => endOfWeek(new Date(d.getFullYear(), d.getMonth() + 1, 0));

/* ===================== RESCHEDULE MODAL (UPDATED) ===================== */
const RescheduleModal = ({ open, onClose, row, onSave, getBookedForDate }) => {
  const [reschedDate, setReschedDate] = useState("");
  const [reschedTime, setReschedTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const bookedSet = useMemo(() => {
    if (!reschedDate || !getBookedForDate) return new Set();
    const list = getBookedForDate(reschedDate) || [];
    return new Set(list.map((a) => a.time_slot));
  }, [reschedDate, getBookedForDate]);

  useEffect(() => {
    if (open) {
      setReschedDate("");
      setReschedTime("");
      setError("");
      setSaving(false);
    }
  }, [open]);

  if (!open || !row) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reschedDate || !reschedTime) {
      setError("Please select both date and time.");
      return;
    }
    try {
      setSaving(true);
      await onSave?.({
        rescheduled_date: reschedDate,
        rescheduled_time: reschedTime,
      });
      onClose?.();
    } catch (err) {
      setError(err?.message || "Failed to reschedule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => !saving && onClose?.()} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-indigo-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Reschedule Appointment</h3>
            <button
              type="button"
              className="rounded-full p-1 hover:bg-indigo-500 transition-colors"
              onClick={() => !saving && onClose?.()}
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <p className="text-indigo-100 text-sm">Patient: {row?.patient_name} • {row?.date} {displayTime(row)}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="mb-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Date *</label>
              <input
                type="date"
                value={reschedDate}
                onChange={(e) => setReschedDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">New Time *</label>
                {reschedDate ? (
                  <span className="text-xs text-gray-500">Booked slots disabled</span>
                ) : (
                  <span className="text-xs text-rose-600">Select a date first</span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SLOT_DEFS.map((s) => {
                  const booked = bookedSet.has(s);
                  const active = reschedTime === s;
                  return (
                    <button
                      type="button"
                      key={s}
                      disabled={!reschedDate || booked}
                      onClick={() => !booked && reschedDate && setReschedTime(s)}
                      className={cls(
                        "rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                        (!reschedDate || booked) && "cursor-not-allowed opacity-60 bg-gray-50",
                        active
                          ? "border-indigo-600 bg-indigo-100 text-indigo-700"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      {toLabel(s)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              onClick={() => !saving && onClose?.()}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={cls(
                "rounded-lg px-4 py-2 text-sm font-medium text-white",
                !reschedDate || !reschedTime ? "bg-indigo-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
              )}
              disabled={!reschedDate || !reschedTime || saving}
            >
              {saving ? "Saving..." : "Confirm Reschedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ===================== NEW APPOINTMENT MODAL ===================== */
const NewAppointmentModal = ({
  open,
  onClose,
  defaultDate,
  onCreated,
  dayAppointmentsForCapacity = [],
}) => {
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(defaultDate || todayISO());
  const [slot, setSlot] = useState("");
  const [service, setService] = useState(SERVICE_TYPES[0]);
  const [status, setStatus] = useState("Pending");
  const [reschedDate, setReschedDate] = useState("");
  const [reschedTime, setReschedTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setDate(defaultDate || todayISO());
      setSlot("");
      setPatientName("");
      setPhone("");
      setService(SERVICE_TYPES[0]);
      setStatus("Pending");
      setReschedDate("");
      setReschedTime("");
      setError("");
    }
  }, [open, defaultDate]);

  const booked = useMemo(
    () => new Set((dayAppointmentsForCapacity || []).map((a) => a.time_slot)),
    [dayAppointmentsForCapacity]
  );

  const remaining = Math.max(0, MAX_APPTS_PER_DAY - (dayAppointmentsForCapacity?.length || 0));

  const disableSubmit =
    !patientName.trim() ||
    !isValidPhone(phone) ||
    !date ||
    !slot ||
    (status === "Rescheduled" && (!reschedDate || !reschedTime)) ||
    remaining <= 0 ||
    booked.has(slot) ||
    saving;

  const serviceOptions = SERVICE_TYPES.map((type) => ({ value: type, label: type }));
  const statusOptions = STATUSES.map((s) => ({ value: s, label: s }));

  const menuPortalStyles = {
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (disableSubmit) return;
    try {
      setSaving(true);
      const payload = {
        patient_name: patientName.trim(),
        phone: String(phone).trim(),
        date,
        time_slot: slot,
        service_type: service,
        status,
        rescheduled_date: status === "Rescheduled" ? reschedDate : null,
        rescheduled_time: status === "Rescheduled" ? reschedTime : null,
      };
      await apiCreateAppointment(payload);
      onCreated?.(date);
      onClose?.();
    } catch (err) {
      setError(err?.message || "Failed to create appointment");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => !saving && onClose?.()} />
      <div className="relative z-10 w-full max-w-xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-indigo-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">New Appointment</h3>
            <button
              type="button"
              className="rounded-full p-1 hover:bg-indigo-500 transition-colors"
              onClick={() => !saving && onClose?.()}
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <p className="text-indigo-100 text-sm">Max {MAX_APPTS_PER_DAY} appointments per day</p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name *</label>
                <input
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Full name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={cls(
                    "w-full rounded-lg border px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500",
                    isValidPhone(phone) || !phone ? "border-gray-300" : "border-rose-300"
                  )}
                  placeholder="e.g. 9876543210"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                <Select
                  options={serviceOptions}
                  value={{ value: service, label: service }}
                  onChange={(selected) => setService(selected.value)}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  isSearchable={false}
                  menuPlacement="top"
                  menuPosition="fixed"
                  menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                  styles={menuPortalStyles}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Time Slot *</label>
                <span className={cls("text-xs font-medium", remaining > 0 ? "text-emerald-600" : "text-rose-600")}>
                  {remaining} slots available
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SLOT_DEFS.map((s) => {
                  const bookedNow = booked.has(s);
                  const active = slot === s;
                  return (
                    <button
                      type="button"
                      key={s}
                      onClick={() => !bookedNow && setSlot(s)}
                      disabled={bookedNow}
                      className={cls(
                        "rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                        bookedNow && "cursor-not-allowed opacity-60 bg-gray-50",
                        active
                          ? "border-indigo-600 bg-indigo-100 text-indigo-700"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      {toLabel(s)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <Select
                  options={statusOptions}
                  value={{ value: status, label: status }}
                  onChange={(selected) => setStatus(selected.value)}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  isSearchable={false}
                  // Open upwards so it doesn't get hidden
                  menuPlacement="top"
                  menuPosition="fixed"
                  menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                  styles={menuPortalStyles}
                />
              </div>
              {status === "Rescheduled" && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-700 mb-2">Reschedule To</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={reschedDate}
                      onChange={(e) => setReschedDate(e.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                    {/* timing buttons like main slots */}
                    <div className="col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {SLOT_DEFS.map((s) => {
                        const active = reschedTime === s;
                        return (
                          <button
                            type="button"
                            key={s}
                            onClick={() => setReschedTime(s)}
                            className={cls(
                              "rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                              active
                                ? "border-indigo-600 bg-indigo-100 text-indigo-700"
                                : "border-gray-300 text-gray-700 hover:bg-gray-50"
                            )}
                          >
                            {toLabel(s)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                onClick={() => !saving && onClose?.()}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={disableSubmit}
                className={cls(
                  "rounded-lg px-4 py-2 text-sm font-medium text-white",
                  disableSubmit ? "bg-indigo-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
                )}
              >
                {saving ? "Saving..." : "Create Appointment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

/* ===================== CALENDAR & LIST VIEWS ===================== */
const ViewToggle = ({ value, onChange }) => (
  <div className="inline-flex rounded-md shadow-sm">
    {["Day", "Week", "Month"].map((v) => (
      <button
        key={v}
        type="button"
        className={cls(
          "px-3 py-1.5 text-sm font-medium border",
          value === v
            ? "bg-indigo-600 text-white border-indigo-600"
            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
          v === "Day" ? "rounded-l-md" : "",
          v === "Month" ? "rounded-r-md" : "",
          v !== "Day" && v !== "Month" ? "border-l-0" : ""
        )}
        onClick={() => onChange?.(v)}
      >
        {v}
      </button>
    ))}
  </div>
);

const CalendarHeader = ({ view, onView, date, setDate, onNew }) => {
  const goToday = () => setDate(new Date(todayISO() + "T00:00:00"));
  const prev = () => {
    const d = new Date(date);
    if (view === "Day") d.setDate(d.getDate() - 1);
    else if (view === "Week") d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setDate(d);
  };
  const next = () => {
    const d = new Date(date);
    if (view === "Day") d.setDate(d.getDate() + 1);
    else if (view === "Week") d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setDate(d);
  };

  const title =
    view === "Month"
      ? date.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: TZ })
      : fmtDatePretty(iso(date));

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <button className="rounded-md border border-gray-300 p-1.5 hover:bg-gray-50 text-gray-700" onClick={prev} title="Previous">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        <button className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 text-gray-700" onClick={goToday}>
          Today
        </button>
        <button className="rounded-md border border-gray-300 p-1.5 hover:bg-gray-50 text-gray-700" onClick={next} title="Next">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        <h3 className="ml-2 text-lg font-semibold text-gray-900">{title}</h3>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onNew}
          className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          title={view === "Day" ? `Book for ${fmtDatePretty(iso(date))}` : "Book appointment"}
        >
          New Appointment {view === "Day" ? `• ${fmtDatePretty(iso(date))}` : ""}
        </button>
        <ViewToggle value={view} onChange={onView} />
      </div>
    </div>
  );
};

const MonthGrid = ({ date, eventsByDate, onPickDay }) => {
  const start = firstOfMonthGrid(date);
  const end = lastOfMonthGrid(date);

  const days = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  const dow = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="mt-4">
      <div className="grid grid-cols-7 text-xs font-medium text-gray-500 mb-2">
        {dow.map((d) => (
          <div key={d} className="px-2 py-1 text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border border-gray-200">
        {days.map((d) => {
          const key = iso(d);
          const list = eventsByDate.get(key) || [];
          const inMonth = d.getMonth() === date.getMonth();
          const isToday = key === todayISO();
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPickDay?.(key)}
              className={cls(
                "bg-white min-h-[100px] px-2 py-2 text-left hover:bg-indigo-50 focus:outline-none flex flex-col",
                !inMonth && "bg-gray-50 text-gray-400",
                isToday && "border-t-2 border-t-indigo-500"
              )}
            >
              <div
                className={cls(
                  "text-xs font-medium self-end w-6 h-6 flex items-center justify-center rounded-full",
                  isToday && "bg-indigo-100 text-indigo-800"
                )}
              >
                {d.getDate()}
              </div>
              <div className="mt-1 space-y-1 overflow-hidden">
                {list.slice(0, 3).map((e) => (
                  <div key={e.id} className={cls("rounded px-1 py-0.5 text-[11px] truncate", statusTint(e.status))}>
                    <span className="font-medium">{displayTime(e)}</span> • {e.patient_name}
                  </div>
                ))}
                {list.length > 3 && <div className="text-[11px] text-gray-500">+{list.length - 3} more</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const WeekStrip = ({ date, eventsByDate, onPickDay }) => {
  const start = startOfWeek(date);
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 mt-4">
      {days.map((d) => {
        const key = iso(d);
        const items = (eventsByDate.get(key) || []).slice().sort(cmpByDateTime);
        const isToday = key === todayISO();
        return (
          <div
            key={key}
            className={cls(
              "rounded-lg border border-gray-200 bg-white p-3",
              isToday && "border-indigo-300 bg-indigo-50"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-xs text-gray-500">{d.toLocaleDateString("en-IN", { weekday: "short", timeZone: TZ })}</div>
                <div className={cls("text-sm font-semibold", isToday ? "text-indigo-700" : "text-gray-900")}>
                  {d.getDate()}
                </div>
              </div>
              <button className="text-xs text-indigo-600 hover:underline" onClick={() => onPickDay?.(key)}>
                View
              </button>
            </div>
            <div className="space-y-1">
              {items.length === 0 ? (
                <div className="text-xs text-gray-400 py-2">No appointments</div>
              ) : (
                items.map((e) => (
                  <div key={e.id} className={cls("rounded px-2 py-1 text-xs flex items-start", statusTint(e.status))}>
                    <span className="font-medium mr-1">{displayTime(e)}</span>
                    <span className="truncate">{e.patient_name}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const DayPanel = ({ dateISO, items, onStatus, onDelete, onReschedule }) => {
  const list = (items || []).slice().sort(cmpByDateTime);
  return (
    <div className="rounded-lg border border-gray-200 bg-white mt-4">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-semibold text-gray-900">{fmtDatePretty(dateISO)}</h4>
          <div className="text-sm text-gray-500">
            <span className="font-medium">{list.length}</span>/{MAX_APPTS_PER_DAY} appointments
          </div>
        </div>
      </div>
      <div className="overflow-hidden">
        {list.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 text-center">No appointments scheduled for this day</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {list.map((row) => (
              <div key={row.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{displayTime(row)}</span>
                      <span className={cls("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", statusTint(row.status))}>
                        {row.status}
                      </span>
                    </div>
                    <div className="mt-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{row.patient_name}</p>
                      <p className="text-sm text-gray-500">{row.phone}</p>
                      <p className="text-sm text-gray-500 mt-1">{row.service_type}</p>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex space-x-2">
                    <select
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      value={row.status}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "Rescheduled") onReschedule?.(row);
                        else onStatus?.(row, v);
                      }}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button
                      className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                      onClick={() => onDelete?.(row)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ===================== APPOINTMENTS LIST WITH TABS ===================== */

const AppointmentsList = ({ all, onStatus, onDelete, onReschedule, baseDateISO, defaultTab = "Upcoming" }) => {
  const [tab, setTab] = useState(defaultTab);

  // when base date changes (e.g., user selected a future date), update default tab intent
  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab, baseDateISO]);

  const parsed = (all || []).slice().sort(cmpByDateTime);
  const past = parsed.filter((r) => r.date < baseDateISO);
  const today = parsed.filter((r) => r.date === baseDateISO);
  const upcoming = parsed.filter((r) => r.date > baseDateISO);

  const current = tab === "Past" ? past : tab === "Upcoming" ? upcoming : today;

  const statusOptions = STATUSES.map((s) => ({ value: s, label: s }));

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {["Past", "Today", "Upcoming"].map((t) => (
            <button
              key={t}
              className={cls(
                "px-4 py-3 text-sm font-medium border-b-2",
                tab === t
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
              onClick={() => setTab(t)}
            >
              {t}{" "}
              <span className="ml-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                {t === "Past" ? past.length : t === "Upcoming" ? upcoming.length : today.length}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {current.length === 0 ? (
        <div className="p-6 text-center text-gray-500">No appointments found</div>
      ) : (
        <div className="divide-y divide-gray-200">
          {current.map((row) => (
            <div key={row.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{fmtDatePretty(row.date)}</span>
                    <span className="text-sm text-gray-500">{displayTime(row)}</span>
                    <span className={cls("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", statusTint(row.status))}>
                      {row.status}
                    </span>
                  </div>
                  <div className="mt-1">
                    <p className="text-sm font-medium text-gray-900">{row.patient_name}</p>
                    <p className="text-sm text-gray-500">{row.phone}</p>
                    <p className="text-sm text-gray-500 mt-1">{row.service_type}</p>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
                  {/* React-Select for Status in Appointments Tab */}
                  <div className="min-w-[160px]">
                    <Select
                      options={statusOptions}
                      value={{ value: row.status, label: row.status }}
                      onChange={(selected) => {
                        const v = selected.value;
                        if (v === "Rescheduled") onReschedule?.(row);
                        else onStatus?.(row, v);
                      }}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      isSearchable={false}
                    />
                  </div>
                  <button
                    className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                    onClick={() => onDelete?.(row)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ===================== OVERVIEW STATS ===================== */
const StatCard = ({ title, value, icon, accent = "indigo" }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between">
    <div>
      <p className="text-xs font-medium text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
    <div
      className={cls(
        "h-10 w-10 rounded-lg flex items-center justify-center",
        accent === "indigo" && "bg-indigo-50 text-indigo-600",
        accent === "emerald" && "bg-emerald-50 text-emerald-600",
        accent === "amber" && "bg-amber-50 text-amber-600",
        accent === "rose" && "bg-rose-50 text-rose-600"
      )}
    >
      {icon}
    </div>
  </div>
);

/* ===================== MAIN DASHBOARD PAGE ===================== */
const AppointmentDashboard = () => {
  const [activeTab, setActiveTab] = useState("Calendar");
  const [showNew, setShowNew] = useState(false);

  // reschedule modal state
  const [reschedTarget, setReschedTarget] = useState(null);
  const [showResched, setShowResched] = useState(false);

  const [view, setView] = useState("Month");
  const [focusDate, setFocusDate] = useState(new Date(todayISO() + "T00:00:00"));

  const [allInRange, setAllInRange] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const focusedISO = iso(focusDate);

  const eventsByDate = useMemo(() => {
    const map = new Map();
    for (const item of allInRange) {
      if (!item?.date) continue;
      if (!map.has(item.date)) map.set(item.date, []);
      map.get(item.date).push(item);
    }
    return map;
  }, [allInRange]);

  // Top stats
  const t0 = todayISO();
  const todayCount = (eventsByDate.get(t0) || []).length;
  const next7 = (() => {
    const end = new Date();
    end.setDate(end.getDate() + 6);
    const endISO = iso(end);
    return (allInRange || []).filter((r) => r.date >= t0 && r.date <= endISO).length;
  })();
  const pendingCount = (allInRange || []).filter((r) => r.status === "Pending").length;
  const confirmedCount = (allInRange || []).filter((r) => r.status === "Confirmed").length;

  const dayItems = eventsByDate.get(focusedISO) || [];

  const range = useMemo(() => {
    if (view === "Day") {
      const d = iso(focusDate);
      return { from: d, to: d };
    }
    if (view === "Week") {
      const s = startOfWeek(focusDate);
      const e = endOfWeek(focusDate);
      return { from: iso(s), to: iso(e) };
    }
    const from = iso(firstOfMonthGrid(focusDate));
    const to = iso(lastOfMonthGrid(focusDate));
    return { from, to };
  }, [view, focusDate]);

  // tiny wrapper to use the centralized API, with optional fallback aggregation
  const fetchRange = async (from, to) => {
    try {
      return await apiGetAppointmentsByRange(from, to);
    } catch {
      const out = [];
      const d0 = new Date(from);
      const d1 = new Date(to);
      for (let d = new Date(d0); d <= d1; d.setDate(d.getDate() + 1)) {
        // eslint-disable-next-line no-await-in-loop
        const rows = await apiGetAppointmentsByDate(iso(d));
        out.push(...(Array.isArray(rows) ? rows : []));
      }
      return out;
    }
  };

  useEffect(() => {
    let live = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const rows = await fetchRange(range.from, range.to);
        if (!live) return;
        setAllInRange(Array.isArray(rows) ? rows : []);
      } catch (e) {
        setErr(e?.message || "Failed to load appointments");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [range.from, range.to]);

  const refreshDay = async (dateISO) => {
    const rows = await fetchRange(range.from, range.to);
    setAllInRange(Array.isArray(rows) ? rows : []);
    if (dateISO) {
      setFocusDate(new Date(dateISO + "T00:00:00"));
      setActiveTab("Calendar");
      setView("Day");
    }
  };

  const handleStatusChange = async (row, newStatus) => {
    try {
      await apiUpdateAppointment(row.id, { status: newStatus });
      refreshDay();
    } catch (e) {
      setErr(e?.message || "Failed to update status");
    }
  };

  const openReschedule = (row) => {
    setReschedTarget(row);
    setShowResched(true);
  };

  const saveReschedule = async ({ rescheduled_date, rescheduled_time }) => {
    if (!reschedTarget) return;
    await apiUpdateAppointment(reschedTarget.id, {
      status: "Rescheduled",
      rescheduled_date,
      rescheduled_time,
    });
    setShowResched(false);
    setReschedTarget(null);
    await refreshDay();
  };

  const onDelete = async (row) => {
    if (!window.confirm("Delete this appointment?")) return;
    try {
      await apiDeleteAppointment(row.id);
      refreshDay();
    } catch (e) {
      setErr(e?.message || "Failed to delete");
    }
  };

  const allSorted = useMemo(() => (allInRange || []).slice().sort(cmpByDateTime), [allInRange]);

  // Determine base date for Appointments tab partitioning and default tab
  const baseDateISO = (() => {
    const f = iso(focusDate);
    return f > t0 ? f : t0;
  })();
  const defaultTabForList = baseDateISO > t0 ? "Past" : "Upcoming";

  // Support: booked slots getter for reschedule modal
  const getBookedForDate = (dateISO) => eventsByDate.get(dateISO) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Appointment Dashboard</h1>
            <p className="text-sm text-gray-500">Overview & schedule</p>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Today" value={todayCount} accent="indigo" icon={<IoIosToday className="h-5 w-5" />} />
          <StatCard title="Upcoming (7d)" value={next7} accent="emerald" icon={<MdUpcoming className="h-5 w-5" />} />
          <StatCard title="Pending" value={pendingCount} accent="amber" icon={<MdPendingActions className="h-5 w-5" />} />
          <StatCard title="Confirmed" value={confirmedCount} accent="indigo" icon={<MdConfirmationNumber className="h-5 w-5" />} />
          <StatCard
            title="Capacity Left (Today)"
            value={Math.max(0, MAX_APPTS_PER_DAY - todayCount)}
            accent="rose"
            icon={<MdReduceCapacity className="h-5 w-5" />}
          />
        </div>

        {/* Tabs & Content */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {["Calendar", "Appointments"].map((tab) => (
                <button
                  key={tab}
                  className={cls(
                    "px-4 py-3 text-sm font-medium border-b-2",
                    activeTab === tab
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4">
            {err && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 mb-4">
                {err}
              </div>
            )}

            {activeTab === "Calendar" ? (
              <div>
                <div className="mb-4">
                  <CalendarHeader
                    view={view}
                    onView={setView}
                    date={focusDate}
                    setDate={setFocusDate}
                    onNew={() => setShowNew(true)}
                  />
                </div>

                {loading ? (
                  <div className="flex justify-center py-8">
                    <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                ) : view === "Month" ? (
                  <MonthGrid
                    date={focusDate}
                    eventsByDate={eventsByDate}
                    onPickDay={(d) => {
                      setFocusDate(new Date(d + "T00:00:00"));
                      setView("Day");
                    }}
                  />
                ) : view === "Week" ? (
                  <WeekStrip
                    date={focusDate}
                    eventsByDate={eventsByDate}
                    onPickDay={(d) => {
                      setFocusDate(new Date(d + "T00:00:00"));
                      setView("Day");
                    }}
                  />
                ) : (
                  <DayPanel
                    dateISO={focusedISO}
                    items={dayItems}
                    onStatus={handleStatusChange}
                    onDelete={onDelete}
                    onReschedule={openReschedule}
                  />
                )}
              </div>
            ) : (
              <AppointmentsList
                all={allSorted}
                onStatus={handleStatusChange}
                onDelete={onDelete}
                onReschedule={openReschedule}
                baseDateISO={baseDateISO}
                defaultTab={defaultTabForList}
              />
            )}
          </div>
        </div>
      </div>

      {/* New Appointment Modal */}
      <NewAppointmentModal
        open={showNew}
        onClose={() => setShowNew(false)}
        defaultDate={focusedISO}
        onCreated={refreshDay}
        dayAppointmentsForCapacity={eventsByDate.get(focusedISO) || []}
      />

      {/* Reschedule Modal */}
      <RescheduleModal
        open={showResched}
        onClose={() => {
          setShowResched(false);
          setReschedTarget(null);
        }}
        row={reschedTarget}
        onSave={saveReschedule}
        getBookedForDate={getBookedForDate}
      />
    </div>
  );
};

export default AppointmentDashboard;
