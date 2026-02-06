<template>
    <v-main class="d-flex align-center justify-center" style="padding-top: 0px;">
        <v-container style="padding-top: 0px; height: 100%;">
            <v-card :style="{ 'background-color': arrasBrandingColor }" class="theme-title mt-2" elevation="2" rounded="lg">
                <v-card-title v-if="currentThemeConfig" class="text-center pa-0 ma-0 theme-title__text" :style="{ 'background-color': arrasBrandingColor }">
                    <v-img inline :src="invertedIconPath" width="24" height="24" class="mr-2 title-theme-icon"></v-img>
                    {{ currentThemeConfig.title }}
                </v-card-title>
            </v-card>
            <LocationSearch />
            <ComparisonMap :_center="[-80.17, 34.652]" :_zoom="8.57" :_type="'sideBySide'" />
        </v-container>
    </v-main>
</template>
<style>
.full-screen-main{
    display: block;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    /* width: 100%; */
    position: absolute;
}
.theme-title {
    max-width: min(520px, 92vw);
    width: fit-content;
    margin: 0 auto;
    z-index: 999;
    padding: 3px 14px;
    top: -4px;
    /* Stand out on top of the map */
    /* background-color: rgba(var(--v-theme-surface), 0.92); */
    border: 1px solid black;
    border-left: 6px solid white;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
}

.theme-title__text {
    font-weight: 650;
    letter-spacing: 0.2px;
    font-size: 1.05rem; /* slight bump, not “big” */
    line-height: 1.25;
    color: white;
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
    watch: {},
    async beforeRouteEnter(to, from, next) {
        console.log('beforeRouteEnter')
        document.getElementById('loading').style.display = 'flex'
       const success = await useThemeLevelStore().setCurrentTheme(to.query.theme)
       if(!success){
        next(false)
        return
       }
        next(true)
    },
    //Pretty sure we don't need this:
    // async beforeRouteUpdate(to, from, next) {
    //     console.log('beforeRouteUpdate')
    //     // Handle route updates when component is reused (e.g., theme query param changes)
    //     if (to.query.theme !== from.query.theme) {
    //         document.getElementById('loading').style.display = 'flex'
    //         const success = await useThemeLevelStore().setCurrentTheme(to.query.theme)
    //         if(!success){
    //             next(false)
    //             return
    //         }
    //         // Hide loading after a brief delay to ensure theme is fully loaded
    //         await this.$nextTick()
    //     }
    //     next()
    // },
    async beforeRouteLeave(to, from, next) {
        console.log('beforeRouteLeave')
        await useThemeLevelStore().setCurrentTheme()
        next()
    },
    mounted() {
       // document.getElementById('loading').style.display = 'none'
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
    methods: {}
}
</script>