<template>
  <!-- <v-main class="landing-page"> -->
  <v-container fluid class="pa-0 ma-0 hero-section">
    <!-- Main Content -->
    <v-container class="mt-0">
      <h1 class="sr-only">Arras Community Health Indicator Tool</h1>
      <v-row>
        <v-col cols="12" md="12">
          <v-card variant="flat" style="background-color: rgba(255, 255, 255, 0.5);" class="pa-6 mt-2">
            <p class="text-body-1 text-medium-emphasis" style="line-height: 1.1em; max-width: 900px; margin: 0 auto;" v-html="mainConfig.landing_text"></p>
          </v-card>
        </v-col>
      </v-row>
      <v-row>
        <!-- Carousel Section -->
        <v-col cols="12" md="7" class="mb-6 mb-md-0">
          <v-card class="carousel-card" elevation="4" rounded="lg">
            <v-carousel
              v-if="slideshowItems.length"
              :cycle="!reduceCarouselMotion"
              show-arrows="hover"
              height="400"
              hide-delimiter-background
              delimiter-icon="mdi-circle"
            >
              <v-carousel-item
                v-for="item in slideshowItems"
                :key="item.src"
                :src="item.src"
                cover
                class="carousel-item"
                :aria-label="item.alt"
              />
            </v-carousel>
          </v-card>
        </v-col>

        <!-- Categories Section -->
        <v-col cols="12" md="5">
          <v-card class="categories-card" elevation="4" rounded="lg">
            <v-card-title class="text-h5 font-weight-bold pa-6 pb-4">
              <v-icon icon="mdi-view-grid" class="mr-2" aria-hidden="true"></v-icon>
              <span role="heading" aria-level="2">Explore Indicator Areas</span>
            </v-card-title>
            <v-card-text class="pa-6 pt-0">
              <v-row dense>
                <v-col cols="12" sm="6" md="12" v-for="cat in categories" :key="cat.title">
                  <v-btn @click="navigateToMap(cat.query_str)" :to="`/map?theme=${cat.query_str}`"
                    :disabled="!cat.enabled" block size="large" variant="elevated" class="category-btn mb-3"
                    :class="{ 'category-btn-disabled': !cat.enabled }">
                    <v-img :src="cat.icon" width="24" height="24" class="mr-2" alt="" aria-hidden="true"></v-img>
                    <!-- <v-icon 
                        :icon="cat.icon || 'mdi-chart-line'" 
                        class="mr-2"
                      ></v-icon> -->
                    {{ cat.title }}
                  </v-btn>
                </v-col>
              </v-row>
              <v-list-item target="_blank" to="/user_guide.pdf" class="sidebar__item" rounded="lg" rel="noopener noreferrer">
                <template v-slot:prepend>
                  <div class="sidebar__icon-wrap sidebar__icon-wrap--home">
                    <v-icon icon="mdi-book-open" size="18" aria-hidden="true"></v-icon>
                  </div>
                </template>
                <v-list-item-title>User Guide<span class="opens-new-tab"></span></v-list-item-title>
              </v-list-item>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-container>
  <!-- </v-main> -->
</template>
<script setup lang="ts">
import { inject, computed } from 'vue';
//import { onBeforeRouteLeave } from 'vue-router';
import { useThemeLevelStore } from '../stores/themeLevelStore';
import { useRouter } from 'vue-router';
import { useAccessibilityStore } from '../stores/accessibilityStore';
import slideshowFilenames from 'virtual:slideshow-images';

const mainConfig = inject('mainConfig') as any;
const categories = computed(() => mainConfig?.categories || []);
const router = useRouter();

const slideshowBase = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

/** Filenames from public/slideshow (jpg/png), discovered at build/dev time. */
const accessibilityStore = useAccessibilityStore()

const slideshowItems = slideshowFilenames.map((filename) => {
  const src = `${slideshowBase}slideshow/${filename}`
  const label = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')
  return { src, alt: `Community photo: ${label}` }
})

const reduceCarouselMotion = computed(
  () =>
    accessibilityStore.enhancedVisual ||
    (typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches),
)
// onBeforeRouteLeave(async (to: any, from: any, next: any) => {
//   await useThemeLevelStore().setCurrentTheme(to.query.theme as string)
//   next()
// })

async function navigateToMap(queryStr: string) {
  //console.log('navigateToMap', queryStr)
  const success = await useThemeLevelStore().setCurrentTheme(queryStr)
  if (!success) {
    return
  }
  await router.push(`/map?theme=${queryStr}`)
}
</script>

<style scoped>
h1 .v-img {
  margin: 0 auto;
}

.landing-page {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
}

.hero-section {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  margin-top: 1em;
}

.carousel-card {
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.carousel-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15) !important;
}

.carousel-item {
  transition: transform 0.5s ease;
}

.categories-card {
  height: 100%;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.categories-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15) !important;
}

.category-btn {
  transition: all 0.3s ease;
  text-transform: none;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.category-btn:hover:not(.category-btn-disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(37, 99, 235, 0.3) !important;
}

.category-btn-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive adjustments */
@media (max-width: 960px) {

  .carousel-card,
  .categories-card {
    margin-bottom: 1.5rem;
  }
}

/* Smooth animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.carousel-card,
.categories-card {
  animation: fadeIn 0.6s ease-out;
}

.categories-card {
  animation-delay: 0.2s;
  animation-fill-mode: both;
}
</style>