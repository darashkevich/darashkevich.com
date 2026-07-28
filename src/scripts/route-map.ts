type RouteMapPayload = {
  routes: GeoJSON.FeatureCollection;
  airports: GeoJSON.FeatureCollection;
  provider: string;
  key: string;
};

const DEFAULT_VIEW = { center: [12, 28] as [number, number], zoom: 1.35 };

function readPayload(): RouteMapPayload | null {
  const dataEl = document.getElementById('route-map-data');
  if (!dataEl?.textContent) return null;
  return JSON.parse(dataEl.textContent) as RouteMapPayload;
}

function getFullscreenElement(): Element | null {
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

/** Lazy-loads MapLibre when the route map enters (or nears) the viewport. */
export async function initRouteMap() {
  const shell = document.getElementById('route-map-shell');
  const stage = document.querySelector<HTMLElement>('[data-route-network]');
  const container = document.getElementById('route-map');
  const payload = readPayload();
  const fullscreenButton = stage?.querySelector<HTMLButtonElement>(
    '[data-route-zoom="fullscreen"]'
  );

  if (!shell || !stage || !container || !payload) return;
  if (shell.dataset.mapReady === '1') return;
  shell.dataset.mapReady = '1';

  const [{ default: maplibregl }, theme] = await Promise.all([
    import('maplibre-gl'),
    import('../lib/route-map-theme'),
    import('maplibre-gl/dist/maplibre-gl.css'),
  ]);

  const {
    applyPortfolioBasemapTheme,
    buildGraticuleGeoJSON,
    cssVar,
    paintRouteOverlays,
    resolveBasemapStyle,
    ROUTE_MAP_OVERLAY_LAYERS
  } = theme;

  const mapData = payload;

  const map = new maplibregl.Map({
    container,
    style: resolveBasemapStyle(mapData.provider, mapData.key),
    center: DEFAULT_VIEW.center,
    zoom: DEFAULT_VIEW.zoom,
    minZoom: 1,
    maxZoom: 14,
    attributionControl: {},
    cooperativeGestures: false
  });

  let styleFonts = ['Open Sans Bold'];

  function refreshMapTheme() {
    applyPortfolioBasemapTheme(map);
    paintRouteOverlays(map);
  }

  function addOverlayLayers() {
    if (!map.getSource('routes')) {
      map.addSource('routes', { type: 'geojson', data: mapData.routes });
    }
    if (!map.getSource('airports')) {
      map.addSource('airports', { type: 'geojson', data: mapData.airports });
    }
    if (!map.getSource('graticule')) {
      map.addSource('graticule', { type: 'geojson', data: buildGraticuleGeoJSON() });
    }

    if (!map.getLayer('route-graticule')) {
      map.addLayer({
        id: 'route-graticule',
        type: 'line',
        source: 'graticule',
        paint: {
          'line-color': cssVar('--color-border', 'rgba(167, 176, 192, 0.2)'),
          'line-opacity': 0.12,
          'line-width': 0.6
        }
      });
    }

    if (!map.getLayer('route-lines')) {
      map.addLayer({
        id: 'route-lines',
        type: 'line',
        source: 'routes',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': cssVar('--color-primary', '#7DD3FC'),
          'line-opacity': 0.5,
          'line-width': 1.15
        }
      });
    }

    if (!map.getLayer('airport-dot-halo')) {
      map.addLayer({
        id: 'airport-dot-halo',
        type: 'circle',
        source: 'airports',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1,
            ['case', ['get', 'hub'], 3.6, 2.6],
            5,
            ['case', ['get', 'hub'], 5.2, 3.6],
            9,
            ['case', ['get', 'hub'], 7, 5]
          ],
          'circle-color': cssVar('--color-primary', '#7DD3FC'),
          'circle-opacity': 0.14,
          'circle-blur': 0.85
        }
      });
    }

    if (!map.getLayer('airport-dots')) {
      map.addLayer({
        id: 'airport-dots',
        type: 'circle',
        source: 'airports',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1,
            ['case', ['get', 'hub'], 2.2, 1.5],
            5,
            ['case', ['get', 'hub'], 3.1, 2.1],
            9,
            ['case', ['get', 'hub'], 4.2, 2.8]
          ],
          'circle-color': '#ffffff',
          'circle-stroke-width': 0.75,
          'circle-stroke-color': cssVar('--color-primary', '#7DD3FC'),
          'circle-opacity': 0.92,
          'circle-stroke-opacity': 0.88
        }
      });
    }

    if (!map.getLayer('airport-labels')) {
      map.addLayer({
        id: 'airport-labels',
        type: 'symbol',
        source: 'airports',
        layout: {
          'text-field': ['get', 'code'],
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1,
            ['case', ['get', 'hub'], 10, 0],
            4,
            ['case', ['get', 'hub'], 11, 9],
            7,
            11
          ],
          'text-font': styleFonts,
          'text-offset': [0, -1.2],
          'text-anchor': 'bottom',
          'text-allow-overlap': false,
          'icon-allow-overlap': true
        },
        paint: {
          'text-color': cssVar('--color-text', '#F5F7FA'),
          'text-halo-color': cssVar('--color-bg-deep', '#161A22'),
          'text-halo-width': 1.25,
          'text-opacity': 0.88
        }
      });
    }

    for (const layerId of ROUTE_MAP_OVERLAY_LAYERS) {
      if (map.getLayer(layerId)) {
        map.moveLayer(layerId);
      }
    }

    paintRouteOverlays(map);
  }

  map.on('style.load', () => {
    const symbolLayer = map
      .getStyle()
      .layers?.find((layer) => layer.type === 'symbol' && 'text-font' in (layer.layout ?? {}));
    styleFonts =
      (symbolLayer?.layout as { 'text-font'?: string[] } | undefined)?.['text-font'] ??
      styleFonts;

    applyPortfolioBasemapTheme(map);
    addOverlayLayers();
    map.resize();
  });

  map.on('load', () => {
    addOverlayLayers();
    map.resize();
  });

  function updateFullscreenButton() {
    if (!fullscreenButton) return;
    const active = getFullscreenElement() === shell;
    fullscreenButton.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
    fullscreenButton.setAttribute('title', active ? 'Exit fullscreen' : 'Fullscreen');
    const enterIcon = fullscreenButton.querySelector('.route-fullscreen-enter');
    const exitIcon = fullscreenButton.querySelector('.route-fullscreen-exit');
    if (enterIcon) enterIcon.toggleAttribute('hidden', active);
    if (exitIcon) exitIcon.toggleAttribute('hidden', !active);
    map.resize();
  }

  async function toggleFullscreen() {
    if (!shell) return;
    const doc = document as Document & { webkitExitFullscreen?: () => void };
    const target = shell as HTMLElement & { webkitRequestFullscreen?: () => void };
    try {
      if (getFullscreenElement() === shell) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else doc.webkitExitFullscreen?.();
      } else if (target.requestFullscreen) {
        await target.requestFullscreen();
      } else {
        target.webkitRequestFullscreen?.();
      }
    } catch {
      /* Fullscreen may be blocked by browser policy. */
    }
  }

  stage.querySelectorAll('[data-route-zoom]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.getAttribute('data-route-zoom');
      if (action === 'in') map.zoomIn({ duration: 250 });
      if (action === 'out') map.zoomOut({ duration: 250 });
      if (action === 'reset') {
        map.flyTo({ ...DEFAULT_VIEW, duration: 500 });
      }
      if (action === 'fullscreen') toggleFullscreen();
    });
  });

  document.addEventListener('fullscreenchange', updateFullscreenButton);
  document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
  window.addEventListener('resize', () => map.resize());

  const themeObserver = new MutationObserver(() => refreshMapTheme());
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme']
  });

  updateFullscreenButton();
}

function scheduleRouteMapInit() {
  const shell = document.getElementById('route-map-shell');
  if (!shell) return;

  const boot = () => {
    void initRouteMap();
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          io.disconnect();
          boot();
        }
      },
      { rootMargin: '240px 0px' }
    );
    io.observe(shell);
    return;
  }

  boot();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleRouteMapInit);
} else {
  scheduleRouteMapInit();
}
