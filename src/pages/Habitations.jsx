import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/Layout";
import {
  Users,
  Search,
  Eye,
  ArrowUpDown,
  RefreshCw,
  Plus,
  AlertTriangle,
  X,
  MapPin,
  CheckCircle2,
  Lock,
  Filter,
} from "lucide-react";
import {
  RiskBadge,
  PriorityBadge,
  CapacityBadge,
  StatusBadge,
} from "@/components/Badges";

const COLUMNS = [
  { key: "name", label: "Habitation", sortable: true },
  { key: "district", label: "District", sortable: true },
  { key: "population", label: "Population", sortable: true },
  { key: "hazard", label: "Primary Hazard", sortable: true },
  { key: "risk_score", label: "Risk Score", sortable: true },
  { key: "vulnerability", label: "Vulnerability", sortable: false },
  { key: "capacity_status", label: "Capacity", sortable: false },
  { key: "priority", label: "Priority", sortable: false },
  { key: "status", label: "Status", sortable: true },
  { key: "action", label: "Action", sortable: false },
];

const ALL_INDIA_HAZARDS = [
  "Flood",
  "Landslide",
  "Cyclone",
  "Earthquake",
  "Drought",
  "Erosion",
  "Cloudburst",
  "Sea Inundation",
];

export default function Habitations() {
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

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("risk_score");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(0);
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterHazard, setFilterHazard] = useState("");
  const perPage = 10;

  // Add Habitation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const initialFormState = {
    name: "",
    district: districtScope || "",
    population: 1000,
    households: 200,
    hazard: "Flood",
    hazard_exposure: 70,
    vulnerability: "High",
    accessibility: "Moderate",
    emergency_access: "Moderate",
    safe_capacity: 500,
    latitude: 20.5937,
    longitude: 78.9629,
  };

  const [formData, setFormData] = useState(initialFormState);

  // Sync modal default district if role changes
  useEffect(() => {
    if (districtScope) {
      setFormData((prev) => ({ ...prev, district: districtScope }));
      setFilterDistrict(districtScope);
    } else {
      setFilterDistrict("");
    }
  }, [districtScope]);

  // Load habitations from FastAPI backend
  const loadHabitations = async () => {
    try {
      setLoading(true);
      setError("");
      let res = await fetch("/api/habitations").catch(() => null);
      if (!res || !res.ok) {
        res = await fetch("http://127.0.0.1:8000/api/habitations");
      }
      if (!res.ok) throw new Error("Failed to fetch habitations");
      const data = await res.json();
      setHabitations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Unable to load habitations from backend database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHabitations();
  }, []);

  // Hard Scoped Habitations (Secures DM Scope)
  const scopedHabitations = useMemo(() => {
    if (districtScope) {
      return habitations.filter(
        (h) => h.district?.toLowerCase() === districtScope.toLowerCase()
      );
    }
    return habitations;
  }, [habitations, districtScope]);

  // Unique Districts from Backend (Filtered if DM)
  const districts = useMemo(() => {
    if (districtScope) return [districtScope];
    const list = habitations.map((h) => h.district).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [habitations, districtScope]);

  // Filtering and Sorting
  const filtered = useMemo(() => {
    let result = scopedHabitations.filter((h) => {
      if (filterDistrict && h.district !== filterDistrict) return false;
      if (filterHazard && h.hazard !== filterHazard) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          (h.name && h.name.toLowerCase().includes(q)) ||
          (h.district && h.district.toLowerCase().includes(q)) ||
          (h.hazard && h.hazard.toLowerCase().includes(q))
        );
      }
      return true;
    });

    result.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "asc"
        ? String(aVal || "").localeCompare(String(bVal || ""))
        : String(bVal || "").localeCompare(String(aVal || ""));
    });

    return result;
  }, [scopedHabitations, query, sortKey, sortDir, filterDistrict, filterHazard]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const pageData = filtered.slice(page * perPage, (page + 1) * perPage);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // Submit Handler for New Habitation
  const handleCreateHabitation = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setSubmitting(true);

    try {
      const finalDistrict = districtScope || formData.district.trim();
      const payload = {
        name: formData.name.trim(),
        district: finalDistrict,
        population: parseInt(formData.population, 10),
        households: parseInt(formData.households, 10),
        hazard: formData.hazard,
        hazard_exposure: parseFloat(formData.hazard_exposure),
        vulnerability: formData.vulnerability,
        accessibility: formData.accessibility,
        emergency_access: formData.emergency_access,
        safe_capacity: parseInt(formData.safe_capacity, 10),
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
      };

      if (!payload.name || !payload.district) {
        throw new Error("Habitation name and district are required.");
      }

      let res = await fetch("/api/habitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch("http://127.0.0.1:8000/api/habitations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to create habitation.");
      }

      const created = await res.json();
      setFormSuccess(
        `Habitation "${created.name}" registered with calculated Risk Score: ${Number(
          created.risk_score || 0
        ).toFixed(1)}`
      );

      // Refresh listing
      await loadHabitations();

      setTimeout(() => {
        setIsModalOpen(false);
        setFormData({ ...initialFormState, district: districtScope || "" });
        setFormSuccess("");
      }, 1200);
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Failed to create habitation.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
          <p className="text-slate-600 dark:text-slate-400">Loading Habitations from Database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/50 p-8 text-center shadow-sm">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Habitations Unavailable</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-5">{error}</p>
          <button
            onClick={loadHabitations}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
        {/* Header with Add Button and Forced Dark Visibility */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="[&_h1]:text-slate-900 [&_h1]:dark:!text-white [&_p]:text-slate-500 [&_p]:dark:!text-slate-400">
            <PageHeader
              title="Habitations Directory"
              subtitle={
                isNational
                  ? "All-India multi-hazard database of exposed settlements with automated risk engines"
                  : `Jurisdiction Directory: District Magistrate ${districtScope} Active Registry`
              }
              icon={Users}
            />
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={loadHabitations}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm font-medium shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => {
                setFormData({ ...initialFormState, district: districtScope || "" });
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Register Habitation
            </button>
          </div>
        </div>

        {/* Scope Status Banner */}
        <div
          className={`rounded-lg p-3.5 mb-5 flex items-center justify-between border ${
            isNational
              ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300"
              : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300"
          }`}
        >
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <Filter className="w-4 h-4 flex-shrink-0" />
            <span>
              Displaying <strong>{filtered.length}</strong> of <strong>{scopedHabitations.length}</strong> habitations{" "}
              {isNational ? "across National Database" : `in ${districtScope} District (Restricted DM Authority)`}.
            </span>
          </div>
          {!isNational && (
            <span className="flex items-center gap-1 text-[11px] font-bold bg-emerald-600 text-white px-2.5 py-1 rounded-full shadow-sm">
              <Lock className="w-3 h-3" /> DM Scoped
            </span>
          )}
        </div>

        {/* Controls / Filter Bar */}
        <div className="flex flex-col md:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search by habitation name, district, or hazard..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          {/* District Filter: Disabled if DM */}
          <select
            value={filterDistrict}
            disabled={!isNational}
            onChange={(e) => {
              setFilterDistrict(e.target.value);
              setPage(0);
            }}
            className={`px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm ${
              !isNational ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed font-semibold" : ""
            }`}
          >
            {isNational ? (
              <>
                <option value="">All Districts ({districts.length})</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </>
            ) : (
              <option value={districtScope}>{districtScope} District (Locked)</option>
            )}
          </select>

          <select
            value={filterHazard}
            onChange={(e) => {
              setFilterHazard(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            <option value="">All Hazards</option>
            {ALL_INDIA_HAZARDS.map((hz) => (
              <option key={hz} value={hz}>
                {hz}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm mb-4 transition-colors">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${
                        col.sortable ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none" : ""
                      }`}
                      onClick={() => col.sortable && toggleSort(col.key)}
                    >
                      <div className="flex items-center gap-1.5">
                        {col.label}
                        {col.sortable && sortKey === col.key && (
                          <ArrowUpDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pageData.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                      No habitations found matching the filters in current scope.
                    </td>
                  </tr>
                ) : (
                  pageData.map((h) => {
                    const riskVal = Number(h.risk_score || 0);
                    return (
                      <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {h.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {h.district}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                          {Number(h.population || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200">
                            {h.hazard}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`font-bold ${
                              riskVal >= 70
                                ? "text-red-600 dark:text-red-400"
                                : riskVal >= 50
                                ? "text-orange-600 dark:text-orange-400"
                                : riskVal >= 30
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-green-600 dark:text-green-400"
                            }`}
                          >
                            {riskVal.toFixed(1)}
                          </span>
                          <span className="text-slate-400 dark:text-slate-500 text-xs ml-0.5">/100</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <RiskBadge level={h.vulnerability || "Low"} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <CapacityBadge status={h.capacity_status || "Adequate"} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <PriorityBadge priority={h.priority || "Monitor"} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={h.status || "Active"} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link
                            to={`/habitations/${h.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {filtered.length === 0 ? 0 : page * perPage + 1}–
              {Math.min((page + 1) * perPage, filtered.length)} of {filtered.length} habitations
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium px-1">
                Page {page + 1} of {totalPages || 1}
              </span>
              <button
                onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ADD HABITATION MODAL                                                      */}
        {/* ========================================================================= */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative animate-in fade-in zoom-in duration-150 my-8">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-5 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Register New Habitation
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {districtScope
                      ? `Registering directly under DM ${districtScope} Jurisdiction`
                      : "Risk & capacity engines automatically calculate scores and relocation priority upon submission."}
                  </p>
                </div>
              </div>

              {formError && (
                <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 rounded-lg text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="mb-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCreateHabitation} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Habitation Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Sunil Ward Extension, Majuli East"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>District / Region *</span>
                      {!isNational && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> Scope Locked
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!isNational}
                      value={districtScope || formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      placeholder="e.g., Chamoli, Dibrugarh, Wayanad"
                      className={`w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                        !isNational ? "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 cursor-not-allowed font-semibold" : ""
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Population *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.population}
                      onChange={(e) => setFormData({ ...formData, population: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Households *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.households}
                      onChange={(e) => setFormData({ ...formData, households: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Safe Capacity *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formData.safe_capacity}
                      onChange={(e) => setFormData({ ...formData, safe_capacity: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Hazard Exposure %
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={formData.hazard_exposure}
                      onChange={(e) => setFormData({ ...formData, hazard_exposure: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Primary Hazard
                    </label>
                    <select
                      value={formData.hazard}
                      onChange={(e) => setFormData({ ...formData, hazard: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {ALL_INDIA_HAZARDS.map((hz) => (
                        <option key={hz} value={hz}>
                          {hz}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Vulnerability Level
                    </label>
                    <select
                      value={formData.vulnerability}
                      onChange={(e) => setFormData({ ...formData, vulnerability: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="Low">Low</option>
                      <option value="Moderate">Moderate</option>
                      <option value="High">High</option>
                      <option value="Very High">Very High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Road Accessibility
                    </label>
                    <select
                      value={formData.accessibility}
                      onChange={(e) => setFormData({ ...formData, accessibility: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="Good">Good (All-weather)</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Poor">Poor (Kaccha/Cut-off)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-500" /> Latitude (India: ~8° to 37°N)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      required
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-500" /> Longitude (India: ~68° to 97°E)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      required
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-50"
                  >
                    {submitting ? "Calculating & Saving..." : "Calculate & Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}