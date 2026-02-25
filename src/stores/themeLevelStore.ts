import { defineStore } from 'pinia'
import { inject, ref } from 'vue'
import type { IndicatorConfig } from '../types/IndicatorConfig'
import axios from 'axios'
import { formatGoogleSheetData } from '../utils/data-transformations'
export interface ThemeConfig {
    title: string
    query_str: string
    enabled?: boolean
    description: string
}

export const useThemeLevelStore = defineStore('themeLevel', () => {
    const currentThemeConfig = ref<ThemeConfig | null>(null)
    const currentThemeShortName = ref<string | null>(null)
    const categoryConfigs = inject('categoryConfigs') as any
    const mainConfig = inject('mainConfig') as any
    const mainConfigForCurrentTheme = ref<any>(null)

    async function setCurrentTheme(shortName?: string): Promise<boolean> {
        if(!shortName){
            currentThemeShortName.value = null
            currentThemeConfig.value = null
            mainConfigForCurrentTheme.value = null
            return true
        }
        currentThemeShortName.value = shortName
        currentThemeConfig.value = categoryConfigs[shortName] as any
        mainConfigForCurrentTheme.value = mainConfig?.categories?.find((cat: any) => cat.query_str === shortName)
        //Get data from google sheets and store along with all the indicators in categoryConfigs
        const currentIndicatorConfigs: IndicatorConfig[] | null = getAllCurrentThemeIndicators()
        if (currentIndicatorConfigs) {
            await Promise.all(currentIndicatorConfigs.map(async (indicator: IndicatorConfig) => {
                indicator.google_sheets_data = formatGoogleSheetData((await axios.get(indicator.google_sheets_url)).data as any)
            }));
        }else{
            return false
        }
        return true
    }

    function getCurrentThemeConfig() {
        return currentThemeConfig.value
    }

    function getMainConfigForCurrentTheme() {
        return mainConfigForCurrentTheme.value
    }

    function getAllCurrentThemeIndicators(): IndicatorConfig[] | null {
        const shortName = currentThemeShortName.value
        if (shortName) {
            const categoryConfig = categoryConfigs[shortName]
            const indicators = categoryConfig?.indicators as IndicatorConfig[] || []
            
            // Get category style from mainConfig
            const categoryStyle = mainConfigForCurrentTheme.value.style
            
            // Merge category style with each indicator's style
            return indicators.map((indicator: IndicatorConfig) => {
                // Normalize icon-colors to colors if present
                if ((indicator.style as any)?.['icon-colors']) {
                    if (!indicator.style.colors) {
                        indicator.style.colors = {}
                    }
                    indicator.style.colors = {
                        ...indicator.style.colors,
                        ...(indicator.style as any)['icon-colors']
                    }
                    delete (indicator.style as any)['icon-colors']
                }
                
                // Merge category style with indicator style (indicator style takes precedence)
                if (categoryStyle) {
                    indicator.style = categoryStyle
                }
                
                return indicator
            })
        }
        return null
    }
    return { setCurrentTheme, getMainConfigForCurrentTheme, getCurrentThemeConfig, getAllCurrentThemeIndicators, currentThemeConfig, currentThemeShortName }
})

