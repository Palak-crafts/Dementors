import React, { useEffect, useState } from 'react';

export default function LiveRiskInspector({ habitation, onClose }) {
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!habitation) return;

    // Support both latitude/longitude properties and coords array [lat, lng]
    const lat = habitation.latitude ?? (habitation.coords ? habitation.coords[0] : null);
    const lon = habitation.longitude ?? (habitation.coords ? habitation.coords[1] : null);

    if (!lat || !lon) return;

    setLoading(true);
    fetch(`http://localhost:8000/api/disaster/live-multi-hazard/${lat}/${lon}`)
      .then(res => res.json())
      .then(data => {
        setTelemetry(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading live multi-hazard telemetry:", err);
        setLoading(false);
      });
  }, [habitation]);

  if (!habitation) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-slate-900 text-slate-100 shadow-2xl border-l border-slate-700 z-50 flex flex-col p-6 overflow-y-auto">
      <div className="flex justify-between items-center pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white">{habitation.name}</h2>
          <p className="text-xs text-slate-400">District: {habitation.district}</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-xl font-bold px-2">✕</button>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-amber-400 space-y-2 font-mono text-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
          <p>Querying Open-Meteo & USGS APIs...</p>
          <p className="text-xs text-slate-500">Running Random Forest ML Inference</p>
        </div>
      ) : telemetry && telemetry.ml_ai_engine ? (
        <div className="mt-6 space-y-6">
          {/* AI Prediction Box */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 shadow">
            <div className="text-xs text-indigo-400 font-mono uppercase tracking-wider mb-1">AI Intelligence Core</div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">Predicted Threat Level:</span>
              <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${
                telemetry.ml_ai_engine.prediction === 'Critical' ? 'bg-red-600 text-white animate-pulse' :
                telemetry.ml_ai_engine.prediction === 'Moderate' ? 'bg-amber-500 text-slate-950' : 'bg-emerald-600 text-white'
              }`}>
                {telemetry.ml_ai_engine.prediction}
              </span>
            </div>
            <div className="mt-3 text-xs text-slate-400 font-mono">
              Engine: {telemetry.ml_ai_engine.model}
            </div>
          </div>

          {/* Evaluated Threats */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase font-mono">Active Hazard Flags</h3>
            {telemetry.evaluated_threats?.map((threat, idx) => (
              <div key={idx} className="bg-red-950/40 border border-red-900/60 text-red-200 text-xs px-3 py-2 rounded flex items-center space-x-2">
                <span>⚠️</span>
                <span>{threat}</span>
              </div>
            ))}
          </div>

          {/* Live Telemetry Breakdown */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase font-mono">Live Ingested Telemetry</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-800/80 p-3 rounded">
                <div className="text-slate-400">Rainfall / Precip</div>
                <div className="text-sm font-bold text-white mt-1">{telemetry.live_telemetry?.weather?.precipitation ?? 0} mm</div>
              </div>
              <div className="bg-slate-800/80 p-3 rounded">
                <div className="text-slate-400">Wind Speed</div>
                <div className="text-sm font-bold text-white mt-1">{telemetry.live_telemetry?.weather?.wind_speed_10m ?? 0} km/h</div>
              </div>
              <div className="bg-slate-800/80 p-3 rounded">
                <div className="text-slate-400">River Discharge</div>
                <div className="text-sm font-bold text-white mt-1">{telemetry.live_telemetry?.river_discharge_m3s ?? 0} m³/s</div>
              </div>
              <div className="bg-slate-800/80 p-3 rounded">
                <div className="text-slate-400">Seismic Mag</div>
                <div className="text-sm font-bold text-white mt-1">{telemetry.live_telemetry?.earthquake_magnitude ?? 0} Mw</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-red-400 text-xs mt-6">Failed to retrieve telemetry stream from backend server.</div>
      )}
    </div>
  );
}