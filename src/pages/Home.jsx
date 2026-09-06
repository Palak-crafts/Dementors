import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Map as MapIcon,
  Users,
  ShieldAlert,
  ArrowRight,
  Gauge,
  Move,
  BarChart3,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Lock,
  Radio,
  Building2,
  Navigation,
  Layers,
  ArrowUpRight,
  Activity,
  BedDouble,
} from 'lucide-react';

import StatCard from '@/components/StatCard';

export default function Home() {
  const [habitations, setHabitations] = useState([]);
  const [relocationSites, setRelocationSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeRole, setActiveRole] = useState(() => {
    return localStorage.getItem('dss_user_role') || 'national';
  });

  useEffect(() => {
    const handleRoleUpdate = () => {
      setActiveRole(localStorage.getItem('dss_user_role') || 'national');
    };
    window.addEventListener('roleChanged', handleRoleUpdate);
    window.addEventListener('storage', handleRoleUpdate);
    return () => {
      window.removeEventListener('roleChanged', handleRoleUpdate);
      window.removeEventListener('storage', handleRoleUpdate);
    };
  }, []);

  const districtScope =
    activeRole === 'chamoli'
      ? 'Chamoli'
      : activeRole === 'darbhanga'
      ? 'Darbhanga'
      : activeRole === 'wayanad'
      ? 'Wayanad'
      : null;

  const isNational = !districtScope;

  async function loadDashboardData() {
    try {
      setLoading(true);
      setError('');

      let [habRes, siteRes] = await Promise.all([
        fetch('/api/habitations').catch(() => null),
        fetch('/api/relocation-sites').catch(() => null),
      ]);

      if (!habRes || !habRes.ok) {
        habRes = await fetch('http://127.0.0.1:8000/api/habitations');
      }
      if (!siteRes || !siteRes.ok) {
        siteRes = await fetch('http://127.0.0.1:8000/api/relocation-sites');
      }

      if (!habRes.ok) throw new Error('Failed to load habitations');
      const habData = await habRes.json();
      const siteData = siteRes && siteRes.ok ? await siteRes.json() : [];

      setHabitations(Array.isArray(habData) ? habData : []);
      setRelocationSites(Array.isArray(siteData) ? siteData : []);
    } catch (err) {
      console.error('Dashboard data loading failed:', err);
      setError('Unable to load dashboard intelligence from backend.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  const scopedHabitations = useMemo(() => {
    if (districtScope) {
      return habitations.filter(
        (h) => h.district?.toLowerCase() === districtScope.toLowerCase()
      );
    }
    return habitations;
  }, [habitations, districtScope]);

  const scopedRelocationSites = useMemo(() => {
    if (districtScope) {
      return relocationSites.filter(
        (s) => s.district?.toLowerCase() === districtScope.toLowerCase()
      );
    }
    return relocationSites;
  }, [relocationSites, districtScope]);

  const totalHabitations = scopedHabitations.length;

  const criticalRedZones = scopedHabitations.filter(
    (h) => h.risk_level === 'Critical'
  ).length;

  const populationAtRisk = scopedHabitations
    .filter((h) => h.risk_level === 'Critical' || h.risk_level === 'High')
    .reduce((total, h) => total + Number(h.population || 0), 0);

  const capacityDeficit = scopedHabitations.reduce(
    (total, h) => total + Number(h.capacity_deficit || 0),
    0
  );

  const immediateRelocation = scopedHabitations.filter(
    (h) => h.priority === 'Immediate'
  ).length;

  const priorityQueue = useMemo(() => {
    return [...scopedHabitations]
      .sort((a, b) => Number(b.risk_score || 0) - Number(a.risk_score || 0))
      .slice(0, 4);
  }, [scopedHabitations]);

  const totalBedCapacity = scopedRelocationSites.reduce(
    (sum, s) => sum + Number(s.capacity || 0),
    0
  );
  const totalOccupiedBeds = scopedRelocationSites.reduce(
    (sum, s) => sum + Number(s.occupancy || 0),
    0
  );
  const totalAvailableBeds = scopedRelocationSites.reduce(
    (sum, s) => sum + Number(s.available || 0),
    0
  );
  const occupancyPercentage = totalBedCapacity
    ? Math.round((totalOccupiedBeds / totalBedCapacity) * 100)
    : 0;

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="text-center">
          <RefreshCw className="w-9 h-9 animate-spin mx-auto text-blue-600 mb-3" />
          <p className="text-slate-800 dark:text-slate-200 font-bold text-sm">
            Initializing Disastra Decision Telemetry...
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Connecting to FastAPI + PostGIS Engine</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen pb-16 transition-colors duration-200">
      {/* EXECUTIVE HERO COMMAND STRIP (ADAPTIVE LIGHT & DARK) */}
      <section className="relative bg-blue-900 dark:bg-slate-900 border-b border-blue-800 dark:border-slate-800 text-white overflow-hidden transition-colors duration-200">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 80%, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 dark:bg-blue-500/10 border border-white/20 dark:border-blue-400/30 text-white dark:text-blue-300 text-xs font-bold font-mono">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  DISASTRA · CRISIS DECISION SUPPORT
                </span>

                {!isNational && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold font-mono">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    DM {districtScope.toUpperCase()} COMMAND
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight mb-4">
                National Disaster Support & Evacuation Intelligence
              </h1>

              <p className="text-sm sm:text-base text-blue-100 dark:text-slate-300 leading-relaxed max-w-2xl">
                {isNational ? (
                  <>
                    Centralized spatial command system orchestrating real-time hazard surge telemetry, local carrying capacity assessment, and algorithm-matched safe shelter evacuation corridors.
                  </>
                ) : (
                  <>
                    Command portal restricted to <strong>District Magistrate {districtScope}</strong>. Coordinating localized hazard surge simulation, CAP early warning cell broadcasts, and immediate relocation queues.
                  </>
                )}
              </p>
            </div>

            {/* Quick Strategic Actions */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[240px]">
              <Link
                to="/risk-map"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 dark:hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg transition active:scale-95"
              >
                <MapIcon className="w-4 h-4" />
                Launch Full GIS Risk Map
              </Link>
              <Link
                to="/relocation"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-800/80 hover:bg-blue-800 dark:bg-slate-800 dark:hover:bg-slate-700 border border-blue-700 dark:border-slate-700 text-white text-xs font-bold rounded-xl transition active:scale-95"
              >
                <Move className="w-4 h-4 text-emerald-400" />
                Evacuation Priority Queue
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* TOP REAL-TIME STATUS STRIP */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 -mt-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            label={districtScope ? `${districtScope} Habitations` : 'Monitored Habitations'}
            value={totalHabitations}
          />
          <StatCard
            label="Critical Red Zones"
            value={criticalRedZones}
            type="critical"
          />
          <StatCard
            label="Population at Risk"
            value={populationAtRisk.toLocaleString('en-IN')}
            type="population"
          />
          <StatCard
            label="Shelter Deficit"
            value={capacityDeficit.toLocaleString('en-IN')}
            type="deficit"
          />
          <StatCard
            label="Immediate Evacuations"
            value={immediateRelocation}
            type="relocation"
          />
        </div>
      </section>

      {/* MAIN OPERATIONAL CONTROL GRID */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COL: CRITICAL RELOCATION QUEUE */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between transition-colors">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-red-600 dark:text-red-500" />
                    Critical Red Zone Action Queue
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Highest risk settlements requiring immediate administrative evacuation protocol
                  </p>
                </div>
                <Link
                  to="/habitations"
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  View All ({totalHabitations})
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3">
                {priorityQueue.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                    No critical habitations detected in active operational jurisdiction.
                  </div>
                ) : (
                  priorityQueue.map((hab) => {
                    const isCritical = hab.risk_level === 'Critical';
                    const isHigh = hab.risk_level === 'High';

                    return (
                      <div
                        key={hab.id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{hab.name}</span>
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
                              ({hab.district})
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isCritical
                                  ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                                  : isHigh
                                  ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'
                                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                              }`}
                            >
                              {hab.risk_level || 'Normal'} Tier
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            Hazard: <strong className="text-slate-800 dark:text-slate-200">{hab.hazard}</strong> · Pop: <strong className="font-mono">{Number(hab.population).toLocaleString()}</strong> · Deficit: <strong className="text-rose-600 dark:text-rose-400 font-mono">{Number(hab.capacity_deficit).toLocaleString()}</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                              hab.priority === 'Immediate'
                                ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700 animate-pulse'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                            }`}
                          >
                            {hab.priority}
                          </span>
                          <Link
                            to={`/habitations/${hab.id}`}
                            className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-blue-400 text-slate-700 dark:text-slate-200 hover:text-blue-600 transition shadow-sm"
                            title="Open Ground Telemetry & Simulate Surge"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" /> Live Multi-Factor Risk Index
              </span>
              <span>FastAPI Weighted Aggregation Engine</span>
            </div>
          </div>

          {/* RIGHT COL: SHELTER READINESS & BED ALLOCATION */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Safe Shelter Reserve Status
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {districtScope ? `Relief facility readiness in ${districtScope}` : 'Nationwide shelter capacity state'}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                    occupancyPercentage > 75
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  {occupancyPercentage}% Load
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-5">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 font-semibold mb-2">
                  <span>Bed Capacity Utilization</span>
                  <span className="font-mono">
                    {totalOccupiedBeds.toLocaleString()} / {totalBedCapacity.toLocaleString()} beds
                  </span>
                </div>
                <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      occupancyPercentage > 75
                        ? 'bg-rose-600'
                        : occupancyPercentage > 45
                        ? 'bg-amber-500'
                        : 'bg-emerald-600'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, occupancyPercentage))}%` }}
                  />
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-3 gap-3 text-center mb-5">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Hubs</span>
                  <strong className="text-base font-black text-slate-800 dark:text-slate-200 font-mono mt-0.5 block">
                    {scopedRelocationSites.length}
                  </strong>
                </div>
                <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Available</span>
                  <strong className="text-base font-black text-emerald-700 dark:text-emerald-300 font-mono mt-0.5 block">
                    {totalAvailableBeds.toLocaleString()}
                  </strong>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Readiness</span>
                  <strong className="text-base font-black text-blue-700 dark:text-blue-400 mt-0.5 block">
                    100% Active
                  </strong>
                </div>
              </div>

              <Link
                to="/relocation-sites"
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                Inspect Relocation Sites Directory
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* PROTOCOL QUICK ACTION BANNER */}
            <div className="bg-gradient-to-br from-blue-900 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  C-DOT CAP Early Warning Protocol
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Trigger simulated localized hazard surges and test automated cell broadcast warning dispatch across affected BTS mobile towers.
              </p>
              <Link
                to={priorityQueue.length > 0 ? `/habitations/${priorityQueue[0].id}` : '/habitations'}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition"
              >
                Simulate Cloudburst Surge
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CORE 3-PILLAR DSS ARCHITECTURE */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 mt-12">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Intelligent Decision Support Architecture
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Engineered to address SIH26191 through three interconnected scientific pipelines
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 border border-blue-100 dark:border-blue-800">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">1. Multi-Hazard Risk Scoring</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Synthesizes terrain slopes, road connectivity, structural vulnerability, and live Open-Meteo precipitation metrics into an unweighted 0-100 composite risk matrix.
            </p>
            <Link
              to="/disasters"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              Hazard Typology SOPs <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 border border-amber-100 dark:border-amber-800">
              <Gauge className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">2. Dynamic Carrying Capacity</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Calculates net population overflow against verified structural safe limits to pinpoint acute deficit hotspots lacking local shelter buffers.
            </p>
            <Link
              to="/capacity"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              Capacity Breakdown <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 border border-emerald-100 dark:border-emerald-800">
              <Navigation className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">3. GIS Evacuation Corridors</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Utilizes Haversine geodesic distance, road accessibility ratings, and shelter suitability scores to establish instantaneous, collision-free evacuation vectors.
            </p>
            <Link
              to="/risk-map"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              Examine Spatial Map <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* QUICK LAUNCH TILES */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 mt-12">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Operational Module Navigation</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              to: '/risk-map',
              icon: MapIcon,
              title: 'Interactive Risk Map',
              desc: 'Spatial visualizer with live evacuation polylines',
            },
            {
              to: '/habitations',
              icon: Users,
              title: 'Habitations Registry',
              desc: 'Census database, weather feeds & surge triggers',
            },
            {
              to: '/capacity',
              icon: Gauge,
              title: 'Capacity Assessment',
              desc: 'Carrying capacity vs population deficit charts',
            },
            {
              to: '/analytics',
              icon: BarChart3,
              title: 'Executive Analytics',
              desc: 'NDMA risk tiers & shelter occupancy telemetry',
            },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition flex items-center gap-3.5"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition flex-shrink-0">
                <item.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate">
                  {item.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}