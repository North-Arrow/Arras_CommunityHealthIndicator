<template>
  <div class="color-legend" :class="{ 'left': side === 'left', 'right': side === 'right' }">
    <div class="legend-container">
      <div class="legend-header">
        <span class="legend-title">{{ selectedIndicator?.title || 'Indicator' }} 
          <v-tooltip
          close-on-content-click
            style="display: inline-block;"
            :max-width="500"
            :location="side === 'left' ? 'bottom start' : 'bottom end'"
            :text="selectedIndicator['tooltip-info']">
            <template v-slot:activator="{ props }">
              <v-icon v-bind="props" icon="mdi-information-outline" size="18" class="mx-2"></v-icon>
            </template>
          </v-tooltip></span>
      </div>
      <div class="legend-content">
        <div class="legend-gradient">
          <div class="gradient-bar" :style="{
            background: `linear-gradient(to right, ${minColor}, ${maxColor})`
          }"></div>
        </div>
        <div class="legend-labels">
          <span class="min-label">{{ legendTitle.min }}</span>
          <span class="max-label">{{ legendTitle.max }}</span>
        </div>

        <div class="extra-layer" v-if="extraLayerHtml" v-html="extraLayerHtml"></div>
        <div v-show="source" class="data-source">Data Source: <a :href="source?.url" target="_blank">{{ source?.text }}
            <v-icon icon="mdi-open-in-new" size="12" /></a></div>

      </div>

    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { inject } from 'vue'
import { useIndicatorLevelStore } from '../stores/indicatorLevelStore'

const arrasBranding = inject('arrasBranding') as any
interface Props {
  selectedIndicator: any
  side: 'left' | 'right'
}

const props = defineProps<Props>()

const indicatorLevelStore = useIndicatorLevelStore(props.side)
const mainConfig = inject('mainConfig') as any;
const source = computed(() => mainConfig?.data_sources?.[props.selectedIndicator?.data_source as string] as any);

const extraLayerHtml = computed(() => {
  return props.selectedIndicator?.legend?.extra_layers?.html;
});

const legendTitle = computed(() => {
  const titleTemplate = props.selectedIndicator?.legend?.title as string | undefined;
  const titleColumn = props.selectedIndicator?.legend?.['title-column'] as 'count' | 'pop' | 'pct' | undefined;
  const minValue = indicatorLevelStore.getMinValue(titleColumn as 'count' | 'pop' | 'pct') ?? 0;
  const maxValue = indicatorLevelStore.getMaxValue(titleColumn as 'count' | 'pop' | 'pct') ?? 0;

  if (titleTemplate) {
    return {
      min: titleTemplate.replace(`{{${titleColumn}}}`, (+minValue).toLocaleString()),
      max: titleTemplate.replace(`{{${titleColumn}}}`, (+maxValue).toLocaleString())
    }
  }
  return {
    min: '',
    mid: '',
    max: ''
  }
})

const minColor = computed(() => {
  const colorName = props.selectedIndicator?.style?.min?.color;
  if (colorName) {
    return arrasBranding.colors[colorName];
  }
  return '#f2f0f7';
})

const maxColor = computed(() => {
  const colorName = props.selectedIndicator?.style?.max?.color;
  if (colorName) {
    return arrasBranding.colors[colorName];
  }
  return '#000000';
})
</script>

<style scoped>
.color-legend {
  position: absolute;
  top: 5px;
  width: 50%;
  height: 80px;

  z-index: 1000;
  user-select: none;
}



.legend-header {
  padding: 8px 12px 4px;
  border-bottom: 1px solid #e5e7eb;
  background: rgba(249, 250, 251, 0.8);
  border-radius: 5px 5px 0 0;
}

.legend-title {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.legend-content {
  padding: 8px 12px;
}

.legend-gradient {
  /* margin-bottom: 6px; */
}

.gradient-bar {
  width: 100%;
  height: 12px;
  border-radius: 2px;
  border: 1px solid #d1d5db;
}

.legend-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.min-label,
.max-label {
  font-size: 10px;
  color: #6b7280;
  font-weight: 500;
}

.legend-container {
  width: 50%;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e5e7eb;
  border-radius: 5px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.data-source {
  font-size: 12px;
  color: #6b7280;
  font-weight: bold;
  margin-top: 4px;
  font-style: italic;
}
</style>
<style>
.protected-lands-swatch {
  width: 10px;
  height: 10px;
  border: 2px solid #f00;
  display: inline-block;
  margin-left: 4px;
  vertical-align: middle;
}
</style>
