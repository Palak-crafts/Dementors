import { useEffect, useState, useMemo } from "react";
import { PageHeader, Disclaimer } from "@/components/Layout";
import {
  Building2,
  RefreshCw,
  Plus,
  AlertTriangle,
  X,
  MapPin,
  CheckCircle2,
  Lock,
  Filter,
  Users,
  BedDouble,
  ShieldCheck,
  Navigation,
} from "lucide-react";
import MapView from "@/components/MapView";
import { StatusBadge } from "@/components/Badges";

export default function RelocationSites() {
  const [sites, setSites] = useState([]);
  const [atRiskHabitations, setAtRiskHabitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Selected Habitation State for Live Evacuation Corridor Mapping
  const [selectedHab, setSelectedHab] = useState(null);

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

  // Add Relocation Site Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const initialFormState = {
    name: "",
    district: districtScope || "",
    capacity: 1000,
    occupancy: 200,
    accessibility: "Good",
    distance: 12.5,
    suitability: 8.5,
    status: "Active",
    latitude: 20.5937,
    longitude: 78.9629,
    power: true,
    water: true,
    medical: true,
  };

  const [formData, setFormData] = useState(initialFormState);

  // Sync modal district default with active scope
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      district: districtScope || "",
    }));
  }, [districtScope]);

  // Fetch all sites and high-risk habitations from backend
  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      let [sitesRes, habsRes] = await Promise.all([
        fetch("/api/relocation-sites").catch(() => null),
        fetch("/api/habitations").catch(() => null),
      ]);

      if (!sitesRes || !sitesRes.ok) {
        sitesRes = await fetch("http://127.0.0.1:8000/api/relocation-sites");
      }
      if (!sitesRes.ok) throw new Error("Failed to load relocation sites");
      const sitesData = await sitesRes.json();
      setSites(Array.isArray(sitesData) ? sitesData : []);

      if (!habsRes || !habsRes.ok) {
        habsRes = await fetch("http://127.0.0.1:8000/api/habitations").catch(() => null);
      }
      if (habsRes && habsRes.ok) {
        const habsData = await habsRes.json();
        setAtRiskHabitations(Array.isArray(habsData) ? habsData : []);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to load relocation sites data from backend database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter Sites strictly to active administrative scope
  const scopedSites = useMemo(() => {
    if (districtScope) {
      return sites.filter(
        (s) => s.district?.toLowerCase() === districtScope.toLowerCase()
      );
    }
    return sites;
  }, [sites, districtScope]);

  // Filter Priority Habitations strictly to active administrative scope
  const scopedPriorityHabs = useMemo(() => {
    let habs = atRiskHabitations.filter(
      (h) => h.priority === "Immediate" || h.risk_level === "Critical" || h.risk_level === "High"
    );
    if (districtScope) {
      habs = habs.filter(
        (h) => h.district?.toLowerCase() === districtScope.toLowerCase()
      );
    }
    return habs;
  }, [atRiskHabitations, districtScope]);

  // Key Statistics derived from active scope
  const totalShelterCapacity = useMemo(() => {
    return scopedSites.reduce((sum, s) => sum + Number(s.capacity || 0), 0);
  }, [scopedSites]);

  const totalOccupancy = useMemo(() => {
    return scopedSites.reduce((sum, s) => sum + Number(s.occupancy || 0), 0);
  }, [scopedSites]);

  const totalAvailableBeds = useMemo(() => {
    return scopedSites.reduce((sum, s) => sum + Number(s.available || 0), 0);
  }, [scopedSites]);

  // Map Data Normalization
  const mapHabitations = useMemo(() => {
    return scopedPriorityHabs.map((h) => ({
      ...h,
      coords: [Number(h.latitude), Number(h.longitude)],
      riskScore: Number(h.risk_score || 0),
      riskLevel: h.risk_level || "Critical",
    }));
  }, [scopedPriorityHabs]);

  const mapSites = useMemo(() => {
    return scopedSites.map((s) => ({
      ...s,
      coords: [Number(s.latitude), Number(s.longitude)],
    }));
  }, [scopedSites]);

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

  const mapCenter = useMemo(() => {
    if (selectedHab && selectedHab.coords) {
      return selectedHab.coords;
    }
    if (districtScope && mapSites.length > 0 && mapSites[0].coords) {
      return mapSites[0].coords;
    }
    if (districtScope && mapHabitations.length > 0 && mapHabitations[0].coords) {
      return mapHabitations[0].coords;
    }
    return [22.5, 79.0];
  }, [selectedHab, districtScope, mapSites, mapHabitations]);

  const mapZoom = selectedHab ? 10 : districtScope ? 9 : 5;

  // Create Shelter Submission
  const handleCreateSite = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setSubmitting(true);

    try {
      const finalDistrict = districtScope || formData.district.trim();
      const payload = {
        name: formData.name.trim(),
        district: finalDistrict,
        capacity: parseInt(formData.capacity, 10),
        occupancy: parseInt(formData.occupancy, 10),
        accessibility: formData.accessibility,
        distance: parseFloat(formData.distance),
        suitability: parseFloat(formData.suitability),
        status: formData.status,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
      };

      if (!payload.name || !payload.district) {
        throw new Error("Site name and district are required.");
      }

      if (payload.occupancy > payload.capacity) {
        throw new Error("Occupancy cannot be greater than total capacity.");
      }

      let res = await fetch("/api/relocation-sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch("http://127.0.0.1:8000/api/relocation-sites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to register relocation shelter.");
      }

      const created = await res.json();
      setFormSuccess(
        `Relocation shelter "${created.name}" registered successfully under ${finalDistrict} district!`
      );

      await loadData();

      setTimeout(() => {
        setIsModalOpen(false);
        setFormData({ ...initialFormState, district: districtScope || "" });
        setFormSuccess("");
      }, 1200);
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Failed to register shelter.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
          <p className="text-slate-600 font-medium">Loading Relocation Centers from Database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl border border-red-200 p-8 text-center shadow-sm">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Relocation Data Unavailable</h2>
          <p className="text-slate-600 mb-5">{error}</p>
          <button
            onClick={loadData}
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
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <PageHeader
          title="Relocation Sites Directory"
          subtitle={
            isNational
              ? "Safe-site capacity assessment, live occupancy tracking & GIS candidate relief hubs"
              : `Jurisdiction Hubs: District Magistrate ${districtScope} Relocation Command`
          }
          icon={Building2}
        />
        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-sm font-semibold shadow-sm active:scale-95"
          >
            <RefreshCw className="w-4 h-4 text-blue-600" />
            Refresh
          </button>
          <button
            onClick={() => {
              setFormData({ ...initialFormState, district: districtScope || "" });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Register Shelter
          </button>
        </div>
      </div>

      {/* Scope Status Banner */}
      <div
        className={`rounded-xl p-3.5 mb-6 flex items-center justify-between border shadow-sm ${
          isNational
            ? "bg-blue-50/70 border-blue-200 text-blue-900"
            : "bg-emerald-50/70 border-emerald-300 text-emerald-950"
        }`}
      >
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
          <Filter className="w-4 h-4 flex-shrink-0 text-slate-500" />
          <span>
            {isNational ? (
              <>
                Displaying <strong>{scopedSites.length}</strong> safe shelters nationwide across{" "}
                <strong>All-India NDMA Directory</strong>.
              </>
            ) : (
              <>
                Restricted to <strong>{scopedSites.length}</strong> active shelters in{" "}
                <strong>District Magistrate {districtScope}</strong> jurisdiction.
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

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {isNational ? "Active Relocation Hubs" : `${districtScope} Relief Centers`}
              </p>
              <h3 className="text-3xl font-black text-slate-900 mt-2">
                {scopedSites.length}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Designated safe facilities</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-600">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Safe Bed Capacity
              </p>
              <h3 className="text-3xl font-black text-slate-900 mt-2">
                {totalShelterCapacity.toLocaleString()}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Ground certified space</p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-600">
              <BedDouble className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-rose-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                Current Evacuee Load
              </p>
              <h3 className="text-3xl font-black text-rose-600 mt-2">
                {totalOccupancy.toLocaleString()}
              </h3>
              <p className="text-xs text-rose-400 mt-1">Sheltered individuals</p>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-600">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Available Reserve Space
              </p>
              <h3 className="text-3xl font-black text-emerald-600 mt-2">
                {totalAvailableBeds.toLocaleString()}
              </h3>
              <p className="text-xs text-emerald-400 mt-1">Ready for intake</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Active Corridor Banner if a village is selected on map */}
      {selectedHab && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-300 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </span>
            <div>
              <p className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-red-600" />
                ACTIVE EVACUATION CORRIDOR VECTOR
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                Connecting endangered settlement <strong>{selectedHab.name}</strong> ({selectedHab.district}) to nearest designated relief facility.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedHab(null)}
            className="flex items-center gap-1 text-xs font-semibold text-red-700 hover:text-red-900 bg-white border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition shadow-sm"
          >
            <X className="w-3.5 h-3.5" /> Clear Route
          </button>
        </div>
      )}

      {/* Map Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {isNational
                ? "National Safe Shelter & Vulnerability Visualizer"
                : `Spatial Command: District ${districtScope} Shelters & Vectors`}
            </h3>
            <p className="text-xs text-slate-500">
              Click any high-risk settlement (Red) to project its live evacuation route to the closest shelter (Blue squares).
            </p>
          </div>
          <div className="text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
            Active Shelters: <strong>{scopedSites.length}</strong> | Priority Zones:{" "}
            <strong>{scopedPriorityHabs.length}</strong>
          </div>
        </div>

        <MapView
          habitations={mapHabitations}
          relocationSites={mapSites}
          selectedHabitation={selectedHab}
          onSelectHabitation={handleToggleHabitation}
          center={mapCenter}
          zoom={mapZoom}
          showSites
          height="440px"
        />
      </div>

      {/* Sites Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-6">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Shelter Name</th>
                <th className="px-4 py-3 text-left">District</th>
                <th className="px-4 py-3 text-left">Capacity</th>
                <th className="px-4 py-3 text-left">Occupancy</th>
                <th className="px-4 py-3 text-left">Available</th>
                <th className="px-4 py-3 text-left">Road Access</th>
                <th className="px-4 py-3 text-left">Distance</th>
                <th className="px-4 py-3 text-left">Suitability</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scopedSites.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    No relocation shelters found in {districtScope || "active"} jurisdiction. Click "Register Shelter" to add one.
                  </td>
                </tr>
              ) : (
                scopedSites.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap flex items-center gap-2">
                      <div className="p-1 rounded bg-blue-50 text-blue-600 border border-blue-100">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      {s.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-medium">
                      {s.district}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-semibold whitespace-nowrap font-mono">
                      {Number(s.capacity || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-rose-600 font-semibold whitespace-nowrap font-mono">
                      {Number(s.occupancy || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-700 whitespace-nowrap font-mono">
                      {Number(s.available || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">
                      {s.accessibility}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-mono text-xs">
                      {s.distance} km
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-bold text-slate-800 font-mono">
                        {s.suitability}
                      </span>
                      <span className="text-slate-400 text-xs ml-0.5">/10</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={s.status || "Active"} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Disclaimer text="GIS candidate relief areas and safe site capacities are updated live from PostgreSQL. Evacuation routes and transport logistics must be verified by local SDRF / District Disaster Management Authorities." />

      {/* ADD RELOCATION SHELTER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 relative animate-in fade-in zoom-in duration-150 my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Register Relocation Center
                </h3>
                <p className="text-xs text-slate-500">
                  {districtScope
                    ? `Registering relief facility under DM ${districtScope} Jurisdiction`
                    : "Add a cyclone shelter, school relief camp, or multi-purpose evacuation facility."}
                </p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateSite} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Center / Shelter Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Pipalkoti Community Center, Gopeshwar Relief Hall"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>District / Jurisdiction *</span>
                    {!isNational && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
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
                    placeholder="e.g., Chamoli, Wayanad, Darbhanga"
                    className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      !isNational ? "bg-slate-100 text-slate-600 cursor-not-allowed font-semibold" : ""
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Total Capacity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Current Occupancy *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.occupancy}
                    onChange={(e) => setFormData({ ...formData, occupancy: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Distance (km)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={formData.distance}
                    onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Suitability (1–10)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    required
                    value={formData.suitability}
                    onChange={(e) => setFormData({ ...formData, suitability: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Road Accessibility
                  </label>
                  <select
                    value={formData.accessibility}
                    onChange={(e) => setFormData({ ...formData, accessibility: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="Good">Good (All-weather Highway/Paved)</option>
                    <option value="Moderate">Moderate (Single-lane link road)</option>
                    <option value="Poor">Poor (Difficult terrain/Off-road)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Operational Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="Active">Active / Ready</option>
                    <option value="Standby">Standby</option>
                    <option value="Full">At Max Capacity</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" /> Latitude (e.g. 30.38)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" /> Longitude (e.g. 79.33)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-50"
                >
                  {submitting ? "Registering..." : "Register Shelter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}