import type { Map as MaplibreMap, StyleSpecification } from 'maplibre-gl';

export function cssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export type BasemapStyleInput = string | StyleSpecification;

/** Public MapLibre demo style — allowed by netlify.toml CSP when no tile API key is set. */
export const DEMOTILES_STYLE_URL = 'https://demotiles.maplibre.org/style.json';

export function buildMinimalBasemapStyle(): StyleSpecification {
  return {
    version: 8,
    name: 'portfolio-minimal',
    sources: {},
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': cssVar('--color-bg-deep', '#161A22')
        }
      }
    ]
  };
}

export function resolveBasemapStyle(provider: string, key: string): BasemapStyleInput {
  // No key: demotiles (countries) — allowed by netlify.toml CSP.
  if (!key) return DEMOTILES_STYLE_URL;

  if (provider === 'stadia') {
    return `https://tiles.stadiamaps.com/styles/stamen_toner_background.json?api_key=${encodeURIComponent(key)}`;
  }

  return `https://api.maptiler.com/maps/backdrop-dark/style.json?key=${encodeURIComponent(key)}`;
}

export function buildGraticuleGeoJSON(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];

  for (let lat = -60; lat <= 60; lat += 30) {
    features.push({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [-180, lat],
          [180, lat]
        ]
      }
    });
  }

  for (let lon = -150; lon < 180; lon += 30) {
    features.push({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [lon, -60],
          [lon, 60]
        ]
      }
    });
  }

  return { type: 'FeatureCollection', features };
}

export const ROUTE_MAP_OVERLAY_LAYERS = new Set([
  'route-graticule',
  'route-lines',
  'airport-dot-halo',
  'airport-dots',
  'airport-labels'
]);

function isRouteOverlayLayer(id: string): boolean {
  return ROUTE_MAP_OVERLAY_LAYERS.has(id);
}

function showLayer(map: MaplibreMap, id: string) {
  try {
    map.setLayoutProperty(id, 'visibility', 'visible');
  } catch {
    /* Layer may not support visibility. */
  }
}

function hideLayer(map: MaplibreMap, id: string) {
  try {
    map.setLayoutProperty(id, 'visibility', 'none');
  } catch {
    /* Layer may not support visibility. */
  }
}

function paintLayer(map: MaplibreMap, id: string, property: string, value: unknown) {
  try {
    map.setPaintProperty(id, property, value);
  } catch {
    /* Layer may not expose this paint property. */
  }
}

function isLandFillLayer(id: string): boolean {
  return /^(land|landcover|landuse|continent|earth|countries)/i.test(id) || id === 'Land';
}

function isWaterFillLayer(id: string): boolean {
  return /water|ocean|sea|marine/i.test(id);
}

function isBoundaryLineLayer(id: string): boolean {
  return /boundary|border|country|disputed|admin/i.test(id);
}

function isRoadOrDetailLayer(id: string): boolean {
  return /road|street|highway|path|rail|bridge|tunnel|building|poi|place|label|name|transit|aeroway|park|forest|grass|ice|glacier|hillshade|mountain|contour/i.test(
    id
  );
}

export function applyPortfolioBasemapTheme(map: MaplibreMap) {
  const bgDeep = cssVar('--color-bg-deep', '#161A22');
  const landFill = cssVar('--color-text-muted', '#A7B0C0');
  const border = cssVar('--color-border', 'rgba(167, 176, 192, 0.2)');

  const layers = map.getStyle().layers ?? [];

  for (const layer of layers) {
    const { id, type } = layer;

    if (isRouteOverlayLayer(id)) continue;

    if (type === 'symbol' || isRoadOrDetailLayer(id)) {
      hideLayer(map, id);
      continue;
    }

    if (type === 'background') {
      paintLayer(map, id, 'background-color', bgDeep);
      continue;
    }

    if (type === 'fill') {
      if (isWaterFillLayer(id)) {
        paintLayer(map, id, 'fill-color', bgDeep);
        paintLayer(map, id, 'fill-opacity', 1);
        continue;
      }

      if (isLandFillLayer(id)) {
        paintLayer(map, id, 'fill-color', landFill);
        paintLayer(map, id, 'fill-opacity', 0.1);
        continue;
      }

      hideLayer(map, id);
      continue;
    }

    if (type === 'line') {
      if (isBoundaryLineLayer(id) && !/water|river|lake/i.test(id)) {
        paintLayer(map, id, 'line-color', border);
        paintLayer(map, id, 'line-opacity', 0.38);
        paintLayer(map, id, 'line-width', 0.7);
        continue;
      }

      hideLayer(map, id);
      continue;
    }

    if (type === 'fill-extrusion' || type === 'circle' || type === 'heatmap') {
      hideLayer(map, id);
    }
  }
}

export function paintRouteOverlays(map: MaplibreMap) {
  const primary = cssVar('--color-primary', '#7DD3FC');
  const primaryDark = cssVar('--color-primary-dark', '#60A5FA');
  const text = cssVar('--color-text', '#F5F7FA');
  const bgDeep = cssVar('--color-bg-deep', '#161A22');
  const border = cssVar('--color-border', 'rgba(167, 176, 192, 0.2)');

  for (const layerId of ROUTE_MAP_OVERLAY_LAYERS) {
    if (map.getLayer(layerId)) showLayer(map, layerId);
  }

  if (map.getLayer('route-graticule')) {
    paintLayer(map, 'route-graticule', 'line-color', border);
    paintLayer(map, 'route-graticule', 'line-opacity', 0.12);
    paintLayer(map, 'route-graticule', 'line-width', 0.6);
  }
  if (map.getLayer('route-lines')) {
    paintLayer(map, 'route-lines', 'line-color', primary);
    paintLayer(map, 'route-lines', 'line-opacity', 0.5);
    paintLayer(map, 'route-lines', 'line-width', 1.4);
  }
  if (map.getLayer('airport-dot-halo')) {
    paintLayer(map, 'airport-dot-halo', 'circle-color', primary);
    paintLayer(map, 'airport-dot-halo', 'circle-opacity', 0.14);
    paintLayer(map, 'airport-dot-halo', 'circle-blur', 0.85);
  }
  if (map.getLayer('airport-dots')) {
    paintLayer(map, 'airport-dots', 'circle-stroke-color', primary);
    paintLayer(map, 'airport-dots', 'circle-color', '#ffffff');
    paintLayer(map, 'airport-dots', 'circle-stroke-width', 0.75);
    paintLayer(map, 'airport-dots', 'circle-opacity', 0.92);
    paintLayer(map, 'airport-dots', 'circle-stroke-opacity', 0.88);
  }
  if (map.getLayer('airport-labels')) {
    paintLayer(map, 'airport-labels', 'text-color', text);
    paintLayer(map, 'airport-labels', 'text-halo-color', bgDeep);
    paintLayer(map, 'airport-labels', 'text-halo-width', 1.25);
    paintLayer(map, 'airport-labels', 'text-opacity', 0.88);
  }
}
