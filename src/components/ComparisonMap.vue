<template>
  <div
    id="comparison-container"
    :class="[
      orientation === 'top-bottom' ? 'orientation-top-bottom' : 'orientation-left-right',
      viewMode === 'solo-left' ? 'solo-left' : viewMode === 'solo-right' ? 'solo-right' : 'sideBySide'
    ]"
  >
    <!-- Solo / Back button (visible in solo mode) -->
    <div v-if="viewMode !== 'side-by-side'" class="solo-exit-wrap">
      <v-btn
        size="small"
        variant="tonal"
        color="primary"
        class="solo-exit-btn"
        @click="viewMode = 'side-by-side'; nextTick(resizeMaps)"
      >
        <v-icon start icon="mdi-arrow-left-right" />
        Back to side-by-side
      </v-btn>
    </div>

    <!-- Left side -->
    <div v-show="viewMode !== 'solo-right'" class="side-panel left-panel">
      <div ref="mapContainerLeft" class="map-container left"> </div>
      <div
        v-if="leftPanel.visible && leftPanel.properties"
        class="feature-panel left-feature-panel"
        :class="{ 'feature-panel--frozen': leftPanel.frozen }"
      >
        <button class="feature-panel-close" @click="clearFeaturePanel('left')">x</button>
        <Popup :properties="leftPanel.properties" side="left" :compact="true" />
      </div>
      <v-btn
        v-if="viewMode === 'side-by-side'"
        size="small"
        variant="tonal"
        class="solo-btn solo-btn-left"
        @click="viewMode = 'solo-left'; nextTick(resizeMaps)"
      >
        <v-icon start icon="mdi-fullscreen" size="18" />
        Solo
      </v-btn>
      <TimelineVisualization side="left" />
      <ColorLegend
        v-if="leftIndicatorLevelStore.getCurrentIndicator() && leftIndicatorLevelStore.getCurrentIndicator()?.geolevel === 'area'"
        :selectedIndicator="leftIndicatorLevelStore.getCurrentIndicator()"
        side="left"
      />
      <PointLegend
        v-else-if="leftIndicatorLevelStore.getCurrentIndicator() && leftIndicatorLevelStore.getCurrentIndicator()?.geolevel === 'point'"
        :selected-indicator="leftIndicatorLevelStore.getCurrentIndicator()"
        side="left"
      />
    </div>

    <!-- Right side -->
    <div v-show="viewMode !== 'solo-left'" class="side-panel right-panel">
      <div ref="mapContainerRight" class="map-container right"> </div>
      <div
        v-if="rightPanel.visible && rightPanel.properties"
        class="feature-panel right-feature-panel"
        :class="{ 'feature-panel--frozen': rightPanel.frozen }"
      >
        <button class="feature-panel-close" @click="clearFeaturePanel('right')">x</button>
        <Popup :properties="rightPanel.properties" side="right" :compact="true" />
      </div>
      <v-btn
        v-if="viewMode === 'side-by-side'"
        size="small"
        variant="tonal"
        class="solo-btn solo-btn-right"
        @click="viewMode = 'solo-right'; nextTick(resizeMaps)"
      >
        <v-icon start icon="mdi-fullscreen" size="18" />
        Solo
      </v-btn>
      <TimelineVisualization side="right" />
      <ColorLegend
        v-if="rightIndicatorLevelStore.getCurrentIndicator() && rightIndicatorLevelStore.getCurrentIndicator()?.geolevel === 'area'"
        :selectedIndicator="rightIndicatorLevelStore.getCurrentIndicator()"
        side="right"
      />
      <PointLegend
        v-else-if="rightIndicatorLevelStore.getCurrentIndicator() && rightIndicatorLevelStore.getCurrentIndicator()?.geolevel === 'point'"
        :selected-indicator="rightIndicatorLevelStore.getCurrentIndicator()"
        side="right"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css';
import { inject, nextTick, onBeforeMount, onMounted, onUnmounted, ref, watch } from 'vue'
import Compare from '../assets/maplibre-gl-compare.js'
import '../assets/maplibre-gl-compare.css';
import TimelineVisualization from './TimelineVisualization.vue'
import Popup from './Popup.vue'
import { useIndicatorLevelStore } from '../stores/indicatorLevelStore'
import { useThemeLevelStore } from '../stores/themeLevelStore'
import ColorLegend from './ColorLegend.vue'
import PointLegend from './PointLegend.vue'
import type { Emitter } from 'mitt'
import createArcGISStyle from '../utils/createArcGISStyle'
import { createMapRequestTransform } from '../utils/mapRequestTransform'
import { setSearchLocationCoordinates } from '../utils/searchLocationLayer'
import { MIN_ZOOM_ON_LOCATION, LOCATION_FLY_DURATION_MS, RIGHT_PADDING_RATIO } from '../constants'
import type { LngLatBoundsLike } from 'maplibre-gl'

const mapContainerLeft = ref<HTMLElement>()
let leftMap: maplibregl.Map | null = null

const mapContainerRight = ref<HTMLElement>()
let rightMap: maplibregl.Map | null = null

const comparisonContainer = '#comparison-container'

// Define props with default values if needed
const props = defineProps<{
  _center: [number, number]
  _zoom: number
  _type: string
  _orientation?: 'left-right' | 'top-bottom'
}>()

const orientation = ref<'left-right' | 'top-bottom'>()
orientation.value = window.innerWidth > window.innerHeight ? 'left-right' : 'top-bottom'

const leftIndicatorLevelStore = useIndicatorLevelStore('left')
const rightIndicatorLevelStore = useIndicatorLevelStore('right')
const themeLevelStore = useThemeLevelStore()

const emitter = inject('mitt') as Emitter<any>
const leftPanel = ref<{ visible: boolean; frozen: boolean; properties: any | null }>({
  visible: false,
  frozen: false,
  properties: null,
})
const rightPanel = ref<{ visible: boolean; frozen: boolean; properties: any | null }>({
  visible: false,
  frozen: false,
  properties: null,
})

let _compare: Compare | null = null

const viewMode = ref<'side-by-side' | 'solo-left' | 'solo-right'>('side-by-side')

function resizeMaps() {
  leftMap?.resize()
  rightMap?.resize()
  emitter.emit('resize-maps')

}

// Watch for theme changes and reinitialize indicators
watch(() => themeLevelStore.currentThemeShortName, async (newThemeShortName, oldThemeShortName) => {
  // Only reinitialize if theme actually changed and maps are loaded
  if (newThemeShortName && newThemeShortName !== oldThemeShortName && leftMap && rightMap && leftMap.loaded() && rightMap.loaded()) {
    const currentThemeIndicators = themeLevelStore.getAllCurrentThemeIndicators()
    if (currentThemeIndicators) {
      // Get default indicators for each side
      const defaultForLeft = currentThemeIndicators.find(
        (i: any) => 'left'.includes(i.default as string)
      )
      const defaultForRight = currentThemeIndicators.find(
        (i: any) => 'right'.includes(i.default as string)
      )

      // Reinitialize indicators
      if (defaultForLeft) {
        await leftIndicatorLevelStore.setIndicatorFromIndicatorShortName(defaultForLeft.short_name, emitter)
      }
      if (defaultForRight) {
        await rightIndicatorLevelStore.setIndicatorFromIndicatorShortName(defaultForRight.short_name, emitter)
      }
    }
  }
})
let hasHash = false
onBeforeMount(() => {
  hasHash = Boolean(window?.location?.hash && window.location.hash !== '')
})
onMounted(async () => {
  // Ensure the container is properly initialized
  const sitePath = inject('sitePath') as string;
  const transformRequest = createMapRequestTransform(sitePath);

  const leftStyle = await createArcGISStyle(sitePath) as any
  const rightStyle = await createArcGISStyle(sitePath) as any

  if (mapContainerLeft.value) {
    leftMap = new maplibregl.Map({
      container: mapContainerLeft.value,
      style: leftStyle,
      center: props._center,
      zoom: props._zoom,
      hash: true,
      attributionControl: false,
      transformRequest
    })
    .addControl(new maplibregl.NavigationControl({
        visualizePitch: true,
        visualizeRoll: true,
        showZoom: true,
        showCompass: true
      }))
      .addControl(new maplibregl.AttributionControl({
        compact: true
      }), 'top-right');

    leftIndicatorLevelStore.initializeMap(leftMap, emitter)
  }

  if (mapContainerRight.value) {
    rightMap = new maplibregl.Map({
      container: mapContainerRight.value,
      style: rightStyle,
      center: props._center,
      zoom: props._zoom,
      attributionControl: false,
      hash: true,
      canvasContextAttributes: { antialias: true },
      transformRequest
    })
      .addControl(new maplibregl.NavigationControl({
        visualizePitch: true,
        visualizeRoll: true,
        showZoom: true,
        showCompass: true
      }))
      .addControl(new maplibregl.AttributionControl({
        compact: true
      }), 'top-right');

    rightIndicatorLevelStore.initializeMap(rightMap, emitter)
  }

  if (leftMap && rightMap) {
    const position = orientation.value === 'top-bottom' ? ['bottom', 'left'] : ['top', 'horiz-center'] as any
    const compareOpts = {
      orientation: orientation.value,
      type: 'sideBySide',
      position,
      showTypeToggle: false
    } as { orientation?: string; type?: string; position?: string[]; showTypeToggle?: boolean }
    _compare = new Compare(leftMap, rightMap, comparisonContainer, compareOpts);
    // bbox as [west, south, east, north] using LngLatBoundsLike
    let bbox = new maplibregl.LngLatBounds([-81.63527368320112, 34.24556219498636], [-80.2, 35.22169720245361]) as LngLatBoundsLike;

    if (!hasHash) {
      leftMap.fitBounds(bbox, {
        padding: { top: 10, bottom: 25, left: 5, right: 5 },
        animate: false
      });
      rightMap.fitBounds(bbox, {
        padding: { top: 10, bottom: 25, left: 5, right: 5 },
        animate: false
      });
    }

    //Maybe redundant to use on instead of once, but just in case
    _compare.onBoth('idle', () => {
      const loadingEl = document.getElementById('loading');
      if (loadingEl && loadingEl.style) {
        loadingEl.style.display = 'none';
      }
      Array.from(document.getElementsByClassName('maplibregl-ctrl-attrib') as unknown as HTMLElement[]).forEach((element) => {
        element.classList.remove('maplibregl-compact-show');
      });
    });
  }

  // Listen for location selection events
  emitter.on('location-selected', handleLocationSelected)
  emitter.on('location-cleared', handleLocationCleared)
  emitter.on('popup-left-changed', updateLeftPanel)
  emitter.on('popup-right-changed', updateRightPanel)
})

function updateLeftPanel(payload: { visible: boolean; frozen: boolean; properties: any | null }) {
  leftPanel.value = payload
}

function updateRightPanel(payload: { visible: boolean; frozen: boolean; properties: any | null }) {
  rightPanel.value = payload
}

function clearFeaturePanel(side: 'left' | 'right') {
  emitter.emit(`popup-${side}-clear`)
}

/**
 * Padding for flyTo when centering on a search result.
 * In side-by-side mode each map is only ~half the viewport; using full window
 * width for `padding.right` breaks camera fitting and misplaces/clips markers.
 */
function getLocationFlyPadding(map: maplibregl.Map): maplibregl.PaddingOptions {
  if (viewMode.value === 'side-by-side') {
    const el = map.getContainer()
    const w = el.clientWidth
    const h = el.clientHeight
    // Symmetric inset only: asymmetric padding shifts the camera center while
    // @mapbox/mapbox-gl-sync-move copies getCenter()/zoom between maps, which
    // interact badly and skew HTML markers vs tiles in split view.
    const inset = Math.max(16, Math.round(Math.min(w, h) * 0.06))
    return { top: inset, bottom: inset, left: inset, right: inset }
  }
  return {
    top: 0,
    bottom: 0,
    left: 0,
    right: window.innerWidth * RIGHT_PADDING_RATIO,
  }
}

/** One map must drive flyTo; sync-move will mirror pose to the other map. */
function getPrimaryMapForSearch(): maplibregl.Map | null {
  if (viewMode.value === 'solo-right' && rightMap) return rightMap
  return leftMap
}

function handleLocationCleared() {
  setSearchLocationCoordinates(leftMap, null)
  setSearchLocationCoordinates(rightMap, null)
}

/**
 * Handles location selection from search
 * Centers both maps on the selected coordinates
 */
const handleLocationSelected = (data: { coordinates: [number, number], text: string }) => {
  const [lng, lat] = data.coordinates
  const coords: [number, number] = [lng, lat]

  // GeoJSON circle layers (not HTML markers) so pins use the same WebGL
  // transform as the basemap—avoids DOM/canvas drift in split view.
  setSearchLocationCoordinates(leftMap, coords, handleLocationCleared)
  setSearchLocationCoordinates(rightMap, coords, handleLocationCleared)

  const primary = getPrimaryMapForSearch()
  if (primary) {
    primary.resize()
    if (primary === leftMap) rightMap?.resize()
    else leftMap?.resize()

    const targetZoom = Math.max(primary.getZoom(), MIN_ZOOM_ON_LOCATION)
    primary.flyTo({
      center: [lng, lat],
      zoom: targetZoom,
      duration: LOCATION_FLY_DURATION_MS,
      padding: getLocationFlyPadding(primary),
    })

    primary.once('moveend', () => {
      leftMap?.resize()
      rightMap?.resize()
    })
  }
}

onUnmounted(() => {
  emitter.off('location-selected', handleLocationSelected)
  emitter.off('location-cleared', handleLocationCleared)
  emitter.off('popup-left-changed', updateLeftPanel)
  emitter.off('popup-right-changed', updateRightPanel)

  handleLocationCleared()

  leftIndicatorLevelStore.removeMap()
  rightIndicatorLevelStore.removeMap()
  if (leftMap) {
    leftMap.remove()
  }
  if (rightMap) {
    rightMap.remove()
  }
  const containerEl = document.querySelector(comparisonContainer) as HTMLElement | null
  containerEl?.classList.remove('orientation-left-right', 'orientation-top-bottom')
})
</script>
<style>
.left-panel .maplibregl-ctrl-top-right {
  display: none;
}

#comparison-container.solo-left .left-panel .maplibregl-ctrl-top-right{
  display: inline-block;
}

.maplibregl-ctrl-bottom-right {
  bottom: 150px;
}

.maplibregl-ctrl-top-right {
  right: 5px;
  left: unset;
}

.slider .maplibregl-ctrl-top-right {
  right: 5px;
  left: unset;
}

.maplibregl-ctrl-group button+button {
  border-radius: 0;
}

.orientation-top-bottom .maplibregl-ctrl-bottom-right {
  bottom: 100px;
}

.map-container {
  position: absolute;
  top: 0;
  bottom: 0;
  cursor: crosshair !important;
  width: 100%;
  transition: width .3s ease-in-out;
  overflow: visible;
}

.map-container.right {
  border-left: 2px solid black;
}

.slider .map-container.right .timeline-header {
  right: 0;
  left: unset;
}

.slider .map-container.right .timeline-visualization {
  right: 20px;
  left: unset;
}

.map-container.collapsed {
  width: calc(100% + 8px);
}

.maplibregl-canvas-container.maplibregl-interactive {
  cursor: crosshair !important;
}

#comparison-container {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  overflow: hidden;
}

/* Side panels: side-by-side each 50%; solo mode one panel full width */
.side-panel {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50%;
}
.side-panel.left-panel {
  left: 0;
}
.side-panel.right-panel {
  left: 50%;
}
.side-panel .map-container {
  width: 100%;
}

#comparison-container.solo-left .right-panel {
  display: none;
}
#comparison-container.solo-left .left-panel {
  width: 100%;
}

#comparison-container.sideBySide .legend-container {
  width: auto;
} 

#comparison-container.solo-right .left-panel {
  display: none;
}
#comparison-container.solo-right .right-panel {
  width: 100%;
  left: 0;
}

/* Solo button on each side */
.solo-btn {
  top: 4rem;
  position: absolute;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.solo-btn-left {
  /* top: 8px; */
  right: 8px;
}
.solo-btn-right {
  /* top: 8px; */
  left: 8px;
}

.feature-panel {
  position: absolute;
  left: 5px;
  bottom: 9rem;
  width: 24%;
  /* min-width: 240px; */
  max-width: 340px;
  z-index: 1001;
  pointer-events: all;
  background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(2px);
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  padding: 8px 8px 6px;
}

.feature-panel--frozen {
  border: 1px solid #008fff;
}

.feature-panel-close {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-weight: 600;
  line-height: 20px;
  text-align: center;
  font-size: 14px;
}

.feature-panel-close:hover {
  background: #f1f5f9;
  color: #1e293b;
}

/* Back to side-by-side (solo mode only) */
.solo-exit-wrap {
  position: absolute;
  top: 4rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
}
.solo-exit-btn {
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

#comparison-container.orientation-top-bottom.sideBySide .side-panel {
  width: 100%;
  height: 50%;
  left: 0;
}
#comparison-container.orientation-top-bottom.sideBySide .side-panel.right-panel {
  top: 50%;
  left: 0;
}
#comparison-container.orientation-top-bottom.sideBySide .map-container {
  position: relative;
  height: 100%;
  width: 100%;
  border-left: none;
}

#comparison-container.orientation-top-bottom.sideBySide .map-container.right {
  border-top: 1px solid black;
}

#comparison-container.orientation-top-bottom.solo-left .left-panel,
#comparison-container.orientation-top-bottom.solo-right .right-panel {
  height: 100%;
}

#comparison-container.orientation-top-bottom .maplibregl-ctrl-bottom-right {
  bottom: 120px;
}

.orientation-top-bottom .timeline-visualization-container.left .timeline-header {
  right: 0px;
  top: 0px;

}

.orientation-top-bottom .timeline-visualization-container.left .timeline-visualization {
  top: 50%;
  bottom: auto;
  transform: translateY(-100%);
  right: 0px;
  left: unset;
  zoom: .7;
}

.orientation-top-bottom .timeline-visualization-container .timeline-header {
  right: 0px;
  top: 50%;
  left: unset;
  width: 100%;
  flex-direction: row-reverse;
}

.orientation-top-bottom .indicator-select {
  margin: unset;
  width: 100%;

}

.orientation-top-bottom .timeline-visualization-container.right .timeline-visualization {
  zoom: .7;
  left: unset;
  right: 5px;
  bottom: 5px !important;
}

.maplibregl-compare-type-toggle.top {
  top: 42px !important;
}

.color-legend, .point-legend {
  left: 50%;
  right: auto;
  transform: translateX(-50%);
} 

.solo-right .color-legend, .solo-right .point-legend,
.solo-left .color-legend, .solo-left .point-legend {
  left: 125px;
  right: auto;
  transform: none;
  max-width: 30%;
}
</style>
