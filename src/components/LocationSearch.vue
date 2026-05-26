<template>
  <section class="location-search-container" aria-labelledby="location-search-label">
    <span id="location-search-label" class="sr-only">Search for a location on the map</span>
    <arcgis-search id="search-component" aria-labelledby="location-search-label"></arcgis-search>
  </section>
</template>
<script lang="ts" setup>
import { inject, onMounted } from 'vue'
//import { ARCGIS_TOKEN } from '../utils/arcgisConfig'
import type { Emitter } from 'mitt'
import "@arcgis/map-components/components/arcgis-search";
const emitter = inject('mitt') as Emitter<any>;
onMounted(() => {
 const searchComponent = document.getElementById('search-component')

 searchComponent?.addEventListener('arcgisSelectResult', (event: any) => {
  const latitude = event.detail.result.feature.geometry.latitude
  const longitude = event.detail.result.feature.geometry.longitude
 
  emitter.emit('location-selected', {
    coordinates: [longitude, latitude],
    text: event.detail.result.feature.text
  })
 })
 searchComponent?.addEventListener('arcgisSelectCancel', () => {
  emitter.emit('location-cleared')
 })
})

</script>

<style scoped>
.location-search-container {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  min-width: 150px;
  z-index: 9999;
  padding: 0;
}

.location-search-container:focus-within {
  min-width: 250px;
}


.location-search-input {
  flex: 1;
}

.location-search-input :deep(.v-field) {
  font-size: 14px;
  min-height: 40px;
}

.clear-btn {
  flex-shrink: 0;
}
</style>

<style>
.location-search-input .v-field__input {
  padding: 0px;
  padding-inline: 0px;
}
</style>