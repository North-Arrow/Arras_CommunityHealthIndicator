/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '*.css' {
  const content: string
  export default content
}

declare module '../assets/maplibre-gl-compare.js' {
  export default class Compare {
    constructor(
      left: any,
      right: any,
      container: string | HTMLElement,
      opts?: { type?: string; orientation?: string; position?: string[]; showTypeToggle?: boolean }
    )
    switchType(type: string): void
  }
}

declare module './plugins/vuetify.js' {
  const vuetify: any
  export default vuetify
}
