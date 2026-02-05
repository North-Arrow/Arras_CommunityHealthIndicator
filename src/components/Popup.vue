<template>
    <div ref="popupContainer" class="popup-container">

        <!-- Feature Details -->
        <div class="feature-details">
            <!-- Header -->
            <div class="popup-header" v-if="!(currentIndicator?.geotype === 'protected' || currentIndicator?.geotype === 'tract' || currentIndicator?.geotype === 'county')">
                <v-icon icon="mdi-map-marker" size="24" color="primary" class="header-icon"></v-icon>
                <div class="header-content">
                    <h3 class="feature-name" v-if="properties.name">{{ properties.name }}</h3>
                    <h3 class="feature-name"  v-else-if="properties.geoid"> {{ currentIndicator?.geotype === 'tract' ? 'Census Tract Number' : currentIndicator?.geotype === 'county' ? 'County FIPS code' : 'ID' }}: {{ properties.geoid }}</h3>
                    <div v-if="properties.address" class="feature-address">
                        <v-icon icon="mdi-map-marker-outline" size="14" class="mr-1"></v-icon>
                        {{ decodeURIComponent(properties.address) }}
                    </div>
                </div>
            </div>

            <!-- Indicator Stats -->
            <div v-if="currentIndicator" class="stats-section">
                <div class="indicator-title">
                    <v-icon icon="mdi-chart-line" size="18" class="mr-2"></v-icon>
                    {{ currentIndicator.title }}
                </div>
                <v-divider class="my-3"></v-divider>
                
                <!-- Percentage Stats -->
                <div class="stats-grid">
                    <template v-for="stat in stats" :key="stat.year">
                        
                        <div
                            :class="{ 'stat-item': true, 'stat-item-empty': stat.isEmpty }"
                        >
                        <div class="stat-label">{{ stat.year }}</div>
                            <div class="stat-value percentage">
                                {{ stat.title }}                     
                            </div> 
                           <div class="stat-value count" v-if="!stat.pctOnly">
                            {{ stat.subtitle }}
                           </div>
                        </div> 
                    </template>
                </div>
            </div>

            <!-- More Info Expansion Panel -->
            <div v-if="moreInfo.length > 0" class="more-info-section">
                <v-expansion-panels color="primary" variant="accordion" class="info-panels">
                    <v-expansion-panel>
                        <v-expansion-panel-title class="info-panel-title">
                            <v-icon icon="mdi-information-outline" size="18" class="mx-2"></v-icon>
                            <span>More Information</span>
                            <span class="info-hint">(Click to expand)</span>
                        </v-expansion-panel-title>
                        <v-expansion-panel-text class="info-panel-content">
                            <div v-html="moreInfo" class="info-text"></div>
                        </v-expansion-panel-text>
                    </v-expansion-panel>
                </v-expansion-panels>
            </div>
            <div v-if="currentIndicator?.geotype === 'protected' || currentIndicator?.geotype === 'tract' || currentIndicator?.geotype === 'county'" class="popup-header area">
                <v-icon icon="mdi-map-marker" size="24" color="primary" class="header-icon"></v-icon>
                <div class="header-content">
                    <h3 class="feature-name" v-if="properties.name">{{ properties.name }}</h3>
                    <h3 class="feature-name"  v-else-if="properties.geoid"> {{ currentIndicator?.geotype === 'tract' ? 'Census Tract Number' : currentIndicator?.geotype === 'county' ? 'County FIPS code' : 'ID' }}: {{ properties.geoid }}</h3>
                    <div v-if="properties.address" class="feature-address">
                        <v-icon icon="mdi-map-marker-outline" size="14" class="mr-1"></v-icon>
                        {{ decodeURIComponent(properties.address) }}
                    </div>
                </div>
            </div>

        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { useIndicatorLevelStore } from '../stores/indicatorLevelStore'

const props = defineProps<{
    properties: any
    side: 'left' | 'right'
}>()

const indicatorStore = useIndicatorLevelStore(props.side)
//const popupContainer = ref<HTMLDivElement | null>(null)
onMounted(() => {
    const popupContainer = document.getElementsByClassName('maplibregl-popup-content') as HTMLCollectionOf<HTMLDivElement>;
    if (popupContainer && popupContainer.length > 0) {
        // The 'zoom' property does not work as expected on many modern browsers for regular elements; 
        // it is non-standard and mostly only works in IE and some Chromium browsers, and not reliably so.
        // Instead, use CSS transform: scale for better cross-browser support:
        for (const container of popupContainer) {
            container.style.transform = `scale(${Math.min(1, window.innerWidth / 1000)})`;
            container.style.transformOrigin = "bottom";
        }
    }
})
const currentIndicator = computed(() => indicatorStore.getCurrentIndicator())
const moreInfo = computed(() => {
    if (!props.properties.more_info) return '';
    const splits = decodeURIComponent(props.properties.more_info).split('\n');
    return splits.join('<br/>');
})
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
    for(const year of years) {
        const count = props.properties[keyMapping.count+year.toString()] || '';
        const pop = props.properties[keyMapping.pop+year.toString()] || '';
        const pct = props.properties[keyMapping.pct+year.toString()] || '';
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

</script>

<style>
.maplibregl-popup{
    max-width: none !important;
    pointer-events: none !important;
   z-index: 999999 !important;
}

.maplibregl-popup-content{
    box-shadow: #00000052 0px 2px 34px;
    border-radius: 8px;
    z-index: 999999 !important;
    background: #fff8;
    backdrop-filter: blur(5px);
}
</style>
<style scoped>

.popup-container {
    /* min-width: 280px; */
    min-width: 280px;
    max-width: 500px;
    padding: 0;
    width: fit-content;
}

/* Cluster Message */
.cluster-message {
    text-align: center;
    padding: 1.5rem;
    background: linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(59, 130, 246, 0.02) 100%);
    border-radius: 8px;
}

.cluster-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e40af;
    margin: 0.5rem 0;
}

.cluster-text {
    font-size: 0.9rem;
    color: #64748b;
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Feature Details */
.feature-details {
    /* padding: 0.5rem; */
}

/* Header */
.popup-header {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
    background: linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(59, 130, 246, 0.02) 100%);
    border-radius: 8px;
}

.header-icon {
    flex-shrink: 0;
    margin-top: 0.25rem;
}

.header-content {
    flex: 1;
    min-width: 0;
}

.feature-name {
    font-size: 1.1rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 0.5rem 0;
    line-height: 1.3;
    word-wrap: break-word;
}

.popup-header.area {
    background: none;
    border-radius: 0;
    padding: 0;
    margin-top: .4rem;
    margin-bottom: -.75rem;
}
.area .header-icon {
    margin-top: -0.25rem;
    vertical-align: top;
}
.area .feature-name{
    vertical-align: bottom;
    font-size: 1rem;
    font-weight: 400;
    color: #1e293b;
    margin: 0 0 0.5rem 0;
    line-height: 1;
    word-wrap: break-word;
}

.feature-address {
    font-size: 0.85rem;
    color: #64748b;
    display: flex;
    align-items: center;
    line-height: 1.4;
}

/* Stats Section */
.stats-section {
    /* margin-bottom: 1rem; */
    width: 100%;
}

.indicator-title {
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
    display: flex;
    align-items: center;
    margin-bottom: 0.5rem;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.25rem;
    width: 100%;
}

.stat-item {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 0.25rem;
    transition: all 0.2s ease;
    min-width: 0;
    overflow-wrap: break-word;
    word-wrap: break-word;
}

.stat-item:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.stat-item-empty {
    opacity: 0.6;
    background: #f1f5f9;
}

.stat-label {
    font-size: 0.75rem;
    line-height: 1rem;
    font-weight: 500;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.stat-value {
    font-size: .9rem;
    font-weight: 600;
    color: #1e293b;
    line-height: 1.3;
}

.stat-value.percentage {
    color: #2563eb;
}

.stat-value.count {
    color: #059669;
}

.stat-total {
    font-size: 0.85rem;
    font-weight: 400;
    color: #64748b;
    /* margin-left: 0.25rem; */
}

.no-data {
    color: #94a3b8;
    font-style: italic;
    font-weight: 400;
}

/* More Info Section */
.more-info-section {
    /* margin-top: 1rem; */
    padding-top: 1rem;
    border-top: 1px solid #e2e8f0;
}

.info-panels {
    background: transparent;
}

.info-panel-title {
    font-size: 0.9rem;
    font-weight: 500;
    color: #1e293b;
    padding: 0.5rem 0;
}

.info-hint {
    font-size: 0.75rem;
    color: #ededed;
    font-weight: 400;
    margin-left: 0.5rem;
}

.info-panel-content {
    padding: 0.75rem 0;
    font-size: 0.9rem;
    line-height: 1.6;
    color: #475569;
}

.info-text {
    color: #475569;
}

.info-text :deep(p) {
    margin: 0.5rem 0;
}

.info-text :deep(strong) {
    color: #1e293b;
    font-weight: 600;
}

/* Responsive */
@media (max-width: 400px) {
    .popup-container {
        /* min-width: 240px; */
    }
    
    .stats-grid {
        grid-template-columns: 1fr;
    }
    
    .feature-name {
        font-size: 1rem;
    }
}
</style>