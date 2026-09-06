import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default leaflet marker icon asset path issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom circular pin icons for habitations
const createCustomIcon = (color, isSelected) =>
  L.divIcon({
    className: "custom-map-marker",
    html: `<div style="
      background-color: ${color};
      width: ${isSelected ? "18px" : "14px"};
      height: ${isSelected ? "18px" : "14px"};
      border-radius: 50%;
      border: ${isSelected ? "3px solid #1e293b" : "2px solid white"};
      box-shadow: ${isSelected ? "0 0 10px rgba(0,0,0,0.8)" : "0 0 4px rgba(0,0,0,0.5)"};
      transition: all 0.2s ease;
    "></div>`,
    iconSize: isSelected ? [18, 18] : [14, 14],
    iconAnchor: isSelected ? [9, 9] : [7, 7],
  });

// Distinct square pin icon for safe shelters
const shelterIcon = L.divIcon({
  className: "custom-shelter-marker",
  html: `<div style="
    background-color: #2563eb;
    width: 16px;
    height: 16px;
    border-radius: 3px;
    border: 2px solid white;
    box-shadow: 0 0 6px rgba(37,99,235,0.7);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function MapRecenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || map.getZoom(), { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

export default function MapView({
  habitations = [],
  relocationSites = [],
  selectedHabitation = null,
  onSelectHabitation = () => {},
  center = [22.5, 79.0],
  zoom = 5,
  height = "600px",
  showSites = true,
}) {
  const getRiskColor = (level) => {
    switch (level) {
      case "Critical":
        return "#dc2626";
      case "High":
        return "#ea580c";
      case "Moderate":
        return "#eab308";
      default:
        return "#16a34a";
    }
  };

  // Find nearest safe shelter coordinate for the selected habitation
  let evacuationRoute = null;
  let targetShelter = null;

  if (selectedHabitation && relocationSites.length > 0) {
    let minD = Infinity;
    for (const site of relocationSites) {
      if (!site.coords || !site.coords[0] || !site.coords[1]) continue;
      const d =
        Math.pow(selectedHabitation.coords[0] - site.coords[0], 2) +
        Math.pow(selectedHabitation.coords[1] - site.coords[1], 2);
      if (d < minD) {
        minD = d;
        targetShelter = site;
      }
    }

    if (targetShelter) {
      evacuationRoute = [selectedHabitation.coords, targetShelter.coords];
    }
  }

  return (
    <div
      style={{ height, width: "100%" }}
      className="rounded-xl overflow-hidden border border-slate-200 relative z-0"
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <MapRecenter center={center} zoom={zoom} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Dynamic Evacuation Route Polyline */}
        {evacuationRoute && (
          <Polyline
            positions={evacuationRoute}
            pathOptions={{
              color: "#dc2626",
              weight: 4,
              dashArray: "8, 8",
              opacity: 0.95,
            }}
          />
        )}

        {/* Habitation Markers */}
        {habitations.map((hab) => {
          if (!hab.coords || !hab.coords[0] || !hab.coords[1]) return null;
          const isSelected = selectedHabitation?.id === hab.id;
          return (
            <Marker
              key={`hab-${hab.id}`}
              position={hab.coords}
              icon={createCustomIcon(getRiskColor(hab.riskLevel), isSelected)}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  onSelectHabitation(isSelected ? null : hab);
                },
              }}
            >
              <Popup>
                <div className="text-xs p-1 min-w-[200px]">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-slate-900 text-sm">
                      {hab.name}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                      style={{ backgroundColor: getRiskColor(hab.riskLevel) }}
                    >
                      {hab.riskLevel}
                    </span>
                  </div>

                  <p className="text-slate-500 text-[11px] mb-2">{hab.district} District</p>

                  <div className="space-y-1 bg-slate-50 p-2 rounded border border-slate-100 mb-2.5 text-slate-700">
                    <p>
                      <strong>Risk Score:</strong> {Number(hab.riskScore || 0).toFixed(1)} / 100
                    </p>
                    <p>
                      <strong>Population:</strong> {hab.population?.toLocaleString()}
                    </p>
                    <p>
                      <strong>Hazard:</strong> {hab.hazard}
                    </p>
                    <p>
                      <strong>Relocation Priority:</strong> {hab.priority}
                    </p>
                  </div>

                  {/* Fully Interactive Toggle Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onSelectHabitation(isSelected ? null : hab);
                    }}
                    className={`w-full py-1.5 px-2 rounded-md text-xs font-bold transition shadow-sm flex items-center justify-center gap-1 ${
                      isSelected
                        ? "bg-rose-600 hover:bg-rose-700 text-white active:scale-95"
                        : "bg-blue-600 hover:bg-blue-700 text-white active:scale-95"
                    }`}
                  >
                    {isSelected ? "✕ Clear Evacuation Route" : "➔ Show Evacuation Route"}
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Safe Shelter Markers */}
        {showSites &&
          relocationSites.map((site) => {
            if (!site.coords || !site.coords[0] || !site.coords[1]) return null;
            return (
              <Marker
                key={`site-${site.id}`}
                position={site.coords}
                icon={shelterIcon}
              >
                <Popup>
                  <div className="text-xs p-1 min-w-[190px]">
                    <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 font-bold rounded text-[10px] mb-1">
                      DESIGNATED SAFE SHELTER
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">{site.name}</h4>
                    <p className="text-slate-500 mb-2">{site.district} District</p>
                    <div className="space-y-1 bg-blue-50/50 p-2 rounded border border-blue-100 text-slate-700">
                      <p>
                        <strong>Available Space:</strong> {site.available?.toLocaleString()}
                      </p>
                      <p>
                        <strong>Total Capacity:</strong> {site.capacity?.toLocaleString()}
                      </p>
                      <p>
                        <strong>Road Access:</strong> {site.accessibility}
                      </p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
}