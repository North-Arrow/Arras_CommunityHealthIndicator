<template>
  <main id="main" class="full-screen-main" :class="{ 'orientation-top-bottom': orientation === 'top-bottom', 'orientation-left-right': orientation === 'left-right' }" tabindex="-1">
    <div id="loading" class="loading-screen">
        <div class="loading-content">
          <div class="logo-container">
            <v-img 
              src="ArrasFoundation.png" 
              max-width="300px"
              class="loading-logo"
            />
          </div>
          <div class="loading-text">
            <h2 class="loading-title">Loading Community Health Data</h2>
            <!-- <p class="loading-subtitle">Please wait while we prepare your map...</p> -->
            <!-- {{ `Loading ${categories.find((c:any) => router.options.history.state.current?.toString().includes(c.query_str))?.title} data...` }} -->
            <p class="loading-subtitle">If this takes too long, please refresh the page.</p>
          </div>
          <div class="progress-container">
            <v-progress-circular 
              indeterminate 
              color="white" 
              size="80" 
              width="8"
              class="loading-spinner"
            />
          </div>
          <div class="loading-dots">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>
    <v-app>
      <v-navigation-drawer
        class="sidebar"
        v-model="drawer"
        temporary
        :width="320"
      >
        <div class="sidebar__header" :style="sidebarHeaderStyle">
          <div class="sidebar__brand">
            <v-img
              src="ArrasFoundation.png"
              width="44"
              height="44"
              class="sidebar__logo"
            />
            <div class="sidebar__brand-text">
              <div class="sidebar__title">Health Indicators</div>
              <div class="sidebar__subtitle">Choose a theme</div>
            </div>
          </div>
        </div>
        <v-divider class="sidebar__divider" />
        <v-list nav density="comfortable" class="sidebar__list">
          <v-list-item
            v-for="category in categories"
            :key="category.title"
            :to="`/map?theme=${category.query_str}`"
            :disabled="!category.enabled"
            @click="drawer = false"
            class="sidebar__item"
            rounded="lg"
          >
            <template v-slot:prepend>
              <div class="sidebar__icon-wrap">
                <v-img :src="category.icon" width="22" height="22" class="sidebar__icon" />
              </div>
            </template>
            <v-list-item-title>{{ category.title }}</v-list-item-title>
          </v-list-item>
          <v-divider class="my-2 sidebar__divider"></v-divider>
          <v-list-item to="/" @click="drawer = false" class="sidebar__item" rounded="lg">
            <template v-slot:prepend>
              <div class="sidebar__icon-wrap sidebar__icon-wrap--home">
                <v-icon icon="mdi-home" size="18"></v-icon>
              </div>
            </template>
            <v-list-item-title>Home</v-list-item-title>
          </v-list-item>
          <v-list-item target="_blank" to="/pdf_placeholder.pdf" class="sidebar__item" rounded="lg">
            <template v-slot:prepend>
              <div class="sidebar__icon-wrap sidebar__icon-wrap--home">
                <v-icon icon="mdi-book-open" size="18"></v-icon>
              </div>
            </template>
            <v-list-item-title>Data Dictionary</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-navigation-drawer>
      <v-app-bar class="app-bar" collapse :elevation="2">
        <template v-slot:prepend>
          <RouterLink v-slot="{ href, navigate }" to="/">
            <v-btn size="large"variant="text" :href="href" @click="navigate">
              <v-img width="50px" src="ArrasFoundation.png" />
            </v-btn>
          </RouterLink>
          <v-icon icon="mdi-menu" size="24" @click="drawer = !drawer" style="cursor: pointer;" />
         
        </template>
      </v-app-bar>
     
      <router-view></router-view>
    </v-app>
  </main>
</template>
<script setup lang="ts">
import { ref, inject, computed, watch, onBeforeMount } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
const drawer = ref(false)

const mainConfig = inject('mainConfig') as any;
const arrasBranding = inject('arrasBranding') as any;
const categories = computed(() => mainConfig?.categories || []);
const orientation = computed(() => window.innerWidth > window.innerHeight ? 'left-right' : 'top-bottom')

const arrasColors = computed<Record<string, string>>(() => arrasBranding?.colors || {});
const sidebarHeaderStyle = computed(() => {
  const darkBlue = arrasColors.value['dark-blue'] || '#1d4389';
  const paleBlue = arrasColors.value['pale-blue'] || '#7fa0ac';
  return {
    background: `linear-gradient(135deg, ${paleBlue} -10%, ${darkBlue} 100%)`,
  };
});

watch(router.currentRoute, (newRoute, oldRoute) => {
  if(!window.location.search.includes('theme') && newRoute.name === 'map') {
    alert('Please go to the home page to select a theme first.')
    window.location.href = '/'
    return
  }

    if(newRoute.name === 'map' && oldRoute?.name === 'map') {
      console.log('reloading')
      //window.location.replace(newRoute.fullPath)
      window.location.reload()
      //window.location.replace(newRoute.fullPath)
    }
}, { immediate: true })
onBeforeMount(() => {
  document.body.style.zoom = window.innerWidth < 1280 ? '0.8' : '1';
})
</script>
<style scoped>
.sidebar {
  z-index: 1000;
  height: calc(100% + -14px) !important;
  border-radius: 18px;
  overflow: hidden;
  /* box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22); */
}

.sidebar__header {
  padding: 16px 16px 14px 16px;
  color: #fff;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sidebar__logo {
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35));
}

.sidebar__brand-text {
  min-width: 0;
}

.sidebar__title {
  font-weight: 700;
  letter-spacing: 0.2px;
  line-height: 1.15;
}

.sidebar__subtitle {
  font-size: 0.85rem;
  opacity: 0.92;
  margin-top: 2px;
}

.sidebar__divider {
  opacity: 0.7;
}

.sidebar__list {
  padding: 10px 8px 12px 8px;
}

.sidebar__item :deep(.v-list-item__content) {
  padding: 8px 2px;
}

.sidebar__icon-wrap {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, .85);
  border: 1px solid rgba(0, 0, 0, 0.08);
  z-index: 1;
}

.sidebar__icon-wrap--home {
  background: rgba(0, 0, 0, 0.04);
}

.sidebar__item :deep(.v-list-item-title) {
  font-weight: 520;
  letter-spacing: 0.1px;
}

.sidebar__item :deep(.v-list-item__prepend) {
  margin-inline-end: 10px;
}

.sidebar__item:hover :deep(.v-list-item__overlay) {
  opacity: 0.06;
}

.sidebar :deep(.v-list-item--active) {
  background: rgba(var(--v-theme-primary), 0.10);
  border: 1px solid rgba(var(--v-theme-primary), 0.22);
}

.sidebar :deep(.v-list-item--active .v-list-item-title) {
  font-weight: 700;
}

.sidebar :deep(.v-list-item--disabled) {
  opacity: 0.55;
}
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}

.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
.full-screen-main{
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background-color: white;
}
.loading-screen {
  z-index: 10000;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: none;
  justify-content: center;
  align-items: center;
  transition: opacity 0.5s ease-in-out, visibility 0.5s ease-in-out;
  visibility: visible;
  opacity: 1;

}

.loading-screen[style*="display: none"] {
  opacity: 0;
  visibility: hidden;
}

.loading-content {
  text-align: center;
  color: white;
  max-width: 500px;
  padding: 2rem;
  animation: fadeInUp 0.8s ease-out;
}

.logo-container {
  margin-bottom: 2rem;
  animation: pulse 2s ease-in-out infinite;
}

.loading-logo {
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
  margin: 0 auto;
}

.loading-text {
  margin-bottom: 2rem;
}

.loading-title {
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: white;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  letter-spacing: 0.5px;
}

.loading-subtitle {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  font-weight: 300;
}

.progress-container {
  margin: 2rem 0;
  display: flex;
  justify-content: center;
}

.loading-spinner {
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.2));
}

.loading-dots {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.loading-dots .dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: white;
  animation: bounce 1.4s ease-in-out infinite both;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.loading-dots .dot:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots .dot:nth-child(2) {
  animation-delay: -0.16s;
}

.loading-dots .dot:nth-child(3) {
  animation-delay: 0;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1.2);
    opacity: 1;
  }
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .loading-title {
    font-size: 1.5rem;
  }
  
  .loading-subtitle {
    font-size: 0.9rem;
  }
  
  .loading-logo {
    max-width: 200px !important;
  }
}
</style>
<style>
.point-legend,
.color-legend{
  pointer-events: none;
}
.point-legend *,
.color-legend *{
  pointer-events: all;
}

.app-bar.v-toolbar.v-toolbar--collapse{
  max-width: min-content;
    padding: 8px;
}
.app-bar .v-toolbar__prepend, .app-bar .v-toolbar__append {
    align-items: center;
    align-self: stretch;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-around;
}
.app-bar .v-toolbar__content, .app-bar .v-toolbar__extension{
    align-items: center;
    display: flex;
    flex: 0 0;
    position: relative;
    transition: inherit;
    width: 100%;
    flex-wrap: wrap;
    flex-direction: column;
    align-content: space-around;
    justify-content: space-evenly;
}
</style>