import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  CloudRain,
  Wind,
  Thermometer,
  ShieldAlert,
  Users,
  AlertTriangle,
  Building2,
  RefreshCw,
  Send,
  CheckCircle2,
  X,
  Radio,
  BellRing,
  Lock,
  Navigation,
} from "lucide-react";
import { RiskBadge, PriorityBadge } from "@/components/Badges";
import MapView from "@/components/MapView";

export default function HabitationDetails() {
  const { id } = useParams();

  const [habitation, setHabitation] = useState(null);
  const [weather, setWeather] = useState(null);
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

  // Simulation state
  const [simulating, setSimulating] = useState(false);
  const [simMessage, setSimMessage] = useState("");

  // SMS / Early Warning Alert State
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertDispatched, setAlertDispatched] = useState(false);

  // Fetch Habitation baseline data
  const loadHabitation = async () => {
    try {
      setLoading(true);
      setError("");
      let res = await fetch(`/api/habitations/${id}`).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`http://127.0.0.1:8000/api/habitations/${id}`);
      }
      if (!res.ok) throw new Error("Could not load habitation details");
      const data = await res.json();
      setHabitation(data);
    } catch (err) {
      console.error(err);
      setError("Unable to connect to backend service.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Live Weather Telemetry (Open-Meteo via FastAPI)
  const loadWeather = async () => {
    try {
      let res = await fetch(`/api/weather/live/${id}`).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`http://127.0.0.1:8000/api/weather/live/${id}`);
      }
      if (res.ok) {
        const wData = await res.json();
        setWeather(wData);
      }
    } catch (err) {
      console.error("Live weather fetch failed", err);
    }
  };

  useEffect(() => {
    loadHabitation();
    loadWeather();
  }, [id]);

  // Check if current user is authorized to command this district
  const isAuthorized = useMemo(() => {
    if (!districtScope) return true; // National admin has all access
    if (!habitation) return true;
    return (
      habitation.district?.toLowerCase() === districtScope.toLowerCase()
    );
  }, [districtScope, habitation]);

  // Disaster Event Simulation Trigger
  const handleSimulateSurge = async () => {
    if (!isAuthorized) {
      alert("Access Denied: You do not possess executive authority over this district.");
      return;
    }

    try {
      setSimulating(true);
      setSimMessage("");

      let res = await fetch(
        `/api/disaster/simulate?habitation_id=${id}&hazard_surge=30.0`,
        { method: "POST" }
      ).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch(
          `http://127.0.0.1:8000/api/disaster/simulate?habitation_id=${id}&hazard_surge=30.0`,
          { method: "POST" }
        );
      }

      if (!res.ok) throw new Error("Simulation failed");
      const result = await res.json();

      setHabitation((prev) => ({
        ...prev,
        hazard_exposure: result.new_hazard_exposure,
        risk_score: result.new_risk_score,
        risk_level: result.new_risk_level,
        priority: result.new_relocation_priority,
      }));

      setSimMessage(
        `Disaster Escalation Event Processed! Dynamic Risk Index surged to ${Number(
          result.new_risk_score
        ).toFixed(1)}/100 (${result.new_risk_level}).`
      );

      // Notify other tabs and components that database records updated
      window.dispatchEvent(new Event("storage"));

      // Auto trigger Early Warning Broadcast Modal
      setShowAlertModal(true);
      setAlertDispatched(false);
    } catch (err) {
      console.error(err);
      alert("Failed to simulate disaster event");
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
          <p className="text-slate-600 font-medium">
            Fetching settlement ground telemetry...
          </p>
        </div>
      </div>
    );
  }

  if (error || !habitation) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          Settlement Not Found
        </h2>
        <p className="text-slate-600 mb-4">{error || "Data unavailable."}</p>
        <Link
          to="/habitations"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Habitations
        </Link>
      </div>
    );
  }

  const coords = [
    Number(habitation.latitude || 20.5937),
    Number(habitation.longitude || 78.9629),
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
      {/* Back button & Scope indicator */}
      <div className="flex items-center justify-between mb-4">
        <Link
          to="/habitations"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Habitations Registry
        </Link>

        {districtScope && (
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
              isAuthorized
                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                : "bg-red-50 border-red-300 text-red-800"
            }`}
          >
            {isAuthorized ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Authorized Jurisdiction: {districtScope}
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-red-600" />
                Read-Only (Non-Jurisdictional District)
              </>
            )}
          </span>
        )}
      </div>

      {/* Unauthorized Warning Notice */}
      {!isAuthorized && (
        <div className="mb-5 p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <span>
            You are viewing a settlement outside your posting (<strong>{districtScope}</strong>). Operational actions such as surge simulations and early warning cell broadcasts are disabled.
          </span>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            {habitation.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {habitation.district} District • Primary Hazard:{" "}
            <strong className="text-slate-700">{habitation.hazard}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <RiskBadge level={habitation.risk_level} />
          <PriorityBadge priority={habitation.priority} />
          <button
            onClick={() => setShowAlertModal(true)}
            disabled={!isAuthorized}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold shadow-sm transition active:scale-95"
          >
            <Radio className="w-3.5 h-3.5" /> Broadcast Alert
          </button>
        </div>
      </div>

      {/* Surge Trigger Banner */}
      {simMessage && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-xs sm:text-sm font-bold">{simMessage}</p>
          </div>
          <button
            onClick={() => setShowAlertModal(true)}
            className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-sm active:scale-95"
          >
            Deploy CAP Protocol
          </button>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Col 1: Weather & Simulation */}
        <div className="space-y-6">
          {/* Weather Telemetry Box */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />{" "}
                Live Weather Telemetry
              </span>
              <span className="text-[10px] font-bold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30 font-mono">
                OPEN-METEO FEED
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center mb-5">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
                <Thermometer className="w-4 h-4 text-rose-400 mx-auto mb-1" />
                <span className="block text-[11px] text-slate-400">Temp</span>
                <strong className="text-sm font-bold text-white font-mono">
                  {weather ? `${weather.temperature}°C` : "--"}
                </strong>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
                <CloudRain className="w-4 h-4 text-sky-400 mx-auto mb-1" />
                <span className="block text-[11px] text-slate-400">Precip</span>
                <strong className="text-sm font-bold text-white font-mono">
                  {weather ? `${weather.rainfall_mm} mm` : "--"}
                </strong>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
                <Wind className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                <span className="block text-[11px] text-slate-400">Wind</span>
                <strong className="text-sm font-bold text-white font-mono">
                  {weather ? `${weather.wind_speed_kmh} km/h` : "--"}
                </strong>
              </div>
            </div>

            {/* Simulation Trigger Button */}
            <button
              onClick={handleSimulateSurge}
              disabled={simulating || !isAuthorized}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm active:scale-95"
            >
              {simulating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Calculating Dynamic Impact...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Simulate Cloudburst / Flood Surge
                </>
              )}
            </button>
          </div>

          {/* Settlement Details Profile */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
              Baseline Demographics
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Population</span>
                <strong className="text-slate-800 font-mono">
                  {Number(habitation.population).toLocaleString()}
                </strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Households</span>
                <strong className="text-slate-800 font-mono">
                  {Number(habitation.households).toLocaleString()}
                </strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">District</span>
                <strong className="text-slate-800">
                  {habitation.district}
                </strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Coordinates</span>
                <span className="text-slate-600 font-mono text-[11px]">
                  {Number(habitation.latitude).toFixed(3)}°N,{" "}
                  {Number(habitation.longitude).toFixed(3)}°E
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Col 2: Multi-Factor Risk Score & Vulnerability */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm text-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Multi-Factor Risk Score
            </p>
            <div className="my-3">
              <span className="text-5xl font-black text-red-600 font-mono">
                {Number(habitation.risk_score || 0).toFixed(1)}
              </span>
              <span className="text-slate-400 text-lg font-bold"> / 100</span>
            </div>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                habitation.risk_score >= 80
                  ? "bg-red-100 text-red-700"
                  : habitation.risk_score >= 60
                  ? "bg-orange-100 text-orange-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {habitation.risk_level} Risk Tier
            </span>

            <div className="mt-6 pt-5 border-t border-slate-100 text-left space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Hazard Exposure Index</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {habitation.hazard_exposure}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, habitation.hazard_exposure)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Vulnerability Index</span>
                  <span className="font-bold text-slate-800">
                    {habitation.vulnerability}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Road Evacuation Accessibility</span>
                  <span className="font-bold text-slate-800">
                    {habitation.accessibility}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Carrying Capacity Balance
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Population</span>
                <strong className="font-mono">{Number(habitation.population).toLocaleString()}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Safe Capacity</span>
                <strong className="font-mono">
                  {Number(habitation.safe_capacity).toLocaleString()}
                </strong>
              </div>
              <div className="flex justify-between py-1 pt-2">
                <span className="font-bold text-red-600">
                  Capacity Deficit Burden
                </span>
                <strong className="text-red-600 text-sm font-mono">
                  {Number(habitation.capacity_deficit).toLocaleString()}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Col 3: DSS Decision & Match Button */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-blue-600" /> Relocation
              Recommendation
            </h3>

            <div className="p-4 bg-slate-50 rounded-xl mb-5 border border-slate-100">
              <span className="text-xs text-slate-500 block mb-1">
                Relocation Urgency Tier
              </span>
              <span className="text-xl font-bold text-red-600">
                {habitation.priority}
              </span>
            </div>

            <div className="text-xs text-slate-600 space-y-2 mb-6">
              <p>• {habitation.hazard_exposure}% exposure to {habitation.hazard}.</p>
              <p>
                • Capacity deficit of{" "}
                <strong>{Number(habitation.capacity_deficit).toLocaleString()}</strong> individuals.
              </p>
              <p>• Accessibility profile: {habitation.accessibility}.</p>
            </div>

            <Link
              to={`/relocation?habitation=${habitation.id}`}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm active:scale-95"
            >
              <Navigation className="w-4 h-4" /> Match Nearest Safe Shelter
            </Link>
          </div>

          {/* Mini GIS Map View */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Spatial Coordinate Fix
            </h4>
            <div className="h-[200px] rounded-xl overflow-hidden">
              <MapView
                habitations={[
                  {
                    id: habitation.id,
                    name: habitation.name,
                    district: habitation.district,
                    population: habitation.population,
                    hazard: habitation.hazard,
                    riskScore: habitation.risk_score,
                    riskLevel: habitation.risk_level,
                    priority: habitation.priority,
                    coords: coords,
                  },
                ]}
                center={coords}
                zoom={10}
                showSites={false}
                height="200px"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SIMULATED CAP EARLY WARNING / SMS BROADCAST MODAL                         */}
      {/* ========================================================================= */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 relative animate-in fade-in zoom-in duration-150">
            <button
              onClick={() => setShowAlertModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <BellRing className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  CAP Early Warning Broadcast
                </h3>
                <p className="text-xs text-slate-500">
                  National Disaster Management Authority (Protocol v1.2)
                </p>
              </div>
            </div>

            {/* Target Details */}
            <div className="bg-slate-50 rounded-xl p-3.5 text-xs space-y-1.5 mb-4 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Target Settlement:</span>
                <strong className="text-slate-800">{habitation.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">District:</span>
                <strong className="text-slate-800">
                  {habitation.district} District
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Population:</span>
                <strong className="text-slate-800">
                  {Number(habitation.population).toLocaleString()} Citizens (
                  {habitation.households} Households)
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Risk Escalation:</span>
                <strong className="text-red-600">
                  {Number(habitation.risk_score).toFixed(1)} / 100 (
                  {habitation.priority})
                </strong>
              </div>
            </div>

            {/* Simulated SMS Card */}
            <div className="mb-5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                Simulated Cell Broadcast SMS:
              </span>
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs font-mono text-amber-950 shadow-inner">
                [NDMA EMERGENCY ALERT]: Severe {habitation.hazard} warning
                escalated for {habitation.name} ({habitation.district}).
                Immediate evacuation required. Proceed to designated relief
                shelter immediately. Follow SDRF/NDRF corridors.
              </div>
            </div>

            {/* Dispatch Status */}
            {alertDispatched ? (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  Emergency warning successfully queued to Telecom Cell Towers &
                  District Control Room!
                </span>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowAlertModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => setAlertDispatched(true)}
                disabled={alertDispatched || !isAuthorized}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Send className="w-3.5 h-3.5" />
                {alertDispatched ? "Broadcast Sent" : "Dispatch Mass SMS Alert"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}