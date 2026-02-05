<template>
  <div class="color-legend" :class="{ 'left': side === 'left', 'right': side === 'right' }">
    <div class="legend-container">
      <div class="legend-header">
        <span class="legend-title">{{ selectedIndicator?.title || 'Indicator' }} <v-tooltip
            style="display: inline-block; max-width: 500px;" location="bottom" :text="selectedIndicator['tooltip-info']">
            <template v-slot:activator="{ props }">
              <v-icon v-bind="props" icon="mdi-information-outline" size="18" class="mx-2"></v-icon>
            </template>
          </v-tooltip></span>      </div>
      <div class="legend-content">

        <table class="legend-icon-container" v-if="legendTitle.min !== '' && legendTitle.max !== '' && legendTitle.mid !== ''">
          <tbody>
            
            <tr>
              <td style="text-align: left;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%;"
                  :style="{ backgroundColor: maxColor }"></span>
              </td>
              <td style="text-align: center;">
                <span style="display: inline-block; width: 16px; height: 16px; border-radius: 50%;"
                  :style="{ backgroundColor: maxColor }"></span>
              </td>
              <td style="text-align: right;"><span
                  style="display: inline-block; width: 32px; height: 32px; border-radius: 50%;"
                  :style="{ backgroundColor: maxColor }" /></td>
            </tr>
            <tr class="legend-labels">
              <td style="text-align: left;">
                <span class="min-label">
                  {{ legendTitle.min ?? '' }}
                </span>
              </td>
              <td style="text-align: center;">
                <span class="mid-label">
                  {{ legendTitle.mid.toLocaleString() ?? '' }}
                </span>
              </td>
              <td style="text-align: right;">
                <span class="max-label">
                  {{ legendTitle.max ?? '' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="secondaryTitleColumn" class="gradient-bar" :style="{ width:'100%',
            background: `linear-gradient(to right, ${minColor}, ${maxColor})`
          }"></div>
        <table v-if="secondaryTitleColumn" class="legend-icon-container">
          <tbody>
            <tr class="legend-labels">
              <td style="text-align: left;"><span class="min-label">{{ secondaryTitle?.min.toLocaleString() }}</span>
              </td>
              <td style="text-align: center;"><span class="mid-label">{{ secondaryTitle?.mid.toLocaleString() }}</span></td>
              <td style="text-align: right;"><span class="max-label">{{ secondaryTitle?.max.toLocaleString() }}</span>
              </td>
            </tr>
          </tbody>

        </table>
        <div v-show="source" class="data-source">Data Source: <a :href="source?.url" target="_blank">{{ source?.text }} <v-icon icon="mdi-open-in-new" size="12" /></a></div>
      </div>
      
    </div>
   
  </div>
</template>

<script lang="ts" setup>
import { computed, inject } from 'vue'
import { useIndicatorLevelStore } from '../stores/indicatorLevelStore'
//import { storeToRefs } from 'pinia'
const arrasBranding = inject('arrasBranding') as any

interface Props {
  selectedIndicator: any
  side: 'left' | 'right'
}

const props = defineProps<Props>()
const indicatorLevelStore = useIndicatorLevelStore(props.side as 'left' | 'right')
// const currentIndicator = computed(() => {
//   return indicatorLevelStore.getCurrentIndicator()
// })

// const titleColumn = computed(() => {
//   return props.selectedIndicator?.legend?.['title-column'] as 'count' | 'pop' | 'pct' | undefined;
// })
const mainConfig = inject('mainConfig') as any;

const source = computed(() => mainConfig?.data_sources?.[props.selectedIndicator?.data_source as string] as any);
const secondaryTitleColumn = computed(() => {
  return props.selectedIndicator?.legend?.['secondary-title-column'] as 'count' | 'pop' | 'pct' | undefined;
})

const secondaryTitle = computed(() => {
  const titleTemplate = props.selectedIndicator?.legend?.['secondary-title'] as string | undefined;
  const minValue = indicatorLevelStore.getMinValue(secondaryTitleColumn.value as 'count' | 'pop' | 'pct') ?? 0;
  const maxValue = indicatorLevelStore.getMaxValue(secondaryTitleColumn.value as 'count' | 'pop' | 'pct') ?? 0;
  const midValue = ((minValue + maxValue) / 2).toFixed(0).toLocaleString();

  if (titleTemplate) {
    return {
      min: titleTemplate.replace(`{{${secondaryTitleColumn.value}}}`, minValue.toLocaleString() ?? '0'),
      mid: titleTemplate.replace(`{{${secondaryTitleColumn.value}}}`, midValue.toLocaleString() ?? '0'),
      max: titleTemplate.replace(`{{${secondaryTitleColumn.value}}}`, maxValue.toLocaleString() ?? '0'),
    }
  }
  return {
    min: '',
    mid: '',
    max: '',
  }
})


const legendTitle = computed(() => {
  const titleTemplate = props.selectedIndicator?.legend?.['title'] as string | undefined;
  const titleColumn = props.selectedIndicator?.legend?.['title-column'] as 'count' | 'pop' | 'pct' | undefined;
  const minValue = indicatorLevelStore.getMinValue(titleColumn as 'count' | 'pop' | 'pct') ?? 0;
  const maxValue = indicatorLevelStore.getMaxValue(titleColumn as 'count' | 'pop' | 'pct') ?? 0;
  const midValue = +(((minValue + maxValue) / 2).toFixed(0)).toLocaleString();


  if (titleTemplate) {
    return {
      min: titleTemplate.replace(`{{${titleColumn}}}`, minValue.toLocaleString() ?? '0'),
      mid: titleTemplate.replace(`{{${titleColumn}}}`, midValue.toLocaleString() ?? '0'),
      max: titleTemplate.replace(`{{${titleColumn}}}`, maxValue.toLocaleString() ?? '0'),
    }
  }
  return {
    min: '',
    mid: '',
    max: '',
  }
})

const maxColor = computed(() => {
  const colorName = props.selectedIndicator?.style?.max?.color;
  if (colorName) {
    return arrasBranding.colors[colorName];
  }
  return '#000000';
})

const minColor = computed(() => {
  const colorName = props.selectedIndicator?.style?.min?.color;
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

.color-legend.left {
  /* right: 20px; */
}

.color-legend.right {
  right: 0px;
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
  padding: 2px 12px;
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
  /* display: flex;
  justify-content: space-between; */
  /* align-items: center; */
  font-size: 10px;
  color: #6b7280;
  font-weight: bold;
}

.min-label,
.max-label {}

.legend-container {
  width: 50%;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e5e7eb;
  border-radius: 5px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.legend-icon-container {
  width: 100%;
  margin: 0 auto;
  border-collapse: collapse;
  vertical-align: middle;
  justify-content: space-around;
}

.legend-icon-container td {
  padding: 0;
  margin: 0;
  width: 33%;
  text-align: center;
}

.data-source {
  font-size: 12px;
  color: #6b7280;
  font-weight: bold;
  margin-top: 4px;
  font-style: italic;
}

.gradient-bar {
  width: 100%;
  height: 12px;
  border-radius: 2px;
  border: 1px solid #d1d5db;
}
</style>
