<template>
    <v-main class="d-flex align-center justify-center" style="padding-top: 0px;">
        <v-container ref="mapPage" class="map-page" fluid style="padding-top: 0px; height: 100%;">
            <div class="map-page-map">
                <ComparisonMap :_center="[-80.17, 34.652]" :_zoom="8.57" :_type="'sideBySide'" />
            </div>
            <header ref="mapPageHeader" class="map-page-header">
                <v-card :style="{ 'background-color': arrasBrandingColor }" class="theme-title mt-2" elevation="2" rounded="lg">
                    <v-card-title v-if="currentThemeConfig" class="text-center pa-0 ma-0 theme-title__text" :style="{ 'background-color': arrasBrandingColor }">
                        <v-img inline :src="invertedIconPath" width="36" height="36" class="mr-2 title-theme-icon flex-shrink-0"></v-img>
                        <span class="theme-title__label">{{ currentThemeConfig.title }}</span>
                    </v-card-title>
                </v-card>
                <LocationSearch />
            </header>
        </v-container>
    </v-main>
</template>
<style>
.maplibregl-compare-type-toggle.top {
    margin-top: 12px;
}
.full-screen-main{
    display: block;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    /* width: 100%; */
    position: absolute;
}
.map-page {
    position: relative;
    height: 100%;
    width: 100%;
    /* Measured from .map-page-header; positions search + solo controls below chrome */
    --map-chrome-height: 5.5rem;
}

.map-page-map {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
}

.map-page-header {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    width: 100%;
    z-index: 999;
    pointer-events: none;
}

.map-page-header > * {
    pointer-events: all;
}

.theme-title {
    max-width: min(25%, 92vw);
    width: fit-content;
    margin: 0 auto;
    padding: 3px 14px;
    border: 1px solid black;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
}

.theme-title .v-card-title.theme-title__text {
    white-space: normal !important;
    overflow: visible !important;
    text-overflow: unset !important;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 4px 8px;
    font-weight: 650;
    letter-spacing: 0.2px;
    font-size: 1.6rem;
    line-height: 1.25;
    color: white;
}

.theme-title__label {
    flex: 1 1 8rem;
    min-width: 0;
    max-width: 100%;
    white-space: normal;
    overflow: visible;
    text-overflow: unset;
    text-align: center;
    line-height: 1.25;
}

.title-theme-icon {
    vertical-align: top;
}
</style>
<script>
import ComparisonMap from '../components/ComparisonMap.vue';
import LocationSearch from '../components/LocationSearch.vue';
import { useThemeLevelStore } from '../stores/themeLevelStore'
import { inject } from 'vue'
export default {
    name: 'Map',
    components: {
        ComparisonMap,
        LocationSearch
    },
    data() {
        return {
            arrasBrandingColors: inject('arrasBranding').colors
         }
    },
    watch: {
        currentThemeConfig() {
            this.$nextTick(() => this.updateMapChromeHeight())
        },
    },
    async beforeRouteEnter(to, from, next) {
        //console.log('beforeRouteEnter')
        document.getElementById('loading').style.display = 'flex'
       const success = await useThemeLevelStore().setCurrentTheme(to.query.theme)
       if(!success){
        next(false)
        return
       }
        next(true)
    },
    async beforeRouteUpdate(to, from, next) {
        if (to.query.theme !== from.query.theme) {
            const loadingEl = document.getElementById('loading');
            if (loadingEl?.style) loadingEl.style.display = 'flex';
            const success = await useThemeLevelStore().setCurrentTheme(to.query.theme);
            if (!success) {
                next(false);
                return;
            }
            await this.$nextTick();
        }
        next();
    },
    async beforeRouteLeave(to, from, next) {
        
        await useThemeLevelStore().setCurrentTheme()
        next()
    },
    mounted() {
        this.$nextTick(() => {
            this.updateMapChromeHeight()
            if (typeof ResizeObserver !== 'undefined' && this.$refs.mapPageHeader) {
                this._mapChromeResizeObserver = new ResizeObserver(() => this.updateMapChromeHeight())
                this._mapChromeResizeObserver.observe(this.$refs.mapPageHeader)
            }
        })
    },
    beforeUnmount() {
        this._mapChromeResizeObserver?.disconnect()
        this._mapChromeResizeObserver = null
    },
    computed: {
        invertedIconPath() {
            if(!this.currentThemeConfig?.icon) return null
            // Replace the suffix _<variant>.png with _white.png (e.g. nature_green.png -> nature_white.png)
            return this.currentThemeConfig?.icon?.replace(/_[^/]*\.png$/i, '_white.png')
        },
        arrasBrandingColor() {
            const themeColorName = this.currentThemeConfig.style.colors.icon;
            return this.arrasBrandingColors[themeColorName]
        },
        currentThemeConfig() {
            return useThemeLevelStore().getMainConfigForCurrentTheme()
        }
    },
    methods: {
        updateMapChromeHeight() {
            const header = this.$refs.mapPageHeader
            const page = this.$refs.mapPage?.$el ?? this.$refs.mapPage
            if (!header || !page) return
            const height = Math.ceil(header.getBoundingClientRect().height)
            if (height > 0) {
                page.style.setProperty('--map-chrome-height', `${height}px`)
            }
        },
    }
}
</script>