import '@mdi/font/css/materialdesignicons.css'
import '../styles/vuetify-overrides.sass'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import colors from 'vuetify/util/colors'

export default createVuetify({

  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {}
      }
    },
  },

  components,
  directives,

})
