import type { GeoJSONSource, Map } from 'maplibre-gl'

export const SEARCH_LOCATION_SOURCE = 'arras-search-location'
export const SEARCH_LOCATION_LAYER = 'arras-search-location-pin'

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

const clickHandlersAttached = new WeakMap<Map, boolean>()

export function ensureSearchLocationLayer(map: Map, onPinClick: () => void) {
  if (!map.getSource(SEARCH_LOCATION_SOURCE)) {
    map.addSource(SEARCH_LOCATION_SOURCE, {
      type: 'geojson',
      data: EMPTY,
    })
    map.addLayer({
      id: SEARCH_LOCATION_LAYER,
      type: 'circle',
      source: SEARCH_LOCATION_SOURCE,
      paint: {
        'circle-radius': 9,
        'circle-color': '#dc2626',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    })
  }
  if (!clickHandlersAttached.get(map)) {
    map.on('click', SEARCH_LOCATION_LAYER, (e) => {
      e.originalEvent?.stopPropagation()
      onPinClick()
    })
    map.on('mouseenter', SEARCH_LOCATION_LAYER, () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', SEARCH_LOCATION_LAYER, () => {
      map.getCanvas().style.cursor = ''
    })
    clickHandlersAttached.set(map, true)
  }
}

/**
 * Show or hide the search-result point. Uses a map layer (not HTML markers) so
 * the pin shares the WebGL transform with the basemap—DOM markers can drift,
 * especially in split view and when zoomed out.
 */
export function setSearchLocationCoordinates(
  map: Map | null,
  coords: [number, number] | null,
  onPinClick?: () => void,
) {
  if (!map) return

  if (!coords) {
    const src = map.getSource(SEARCH_LOCATION_SOURCE) as GeoJSONSource | undefined
    if (src) src.setData(EMPTY)
    return
  }

  if (!onPinClick) return
  ensureSearchLocationLayer(map, onPinClick)
  const src = map.getSource(SEARCH_LOCATION_SOURCE) as GeoJSONSource
  src.setData({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: coords },
      },
    ],
  })
}
