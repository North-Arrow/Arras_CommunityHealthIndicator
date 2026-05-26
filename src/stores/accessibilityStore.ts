import { defineStore } from 'pinia'

const STORAGE_KEY = 'arras-a11y-enhanced'

export const useAccessibilityStore = defineStore('accessibility', {
  state: () => ({
    enhancedVisual: typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'true',
    statusMessage: '' as string,
  }),
  actions: {
    init() {
      document.documentElement.classList.toggle('a11y-enhanced', this.enhancedVisual)
    },
    toggleEnhancedVisual() {
      this.setEnhancedVisual(!this.enhancedVisual)
    },
    setEnhancedVisual(value: boolean) {
      this.enhancedVisual = value
      localStorage.setItem(STORAGE_KEY, String(value))
      document.documentElement.classList.toggle('a11y-enhanced', value)
      this.announce(
        value
          ? 'Enhanced accessibility display turned on.'
          : 'Enhanced accessibility display turned off.',
      )
    },
    announce(message: string) {
      this.statusMessage = ''
      requestAnimationFrame(() => {
        this.statusMessage = message
      })
    },
  },
})
