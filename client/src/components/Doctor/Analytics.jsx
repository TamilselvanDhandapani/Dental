import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import {
  getPatientsByYear,
  getPatientsByYearMonth,
  getPatientsByYearGender,
  getPatientsByAgeGroup,
  getVisitsByYear,
  getVisitsByMonth,
} from "../../utils/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

/* ---------------------------- helpers ---------------------------- */
const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"
];
const toMonthName = (m) => MONTHS[(Number(m) || 1) - 1] || String(m || "");
const fmtInt = (n) => (Number.isFinite(+n) ? Number(n) : 0);

// One brand color; we’ll vary opacity to create shades
const BASE_RGB = { r: 99, g: 102, b: 241 }; // indigo-500
const shadeSeries = (len, { r, g, b } = BASE_RGB) => {
  // opacity from 0.35 -> 1.0
  const min = 0.35;
  const max = 1.0;
  return Array.from({ length: len }, (_, i) => {
    const a = len <= 1 ? 1 : min + (i / (len - 1)) * (max - min);
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
  });
};

const selectStyles = {
  control: (base) => ({
    ...base,
    minHeight: 34,
    borderColor: "#E5E7EB",
    boxShadow: "none",
    ":hover": { borderColor: "#CBD5E1" },
    fontSize: 14,
  }),
  valueContainer: (base) => ({ ...base, padding: "2px 8px" }),
  indicatorsContainer: (base) => ({ ...base, padding: "2px 6px" }),
  menu: (base) => ({ ...base, zIndex: 40, fontSize: 14 }),
};

const Note = ({ tone = "info", children }) => {
  const tones = {
    info: "bg-indigo-50 text-indigo-700 border-indigo-200",
    warn: "bg-amber-50 text-amber-800 border-amber-200",
    error: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${tones[tone]}`}>
      {children}
    </div>
  );
};

const Segmented = ({ value, onChange, options }) => (
  <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
    {options.map((opt) => {
      const active = value === opt.value;
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            active
              ? "bg-indigo-600 text-white"
              : "text-gray-700 hover:bg-gray-50"
          }`}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

const chartTypeOptions = [
  { label: "Bar", value: "bar" },
  { label: "Line", value: "line" },
  { label: "Pie", value: "pie" },
];

// Gender-specific options (no line)
const chartTypeOptionsGender = [
  { label: "Bar", value: "bar" },
  { label: "Pie", value: "pie" },
];

const Card = ({ title, subtitle, right, children }) => (
  <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-100">
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-gray-800">
          {title}
        </h3>
        {subtitle ? (
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{subtitle}</p>
        ) : null}
      </div>
      {right}
    </div>
    <div className="p-4 sm:p-6">{children}</div>
  </div>
);

/* Reusable chart: expects [{label, value}] */
const Chart = ({ type, data, valueKey = "value", height = 280, itemColors }) => {
  if (!Array.isArray(data) || data.length === 0) return <Note tone="info">No data</Note>;

  const normalized = data.map((d) => ({ ...d, [valueKey]: fmtInt(d[valueKey]) }));

  if (type === "pie") {
    return (
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={normalized}
              dataKey={valueKey}
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label
              isAnimationActive
            >
              {(itemColors || []).length
                ? normalized.map((_, i) => (
                    <Cell key={i} fill={itemColors[i % itemColors.length]} />
                  ))
                : normalized.map((_, i) => (
                    <Cell key={i} fill={`rgba(${BASE_RGB.r}, ${BASE_RGB.g}, ${BASE_RGB.b}, ${0.5 + (i % 5) * 0.1})`} />
                  ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === "line") {
    return (
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer>
          <LineChart
            data={normalized}
            margin={{ top: 10, right: 20, bottom: 0, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey={valueKey}
              stroke={`rgba(${BASE_RGB.r}, ${BASE_RGB.g}, ${BASE_RGB.b}, 1)`}
              strokeWidth={2}
              dot
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // default: bar
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer>
        <BarChart
          data={normalized}
          margin={{ top: 10, right: 20, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey={valueKey}>
            {(itemColors || []).length
              ? normalized.map((_, i) => (
                  <Cell key={i} fill={itemColors[i % itemColors.length]} />
                ))
              : normalized.map((_, i) => (
                  <Cell
                    key={i}
                    fill={`rgba(${BASE_RGB.r}, ${BASE_RGB.g}, ${BASE_RGB.b}, ${0.5 + (i % 5) * 0.1})`}
                  />
                ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ---------------------------- main page ---------------------------- */
const Analytics = () => {
  // Per-card chart type states
  const [typePYear, setTypePYear] = useState("bar");
  const [typePMonth, setTypePMonth] = useState("bar");
  const [typePGender, setTypePGender] = useState("pie"); // no line here
  const [typePAge, setTypePAge] = useState("bar");
  const [typeVYear, setTypeVYear] = useState("bar");
  const [typeVMonth, setTypeVMonth] = useState("line");

  // Base datasets
  const [patientsByYear, setPatientsByYear] = useState([]);
  const [patientsByAgeGroup, setPatientsByAgeGroup] = useState([]);
  const [visitsByYear, setVisitsByYear] = useState([]);

  // Year-scoped datasets
  const [patientsByYearMonth, setPatientsByYearMonth] = useState([]);
  const [patientsByYearGender, setPatientsByYearGender] = useState([]);
  const [visitsByMonth, setVisitsByMonth] = useState([]);

  // Year pickers
  const [yearPMonth, setYearPMonth] = useState("");
  const [yearPGender, setYearPGender] = useState("");
  const [yearVMonth, setYearVMonth] = useState("");

  // Loading/error states
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingPMonth, setLoadingPMonth] = useState(false);
  const [loadingPGender, setLoadingPGender] = useState(false);
  const [loadingVMonth, setLoadingVMonth] = useState(false);
  const [err, setErr] = useState("");

  // Load base
  useEffect(() => {
    let live = true;
    (async () => {
      setErr("");
      setLoadingBase(true);
      try {
        const [pYear, pAge, vYear] = await Promise.all([
          getPatientsByYear(),        // [{year,total}]
          getPatientsByAgeGroup(),    // [{age_group,total}]
          getVisitsByYear(),          // [{year,total}]
        ]);
        if (!live) return;

        const pYearRows = Array.isArray(pYear) ? pYear : [];
        const vYearRows = Array.isArray(vYear) ? vYear : [];

        setPatientsByYear(pYearRows);
        setPatientsByAgeGroup(Array.isArray(pAge) ? pAge : []);
        setVisitsByYear(vYearRows);

        const candidateYears = [
          ...new Set([...pYearRows.map(r => r.year), ...vYearRows.map(r => r.year)])
        ].filter(Boolean).sort((a,b) => Number(b) - Number(a));
        const latest = String(candidateYears[0] || new Date().getFullYear());

        setYearPMonth(latest);
        setYearPGender(latest);
        setYearVMonth(latest);
      } catch (e) {
        setErr(e?.message || "Failed to load analytics");
      } finally {
        setLoadingBase(false);
      }
    })();
    return () => { live = false; };
  }, []);

  // Patients by month
  useEffect(() => {
    if (!yearPMonth) return;
    let live = true;
    (async () => {
      setLoadingPMonth(true);
      try {
        const rows = await getPatientsByYearMonth(yearPMonth);
        if (!live) return;
        setPatientsByYearMonth(Array.isArray(rows) ? rows : []);
      } catch (e) {
        setErr(prev => prev || e?.message || "Failed to load monthly patients");
      } finally {
        setLoadingPMonth(false);
      }
    })();
    return () => { live = false; };
  }, [yearPMonth]);

  // Patients by gender
  useEffect(() => {
    if (!yearPGender) return;
    let live = true;
    (async () => {
      setLoadingPGender(true);
      try {
        const rows = await getPatientsByYearGender(yearPGender);
        if (!live) return;
        setPatientsByYearGender(Array.isArray(rows) ? rows : []);
      } catch (e) {
        setErr(prev => prev || e?.message || "Failed to load gender data");
      } finally {
        setLoadingPGender(false);
      }
    })();
    return () => { live = false; };
  }, [yearPGender]);

  // Visits by month
  useEffect(() => {
    if (!yearVMonth) return;
    let live = true;
    (async () => {
      setLoadingVMonth(true);
      try {
        const rows = await getVisitsByMonth(yearVMonth);
        if (!live) return;
        setVisitsByMonth(Array.isArray(rows) ? rows : []);
      } catch (e) {
        setErr(prev => prev || e?.message || "Failed to load monthly visits");
      } finally {
        setLoadingVMonth(false);
      }
    })();
    return () => { live = false; };
  }, [yearVMonth]);

  // Options for react-select
  const yearOptions = useMemo(() => {
    const ys = new Set([
      ...patientsByYear.map((r) => String(r.year)),
      ...visitsByYear.map((r) => String(r.year)),
    ]);
    return Array.from(ys)
      .filter(Boolean)
      .sort((a, b) => Number(b) - Number(a))
      .map((y) => ({ value: y, label: y }));
  }, [patientsByYear, visitsByYear]);

  // Data mapping
  const dataPatientsByYear = useMemo(
    () => patientsByYear.map((r) => ({ label: String(r.year), value: fmtInt(r.total) })),
    [patientsByYear]
  );
  const dataPatientsByYearMonth = useMemo(
    () =>
      patientsByYearMonth
        .slice()
        .sort((a, b) => Number(a.month) - Number(b.month))
        .map((r) => ({ label: toMonthName(r.month), value: fmtInt(r.total) })),
    [patientsByYearMonth]
  );
  const dataPatientsByYearGender = useMemo(
    () =>
      patientsByYearGender.map((r) => ({
        label: r.gender || "Unknown",
        value: fmtInt(r.total),
      })),
    [patientsByYearGender]
  );
  const dataPatientsByAgeGroup = useMemo(
    () => patientsByAgeGroup.map((r) => ({ label: r.age_group || "Unknown", value: fmtInt(r.total) })),
    [patientsByAgeGroup]
  );
  const dataVisitsByYear = useMemo(
    () => visitsByYear.map((r) => ({ label: String(r.year), value: fmtInt(r.total) })),
    [visitsByYear]
  );
  const dataVisitsByMonth = useMemo(
    () =>
      visitsByMonth
        .slice()
        .sort((a, b) => Number(a.month) - Number(b.month))
        .map((r) => ({ label: toMonthName(r.month), value: fmtInt(r.total) })),
    [visitsByMonth]
  );

  // Overview KPIs
  const totalPatients = useMemo(
    () => dataPatientsByYear.reduce((s, r) => s + r.value, 0),
    [dataPatientsByYear]
  );
  const totalVisits = useMemo(
    () => dataVisitsByYear.reduce((s, r) => s + r.value, 0),
    [dataVisitsByYear]
  );
  const uniqueYears = useMemo(
    () =>
      new Set([
        ...patientsByYear.map((r) => r.year),
        ...visitsByYear.map((r) => r.year),
      ]).size,
    [patientsByYear, visitsByYear]
  );
  const latestYear = useMemo(() => {
    const ys = [
      ...new Set([
        ...patientsByYear.map((r) => r.year),
        ...visitsByYear.map((r) => r.year),
      ]),
    ].filter(Boolean);
    return ys.sort((a, b) => Number(b) - Number(a))[0] || "-";
  }, [patientsByYear, visitsByYear]);

  const patientsInLatestYear = useMemo(() => {
    if (!latestYear || latestYear === "-") return 0;
    return fmtInt(
      patientsByYear.find((r) => String(r.year) === String(latestYear))?.total
    );
  }, [patientsByYear, latestYear]);

  const visitsInLatestYear = useMemo(() => {
    if (!latestYear || latestYear === "-") return 0;
    return fmtInt(
      visitsByYear.find((r) => String(r.year) === String(latestYear))?.total
    );
    // eslint-disable-next-line
  }, [visitsByYear, latestYear]);

  // Shades for monthly charts (same base color, different opacities)
  const monthColorsPatients = useMemo(
    () => shadeSeries(dataPatientsByYearMonth.length),
    [dataPatientsByYearMonth.length]
  );
  const monthColorsVisits = useMemo(
    () => shadeSeries(dataVisitsByMonth.length),
    [dataVisitsByMonth.length]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-500">
              Overview of patients & visits with monthly, gender, and age splits.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-10 space-y-6">
        {err ? <Note tone="error">{err}</Note> : null}

     

        {/* Patients by Year */}
        <Card
          title="Patients by Year"
          subtitle="Total registered patients per year"
          right={
            <Segmented value={typePYear} onChange={setTypePYear} options={chartTypeOptions} />
          }
        >
          {loadingBase ? <Note tone="info">Loading…</Note> : (
            <Chart type={typePYear} data={dataPatientsByYear} />
          )}
        </Card>

        {/* Patients by Month — react-select + shades */}
        <Card
          title="Patients by Month"
          subtitle="Monthly patient registrations"
          right={
            <div className="flex items-center gap-2">
              <div className="w-32">
                <Select
                  isSearchable
                  styles={selectStyles}
                  options={yearOptions}
                  value={yearOptions.find((o) => o.value === yearPMonth) || null}
                  onChange={(opt) => setYearPMonth(opt?.value || "")}
                  placeholder="Year"
                />
              </div>
              <Segmented value={typePMonth} onChange={setTypePMonth} options={chartTypeOptions} />
            </div>
          }
        >
          {loadingPMonth || loadingBase ? <Note tone="info">Loading…</Note> : (
            <Chart
              type={typePMonth}
              data={dataPatientsByYearMonth}
              itemColors={monthColorsPatients}
            />
          )}
        </Card>

        {/* Patients by Gender — NO line, Bar/Pie only */}
        <Card
          title="Patients by Gender"
          subtitle="Distribution by gender for selected year"
          right={
            <div className="flex items-center gap-2">
              <div className="w-32">
                <Select
                  isSearchable
                  styles={selectStyles}
                  options={yearOptions}
                  value={yearOptions.find((o) => o.value === yearPGender) || null}
                  onChange={(opt) => setYearPGender(opt?.value || "")}
                  placeholder="Year"
                />
              </div>
              <Segmented
                value={typePGender}
                onChange={(v) => setTypePGender(v === "line" ? "bar" : v)}
                options={chartTypeOptionsGender}
              />
            </div>
          }
        >
          {loadingPGender || loadingBase ? <Note tone="info">Loading…</Note> : (
            <Chart
              type={typePGender === "line" ? "bar" : typePGender}
              data={dataPatientsByYearGender}
            />
          )}
        </Card>

        {/* Patients by Age Group */}
        <Card
          title="Patients by Age Group"
          subtitle="How your patient base is distributed across ages"
          right={
            <Segmented value={typePAge} onChange={setTypePAge} options={chartTypeOptions} />
          }
        >
          {loadingBase ? <Note tone="info">Loading…</Note> : (
            <Chart type={typePAge} data={dataPatientsByAgeGroup} />
          )}
        </Card>

        {/* Visits by Year */}
        <Card
          title="Visits by Year"
          subtitle="Total visits recorded per year"
          right={
            <Segmented value={typeVYear} onChange={setTypeVYear} options={chartTypeOptions} />
          }
        >
          {loadingBase ? <Note tone="info">Loading…</Note> : (
            <Chart type={typeVYear} data={dataVisitsByYear} />
          )}
        </Card>

        {/* Visits by Month — react-select + shades */}
        <Card
          title="Visits by Month"
          subtitle="Monthly visits for selected year"
          right={
            <div className="flex items-center gap-2">
              <div className="w-32">
                <Select
                  isSearchable
                  styles={selectStyles}
                  options={yearOptions}
                  value={yearOptions.find((o) => o.value === yearVMonth) || null}
                  onChange={(opt) => setYearVMonth(opt?.value || "")}
                  placeholder="Year"
                />
              </div>
              <Segmented value={typeVMonth} onChange={setTypeVMonth} options={chartTypeOptions} />
            </div>
          }
        >
          {loadingVMonth || loadingBase ? <Note tone="info">Loading…</Note> : (
            <Chart
              type={typeVMonth}
              data={dataVisitsByMonth}
              itemColors={monthColorsVisits}
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
