<template>
  <v-select :model-value="indicatorStore?.getCurrentIndicator()"
    :items="themeLevelStore?.getAllCurrentThemeIndicators() || []" return-object item-title="short_title" density="compact"
    variant="outlined" width="100%" hide-details class="indicator-select"
    @update:model-value="handleIndicatorChange">
    <template #prepend-item>
      <v-list-subheader v-if="themeTitle" class="indicator-select-theme-title text-high-emphasis font-weight-bold">
        {{ themeTitle }}
      </v-list-subheader>
      <v-divider v-if="themeTitle" class="mb-1" />
    </template>
    <template v-slot:item="{ props: itemProps }">
      <v-list-item class="indicator-select-item" v-bind="itemProps"></v-list-item>
    </template>
  </v-select>
</template>

<script lang="ts" setup>
import { inject, computed } from 'vue'
import useIndicatorLevelStore from '../stores/indicatorLevelStore'
import { useThemeLevelStore } from '../stores/themeLevelStore'

interface Props {
  side: 'left' | 'right'
}

const props = defineProps<Props>()
const indicatorStore = useIndicatorLevelStore(props.side)
const themeLevelStore = useThemeLevelStore()
const emitter = inject('mitt') as any

const themeTitle = computed(() => themeLevelStore.getMainConfigForCurrentTheme()?.title ?? '')

const handleIndicatorChange = async (indicator: any) => {
  await indicatorStore.setIndicatorFromIndicatorShortName(indicator.short_name, emitter)

  // Emit event for parent component
  //emit('indicatorChanged', [indicator, props.side])
  emitter?.emit(`indicator-changed-${props.side}`, indicator, props.side)
}

// Expose the indicatorStore so parent can access it if needed
defineExpose({
  indicatorStore
})
</script>
<style>
.v-overlay__content.v-select__content {
  width: 37%;
}
.v-list-item-title{
  white-space: normal;
  line-height: 1em;
  padding: 4px;
  /* border-bottom: 1px solid lightgray; */
}

</style>
<style scoped>

.indicator-select {

  /* margin: 0 auto; */
  border-bottom: 1px solid #e5e7eb;
  background: rgba(249, 250, 251, 0.8);
  border-radius: 8px 8px 0 0;
  height: 6em;
}

.right .indicator-select {

  left: calc(50% + 5px);
  /* margin: 0 auto; */
  border-bottom: 1px solid #e5e7eb;
  background: rgba(249, 250, 251, 0.8);
  border-radius: 8px 8px 0 0;
}

.indicator-select :deep(.v-field) {
  font-size: 11px;
  min-height: 32px;
}

.indicator-select :deep(.v-field__input) {
  overflow: clip;
  padding: 4px 8px;
  height: 100%;
  max-height: 96px;
  
}

.indicator-select :deep(.v-select__selection) {
  font-size: 14px;
  line-height: 1.2em;
  text-overflow: ellipsis;
  white-space: normal;
}

.indicator-select :deep(.v-select__selection-text) {
  text-overflow: ellipsis;
    white-space: normal;
    font-size: small;
    line-height: 1em;
    font-weight: bold;
}

.indicator-select-item {
  font-size: 11px;
  min-height: 32px;
  overflow: visible;
  text-overflow: ellipsis;
  white-space: normal !important;
  border-bottom: 1px solid lightgray;
}

.indicator-select-theme-title {
  font-size: 0.95rem;
  line-height: 1.35;
  white-space: normal;
  height: auto !important;
  padding-top: 8px;
}
</style>
