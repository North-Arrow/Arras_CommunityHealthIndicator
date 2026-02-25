import { defineStore } from 'pinia'
import { ref, inject } from 'vue'
import type { IndicatorConfig } from '../types/IndicatorConfig.ts'
import { useThemeLevelStore } from './themeLevelStore'
import { createDataToMapWorker } from '../utils/dataToMapWorkerFactory.ts'
import type { PointDataToMap } from '../utils/pointDataToMap.ts'
import type { AreaDataToMap } from '../utils/areaDataToMap.ts'
import type { Emitter } from 'mitt'
import { DEFAULT_YEAR, DEFAULT_GEO_SELECTION } from '../constants'

/**
 * Store interface for indicator-level state management
 * Each map side (left/right) has its own instance of this store
 */
export interface IndicatorLevelStore {
    currentIndicator: IndicatorConfig | null
    currentIndicatorData: any
    currentYear: number | null
    setIndicatorFromIndicatorShortName: (indicatorShortName: string, emitter?: Emitter<any>) => void
    getCurrentIndicator: () => IndicatorConfig | null
    initializeMap: (_map: maplibregl.Map) => void
    removeMap: () => void
    worker: PointDataToMap | AreaDataToMap | null
}

const themeLevelStore = useThemeLevelStore()

const indicatorLevelStore = (storeName: 'left' | 'right') => {
    const arrasBranding = ref<any>(inject('arrasBranding') as any)
    const sitePath = inject('sitePath') as string
    const currentIndicator = ref<IndicatorConfig | null>(null)
    const currentGeoSelection = ref<string | null>(null)
    let map: maplibregl.Map | null = null
    const currentYear = ref<number | null>(DEFAULT_YEAR)
    const minValue = ref<number | null>(null)
    const maxValue = ref<number | null>(null)
    const csvData = ref<string | null>(null)
    // Helper function to get current theme indicators dynamically
    function getCurrentThemeIndicators() {
        return themeLevelStore.getAllCurrentThemeIndicators()
    }

    function getCsvData(): string | null {
        return csvData.value
    }

    function initializeMap(_map: maplibregl.Map, emitter?: Emitter<any>) {
        map = _map
        _map.on('load', async () => {
            // Get current theme indicators dynamically when map loads
            const currentThemeIndicators = getCurrentThemeIndicators()
            const defaultForSide = currentThemeIndicators?.find(
                (i: IndicatorConfig) => storeName.includes(i.default as string)
            ) || null
            await setIndicatorFromIndicatorShortName(defaultForSide?.short_name || '', emitter)
        })
    }

    let worker: AreaDataToMap | PointDataToMap | null = null;

   
    function removeMap() {
        if(worker) {
            worker.removeOldEvents();
            worker.hideLayers();
            worker = null;
        }
        map = null
    }

    async function setCurrentYear(year: number | string) {
    
        if(typeof year === 'string') {
            year = +(year.replace(/[^0-9]/g, ''))
        }

        currentYear.value = year
        if(worker) {
            await worker.setPaintAndLayoutProperties(year as number)
            // Note: min/max values are calculated across all years in setupIndicator,
            // so they don't need to be updated when year changes
        }
    }
    function getCurrentYear(): number | null {
        return currentYear.value
    }
    /**
     * Gets the currently selected geography
     * @returns Lowercase geography identifier, defaults to DEFAULT_GEO_SELECTION
     */
    function getCurrentGeoSelection(): string | null {
        return currentGeoSelection.value?.toLowerCase() || DEFAULT_GEO_SELECTION
    }
    function setCurrentGeoSelection(geoSelection: string) {
        currentGeoSelection.value = geoSelection?.toLowerCase() || null
    }
    /**
     * Sets the current indicator by short name and initializes the map worker
     * Finds the latest available year from the data and sets it as default
     */
    async function setIndicatorFromIndicatorShortName(indicatorShortName: string, emitter?: Emitter<any>) {
        // Get current theme indicators dynamically
        const currentThemeIndicators = getCurrentThemeIndicators()
        const indicator = currentThemeIndicators?.find(
            (i: IndicatorConfig) => i.short_name === indicatorShortName
        ) || null
        
        if (indicator) {
            
            currentIndicator.value = indicator
            if(!indicator.google_sheets_data){
                return false;
            }

            // Clean up existing worker
            if (worker) {
                worker.removeOldEvents();
                worker.hideLayers();
                worker = null;
            }
            // Create new worker for this indicator
            worker = createDataToMapWorker(
                indicator,
                map,
                storeName as 'left' | 'right' | null,
                emitter,
                arrasBranding.value,
                sitePath
            );

            if (worker) {
                // Find available years - prefer 4-digit years, fallback to count_ prefixed columns
                const headerShortNames = indicator.google_sheets_data.headerShortNames;
                let defaultYears = headerShortNames && headerShortNames.length > 0 
                    ? headerShortNames
                        .filter((year: string) => /^\d{4}$/.test(year))
                        .sort((a: string, b: string) => Number(a) - Number(b))
                    : null;
                    
                if (!defaultYears || defaultYears.length === 0) {
                    defaultYears = headerShortNames
                        .filter((year: string) => year.toLowerCase().startsWith(indicator.timeline?.yearValuePrefix || ''))
                        .sort((a: string, b: string) => 
                            Number(a.replace(indicator.timeline?.yearValuePrefix || '', '')) - Number(b.replace(indicator.timeline?.yearValuePrefix || '', ''))
                        ).map((year: string) => Number(year.replace(indicator.timeline?.yearValuePrefix || '', '')));
                }
                
                await worker.setupIndicator(defaultYears[defaultYears.length - 1]);
                const rawData = worker?.getCsvData()
                csvData.value = rawData.headerLabels + '\n' + rawData.data.map((d: { [s: string]: unknown } | ArrayLike<unknown>) => Object.values(d).join(',')).join('\n')
                console.log(csvData.value)
                // Update min/max values from worker after setup
                minValue.value = (worker as any).minValue ?? null;
                maxValue.value = (worker as any).maxValue ?? null;
                await setCurrentYear(defaultYears[defaultYears.length - 1]);
                setCurrentGeoSelection(DEFAULT_GEO_SELECTION);
                
                // Listen for geography selection events
                emitter?.on(`feature-${storeName}-clicked`, (feature: string | null) => {
                    setCurrentGeoSelection(feature || DEFAULT_GEO_SELECTION);
                });
            }
        } else {
            currentIndicator.value = null;
        }
    }

    function getCurrentIndicator(): IndicatorConfig | null {
        return currentIndicator.value || null
    }

    function getMinValue(type: 'count' | 'pop' | 'pct' | 'acres'): number | null {
        if(type === 'count') {
            return worker?.rangeValues.count.min ?? null;
        } else if(type === 'pop') {
            return worker?.rangeValues.pop.min ?? null;
        } else if(type === 'pct') {
            return worker?.rangeValues.pct.min ?? null;
        } else if(type === 'acres') {
            return worker?.rangeValues.acres.min ?? null;
        }
        return null;
    }

    function getMaxValue(type: 'count' | 'pop' | 'pct' | 'acres'): number | null {
        if(type === 'count') {
            return worker?.rangeValues.count.max ?? null;
        } else if(type === 'pop') {
            return worker?.rangeValues.pop.max ?? null;
        } else if(type === 'pct') {
            return worker?.rangeValues.pct.max ?? null;
        } else if(type === 'acres') {
            return worker?.rangeValues.acres.max ?? null;
        }
        return null;
    }

    return { setIndicatorFromIndicatorShortName, getCurrentIndicator, initializeMap, removeMap, setCurrentYear, getCurrentYear, getCurrentGeoSelection, setCurrentGeoSelection, getMinValue, getMaxValue, minValue, maxValue, getCsvData }
}

// This is where the difference is to make unique stores:
export const useIndicatorLevelStore = (storeName: 'left' | 'right') => {
    const store = defineStore(`${storeName}-indicator`, () => indicatorLevelStore(storeName))
    return store()
}

export default useIndicatorLevelStore


