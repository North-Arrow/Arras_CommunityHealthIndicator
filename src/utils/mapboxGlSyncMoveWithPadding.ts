import type { Map } from 'maplibre-gl'

/**
 * Keeps follower maps aligned with the master on every `move` event.
 * Fork of @mapbox/mapbox-gl-sync-move that also copies {@link Map.getPadding}
 * (and roll). Without this, after a padded flyTo the master keeps edge insets
 * while the follower still has default padding, so projections diverge and
 * HTML markers drift west of the basemap (worse when zoomed out).
 */
function moveToMapPosition(master: Map, clones: Map[]) {
  const center = master.getCenter()
  const zoom = master.getZoom()
  const bearing = master.getBearing()
  const pitch = master.getPitch()
  const roll = master.getRoll()
  const p = master.getPadding()
  const padding = {
    top: p.top ?? 0,
    bottom: p.bottom ?? 0,
    left: p.left ?? 0,
    right: p.right ?? 0,
  }

  clones.forEach((clone) => {
    clone.jumpTo({
      center,
      zoom,
      bearing,
      pitch,
      roll,
      padding,
    })
  })
}

export default function mapboxGlSyncMoveWithPadding(...mapArgs: Map[]) {
  const maps: Map[] = [...mapArgs]

  const fns = maps.map((map, index) =>
    sync.bind(null, map, maps.filter((_, i) => i !== index)),
  )

  function on() {
    maps.forEach((map, index) => {
      map.on('move', fns[index]!)
    })
  }

  function off() {
    maps.forEach((map, index) => {
      map.off('move', fns[index]!)
    })
  }

  function sync(master: Map, clones: Map[]) {
    off()
    moveToMapPosition(master, clones)
    on()
  }

  on()

  return function clear() {
    off()
  }
}
