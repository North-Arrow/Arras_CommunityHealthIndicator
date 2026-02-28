import type { IndicatorConfig } from "../types/IndicatorConfig";
import { DataToMap } from "./dataToMap";
import { type Map } from "maplibre-gl";
import type { Emitter } from "mitt";
import {
  POINT_SIZE_MIN,
  POINT_SIZE_MAX,
  POINT_SIZE_VALUE_MIN,
  POINT_SIZE_VALUE_MAX,
  CIRCLE_OPACITY_DEFAULT,
  CIRCLE_OPACITY_HOVER
} from "../constants";

export class PointDataToMap extends DataToMap {


  constructor(
    data: IndicatorConfig,
    map: Map,
    side: "left" | "right" | null = null,
    emitter?: Emitter<any>,
    arrasBranding?: any,
    sitePath?: string
  ) {
    super(data, map, side, emitter, arrasBranding as any, sitePath);

    this.arrasBranding = arrasBranding as any;
  }

  /**
   * Generates a MapLibre GL expression for circle radius based on data values
   * Uses Cohort_ prefix if both count and percentage are available, otherwise count_ prefix
   * @returns MapLibre expression array for circle-radius property
   */
  getSizeExpression() {
    const data = this.data;
    let propAccessor = data.map?.size + '_' + String(this.year);
    if (!propAccessor) {
      return POINT_SIZE_MIN + 3;
    }
    
    const sizeExp = [
      "case",
      ["has", propAccessor],
      [
        "interpolate",
        ["linear"],
        ["to-number", ["get", propAccessor]],
        POINT_SIZE_VALUE_MIN,
        POINT_SIZE_MIN,
        POINT_SIZE_VALUE_MAX,
        POINT_SIZE_MAX,
      ],
      POINT_SIZE_MIN + 3, // Default size when no data
    ];
    
    return sizeExp;
  }

  async setupIndicator(year: number | null): Promise<boolean> {
    await super.setupIndicator?.(year);
    this.removeOldEvents();
    const geojson = this.generateGeojson();

    const map = (this as any).map as Map;
    const data = this.data;
    const source: any = await map.getSource(data.source_name);

    if (source && typeof source.setData === "function") {
      source.setData(geojson);
    } else {
      console.error(`Source ${data.source_name} not found`);
    }
    await this.setPaintAndLayoutProperties(year);
    this.addNewEvents();
    return true;
  }



  removeOldEvents() {
    super.removeOldEvents();
  }

  /**
   * Adds event handlers for mouse interactions on point features
   * Handles hover highlighting, popup display, and click to freeze/unfreeze popup
   */
  addNewEvents() {
    super.addNewEvents();
    const map = (this as any).map as Map;
    const mainLayer = this.data.layers.main;

    if (!map) return;

    this.events.mousemove = (event: any) => {
    //  if (this.frozenPopup) return;
      this.createPopupIfNeeded();
      const features = map.queryRenderedFeatures(event.point, {
        layers: [mainLayer],
      });

      if (features.length === 0) {
        map.setPaintProperty(mainLayer, "circle-opacity", CIRCLE_OPACITY_DEFAULT);
        this.removePopup();
        this.emitter?.emit(`feature-${this.side || "left"}-hovered`, null);
        this.emitter?.emit(`feature-name-${this.side || "left"}-hovered`, null);
        return;
      } else {
        map.setPaintProperty(mainLayer, "circle-opacity", [
          "case",
          ["==", ["get", "geoid"], features[0].properties.geoid],
          CIRCLE_OPACITY_HOVER,
          CIRCLE_OPACITY_DEFAULT,
        ]);

        // Show popup with Vue component
        this.showPopup(
          event.lngLat,
          features[0].properties,
          this.side as "left" | "right"
        );

        this.emitter?.emit(
          `feature-${this.side || "left"}-hovered`,
          features[0].properties.geoid
        );

        this.emitter?.emit(
          `feature-name-${this.side || "left"}-hovered`,
          features[0].properties.name ?? features[0].properties.geoid
        );
      }
    };
    map.on("mousemove", this.events.mousemove);

    this.events.click = (event: any) => {
      if (!map) return;
      const features = map.queryRenderedFeatures(event.point, {
        layers: [mainLayer],
      });
      //console.log(features);
      if (features.length === 0) {
        this.emitter?.emit(`feature-${this.side || "left"}-clicked`, null as any);
      } else {
        this.emitter?.emit(`feature-${this.side || "left"}-clicked`, features[0].properties.geoid);
        this.emitter?.emit(`feature-name-${this.side || "left"}-clicked`, features[0].properties.name ?? features[0].properties.geoid);
      }
    };
    map.on("click", this.events.click);
    
  }

  /**
   * Applies paint and layout properties to point layers
   * Sets circle radius, color, opacity, and sort key based on data values
   */
  async setPaintAndLayoutProperties(year: number | null) {
    await super.setPaintAndLayoutProperties(year);
    const map = (this as any).map as Map;
    if (!map) return false;
    const mainLayer = this.data.layers.main;
    map.setLayoutProperty(mainLayer, "visibility", "visible");
    map.setPaintProperty(mainLayer, "circle-radius", this.getSizeExpression());
    map.setPaintProperty(mainLayer, "circle-opacity", CIRCLE_OPACITY_DEFAULT);
    
    // Set sort key to ensure larger circles render on top
    map.setLayoutProperty(mainLayer, "circle-sort-key", [
      "case",
      ["has", `cohort_${this.year}`],
      ["/", 1, ["to-number", ["get", `cohort_${this.year}`]]],
      ["has", `count_${this.year}`],
      ["/", 1, ["to-number", ["get", `count_${this.year}`]]],
      ["has", `pct_${this.year}`],
      ["/", 1, ["to-number", ["get", `pct_${this.year}`]]],
      0,
    ]);

    const maxColor = this.arrasBranding.colors[this.data.style.max.color];
    const circleColor =
      this.data.map?.color === null
        ? maxColor
        : this.getGradientExpression();

    map.setPaintProperty(mainLayer, "circle-color", circleColor);

    map.setLayoutProperty(mainLayer, "visibility", "visible");

    return true;
  }

  /**
   * Generates GeoJSON from Google Sheets data
   * Converts tabular data with lat/lng coordinates into GeoJSON Point features
   * @returns GeoJSON FeatureCollection with Point geometries
   */
   generateGeojson() {
    const rawGoogleData = this.data.google_sheets_data.data;
    const geojson = {
      type: "FeatureCollection",
      features: rawGoogleData.map((row: any) => {
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [+row.lng, +row.lat],
          },
          properties: row,
        };
      }),
    };
    //console.log(geojson);
    return geojson;
  }
}
