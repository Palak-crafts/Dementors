import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  GeoJSON,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import LiveRiskInspector from "./LiveRiskInspector";

// Fix default Leaflet marker icon asset path issues
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
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
      box-shadow: ${
        isSelected
          ? "0 0 10px rgba(0,0,0,0.8)"
          : "0 0 4px rgba(0,0,0,0.5)"
      };
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

// Recenter map when center/zoom changes
function MapRecenter({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || map.getZoom(), {
        animate: true,
      });
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
  const [indiaBoundary, setIndiaBoundary] = useState(null);

  // Load India's administrative boundary GeoJSON
  useEffect(() => {
    let mounted = true;

    fetch("/geojson/india-states-simplified.geojson")
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load India boundary: ${response.status}`
          );
        }
        return response.json();
      })
      .then((data) => {
        if (mounted) {
          setIndiaBoundary(data);
        }
      })
      .catch((error) => {
        console.error("India boundary could not be loaded:", error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Get marker color based on risk level
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

  // Helper to extract coordinates safely from backend object format
  const getCoords = (item) => {
    if (item.coords && Array.isArray(item.coords)) return item.coords;
    if (item.latitude !== undefined && item.longitude !== undefined) {
      return [parseFloat(item.latitude), parseFloat(item.longitude)];
    }
    return null;
  };

  // Find nearest safe shelter for selected habitation
  let evacuationRoute = null;
  let targetShelter = null;
  const selCoords = selectedHabitation ? getCoords(selectedHabitation) : null;

  if (selectedHabitation && selCoords && relocationSites.length > 0) {
    let minD = Infinity;

    for (const site of relocationSites) {
      const siteCoords = getCoords(site);
      if (!siteCoords || !siteCoords[0] || !siteCoords[1]) {
        continue;
      }

      const d =
        Math.pow(selCoords[0] - siteCoords[0], 2) +
        Math.pow(selCoords[1] - siteCoords[1], 2);

      if (d < minD) {
        minD = d;
        targetShelter = { ...site, coords: siteCoords };
      }
    }

    if (targetShelter) {
      evacuationRoute = [selCoords, targetShelter.coords];
    }
  }

  return (
    <div
      style={{
        height,
        width: "100%",
      }}
      className="rounded-xl overflow-hidden border border-slate-200 relative z-0"
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{
          height: "100%",
          width: "100%",
        }}
        scrollWheelZoom={true}
      >
        {/* Recenter map when location/zoom changes */}
        <MapRecenter center={center} zoom={zoom} />

        {/* OpenStreetMap base map */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* INDIA ADMINISTRATIVE BOUNDARY */}
        {indiaBoundary && (
          <GeoJSON
            data={indiaBoundary}
            style={{
              color: "#1e3a8a",
              weight: 2.5,
              opacity: 1,
              fillOpacity: 0,
            }}
          />
        )}

        {/* EVACUATION ROUTE */}
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

        {/* HABITATION MARKERS */}
        {habitations.map((hab) => {
          const coords = getCoords(hab);
          if (!coords || !coords[0] || !coords[1]) {
            return null;
          }

          const isSelected = selectedHabitation?.id === hab.id;
          const riskLevel = hab.risk_level || hab.riskLevel || "Low";
          const riskScore = hab.risk_score || hab.riskScore || 0;

          return (
            <Marker
              key={`hab-${hab.id}`}
              position={coords}
              icon={createCustomIcon(getRiskColor(riskLevel), isSelected)}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  onSelectHabitation(isSelected ? null : { ...hab, coords });
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
                      style={{ backgroundColor: getRiskColor(riskLevel) }}
                    >
                      {riskLevel}
                    </span>
                  </div>

                  <p className="text-slate-500 text-[11px] mb-2">
                    {hab.district} District
                  </p>

                  <div className="space-y-1 bg-slate-50 p-2 rounded border border-slate-100 mb-2.5 text-slate-700">
                    <p>
                      <strong>Risk Score:</strong> {Number(riskScore).toFixed(1)} / 100
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

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onSelectHabitation(isSelected ? null : { ...hab, coords });
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

        {/* SAFE SHELTER MARKERS */}
        {showSites &&
          relocationSites.map((site) => {
            const coords = getCoords(site);
            if (!coords || !coords[0] || !coords[1]) {
              return null;
            }

            return (
              <Marker key={`site-${site.id}`} position={coords} icon={shelterIcon}>
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

      {/* Live Risk Inspector Drawer / Side Panel */}
      <LiveRiskInspector
        habitation={selectedHabitation}
        onClose={() => onSelectHabitation(null)}
      />
    </div>
  );
}