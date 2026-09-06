import { useEffect, useState, useMemo } from "react";
import { PageHeader, Disclaimer } from "@/components/Layout";
import {
  BarChart3,
  RefreshCw,
  AlertTriangle,
  Users,
  Building2,
  ShieldAlert,
  Flame,
  Activity,
  HeartCrack,
  Home,
  Filter,
  Lock,
} from "lucide-react";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts";

// High-contrast, Executive Gov DSS Theme
const RISK_COLORS = {
  Critical: "#b91c1c", // Deep Crimson
  High: "#ea580c",     // Vivid Amber Orange
  Moderate: "#d97706", // Muted Gold
  Low: "#059669",      // Resilient Emerald
};

const PRIORITY_COLORS = {
  Immediate: "#dc2626",
  "Short-Term": "#ea580c",
  "Medium-Term": "#f59e0b",
  Monitor: "#10b981",
};

const HAZARD_PALETTE = [
  "#2563eb", // Blue
  "#0284c7", // Sky Blue
  "#0d9488", // Teal
  "#7c3aed", // Violet
  "#c026d3", // Magenta
  "#64748b", // Slate
];

// Clean custom tooltip for Recharts
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-slate-900 dark:bg-slate-800 text-white px-3 py-2 rounded-lg shadow-xl text-xs border border-slate-700">
        <p className="font-bold">{label || item.name}</p>
        <p className="text-slate-300 dark:text-slate-300 mt-0.5">
          Count: <span className="font-mono text-amber-400 font-bold">{item.value}</span> settlements
        </p>
      </div>
    );
  }
  return null;
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [scopedAnalytics, setScopedAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeRole, setActiveRole] = useState(() => {
    return localStorage.getItem("dss_user_role") || "national";
  });

  useEffect(() => {
    const handleRoleUpdate = () => {
      setActiveRole(localStorage.getItem("dss_user_role") || "national");
    };
    window.addEventListener("roleChanged", handleRoleUpdate);
    window.addEventListener("storage", handleRoleUpdate);
    return () => {
      window.removeEventListener("roleChanged", handleRoleUpdate);
      window.removeEventListener("storage", handleRoleUpdate);
    };
  }, []);

  const districtScope =
    activeRole === "chamoli"
      ? "Chamoli"
      : activeRole === "darbhanga"
      ? "Darbhanga"
      : activeRole === "wayanad"
      ? "Wayanad"
      : null;

  const isNational = !districtScope;

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      let res = await fetch("/api/analytics").catch(() => null);
      if (!res || !res.ok) {
        res = await fetch("http://127.0.0.1:8000/api/analytics");
      }
      if (!res.ok) throw new Error("Failed to load analytics");
      const result = await res.json();
      setData(result);

      let habRes = await fetch("/api/habitations").catch(() => null);
      if (!habRes || !habRes.ok) {
        habRes = await fetch("http://127.0.0.1:8000/api/habitations");
      }
      const allHabs = habRes && habRes.ok ? await habRes.json() : [];

      let siteRes = await fetch("/api/relocation-sites").catch(() => null);
      if (!siteRes || !siteRes.ok) {
        siteRes = await fetch("http://127.0.0.1:8000/api/relocation-sites");
      }
      const allSites = siteRes && siteRes.ok ? await siteRes.json() : [];

      if (districtScope) {
        const dLower = districtScope.toLowerCase();
        const dHabs = allHabs.filter((h) => h.district?.toLowerCase() === dLower);
        const dSites = allSites.filter((s) => s.district?.toLowerCase() === dLower);

        const totalHabs = dHabs.length;
        const totalPop = dHabs.reduce((acc, h) => acc + Number(h.population || 0), 0);
        const popAtRisk = dHabs
          .filter((h) => h.risk_level === "Critical" || h.risk_level === "High")
          .reduce((acc, h) => acc + Number(h.population || 0), 0);
        const totalDeficit = dHabs.reduce((acc, h) => acc + Number(h.capacity_deficit || 0), 0);

        const criticalCount = dHabs.filter((h) => h.risk_level === "Critical").length;
        const highCount = dHabs.filter((h) => h.risk_level === "High").length;
        const modCount = dHabs.filter((h) => h.risk_level === "Moderate").length;
        const lowCount = dHabs.filter((h) => h.risk_level === "Low").length;

        const immReloc = dHabs.filter((h) => h.priority === "Immediate").length;
        const shortReloc = dHabs.filter((h) => h.priority === "Short-Term").length;
        const medReloc = dHabs.filter((h) => h.priority === "Medium-Term").length;
        const monReloc = dHabs.filter((h) => h.priority === "Monitor").length;

        const hazardDist = {};
        dHabs.forEach((h) => {
          const hz = h.hazard || "Unknown";
          hazardDist[hz] = (hazardDist[hz] || 0) + 1;
        });

        const totalSiteCap = dSites.reduce((acc, s) => acc + Number(s.capacity || 0), 0);
        const occSiteCap = dSites.reduce((acc, s) => acc + Number(s.occupancy || 0), 0);
        const availSiteCap = dSites.reduce((acc, s) => acc + Number(s.available || 0), 0);

        setScopedAnalytics({
          summary: {
            total_habitations: totalHabs,
            total_population: totalPop,
            population_at_risk: popAtRisk,
            critical_red_zones: criticalCount,
            capacity_deficit: totalDeficit,
            immediate_relocation: immReloc,
          },
          risk_distribution: {
            Critical: criticalCount,
            High: highCount,
            Moderate: modCount,
            Low: lowCount,
          },
          relocation_distribution: {
            Immediate: immReloc,
            "Short-Term": shortReloc,
            "Medium-Term": medReloc,
            Monitor: monReloc,
          },
          hazard_distribution: hazardDist,
          relocation_capacity: {
            total_capacity: totalSiteCap,
            occupied: occSiteCap,
            available: availSiteCap,
            sites: dSites.length,
          },
        });
      } else {
        setScopedAnalytics(null);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to load real-time analytics from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [districtScope]);

  const activeAnalytics = isNational ? data : scopedAnalytics || data;

  // Filter out 0 value slices from Pie to prevent text overlapping
  const riskPieData = useMemo(() => {
    if (!activeAnalytics?.risk_distribution) return [];
    return Object.entries(activeAnalytics.risk_distribution)
      .map(([name, value]) => ({
        name,
        value: Number(value || 0),
      }))
      .filter((item) => item.value > 0);
  }, [activeAnalytics]);

  const priorityBarData = useMemo(() => {
    if (!activeAnalytics?.relocation_distribution) return [];
    return Object.entries(activeAnalytics.relocation_distribution).map(
      ([priority, count]) => ({
        priority,
        count: Number(count || 0),
      })
    );
  }, [activeAnalytics]);

  const hazardBarData = useMemo(() => {
    if (!activeAnalytics?.hazard_distribution) return [];
    const total = Object.values(activeAnalytics.hazard_distribution).reduce(
      (a, b) => a + Number(b),
      0
    );
    return Object.entries(activeAnalytics.hazard_distribution)
      .map(([hazard, count]) => ({
        hazard,
        count: Number(count || 0),
        percentage: total ? Math.round((Number(count) / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [activeAnalytics]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">Computing spatial analytics telemetry...</p>
        </div>
      </div>
    );
  }

  if (error || !activeAnalytics) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
        <div className="max-w-xl mx-auto px-4 py-16">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/50 p-8 text-center shadow-sm">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Analytics Telemetry Offline</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-5">{error}</p>
            <button
              onClick={loadAnalytics}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
            >
              <RefreshCw className="w-4 h-4" /> Retry Telemetry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { summary, relocation_capacity } = activeAnalytics;
  const occupancyRate = relocation_capacity.total_capacity
    ? Math.round((relocation_capacity.occupied / relocation_capacity.total_capacity) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <PageHeader
            title={isNational ? "National Disaster Analytics" : `District Analytics Command · ${districtScope}`}
            subtitle={
              isNational
                ? "Macro-level synthesis of multi-hazard risks, displacement pressure, and shelter reserves"
                : `Operational Context: District Magistrate ${districtScope} Spatial Command`
            }
            icon={BarChart3}
          />
          <button
            onClick={loadAnalytics}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm font-semibold shadow-sm active:scale-95"
          >
            <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Refresh Analytics
          </button>
        </div>

        {/* Scope Status Banner */}
        <div
          className={`rounded-xl p-3.5 mb-6 flex items-center justify-between border shadow-sm ${
            isNational
              ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300"
              : "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-300"
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
            <Filter className="w-4 h-4 flex-shrink-0 text-slate-500 dark:text-slate-400" />
            <span>
              {isNational ? (
                <>Synthesizing data nationwide across <strong>All-India Sentinel Database</strong>.</>
              ) : (
                <>
                  Active Scope: <strong>District Magistrate {districtScope}</strong>. Cross-district leakage restricted.
                </>
              )}
            </span>
          </div>
          {!isNational && (
            <span className="flex items-center gap-1.5 text-[11px] font-bold bg-emerald-700 text-white px-3 py-1 rounded-lg shadow-sm">
              <Lock className="w-3 h-3" /> DM Scoped
            </span>
          )}
        </div>

        {/* Primary Key Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {isNational ? "Monitored Habitations" : `${districtScope} Habitations`}
                </p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                  {summary.total_habitations}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Spatial points indexed</p>
              </div>
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                <Home className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Census Population
                </p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                  {Number(summary.total_population || 0).toLocaleString()}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Direct baseline population</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/40 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-xl p-5 shadow-sm hover:border-rose-300 dark:hover:border-rose-800 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  Population At Risk
                </p>
                <h3 className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-2">
                  {Number(summary.population_at_risk || 0).toLocaleString()}
                </h3>
                <p className="text-xs text-rose-400 dark:text-rose-500 mt-1">Critical & High hazard exposure</p>
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400">
                <HeartCrack className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-xl p-5 shadow-sm hover:border-amber-300 dark:hover:border-amber-800 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Shelter Deficit
                </p>
                <h3 className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">
                  {Number(summary.capacity_deficit || 0).toLocaleString()}
                </h3>
                <p className="text-xs text-amber-400 dark:text-amber-500 mt-1">Lacking safe refuge beds</p>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-red-50/60 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-4 transition-colors">
            <div className="p-2.5 bg-red-600 text-white rounded-lg shadow-sm">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-red-950 dark:text-red-300 font-bold uppercase tracking-wider">Critical Red Zones</p>
              <p className="text-2xl font-black text-red-700 dark:text-red-400 mt-0.5">
                {summary.critical_red_zones} <span className="text-xs font-semibold text-red-600 dark:text-red-300">Settlements</span>
              </p>
            </div>
          </div>

          <div className="bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center gap-4 transition-colors">
            <div className="p-2.5 bg-amber-600 text-white rounded-lg shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-amber-950 dark:text-amber-300 font-bold uppercase tracking-wider">Immediate Evacuations</p>
              <p className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-0.5">
                {summary.immediate_relocation} <span className="text-xs font-semibold text-amber-600 dark:text-amber-300">Corridors</span>
              </p>
            </div>
          </div>

          <div className="bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center gap-4 transition-colors">
            <div className="p-2.5 bg-emerald-700 text-white rounded-lg shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-emerald-950 dark:text-emerald-300 font-bold uppercase tracking-wider">Safe Shelter Reserve</p>
              <p className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-0.5 font-mono">
                {Number(relocation_capacity.available || 0).toLocaleString()} <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Available Beds</span>
              </p>
            </div>
          </div>
        </div>

        {/* Visual Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Risk Distribution Donut */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Multi-Factor Risk Distribution
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Categorized by NDMA Risk Matrix</p>
              </div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                {districtScope || "All-India"}
              </span>
            </div>

            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={55}
                    paddingAngle={4}
                    stroke="transparent"
                    strokeWidth={2}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {riskPieData.map((entry) => (
                      <Cell
                        key={`pie-cell-${entry.name}`}
                        fill={RISK_COLORS[entry.name] || "#64748b"}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Priority Queue Bars */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Relocation Priority Queue
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Calculated urgency matrix</p>
              </div>
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800">
                Ranked Execution
              </span>
            </div>

            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={priorityBarData}
                  margin={{ top: 25, right: 20, left: -15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} vertical={false} />
                  <XAxis
                    dataKey="priority"
                    stroke="#94a3b8"
                    tick={{ fontSize: 11, fill: "currentColor", fontWeight: 600 }}
                    className="text-slate-600 dark:text-slate-400"
                    axisLine={{ stroke: "#94a3b8", opacity: 0.2 }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    className="text-slate-600 dark:text-slate-400"
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Habitations" radius={[6, 6, 0, 0]}>
                    {priorityBarData.map((entry) => (
                      <Cell
                        key={`bar-${entry.priority}`}
                        fill={PRIORITY_COLORS[entry.priority] || "#3b82f6"}
                      />
                    ))}
                    <LabelList
                      dataKey="count"
                      position="top"
                      fontSize={12}
                      fontWeight={700}
                      fill="#94a3b8"
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hazard Exposure Type Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Primary Hazard Distribution</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Vulnerability typology breakdown</p>
              </div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                {hazardBarData.length} Types
              </span>
            </div>

            <div className="space-y-4 pt-1">
              {hazardBarData.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 py-6 text-center">No hazard records found in scope.</p>
              ) : (
                hazardBarData.map((item, idx) => (
                  <div key={item.hazard}>
                    <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                      <span className="text-slate-800 dark:text-slate-200 font-bold">{item.hazard}</span>
                      <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {item.count} settlements ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: HAZARD_PALETTE[idx % HAZARD_PALETTE.length],
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Shelter Infrastructure Capacity */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between transition-colors">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Safe Shelter Occupancy & Reserves</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Relief campsite carrying state</p>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                    occupancyRate > 75
                      ? "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800"
                      : occupancyRate > 40
                      ? "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800"
                      : "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                  }`}
                >
                  {occupancyRate}% Utilized
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-center">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Beds</span>
                  <strong className="text-lg font-black text-slate-800 dark:text-slate-200 font-mono mt-0.5 block">
                    {Number(relocation_capacity.total_capacity || 0).toLocaleString()}
                  </strong>
                </div>
                <div className="bg-rose-50/50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-800">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Occupied</span>
                  <strong className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5 block">
                    {Number(relocation_capacity.occupied || 0).toLocaleString()}
                  </strong>
                </div>
                <div className="bg-emerald-50/50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Available</span>
                  <strong className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono mt-0.5 block">
                    {Number(relocation_capacity.available || 0).toLocaleString()}
                  </strong>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Shelter Hubs</span>
                  <strong className="text-lg font-black text-blue-700 dark:text-blue-400 font-mono mt-0.5 block">
                    {relocation_capacity.sites} Active
                  </strong>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 font-semibold mb-2">
                  <span>Relief Bed Pressure Index</span>
                  <span className="font-mono">
                    {Number(relocation_capacity.occupied || 0).toLocaleString()} /{" "}
                    {Number(relocation_capacity.total_capacity || 0).toLocaleString()} beds
                  </span>
                </div>
                <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      occupancyRate > 75
                        ? "bg-red-600"
                        : occupancyRate > 40
                        ? "bg-amber-500"
                        : "bg-emerald-600"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, occupancyRate))}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 font-medium">
              Synchronized with live PostGIS relocation site telemetry.
            </div>
          </div>
        </div>

        <Disclaimer text="National and District analytics telemetry is synthesized dynamically from active geofenced settlement coordinates. Data conforms to NDMA operational guidelines." />
      </div>
    </div>
  );
}