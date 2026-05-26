<template>
  <div class="a11y-geo-list" :class="{ 'a11y-geo-list--right': side === 'right' }">
    <label :id="labelId" class="a11y-geo-list__label">Browse geographies ({{ side }} map)</label>
    <v-autocomplete
      :model-value="selectedGeoid"
      :items="items"
      item-title="title"
      item-value="geoid"
      density="compact"
      variant="outlined"
      hide-details
      clearable
      placeholder="Search by name"
      :aria-labelledby="labelId"
      @update:model-value="onSelect"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch, inject } from 'vue'
import { useIndicatorLevelStore } from '../stores/indicatorLevelStore'
import type { Emitter } from 'mitt'

const props = defineProps<{
  side: 'left' | 'right'
}>()

const emitter = inject('mitt') as Emitter<Record<string, unknown>>
const indicatorStore = useIndicatorLevelStore(props.side)
const selectedGeoid = ref<string | number | null>(null)
const labelId = `a11y-geo-label-${props.side}`

const items = computed(() => {
  const indicator = indicatorStore.getCurrentIndicator()
  const rows = indicator?.google_sheets_data?.data
  if (!rows) return []

  return rows
    .filter((row: Record<string, unknown>) => {
      const geoid = String(row.geoid ?? '').toLowerCase()
      const name = String(row.name ?? '').toLowerCase()
      const filtered = indicator?.timeline?.filterOut?.some((f: string) =>
        geoid.includes(f.toLowerCase()),
      )
      return !filtered && !name.includes('school district')
    })
    .map((row: Record<string, unknown>) => ({
      geoid: row.geoid,
      title: String(row.name ?? row.geoid ?? ''),
      properties: row,
    }))
    .sort((a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title))
})

watch(
  () => indicatorStore.getCurrentIndicator()?.short_name,
  () => {
    selectedGeoid.value = null
  },
)

function onSelect(geoid: string | number | null) {
  selectedGeoid.value = geoid
  if (geoid == null) {
    emitter.emit(`popup-${props.side}-clear`)
    return
  }
  const row = items.value.find((item: { geoid: unknown }) => String(item.geoid) === String(geoid))
  if (!row) return
  emitter.emit('a11y-select-feature', {
    side: props.side,
    properties: row.properties,
  })
}
</script>

<style scoped>
.a11y-geo-list {
  position: absolute;
  top: calc(var(--map-chrome-height, 5.5rem) + 4rem);
  left: 8px;
  z-index: 11;
  width: min(240px, 42vw);
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 6px 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.a11y-geo-list__label {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  margin-bottom: 4px;
  color: #1e293b;
}

.a11y-geo-list--right {
  left: auto;
  right: 8px;
}
</style>
