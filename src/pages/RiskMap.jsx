import { useEffect, useState, useMemo } from "react";
import { PageHeader, Disclaimer } from "@/components/Layout";
import {
  Map as MapIcon,
  SlidersHorizontal,
  RefreshCw,
  AlertTriangle,
  MapPin,
  ShieldCheck,
  Navigation,
  X,
  Lock,
} from "lucide-react";

import MapView from "@/components/MapView";
import MapLegend from "@/components/MapLegend";
import FilterPanel from "@/components/FilterPanel";

export default function RiskMap() {
  const [habitations, setHabitations] = useState([]);
  const [relocationSites, setRelocationSites] = useState([]);

  // Read authenticated user role
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

  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(true);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // State for active evacuation corridor
  const [selectedHab, setSelectedHab] = useState(null);

  // Sync role-based district into map filters
  useEffect(() => {
    if (districtScope) {
      setFilters((prev) => ({ ...prev, district: districtScope }));
    } else {
      setFilters((prev) => {
        const next = { ...prev };
        delete next.district;
        return next;
      });
    }
  }, [districtScope]);

  // ==========================================================
  // LOAD REAL GIS DATA FROM FASTAPI BACKEND
  // ==========================================================
  async function loadGISData() {
    try {
      setLoading(true);
      setError("");

      let habRes = await fetch("/api/gis/habitations").catch(() => null);
      if (!habRes || !habRes.ok) {
        habRes = await fetch("http://127.0.0.1:8000/api/gis/habitations");
      }
      if (!habRes.ok) throw new Error("Failed to load habitations GIS data");
      const habitationGeoJSON = await habRes.json();

      let siteRes = await fetch("/api/gis/relocation-sites").catch(() => null);
      if (!siteRes || !siteRes.ok) {
        siteRes = await fetch("http://127.0.0.1:8000/api/gis/relocation-sites");
      }
      if (!siteRes.ok) throw new Error("Failed to load relocation sites GIS data");
      const siteGeoJSON = await siteRes.json();

      const habFeatures = habitationGeoJSON.features || [];
      const parsedHabs = habFeatures.map((f) => {
        const p = f.properties || {};
        const coords = f.geometry?.coordinates || [78.9629, 20.5937];
        return {
          id: p.id,
          name: p.name,
          district: p.district,
          population: Number(p.population || 0),
          households: Number(p.households || 0),
          hazard: p.hazard || "Unknown",
          riskScore: Number(p.risk_score || 0),
          riskLevel: p.risk_level || "Low",
          vulnerability: p.vulnerability || "Moderate",
          accessibility: p.accessibility || "Moderate",
          capacityDeficit: Number(p.capacity_deficit || 0),
          capacityStatus: p.capacity_status || "Adequate",
          priority: p.priority || "Monitor",
          status: p.status || "Active",
          coords: [coords[1], coords[0]],
        };
      });

      const siteFeatures = siteGeoJSON.features || [];
      const parsedSites = siteFeatures.map((f) => {
        const p = f.properties || {};
        const coords = f.geometry?.coordinates || [78.9629, 20.5937];
        return {
          id: p.id,
          name: p.name,
          district: p.district,
          capacity: Number(p.capacity || 0),
          occupancy: Number(p.occupancy || 0),
          available: Number(p.available || 0),
          accessibility: p.accessibility || "Good",
          distance: Number(p.distance || 0),
          suitability: p.suitability,
          status: p.status || "Active",
          coords: [coords[1], coords[0]],
        };
      });

      setHabitations(parsedHabs);
      setRelocationSites(parsedSites);
    } catch (err) {
      console.error("GIS loading failed:", err);
      setError("Unable to load GIS data from backend server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGISData();
  }, []);

  // Filtered Habitations strictly scoped to Active District Scope
  const filtered = useMemo(() => {
    return habitations.filter((h) => {
      if (districtScope && h.district?.toLowerCase() !== districtScope.toLowerCase()) {
        return false;
      }
      if (filters.district && h.district !== filters.district) return false;
      if (filters.hazard && h.hazard !== filters.hazard) return false;
      if (filters.riskLevel && h.riskLevel !== filters.riskLevel) return false;
      if (filters.vulnerability && h.vulnerability !== filters.vulnerability) return false;
      if (filters.capacityStatus && h.capacityStatus !== filters.capacityStatus) return false;
      if (filters.priority && h.priority !== filters.priority) return false;
      return true;
    });
  }, [habitations, filters, districtScope]);

  // Filter Relocation Sites strictly scoped to Active District Scope
  const scopedSites = useMemo(() => {
    if (!districtScope) return relocationSites;
    return relocationSites.filter(
      (s) => s.district?.toLowerCase() === districtScope.toLowerCase()
    );
  }, [relocationSites, districtScope]);

  const districts = useMemo(() => {
    if (districtScope) return [districtScope];
    return [...new Set(habitations.map((h) => h.district))].filter(Boolean).sort();
  }, [habitations, districtScope]);

  // Base list for Statistics (Strictly district-scoped)
  const scopedBaseHabitations = useMemo(() => {
    if (districtScope) {
      return habitations.filter(
        (h) => h.district?.toLowerCase() === districtScope.toLowerCase()
      );
    }
    return habitations;
  }, [habitations, districtScope]);

  // Real-time Dynamic Statistics derived from active scope
  const totalInScope = scopedBaseHabitations.length;
  const criticalCount = scopedBaseHabitations.filter((h) => h.riskLevel === "Critical").length;
  const highRiskCount = scopedBaseHabitations.filter((h) => h.riskLevel === "High").length;
  const relocationCount = scopedBaseHabitations.filter(
    (h) => h.priority === "Immediate" || h.priority === "Short-Term"
  ).length;

  const handleToggleHabitation = (hab) => {
    if (!hab) {
      setSelectedHab(null);
      return;
    }
    if (selectedHab && selectedHab.id === hab.id) {
      setSelectedHab(null);
    } else {
      setSelectedHab(hab);
    }
  };

  // Map camera centering
  const mapCenter = useMemo(() => {
    if (selectedHab) return selectedHab.coords;
    if (districtScope && filtered.length > 0) return filtered[0].coords;
    return [22.5, 79.0];
  }, [selectedHab, districtScope, filtered]);

  const mapZoom = useMemo(() => {
    if (selectedHab) return 10;
    if (districtScope) return 9;
    return 5;
  }, [selectedHab, districtScope]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
          <PageHeader
            title="Risk Intelligence Map"
            subtitle="India-wide disaster risk & relocation intelligence"
            icon={MapIcon}
          />
          <div className="h-[600px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center transition-colors">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Loading GIS intelligence from FastAPI backend...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        <PageHeader
          title="Risk Intelligence Map"
          subtitle={
            districtScope
              ? `Jurisdiction Focus: District Magistrate ${districtScope} Spatial Command (Restricted Scope)`
              : "India-wide disaster risk & relocation command center (All-India Scope)"
          }
          icon={MapIcon}
        />

        {error && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">GIS Connection Error</p>
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
            <button
              onClick={loadGISData}
              className="flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 text-xs font-medium text-white px-3 py-2 transition"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}

        {/* Real-time Dynamic Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {districtScope ? `${districtScope} Habitations` : "Total Habitations"}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {totalInScope}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                <MapPin className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Critical Red Zones</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {criticalCount}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">High Risk Zones</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                  {highRiskCount}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Relocation Required</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                  {relocationCount}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                <MapIcon className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Active Evacuation Corridor Notification Banner */}
        {selectedHab && (
          <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
              </span>
              <div>
                <p className="text-xs font-bold text-red-900 dark:text-red-200 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  ACTIVE EVACUATION CORRIDOR
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                  Showing designated escape vector from{" "}
                  <strong>{selectedHab.name}</strong> ({selectedHab.district}) to nearest safe shelter.
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedHab(null)}
              className="flex items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-300 hover:text-red-900 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-slate-700 transition shadow-sm"
            >
              <X className="w-3.5 h-3.5" /> Clear Route
            </button>
          </div>
        )}

        {/* Map + Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div
            className={`lg:w-64 flex-shrink-0 ${
              showFilters ? "block" : "hidden lg:block"
            }`}
          >
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Map Filters
                  </h3>
                </div>
                {districtScope && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                    <Lock className="w-2.5 h-2.5" /> DM Scope
                  </span>
                )}
              </div>

              <FilterPanel
                filters={filters}
                onChange={setFilters}
                districts={districts}
              />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Showing{" "}
                  <strong className="text-slate-900 dark:text-white">{filtered.length}</strong> of{" "}
                  <strong className="text-slate-900 dark:text-white">{totalInScope}</strong> habitations{" "}
                  {districtScope ? `in ${districtScope} District` : "Nationwide"}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Click on any settlement marker to project or clear its evacuation corridor
                </p>
              </div>

              <button
                onClick={loadGISData}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Map
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
              <MapView
                habitations={filtered}
                relocationSites={scopedSites}
                selectedHabitation={selectedHab}
                onSelectHabitation={handleToggleHabitation}
                center={mapCenter}
                zoom={mapZoom}
                showSites
                height="620px"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <MapLegend />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <strong>{filtered.length}</strong> settlements plotted ·{" "}
                <strong>{scopedSites.length}</strong> safe shelters online in active jurisdiction
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Disclaimer text="Risk scores and relocation priorities are prototype decision-support calculations. They are not official government hazard classifications." />
        </div>
      </div>
    </div>
  );
}