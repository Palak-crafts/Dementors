import { RotateCcw } from "lucide-react";

export default function FilterPanel({ filters = {}, onChange, districts = [] }) {
  const handleChange = (key, value) => {
    onChange((prev) => {
      const next = { ...prev };
      if (!value || value === "all") {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  };

  const handleClear = () => {
    // Preserve district scope if set by role
    const currentDistrict = filters.district;
    onChange(currentDistrict ? { district: currentDistrict } : {});
  };

  return (
    <div className="space-y-3.5 text-xs">
      {/* District Filter */}
      <div>
        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
          District
        </label>
        <select
          value={filters.district || "all"}
          onChange={(e) => handleChange("district", e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
        >
          <option value="all">All Districts</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Hazard Type */}
      <div>
        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
          Hazard Type
        </label>
        <select
          value={filters.hazard || "all"}
          onChange={(e) => handleChange("hazard", e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
        >
          <option value="all">All Hazards</option>
          <option value="Flood">Flood</option>
          <option value="Landslide">Landslide</option>
          <option value="Cyclone">Cyclone</option>
          <option value="Earthquake">Earthquake</option>
          <option value="Cloudburst">Cloudburst</option>
          <option value="Erosion">Erosion</option>
          <option value="Drought">Drought</option>
        </select>
      </div>

      {/* Risk Level */}
      <div>
        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
          Risk Level
        </label>
        <select
          value={filters.riskLevel || "all"}
          onChange={(e) => handleChange("riskLevel", e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
        >
          <option value="all">All Levels</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Vulnerability */}
      <div>
        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
          Vulnerability
        </label>
        <select
          value={filters.vulnerability || "all"}
          onChange={(e) => handleChange("vulnerability", e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
        >
          <option value="all">All Levels</option>
          <option value="Very High">Very High</option>
          <option value="High">High</option>
          <option value="Moderate">Moderate</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Capacity Status */}
      <div>
        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
          Capacity Status
        </label>
        <select
          value={filters.capacityStatus || "all"}
          onChange={(e) => handleChange("capacityStatus", e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
        >
          <option value="all">All Statuses</option>
          <option value="Critical Deficit">Critical Deficit</option>
          <option value="Deficit">Deficit</option>
          <option value="Warning">Warning</option>
          <option value="Adequate">Adequate</option>
        </select>
      </div>

      {/* Relocation Priority */}
      <div>
        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
          Relocation Priority
        </label>
        <select
          value={filters.priority || "all"}
          onChange={(e) => handleChange("priority", e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
        >
          <option value="all">All Priorities</option>
          <option value="Immediate">Immediate</option>
          <option value="Short-Term">Short-Term</option>
          <option value="Planned">Planned</option>
          <option value="Monitor">Monitor</option>
        </select>
      </div>

      {/* Clear Filters Button */}
      <button
        onClick={handleClear}
        className="w-full mt-4 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-medium text-xs shadow-sm"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Clear Filters
      </button>
    </div>
  );
}