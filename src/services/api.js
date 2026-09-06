// ============================================================
// API Service — FastAPI Backend
// ============================================================

const API_BASE = '/api';

// ------------------------------------------------------------
// Helper
// ------------------------------------------------------------

async function apiRequest(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`);

  if (!response.ok) {
    throw new Error(
      `API Error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}


// ============================================================
// HABITATIONS
// ============================================================

export async function fetchHabitations() {
  return apiRequest('/habitations');
}


export async function fetchHabitationById(id) {
  return apiRequest(`/habitations/${id}`);
}


// ============================================================
// RISK MAP
// ============================================================

export async function fetchRiskMapData() {
  return apiRequest('/gis/habitations');
}


// ============================================================
// RELOCATION PRIORITY
// ============================================================

export async function fetchRelocationPriority() {
  return apiRequest('/relocation-priority');
}


// ============================================================
// RELOCATION SITES
// ============================================================

export async function fetchRelocationSites() {
  return apiRequest('/relocation-sites');
}


// ============================================================
// GIS — HABITATIONS
// ============================================================

export async function fetchGISHabitations() {
  return apiRequest('/gis/habitations');
}


// ============================================================
// GIS — RELOCATION SITES
// ============================================================

export async function fetchGISRelocationSites() {
  return apiRequest('/gis/relocation-sites');
}


// ============================================================
// ANALYTICS
// ============================================================

export async function fetchAnalytics() {
  return apiRequest('/analytics');
}


// ============================================================
// DEMO MODE
// ============================================================

// Backend is now the primary data source.
export const DEMO_MODE = false;