// MapToolkit API service — adds real geographic enrichment to selected nodes
const BASE = '/maptoolkit-api';
// Use Vite environment variables. Must be configured in .env
const API_KEY = import.meta.env.VITE_MAPTOOLKIT_API_KEY;

function url(path, params = {}) {
  // We use window.location.origin to support absolute URLs if needed (e.g. for images)
  const isBrowser = typeof window !== 'undefined';
  const baseUrl = isBrowser ? window.location.origin + BASE : BASE;
  const u = new URL(`${baseUrl}${path}`);
  u.searchParams.set('apikey', API_KEY);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  return u.toString();
}

/**
 * Reverse geocode lat/lng → address object
 * @param {{ lat: number, lng: number }} coords
 * @returns {Promise<{ city: string, country: string, display_name: string }>}
 */
export async function reverseGeocode({ lat, lng }) {
  const res = await fetch(url('/geocode/reverse', { lat, lon: lng, language: 'en' }));
  if (!res.ok) throw new Error(`Geocode failed: ${res.status}`);
  const data = await res.json();
  return {
    city: data.address?.city || data.address?.town || data.address?.village || data.address?.county || '—',
    country: data.address?.country || '—',
    countryCode: data.address?.country_code?.toUpperCase() || '—',
    state: data.address?.state || data.address?.['state_district'] || null,
    display_name: data.display_name || '—',
    postcode: data.address?.postcode || null,
  };
}

/**
 * Get elevation in metres at given points
 * @param {Array<{ lat: number, lng: number }>} points
 * @returns {Promise<number[]>}
 */
export async function getElevation(points) {
  const pointsJSON = JSON.stringify(points.map(p => [p.lat, p.lng]));
  const res = await fetch(url('/elevation', { points: pointsJSON }));
  if (!res.ok) throw new Error(`Elevation failed: ${res.status}`);
  return res.json(); // number[]
}

/**
 * Build a static map tile URL — use as <img src={...} />.
 * @param {{ lat: number, lng: number }} center
 * @param {{ zoom?: number, size?: string, maptype?: string }} opts
 */
export function staticMapUrl({ lat, lng }, { zoom = 9, size = '480x220', maptype = 'toursprung-terrain' } = {}) {
  return url('/staticmap', {
    center: `${lat},${lng}`,
    zoom,
    size,
    maptype,
    marker: `center:${lat},${lng}|shadow:false`,
    factor: '2', // retina
  });
}

/**
 * Geocode search — returns place suggestions for a text query
 * @param {string} query
 * @param {{ limit?: number }} opts
 */
export async function geocodeSearch(query, { limit = 5 } = {}) {
  const res = await fetch(url('/geocode/search', { q: query, language: 'en', limit }));
  if (!res.ok) throw new Error(`Geocode search failed: ${res.status}`);
  return res.json(); // array of results
}

/**
 * Haversine great-circle distance in km between two lat/lng points
 */
export function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sin2 =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(sin2), Math.sqrt(1 - sin2)));
}

/**
 * MapToolkit routing (fallback)
 */
export async function getRoute(from, to) {
  const points = `${from.lat},${from.lng}|${to.lat},${to.lng}`;
  const res = await fetch(url('/route', { points, routeType: 'car', language: 'en', format: 'json' }));
  if (!res.ok) throw new Error(`Route failed: ${res.status}`);
  const data = await res.json();
  const distance_km = Math.round((data.routes?.[0]?.distance || 0) / 1000);
  const duration_min = Math.round((data.routes?.[0]?.duration || 0) / 60);
  const h_km = haversineKm(from, to);
  const fiber_latency_ms = Math.round((h_km / 200) * 2);
  return { distance_km, duration_min, haversine_km: h_km, fiber_latency_ms };
}

// ── FastRouting (OSRM) ────────────────────────────────────────────────────
// Uses the OSRM public routing engine for precise road geometry + turn-by-turn.
// Returns null gracefully if the pair is non-routable (e.g. intercontinental).
const OSRM_BASE = 'https://router.project-osrm.org';

/**
 * Road route via FastRouting / OSRM engine.
 *
 * @param {{ lat: number, lng: number }} from
 * @param {{ lat: number, lng: number }} to
 * @returns {Promise<{
 *   distance_km: number,
 *   duration_min: number,
 *   haversine_km: number,
 *   fiber_latency_ms: number,
 *   geometry: GeoJSON.LineString | null,
 *   steps: Array<{ name: string, distance_m: number, duration_s: number, maneuver: string }>,
 *   routable: boolean,
 * } | null>}
 */
export async function fastRoute(from, to) {
  const h_km = haversineKm(from, to);
  const fiber_latency_ms = Math.round((h_km / 200) * 2);

  // Skip OSRM call for clearly intercontinental pairs (> 4 000 km straight-line)
  if (h_km > 4000) {
    return {
      distance_km: null,
      duration_min: null,
      haversine_km: h_km,
      fiber_latency_ms,
      geometry: null,
      steps: [],
      routable: false,
    };
  }

  try {
    const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const params = new URLSearchParams({
      geometries: 'geojson',
      overview: 'full',
      steps: 'true',
    });
    const res = await fetch(`${OSRM_BASE}/route/v1/driving/${coords}?${params}`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const data = await res.json();

    if (data.code !== 'Ok' || !data.routes?.length) {
      return { distance_km: null, duration_min: null, haversine_km: h_km, fiber_latency_ms, geometry: null, steps: [], routable: false };
    }

    const route = data.routes[0];
    const steps = (route.legs?.[0]?.steps || []).map(s => ({
      name: s.name || 'unnamed road',
      distance_m: Math.round(s.distance),
      duration_s: Math.round(s.duration),
      maneuver: s.maneuver?.type || 'continue',
    }));

    return {
      distance_km: Math.round(route.distance / 1000),
      duration_min: Math.round(route.duration / 60),
      haversine_km: h_km,
      fiber_latency_ms,
      geometry: route.geometry,  // GeoJSON LineString
      steps,
      routable: true,
    };
  } catch {
    return { distance_km: null, duration_min: null, haversine_km: h_km, fiber_latency_ms, geometry: null, steps: [], routable: false };
  }
}
