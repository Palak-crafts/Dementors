import { useEffect, useState, useMemo } from "react";
import { PageHeader, Disclaimer } from "@/components/Layout";
import {
  Move,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Building2,
  CheckCircle2,
  X,
  MapPin,
  Download,
  Filter,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { PriorityBadge } from "@/components/Badges";

function formatSuitability(val) {
  const num = Number(val || 0);
  if (num > 10) {
    return (num / 10).toFixed(1);
  }
  return num.toFixed(1);
}

export default function Relocation() {
  const [searchParams] = useSearchParams();
  const preSelectedHabitationId = searchParams.get("habitation");

  // Self-contained Role & District Scope Tracker (Zero external imports)
  const [activeRole, setActiveRole] = useState(() => {
    return localStorage.getItem("dss_user_role") || "national";
  });

  useEffect(() => {
    const handleRoleChange = () => {
      setActiveRole(localStorage.getItem("dss_user_role") || "national");
    };
    window.addEventListener("roleChanged", handleRoleChange);
    window.addEventListener("storage", handleRoleChange);
    return () => {
      window.removeEventListener("roleChanged", handleRoleChange);
      window.removeEventListener("storage", handleRoleChange);
    };
  }, []);

  const districtFilter =
    activeRole === "chamoli"
      ? "Chamoli"
      : activeRole === "darbhanga"
      ? "Darbhanga"
      : activeRole === "wayanad"
      ? "Wayanad"
      : null;

  const isNational = activeRole === "national";

  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal State for Best Shelter Recommendation
  const [selectedHabitation, setSelectedHabitation] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState("");

  const loadRanking = async () => {
    try {
      setLoading(true);
      setError("");
      let res = await fetch("/api/relocation-priority").catch(() => null);
      if (!res || !res.ok) {
        res = await fetch("http://127.0.0.1:8000/api/relocation-priority");
      }
      if (!res.ok) throw new Error("Failed to fetch relocation priorities");
      const data = await res.json();
      setRanking(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Unable to load relocation priorities from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRanking();
  }, []);

  // Filter queue dynamically based on active DM scope
  const visibleRanking = useMemo(() => {
    if (isNational || !districtFilter) {
      return ranking;
    }
    return ranking.filter(
      (h) => h.district?.toLowerCase() === districtFilter.toLowerCase()
    );
  }, [ranking, isNational, districtFilter]);

  // Auto-open recommendation if navigated from Habitation Details
  useEffect(() => {
    if (preSelectedHabitationId && ranking.length > 0) {
      const match = ranking.find(
        (h) => String(h.habitation_id) === String(preSelectedHabitationId)
      );
      if (match) {
        handleFindShelter(match);
      }
    }
  }, [preSelectedHabitationId, ranking]);

  const handleFindShelter = async (hab) => {
    setSelectedHabitation(hab);
    setRecommendation(null);
    setRecError("");
    setRecLoading(true);

    try {
      let res = await fetch(
        `/api/relocation-sites/best/${hab.habitation_id}`
      ).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(
          `http://127.0.0.1:8000/api/relocation-sites/best/${hab.habitation_id}`
        );
      }
      if (!res.ok) throw new Error("Could not find suitable relocation sites");
      const data = await res.json();
      if (data.error) {
        setRecError(data.error);
      } else {
        setRecommendation(data);
      }
    } catch (err) {
      console.error(err);
      setRecError("Error finding the best relocation shelter.");
    } finally {
      setRecLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedHabitation(null);
    setRecommendation(null);
    setRecError("");
  };

  // Export Evacuation Action Plan to CSV for the visible habitations
  const handleExportCSV = () => {
    if (!visibleRanking || visibleRanking.length === 0) {
      alert("No relocation queue data available to export.");
      return;
    }

    const headers = [
      "Evacuation Rank",
      "Habitation Name",
      "District",
      "Multi-Factor Risk Score",
      "Shelter Capacity Deficit",
      "Road Accessibility",
      "Relocation Priority",
      "Action Timeline Window",
    ];

    const rows = visibleRanking.map((h, idx) => [
      `#${idx + 1}`,
      `"${(h.habitation_name || "").replace(/"/g, '""')}"`,
      `"${(h.district || "").replace(/"/g, '""')}"`,
      Number(h.risk_score || 0).toFixed(1),
      Number(h.capacity_deficit || 0),
      `"${h.accessibility || "Moderate"}"`,
      `"${h.priority || "Monitor"}"`,
      `"${
        h.priority === "Immediate"
          ? "0 - 24 Hours (Urgent)"
          : h.priority === "Short-Term"
          ? "24 - 72 Hours"
          : "7 - 14 Days Monitoring"
      }"`,
    ]);

    const csvContent =
      "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${
        isNational ? "NDMA_National" : `DM_${districtFilter}`
      }_Evacuation_Plan_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading relocation queue...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
        <div className="max-w-xl mx-auto px-4 py-16">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/50 p-8 text-center shadow-sm">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Queue Unavailable</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-5">{error}</p>
            <button
              onClick={loadRanking}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <PageHeader
            title="Immediate Relocation Priority"
            subtitle={
              isNational
                ? "All-India ranked relocation queue powered by FastAPI & PostgreSQL"
                : `Jurisdiction Scope: District Magistrate ${districtFilter} Active Operations`
            }
            icon={Move}
          />
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition text-sm font-semibold shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export {isNational ? "National Plan" : `${districtFilter} Plan`}
            </button>
            <button
              onClick={loadRanking}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm font-medium shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Scope Status Banner */}
        <div
          className={`rounded-lg p-4 mb-6 flex items-center justify-between border ${
            isNational
              ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300"
              : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300"
          }`}
        >
          <div className="flex items-center gap-2 text-sm">
            <Filter className="w-4 h-4" />
            <span>
              Showing <strong>{visibleRanking.length}</strong> habitations{" "}
              {isNational ? "nationwide" : `in ${districtFilter} District`}.
            </span>
          </div>
          {!isNational && (
            <span className="text-xs font-bold bg-emerald-600 text-white px-2.5 py-1 rounded-full">
              DM Operational Mode
            </span>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm mb-6 transition-colors">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Rank</th>
                  <th className="px-4 py-3 text-left">Habitation</th>
                  <th className="px-4 py-3 text-left">District</th>
                  <th className="px-4 py-3 text-left">Risk Score</th>
                  <th className="px-4 py-3 text-left">Capacity Deficit</th>
                  <th className="px-4 py-3 text-left">Accessibility</th>
                  <th className="px-4 py-3 text-left">Priority</th>
                  <th className="px-4 py-3 text-left">Allocation</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visibleRanking.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                      No habitations found for current administrative scope.
                    </td>
                  </tr>
                ) : (
                  visibleRanking.map((h, index) => {
                    const rankNum = index + 1;
                    return (
                      <tr key={h.habitation_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                              rankNum <= 2
                                ? "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                                : rankNum <= 5
                                ? "bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            #{rankNum}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap">
                          {h.habitation_name}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {h.district}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`font-semibold ${
                              h.risk_score >= 70
                                ? "text-red-600 dark:text-red-400"
                                : "text-orange-600 dark:text-orange-400"
                            }`}
                          >
                            {Number(h.risk_score || 0).toFixed(1)}
                          </span>
                          <span className="text-slate-400 dark:text-slate-500 text-xs ml-0.5">/100</span>
                        </td>
                        <td className="px-4 py-3 text-red-600 dark:text-red-400 font-semibold whitespace-nowrap font-mono">
                          {Number(h.capacity_deficit || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {h.accessibility}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <PriorityBadge priority={h.priority} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleFindShelter(h)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-md font-medium text-xs transition"
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            Match Shelter
                          </button>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link
                            to={`/habitations/${h.habitation_id}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                          >
                            Details <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <Link
            to="/relocation-sites"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
          >
            Explore Safe Relocation Sites <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <Disclaimer text="Decision-support recommendation — final decisions require authorized assessment and ground validation. Calculations dynamically generated by the backend engine." />

        {/* MATCH SHELTER MODAL */}
        {selectedHabitation && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative animate-in fade-in zoom-in duration-150">
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
                  <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Optimal Shelter Matching
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Target Habitation:{" "}
                    <strong className="text-slate-700 dark:text-slate-200">
                      {selectedHabitation.habitation_name}
                    </strong>{" "}
                    ({selectedHabitation.district} District)
                  </p>
                </div>
              </div>

              {recLoading ? (
                <div className="py-12 text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 dark:text-blue-400 mb-3" />
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    Running suitability & distance allocation algorithms...
                  </p>
                </div>
              ) : recError ? (
                <div className="p-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-center">
                  <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">{recError}</p>
                </div>
              ) : recommendation && recommendation.recommended_site ? (
                <div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/50 rounded-xl p-5 mb-6">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white uppercase tracking-wider">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Top Recommendation
                      </span>
                      <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                        Score: {recommendation.recommended_site.site_score} / 100
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-emerald-950 dark:text-emerald-100 mb-1">
                      {recommendation.recommended_site.site_name}
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1 mb-4">
                      <MapPin className="w-3.5 h-3.5" />
                      {recommendation.recommended_site.district} District • Distance:{" "}
                      <strong>{recommendation.recommended_site.distance} km</strong>
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="bg-white/80 dark:bg-slate-800/80 rounded-lg p-2.5 border border-emerald-200 dark:border-emerald-800/60">
                        <span className="block text-xs text-slate-500 dark:text-slate-400">Available</span>
                        <strong className="text-base text-emerald-700 dark:text-emerald-300 font-mono">
                          {recommendation.recommended_site.available}
                        </strong>
                      </div>
                      <div className="bg-white/80 dark:bg-slate-800/80 rounded-lg p-2.5 border border-emerald-200 dark:border-emerald-800/60">
                        <span className="block text-xs text-slate-500 dark:text-slate-400">Total Capacity</span>
                        <strong className="text-base text-slate-800 dark:text-slate-200 font-mono">
                          {recommendation.recommended_site.capacity}
                        </strong>
                      </div>
                      <div className="bg-white/80 dark:bg-slate-800/80 rounded-lg p-2.5 border border-emerald-200 dark:border-emerald-800/60">
                        <span className="block text-xs text-slate-500 dark:text-slate-400">Accessibility</span>
                        <strong className="text-base text-slate-800 dark:text-slate-200">
                          {recommendation.recommended_site.accessibility}
                        </strong>
                      </div>
                      <div className="bg-white/80 dark:bg-slate-800/80 rounded-lg p-2.5 border border-emerald-200 dark:border-emerald-800/60">
                        <span className="block text-xs text-slate-500 dark:text-slate-400">Suitability</span>
                        <strong className="text-base text-slate-800 dark:text-slate-200 font-mono">
                          {formatSuitability(recommendation.recommended_site.suitability)} / 10
                        </strong>
                      </div>
                    </div>
                  </div>

                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    All Evaluated Candidate Sites
                  </h5>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                        <tr>
                          <th className="px-3 py-2 text-left">Shelter Name</th>
                          <th className="px-3 py-2 text-left">Distance</th>
                          <th className="px-3 py-2 text-left">Available</th>
                          <th className="px-3 py-2 text-left">Suitability</th>
                          <th className="px-3 py-2 text-right">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {recommendation.all_sites.map((site) => (
                          <tr
                            key={site.site_id}
                            className={
                              site.site_id === recommendation.recommended_site.site_id
                                ? "bg-emerald-50/60 dark:bg-emerald-950/40 font-semibold"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                            }
                          >
                            <td className="px-3 py-2 text-slate-800 dark:text-slate-200">{site.site_name}</td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-400 font-mono">{site.distance} km</td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-400 font-mono">{site.available}</td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-400 font-mono">
                              {formatSuitability(site.suitability)} / 10
                            </td>
                            <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-400 font-bold font-mono">
                              {site.site_score}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}