import type { IndicatorConfig } from "../types/IndicatorConfig";
import type { Map, MapGeoJSONFeature } from "maplibre-gl";
import type { Emitter } from "mitt";
import maplibregl from "maplibre-gl";
import { createApp, type App, reactive } from "vue";
import Popup from "../components/Popup.vue";
import vuetify from "../plugins/vuetify.js";
import {
  YEAR_PATTERN,
  EXCLUDED_GEO_PATTERNS,
  MIN_MULTIPLIER,
  MAX_MULTIPLIER,
} from "../constants";
import { formatGoogleSheetData } from "./data-transformations.js";

/**
 * Base class for mapping indicator data to MapLibre GL maps
 * Handles common functionality for both area and point-based visualizations
 */
export class DataToMap {
  readonly data: IndicatorConfig;
  protected readonly map: Map;
  protected readonly emitter?: Emitter<any>;
  events: { click: any; mousemove: any; mouseleave: any };
  year: number | null;
  side: "left" | "right" | null;
  protected popup: any = null;
  protected frozenPopup: boolean = false;
  protected popupApp: App | null = null;
  protected highlightedGeoid: string | null | MapGeoJSONFeature = null;
  protected lastPopupGeoid: string | null | MapGeoJSONFeature = null;
  protected popupProperties: ReturnType<typeof reactive> | null = null;
  protected arrasBranding: any;
  protected sitePath: string;
  protected hoveringPlaceId: number = -1;
  minValue: number | null;
  maxValue: number | null;
  rangeValues: {
    count: { min: number | null; max: number | null };
    pop: { min: number | null; max: number | null };
    pct: { min: number | null; max: number | null };
    acres: { min: number | null; max: number | null };
  };
  constructor(
    _data: IndicatorConfig,
    _map: Map,
    side: "left" | "right" | null = null,
    _emitter?: Emitter<any>,
    _arrasBranding?: any,
    _sitePath?: string,
  ) {
    this.data = _data;
    this.map = _map;
    this.emitter = _emitter;
    this.events = {
      click: null,
      mousemove: null,
      mouseleave: null,
    };
    this.year = null;
    this.side = side;
    this.highlightedGeoid = null;
    this.arrasBranding = _arrasBranding;
    this.sitePath = _sitePath || "";
    this.hoveringPlaceId = -1;

    this.minValue = null;
    this.maxValue = null;

    this.rangeValues = {
      count: {
        min: 0,
        max: 100,
      },
      pop: {
        min: 0,
        max: 100,
      },
      pct: {
        min: 0,
        max: 100,
      },
      acres: {
        min: 0,
        max: 100,
      },
    };
  }

  async setupIndicator(year: number | null): Promise<boolean> {
    this.year = year || this.year || null;
    this.rangeValues.pop.min = this.getMin("pop") ?? null;
    this.rangeValues.pop.max = this.getMax("pop") ?? null;
    this.rangeValues.pct.min = this.getMin("pct") ?? null;
    this.rangeValues.pct.max = this.getMax("pct") ?? null;
    this.rangeValues.count.min = this.getMin("count") ?? null;
    this.rangeValues.count.max = this.getMax("count") ?? null;
    this.rangeValues.acres.min = this.getMin("acres") ?? null;
    this.rangeValues.acres.max = this.getMax("acres") ?? null;
    const { minValue, maxValue } = this.getMinMaxValues();
    this.minValue = minValue;
    this.maxValue = maxValue;
    const legendExtra = this.data.legend?.extra_layers as { data_merge?: { source?: string; google_sheets_url?: string } } | undefined;
    if(legendExtra?.data_merge) {
      await this.generateExtraGeojson(legendExtra.data_merge);
    }
    // Don't mutate shared indicator config - values are stored in instance properties
    return true;
  }

  /**
   * Generates GeoJSON from data
   * Overridden by subclasses (AreaDataToMap uses existing sources, PointDataToMap generates from coordinates)
   */
  async generateExtraGeojson(dataMerge: { source?: string; google_sheets_url?: string } | undefined) {
    if(!this.map || !this.data) return null;
    if(!dataMerge) return null;
    const googleSheetsUrl = dataMerge?.google_sheets_url;
   
    if (dataMerge?.source) {
      const source = this.map.getSource(dataMerge.source as string);
      if (source) {
        const geojson = await (source as any).getData();
        if (googleSheetsUrl) {
          const response = await fetch(googleSheetsUrl);
          const data = await response.text();
          const formattedData = formatGoogleSheetData(data);
          geojson.features = geojson.features.map((feature: any) => {
            const row = formattedData.data.find((row: any) => +row.geoid === +feature.properties.geoid);
            if (row) {
              return {
                ...feature,
                properties: row,
              };
            }
          });
        }
        if (source && typeof (source as any).setData === "function") {
          (source as any).setData(geojson);
        } else {
          console.error(`Source ${dataMerge.source} not found`);
        }
      }
    }
    return null;
  }

  /**
   * Generates a MapLibre GL expression for gradient fill color based on data values
   * @returns MapLibre expression array or false if data is invalid
   */
  getGradientExpression() {
    const data = this.data;
    // Use instance properties if available, otherwise calculate
    const minValue = this.minValue || this.getMinMaxValues().minValue;
    const maxValue = this.maxValue || this.getMinMaxValues().maxValue;
    const minColor = this.arrasBranding.colors[data.style.min.color];
    const maxColor = this.arrasBranding.colors[data.style.max.color];
    // Don't mutate shared indicator config - values are stored in instance properties

    if (
      !data ||
      !data.layers ||
      !data.layers.main ||
      !data.style ||
      !data.style.min ||
      !data.style.max
    ) {
      console.error("Missing required data properties:", {
        data,
        layers: data?.layers,
        style: data?.style,
      });
      return false;
    }
    const yearValuePrefix = this.data.timeline?.yearValuePrefix || "";
    // Create MapLibre expression: interpolate color based on year value
    const fillExp = [
      "case",
      ["has", yearValuePrefix + String(this.year)],
      [
        "interpolate",
        ["linear"],
        ["to-number", ["get", yearValuePrefix + String(this.year)]],
        minValue,
        minColor,
        maxValue,
        maxColor,
      ],
      "#0000",
    ];

    if (!data.layers.main) {
      console.error("data.layers.main is undefined");
      return false;
    }
    return fillExp;
  }
  /**
   * Hides all layers associated with this indicator
   * Used when switching indicators or cleaning up
   */
  hideLayers() {
    if (!this.map) return;
    if (this.data.layers.main) {
      //console.log('off ', this.data.layers.main);
      this.map.setLayoutProperty(this.data.layers.main, "visibility", "none");
    }
    if (this.data.layers.outline) {
      //console.log('off outline', this.data.layers.outline);
      this.map.setLayoutProperty(
        this.data.layers.outline,
        "visibility",
        "none",
      );
    }
    if (this.data.legend?.extra_layers?.layer_name) {
      this.map.setLayoutProperty(
        this.data.legend?.extra_layers?.layer_name,
        "visibility",
        "none",
      );
    }
    if (this.data.layers.circle) {
      //console.log('off circle', this.data.layers.circle);
      this.map.setLayoutProperty(this.data.layers.circle, "visibility", "none");
    }
  }

  //This may be getting called too much but not a huge problem. Better than not enough.
  removeOldEvents() {
    if (!this.map) {
      // Clean up popup even if map is gone
      if (this.popupApp) {
        this.popupApp.unmount();
        this.popupApp = null;
      }
      if (this.popup) {
        this.popup.remove();
        this.popup = null;
      }
      return;
    }
    if (this.events.click) {
      this.map.off("click", this.events.click);
    }
    if (this.events.mousemove) {
      this.map.off("mousemove", this.events.mousemove);
    }
    if (this.events.mouseleave) {
      this.map.off("mouseleave", this.events.mouseleave);
    }
    if (this.popupApp) {
      this.popupApp.unmount();
      this.popupApp = null;
    }
    if (this.popup) {
      this.popup.remove();
      this.popup = null;
    }
  }
  /**
   * Adds base event handlers for mouse interactions
   * Subclasses override this to add their specific event handling
   */
  addNewEvents() {
    this.events.mouseleave = () => {
      if (this.frozenPopup || !this.popup) return;
      this.removePopup();
    };
    const mainLayer = this.data.layers.main;
    this.map.on("mouseleave", mainLayer, this.events.mouseleave);

    this.events.mousemove = (event: any) => {
      const features = this.map.queryRenderedFeatures(event.point, {
        layers: ["places-fill"],
      });
      if (features.length > 0) {
        this.hoveringPlaceId = features[0].id as number;
        this.map.setFeatureState(
          { source: "places-source", id: this.hoveringPlaceId },
          { hover: true },
        );
      } else {
        this.map.setFeatureState(
          { source: "places-source", id: this.hoveringPlaceId },
          { hover: false },
        );
        this.hoveringPlaceId = -1;
      }
    };

    this.map.on("mousemove", this.events.mousemove);

    this.events.click = (_event: any) => {
      this.frozenPopup = !this.frozenPopup;
    };
    this.map.on("click", this.events.click);
  }

  /**
   * Creates a MapLibre popup instance if one doesn't exist
   * Popup is reused across interactions to improve performance
   */
  protected createPopupIfNeeded() {
    if (!this.popup) {
      this.popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
        closeOnMove: false,
        focusAfterOpen: false,
      });
    }
  }

  /**
   * Shows a popup at the specified location with feature properties
   * Optimizes performance by reusing Vue app instances when the same feature is hovered
   * @param lngLat - Map coordinates where popup should appear
   * @param properties - Feature properties to display in popup
   * @param side - Which map side ('left' or 'right') for unique container ID
   */
  protected showPopup(lngLat: any, properties: any, side: "left" | "right") {
    if (!this.map) return;

    // Get the geoid from properties to detect if we're hovering the same feature
    const currentGeoid = properties?.geoid || properties?.id || null;
    const geoidChanged = currentGeoid !== this.lastPopupGeoid;

    // Use unique container ID based on side to avoid conflicts between left and right popups
    const containerId = `popup-container-${side}`;
    this.createPopupIfNeeded();

    // Always update popup position
    this.popup.setLngLat(lngLat);

    // Only recreate the HTML container if geoid changed or popup doesn't exist
    if (geoidChanged || !this.popupApp) {
      this.popup.setHTML(`<div id="${containerId}"></div>`).addTo(this.map);
    }

    const popupContainer = document.getElementById(containerId);

    if (popupContainer) {
      if (geoidChanged || !this.popupApp) {
        // Unmount existing app if it exists
        if (this.popupApp) {
          this.popupApp.unmount();
          this.popupApp = null;
        }

        // Create reactive object for properties
        this.popupProperties = reactive({ ...properties });

        // Create and mount new app instance with reactive properties
        this.popupApp = createApp(Popup, {
          properties: this.popupProperties,
          side,
        }).use(vuetify);
        this.popupApp.mount(popupContainer);

        // Update last geoid to track which feature is currently displayed
        this.lastPopupGeoid = currentGeoid;
      } else {
        // Same geoid - just update the reactive properties by copying new values
        // This avoids unnecessary Vue component recreation
        if (this.popupProperties) {
          Object.assign(this.popupProperties, properties);
        }
      }
    }
  }

  /**
   * Removes the popup from the map and cleans up Vue app instance
   * Called when mouse leaves a feature or when switching indicators
   */
  protected removePopup() {
    if (this.popupApp) {
      this.popupApp.unmount();
      this.popupApp = null;
    }
    if (this.popup) {
      this.popup.remove();
      this.popup = null;
    }
    this.lastPopupGeoid = null;
    this.popupProperties = null;
  }

  /**
   * Sets basic paint and layout properties for map layers
   * Makes main and outline layers visible
   * Subclasses override this to add their specific styling
   * @param year - The year to apply properties for
   * @returns Promise resolving to true on success, false on failure
   */
  async setPaintAndLayoutProperties(year: number | null) {
    if (!this.map) return false;
    this.year = year || this.year || null;

    if (this.map && this.data.layers.main) {
      this.map.setLayoutProperty(
        this.data.layers.main,
        "visibility",
        "visible",
      );
    }
    if (this.map && this.data.layers.outline) {
      this.map.setLayoutProperty(
        this.data.layers.outline,
        "visibility",
        "visible",
      );
    }
    if (this.map && this.data.legend?.extra_layers?.layer_name) {
      this.map.setLayoutProperty(
        this.data.legend?.extra_layers?.layer_name,
        "visibility",
        "visible",
      );
      const styling = this.data.legend?.extra_layers?.styling;
      if(styling) {
        if(styling.image) {
          const image = await this.map.loadImage(styling.image.url);
          this.map.addImage(styling.image.id, image.data);
        }
          if(styling.paint) {
            Object.entries(styling.paint).forEach(([key, value]) => {
              this.map.setPaintProperty(this.data.legend?.extra_layers?.layer_name as string, key, value);
            });
        }
        if(styling.filter) {
          const _filter = JSON.stringify(styling.filter)
          .replace(/\{\{pct\}\}/g, `pct_${year || this.year}`)
          .replace(/\{\{count\}\}/g, `count_${year || this.year}`)
          .replace(/\{\{pop\}\}/g, `pop_${year || this.year}`);

          const parsedFilter = JSON.parse(_filter);
          this.map.setFilter(this.data.legend?.extra_layers?.layer_name as string, parsedFilter);

        }
      }
    }
    return true;
  }

  getAllYears() {
    const shortNames = this.data.google_sheets_data.headerShortNames;
    return Array.from(
      new Set(
        shortNames
          .map((year: string) =>
            Number(
              year
                .toLowerCase()
                .replace("count_", "")
                .replace("pop_", "")
                .replace("pct_", ""),
            ),
          )
          .filter((year: string | number) => !isNaN(+year)),
      ),
    );
  }

  getMinForYear(prop: string, year: number | null) {
    const data = this.data.google_sheets_data.data;
    let filteredData;
    if (prop === "acres") {
      filteredData = data.filter(
        (feature: any) =>
          feature.geoid !== null &&
          feature.geoid !== undefined &&
          feature["acres"] !== null &&
          feature["acres"] !== undefined,
      );
    } else {
      filteredData = data.filter(
        (feature: any) =>
          feature.geoid !== null &&
          feature.geoid !== undefined &&
          feature[prop + "_" + (year || this.year)] !== null &&
          feature[prop + "_" + (year || this.year)] !== undefined,
      );
    }

    if (prop === "pop" || prop === "count" || prop === "acres") {
      filteredData = filteredData.filter(
        (feature: any) =>
          !EXCLUDED_GEO_PATTERNS.some((pattern) =>
            feature?.geoid?.toLowerCase()?.includes(pattern),
          ),
      );
    }
    if (filteredData.length === 0) {
      console.warn(year, prop, "no data");
      return null;
    }

    let min;
    if (prop === "acres") {
      min = Math.min(...filteredData.map((feature: any) => +feature["acres"]));
    } else {
      min = Math.min(
        ...filteredData.map(
          (feature: any) => +feature[prop + "_" + (year || this.year)],
        ),
      );
    }
    if (isNaN(+min)) {
      console.warn(year, prop, "isNaN", min);
      return Number.MAX_SAFE_INTEGER;
    }
    // if (prop === "pct") {
    //   if (min < 0) {
    //     return 0;
    //   }
    // }
    return min;
  }
  getMaxForYear(prop: string, year: number | null) {
    const data = this.data.google_sheets_data.data;
    let filteredData;
    if (prop === "acres") {
      filteredData = data.filter(
        (feature: any) =>
          feature.geoid !== null &&
          feature.geoid !== undefined &&
          feature["acres"] !== null &&
          feature["acres"] !== undefined,
      );
    } else {
      filteredData = data.filter(
        (feature: any) =>
          feature.geoid !== null &&
          feature.geoid !== undefined &&
          feature[prop + "_" + (year || this.year)] !== null &&
          feature[prop + "_" + (year || this.year)] !== undefined,
      );
    }

    if (prop === "pop" || prop === "count" || prop === "acres") {
      filteredData = filteredData.filter(
        (feature: any) =>
          !EXCLUDED_GEO_PATTERNS.some((pattern) =>
            feature?.geoid?.toLowerCase()?.includes(pattern),
          ),
      );
    }
    if (filteredData.length === 0) {
      console.warn(year, prop, "no data");
      return Number.MAX_SAFE_INTEGER;
    }
    let max;
    if (prop === "acres") {
      max = Math.max(...filteredData.map((feature: any) => +feature["acres"]));
    } else {
      max = Math.max(
        ...filteredData.map(
          (feature: any) => +feature[prop + "_" + (year || this.year)],
        ),
      );
    }
    if (isNaN(max)) {
      console.warn(year, prop, "isNaN", max);
      return Number.MAX_SAFE_INTEGER;
    }
    // if (prop === "pct") {
    //   if (max > 100) {
    //     return 100;
    //   }
    // }
    return max;
  }
  getMin(prop: string) {
    let min = Number.MAX_SAFE_INTEGER;
    const years = this.getAllYears();
    for (let yearIdx = 0; yearIdx < years.length; yearIdx++) {
      const year = years[yearIdx] as number;
      const yearValue = this.getMinForYear(prop, +year as number);
      if (yearValue !== null && yearValue < min && !isNaN(yearValue)) {
        min = yearValue as number;
      }
    }
    return min;
  }

  getMax(prop: string) {
    let max = 0;
    const years = this.getAllYears();
    for (let yearIdx = 0; yearIdx < years.length; yearIdx++) {
      const year = years[yearIdx] as number;
      const yearValue = this.getMaxForYear(prop, +year as number);
      if (yearValue !== null && yearValue > max && !isNaN(yearValue)) {
        max = yearValue as number;
      }
    }
    return max;
  }

  /**
   * Calculates min and max values across all years in the dataset
   * Filters out excluded geographies (overall, statewide, school districts)
   * @returns Object with minValue and maxValue
   */
  //TODO: Replace this with new getMin and getMax methods
  getMinMaxValues() {
    const data = this.data;

    const yearValuePrefix = data.timeline?.yearValuePrefix || "";
    let years = data.google_sheets_data.headerShortNames.filter(
      (year: string) =>
        yearValuePrefix.length > 0
          ? year.startsWith(yearValuePrefix)
          : YEAR_PATTERN.test(year) && !isNaN(Number(year)),
    );
    //console.log(years);

    let minValue = Number.MAX_SAFE_INTEGER;
    let maxValue = 0;

    // Calculate min/max across all years
    for (let yearIdx = 0; yearIdx < years.length; yearIdx++) {
      const yearColumn = years[yearIdx] as string;

      const yearValues = data.google_sheets_data.data
        .filter((feature: any) => {
          const geoid = feature?.geoid?.toLowerCase() || "";
          const name = feature?.name?.toLowerCase() || "";
          return !EXCLUDED_GEO_PATTERNS.some(
            (pattern) => geoid.includes(pattern) || name.includes(pattern),
          );
        })
        .map((feature: any) => feature[yearColumn])
        .filter(
          (value: any) =>
            value !== null && value !== undefined && !isNaN(Number(value)),
        );
      if (yearValues.length === 0) continue;

      const thisYearMinValue = Math.min(...yearValues);
      const thisYearMaxValue = Math.max(...yearValues);

      if (thisYearMinValue < minValue) {
        minValue = thisYearMinValue;
      }
      if (thisYearMaxValue > maxValue) {
        maxValue = thisYearMaxValue;
      }
    }
    // Apply multipliers to provide visual padding
    return {
      minValue: Math.floor(minValue * MIN_MULTIPLIER),
      maxValue: Math.ceil(maxValue * MAX_MULTIPLIER),
    };
  }
}
