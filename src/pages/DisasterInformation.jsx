import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/Layout';
import {
  Waves,
  Mountain,
  Wind,
  Search,
  ChevronDown,
  ChevronUp,
  MapPin,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Radio,
  Lock,
  Layers,
} from 'lucide-react';
import { DISASTER_INFO } from '@/data/demoData';

const ICON_MAP = { Waves, Mountain, Wind };

const COLOR_CLASSES = {
  blue: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  amber: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  stone: 'bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 border-stone-200 dark:border-slate-700',
};

export default function DisasterInformation() {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState('flood');
  const [habitations, setHabitations] = useState([]);

  // Active Role Scope Tracking
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

  // Load Real-time Habitations from backend to bind live exposure metrics
  useEffect(() => {
    async function loadData() {
      try {
        let res = await fetch('/api/habitations').catch(() => null);
        if (!res || !res.ok) {
          res = await fetch('http://127.0.0.1:8000/api/habitations');
        }
        if (res && res.ok) {
          const data = await res.json();
          setHabitations(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('Habitations telemetry fetch failed', e);
      }
    }
    loadData();
  }, []);

  // Filter scoped habitations
  const scopedHabitations = useMemo(() => {
    if (districtScope) {
      return habitations.filter(
        (h) => h.district?.toLowerCase() === districtScope.toLowerCase()
      );
    }
    return habitations;
  }, [habitations, districtScope]);

  // Compute live exposure statistics per hazard
  const hazardStats = useMemo(() => {
    const stats = {};
    scopedHabitations.forEach((h) => {
      const hz = h.hazard || 'Unknown';
      if (!stats[hz]) {
        stats[hz] = { total: 0, critical: 0, population: 0 };
      }
      stats[hz].total += 1;
      if (h.risk_level === 'Critical' || h.risk_level === 'High') {
        stats[hz].critical += 1;
      }
      stats[hz].population += Number(h.population || 0);
    });
    return stats;
  }, [scopedHabitations]);

  const filtered = DISASTER_INFO.filter(
    (d) =>
      d.name.toLowerCase().includes(query.toLowerCase()) ||
      d.causes.some((c) => c.toLowerCase().includes(query.toLowerCase())) ||
      d.impact.some((c) => c.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <PageHeader
            title="Multi-Hazard Intelligence Hub"
            subtitle="Typology profiles, dynamic exposure telemetry, and standard operating evacuation protocols"
            icon={Waves}
          />
        </div>

        {/* Scope Status Banner */}
        <div
          className={`rounded-xl p-3.5 mb-6 flex items-center justify-between border shadow-sm ${
            isNational
              ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300'
              : 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
            <Layers className="w-4 h-4 flex-shrink-0 text-slate-500 dark:text-slate-400" />
            <span>
              {isNational ? (
                <>Synthesizing national hazard typology across <strong>All-India NDMA Baselines</strong>.</>
              ) : (
                <>
                  Operational Context: <strong>District Magistrate {districtScope}</strong>. Hazard exposure calculated for local settlements.
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

        {/* Search Input */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search hazards, triggers, vulnerability indicators or evacuation guidelines..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition"
          />
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {filtered.map((disaster) => {
            const Icon = ICON_MAP[disaster.icon] || Waves;
            const isOpen = expanded === disaster.id;
            const liveStat = hazardStats[disaster.name] || { total: 0, critical: 0, population: 0 };

            return (
              <div
                key={disaster.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 shadow-sm overflow-hidden ${
                  isOpen
                    ? 'border-blue-300 dark:border-blue-700 ring-1 ring-blue-100 dark:ring-blue-950'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : disaster.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition text-left"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-sm ${COLOR_CLASSES[disaster.color]}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{disaster.name}</h3>
                        {liveStat.total > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 px-2.5 py-0.5 rounded-full font-mono">
                            <Radio className="w-3 h-3 text-rose-500 animate-pulse" />
                            {liveStat.total} {liveStat.total === 1 ? 'Settlement' : 'Settlements'} Exposed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {liveStat.total > 0
                          ? `Live Population at Risk: ${liveStat.population.toLocaleString()} citizens`
                          : 'Causes, risk indicators, impact, and standard mitigation'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 border-t border-slate-100 dark:border-slate-800 pt-5 space-y-6">
                    {/* Live Tactical Handoff Strip */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                          Active Telemetry: <strong>{liveStat.total}</strong> settlements indexed with{' '}
                          <strong>{liveStat.critical}</strong> critical red zones under this hazard.
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          to="/risk-map"
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95"
                        >
                          <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          Plot on Risk Map
                        </Link>
                        <Link
                          to="/habitations"
                          className="inline-flex items-center gap-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95"
                        >
                          Inspect Directory
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>

                    {/* Standard Matrix Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      <div className="bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
                          Trigger Causes
                        </h4>
                        <ul className="space-y-1.5">
                          {disaster.causes.map((c, i) => (
                            <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                              <span className="text-blue-500 font-bold">•</span>
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
                          Risk Indicators
                        </h4>
                        <ul className="space-y-1.5">
                          {disaster.riskIndicators.map((c, i) => (
                            <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                              <span className="text-amber-500 font-bold">•</span>
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
                          Vulnerable Topography
                        </h4>
                        <ul className="space-y-1.5">
                          {disaster.vulnerableAreas.map((c, i) => (
                            <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                              <span className="text-rose-500 font-bold">•</span>
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* NDMA Evacuation & Mitigation SOPs */}
                    <div className="bg-blue-50/40 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800 rounded-xl p-4">
                      <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                        NDMA 3-Phase Evacuation & Mitigation Protocol
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-blue-100 dark:border-blue-900/50">
                          <span className="font-bold text-blue-700 dark:text-blue-400 block mb-1">Phase 1: Detection & Alert</span>
                          <p className="text-slate-600 dark:text-slate-400">
                            Automated rainfall surge trigger & CAP cell broadcast dispatch to local telecom towers.
                          </p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-blue-100 dark:border-blue-900/50">
                          <span className="font-bold text-amber-700 dark:text-amber-400 block mb-1">Phase 2: Corridor Clearance</span>
                          <p className="text-slate-600 dark:text-slate-400">
                            SDRF transport mobilization along pre-calculated all-weather road evacuation routes.
                          </p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-blue-100 dark:border-blue-900/50">
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-1">Phase 3: Shelter Intake</span>
                          <p className="text-slate-600 dark:text-slate-400">
                            Transfer to designated relief hubs with verified drinking water, backup generators, and medical triage.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}