import { useEffect, useMemo, useState } from "react";
import { PageHeader, Disclaimer } from "@/components/Layout";
import {
  Gauge,
  RefreshCw,
  AlertTriangle,
  Users,
  Building2,
  AlertOctagon,
  TrendingUp,
  Filter,
  Lock,
} from "lucide-react";
import StatCard from "@/components/StatCard";

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

const CAPACITY_COLORS = {
  Adequate: "#16a34a",
  Warning: "#ca8a04",
  Deficit: "#ea580c",
  "Critical Deficit": "#dc2626",
};

export default function Capacity() {
  const [habitations, setHabitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Role Scope Tracking
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

  const loadHabitations = async () => {
    try {
      setLoading(true);
      setError("");

      let res = await fetch("/api/habitations").catch(() => null);
      if (!res || !res.ok) {
        res = await fetch("http://127.0.0.1:8000/api/habitations");
      }

      if (!res.ok) throw new Error("Backend connection failed");
      const data = await res.json();
      setHabitations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Unable to load capacity data from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHabitations();
  }, []);

  // Filter habitations strictly to active scope
  const scopedHabitations = useMemo(() => {
    if (districtScope) {
      return habitations.filter(
        (h) => h.district?.toLowerCase() === districtScope.toLowerCase()
      );
    }
    return habitations;
  }, [habitations, districtScope]);

  /* ---------------- Calculations ---------------- */
  const totalPop = useMemo(() => {
    return scopedHabitations.reduce(
      (sum, h) => sum + Number(h.population || 0),
      0
    );
  }, [scopedHabitations]);

  const totalCapacity = useMemo(() => {
    return scopedHabitations.reduce(
      (sum, h) => sum + Number(h.safe_capacity ?? h.safeCapacity ?? 0),
      0
    );
  }, [scopedHabitations]);

  const totalDeficit = useMemo(() => {
    return scopedHabitations.reduce(
      (sum, h) => sum + Number(h.capacity_deficit ?? h.capacityDeficit ?? 0),
      0
    );
  }, [scopedHabitations]);

  const totalSurplus = useMemo(() => {
    return scopedHabitations.reduce(
      (sum, h) => sum + Number(h.capacity_surplus ?? h.capacitySurplus ?? 0),
      0
    );
  }, [scopedHabitations]);

  const deficitCount = useMemo(() => {
    return scopedHabitations.filter((h) => {
      const status = h.capacity_status || h.capacityStatus;
      return status === "Deficit" || status === "Critical Deficit";
    }).length;
  }, [scopedHabitations]);

  /* ---------------- Breakdown Chart Data ---------------- */
  const comparativeChartData = useMemo(() => {
    if (districtScope) {
      return scopedHabitations.map((h) => ({
        label: h.name?.length > 12 ? `${h.name.substring(0, 12)}...` : h.name,
        fullName: h.name,
        Population: Number(h.population || 0),
        "Safe Capacity": Number(h.safe_capacity ?? h.safeCapacity ?? 0),
        deficit: Number(h.capacity_deficit ?? h.capacityDeficit ?? 0),
      }));
    }

    const byDistrict = {};
    scopedHabitations.forEach((h) => {
      const district = h.district || "General";
      if (!byDistrict[district]) {
        byDistrict[district] = {
          label: district.length > 10 ? `${district.substring(0, 10)}...` : district,
          fullName: district,
          Population: 0,
          "Safe Capacity": 0,
          deficit: 0,
        };
      }
      byDistrict[district].Population += Number(h.population || 0);
      byDistrict[district]["Safe Capacity"] += Number(
        h.safe_capacity ?? h.safeCapacity ?? 0
      );
      byDistrict[district].deficit += Number(
        h.capacity_deficit ?? h.capacityDeficit ?? 0
      );
    });

    return Object.values(byDistrict).sort((a, b) => b.deficit - a.deficit);
  }, [scopedHabitations, districtScope]);

  /* ---------------- Capacity Distribution ---------------- */
  const capDistData = useMemo(() => {
    const capDist = {};

    scopedHabitations.forEach((h) => {
      const status = h.capacity_status || h.capacityStatus || "Adequate";
      capDist[status] = (capDist[status] || 0) + 1;
    });

    return Object.entries(capDist).map(([name, value]) => ({
      name,
      value,
    }));
  }, [scopedHabitations]);

  /* ---------------- Loading ---------------- */
  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading capacity assessment data...</p>
        </div>
      </div>
    );
  }

  /* ---------------- Error ---------------- */
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
        <div className="max-w-xl mx-auto px-4 py-16">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/50 p-8 text-center shadow-sm">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Capacity Data Unavailable
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-5">{error}</p>
            <button
              onClick={loadHabitations}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <PageHeader
            title="Capacity Assessment"
            subtitle={
              isNational
                ? "All-India population vs safe carrying capacity analytics"
                : `Operational Context: District Magistrate ${districtScope} Carrying Capacity Registry`
            }
            icon={Gauge}
          />
          <button
            onClick={loadHabitations}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm font-medium shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Scope Status Banner */}
        <div
          className={`rounded-lg p-3.5 mb-6 flex items-center justify-between border ${
            isNational
              ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300"
              : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300"
          }`}
        >
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <Filter className="w-4 h-4 flex-shrink-0" />
            <span>
              Aggregating metrics across <strong>{scopedHabitations.length}</strong> settlements{" "}
              {isNational
                ? "nationwide"
                : `within District Magistrate ${districtScope} operational command`}.
            </span>
          </div>
          {!isNational && (
            <span className="flex items-center gap-1 text-[11px] font-bold bg-emerald-600 text-white px-2.5 py-1 rounded-full shadow-sm">
              <Lock className="w-3 h-3" /> DM Filtered
            </span>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard
            title={isNational ? "Total Population" : `${districtScope} Population`}
            label="Total Population"
            value={totalPop.toLocaleString()}
            icon={Users}
            type="population"
          />
          <StatCard
            title="Safe Capacity"
            label="Available Capacity"
            value={totalCapacity.toLocaleString()}
            icon={Building2}
            type="total"
          />
          <StatCard
            title="Capacity Deficit"
            label="Capacity Deficit"
            value={totalDeficit.toLocaleString()}
            icon={AlertTriangle}
            type="deficit"
          />
          <StatCard
            title="Capacity Surplus"
            label="Capacity Surplus"
            value={totalSurplus.toLocaleString()}
            icon={TrendingUp}
            type="capacity"
          />
          <StatCard
            title="Habitations in Deficit"
            label="Habitations w/ Deficit"
            value={deficitCount}
            icon={AlertOctagon}
            type="critical"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Population vs Capacity */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm transition-colors">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">
              {isNational
                ? "Population vs Safe Capacity by District"
                : `Population vs Safe Capacity Across ${districtScope} Settlements`}
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={comparativeChartData.slice(0, 8)}
                  margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.25} />
                  <XAxis
                    dataKey="label"
                    stroke="#94a3b8"
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    className="text-slate-600 dark:text-slate-400"
                    angle={-20}
                    textAnchor="end"
                    height={40}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    className="text-slate-600 dark:text-slate-400"
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderColor: "rgba(51, 65, 85, 0.6)",
                      color: "#fff",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                    }}
                    itemStyle={{ color: "#fff" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: "8px" }} />
                  <Bar dataKey="Population" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="Safe Capacity"
                    fill="#16a34a"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Capacity Deficit Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm transition-colors">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">
              {isNational
                ? "Capacity Deficit by District"
                : `Net Deficit by ${districtScope} Settlement`}
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={comparativeChartData.slice(0, 8)}
                  layout="vertical"
                  margin={{ top: 10, right: 35, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.25} />
                  <XAxis
                    type="number"
                    stroke="#94a3b8"
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    className="text-slate-600 dark:text-slate-400"
                    allowDecimals={false}
                  />
                  <YAxis
                    dataKey="label"
                    type="category"
                    stroke="#94a3b8"
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    className="text-slate-600 dark:text-slate-400"
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderColor: "rgba(51, 65, 85, 0.6)",
                      color: "#fff",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                    }}
                    itemStyle={{ color: "#fff" }}
                  />
                  <Bar dataKey="deficit" fill="#ea580c" radius={[0, 4, 4, 0]}>
                    <LabelList
                      dataKey="deficit"
                      position="right"
                      fontSize={11}
                      fill="#94a3b8"
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Capacity Status Distribution */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm transition-colors">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">
              Capacity Status Distribution {districtScope ? `(${districtScope})` : "(National)"}
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={capDistData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine
                  >
                    {capDistData.map((entry, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={CAPACITY_COLORS[entry.name] || "#94a3b8"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderColor: "rgba(51, 65, 85, 0.6)",
                      color: "#fff",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                    }}
                    itemStyle={{ color: "#fff" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Breakdown List */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm transition-colors">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">
              Capacity Status Breakdown
            </h3>
            <div className="space-y-3">
              {capDistData.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No status data available for current jurisdiction.</p>
              ) : (
                capDistData.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            CAPACITY_COLORS[item.name] || "#94a3b8",
                        }}
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-mono">
                      {item.value} {item.value === 1 ? "habitation" : "habitations"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <Disclaimer text="Capacity assessment metrics are calculated dynamically by the decision engine based on baseline carrying capacity and ground population census." />
      </div>
    </div>
  );
}