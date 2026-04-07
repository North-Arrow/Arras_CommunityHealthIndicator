<template>
    <div class="popup-container" :class="{ compact }">

        <div class="popup-header">
            <div class="header-content">
                <h3 class="feature-name" v-if="properties.name">{{ properties.name }}</h3>
                <h3 class="feature-name" v-else-if="properties.geoid">{{ properties.geoid }}</h3>
                <div v-if="properties.address" class="feature-address">{{ decodeURIComponent(properties.address) }}
                </div>
            </div>
            <div v-if="popupLegend.title || popupLegend.subtitle" class="popup-legend">
                <span v-if="popupLegend.title" class="popup-legend-title">{{ popupLegend.title }}</span>
                <span v-if="popupLegend.subtitle" class="popup-legend-subtitle">{{ popupLegend.subtitle }}</span>
            </div>

        </div>

        <div v-if="currentIndicator" class="stats-section">
            <div class="indicator-title">{{ (currentIndicator as any).short_title || currentIndicator.title }}</div>
            <div class="stats-grid">
                <div :class="{ 'stat-item': true, 'stat-item-empty': stat.isEmpty }" v-for="stat in stats"
                    :key="stat.year">
                    <div class="stat-label">{{ stat.year }}</div>
                    <div class="stat-value percentage">{{ stat.title }}</div>
                    <div class="stat-value count" v-if="!stat.pctOnly && stat.subtitle">{{ stat.subtitle }}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useIndicatorLevelStore } from '../stores/indicatorLevelStore'

const props = defineProps<{
    properties: any
    side: 'left' | 'right'
    compact?: boolean
}>()

const indicatorStore = useIndicatorLevelStore(props.side)
const currentIndicator = computed(() => indicatorStore.getCurrentIndicator())
//TODO: Probably don't need keyMapping...
const keyMapping = {
    "pct": "pct_",
    "count": "count_",
    "pop": "pop_"
}
const stats = computed(() => {
    const years = Array.from(new Set(Object.keys(props.properties).map(key => Number(key.toLowerCase().replace('count_', '').replace('pop_', '').replace('pct_', ''))).filter(year => !isNaN(+year))))

    const stats = [];
    const popup = currentIndicator?.value?.popup;
    for (const year of years) {
        const count = props.properties[keyMapping.count + year.toString()] || '';
        const pop = props.properties[keyMapping.pop + year.toString()] || '';
        const pct = props.properties[keyMapping.pct + year.toString()] || '';
        const isEmpty = count === '' && pop === '' && pct === '';
        const pctOnly = pct !== '' && count === '' && pop === '';
        stats.push({
            isEmpty: isEmpty,
            pctOnly: pctOnly,
            year: year,
            title: popup?.format?.title?.replace('{{count}}', (+count).toLocaleString()).replace('{{pop}}', (+pop).toLocaleString()).replace('{{pct}}', pct.toLocaleString()),
            subtitle: popup?.format?.subtitle?.replace('{{count}}', (+count).toLocaleString()).replace('{{pop}}', (+pop).toLocaleString()).replace('{{pct}}', pct.toLocaleString())
        })
    }
    return stats
})

function formatLegendText(template: string | null | undefined) {
    if (!template) return ''
    return template
        .replace(/\{\{pct\}\}/g, '%')
        .replace(/\{\{count\}\}/g, 'Amount')
        .replace(/\{\{pop\}\}/g, 'Total')
        .replace(/\{\{acres\}\}/g, 'Acres')
        .replace(/\s+/g, ' ')
        .trim()
}

const popupLegend = computed(() => {
    const popup = currentIndicator.value?.popup as any
    const provided = popup?.popup_legend
    if (provided) {
        return {
            title: provided.title || '',
            subtitle: provided.subtitle || ''
        }
    }
    return {
        title: formatLegendText(popup?.format?.title),
        subtitle: formatLegendText(popup?.format?.subtitle)
    }
})

</script>

<style scoped>
.popup-container {
    min-width: 0;
    max-width: none;
    width: 100%;
    padding: 0;
}

.popup-legend {
    display: flex;
    flex-direction: column;
    gap: 2px;
    line-height: 1rem;
    /* margin-bottom: 6px;
    padding-bottom: 4px; */
    border-bottom: 1px solid #e2e8f0;
}

.popup-legend-title {
    font-size: 0.72rem;
    font-weight: 700;
    color: #2563eb;
    line-height: 1rem;
}

.popup-legend-subtitle {
    font-size: 0.68rem;
    font-weight: 700;
    color: #059669;
    line-height: 1rem;
}

.popup-header {
    margin-bottom: 6px;
}

.header-content {
    min-width: 0;
}

.feature-name {
    font-size: 0.9rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
    line-height: 1.2;
    overflow-wrap: anywhere;
}

.feature-address {
    font-size: 0.75rem;
    color: #64748b;
    line-height: 1.2;
    margin-top: 2px;
}

.stats-section {
    width: 100%;
}

.indicator-title {
    font-size: 0.75rem;
    font-weight: 700;
    color: #334155;
    margin-bottom: 4px;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
}

.stats-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 4px;
}

.stat-item {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 4px 6px;
}

.stat-item-empty {
    opacity: 0.7;
}

.stat-label {
    font-size: 0.7rem;
    line-height: 1;
    font-weight: 700;
    color: #64748b;
    margin-bottom: 2px;
}

.stat-value {
    font-size: 0.76rem;
    font-weight: 600;
    color: #1e293b;
    line-height: 1.2;
    overflow-wrap: anywhere;
}

.stat-value.percentage {
    color: #2563eb;
}

.stat-value.count {
    color: #059669;
}
</style>