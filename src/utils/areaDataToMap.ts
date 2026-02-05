import type { IndicatorConfig } from "../types/IndicatorConfig";
import { DataToMap } from "./dataToMap";
import type { Map } from "maplibre-gl";
import type { Emitter } from "mitt";

/**
 * Handles area-based (polygon) data visualization on maps
 * Extends DataToMap to provide area-specific functionality like fill colors and outlines
 */
export class AreaDataToMap extends DataToMap {
  selectedGeography: string | null = null;

  constructor(
    data: IndicatorConfig,
    map: Map,
    side: "left" | "right" | null = null,
    emitter?: Emitter<any>,
    arrasBranding?: any,
    sitePath?: string
  ) {
    super(data, map, side, emitter, arrasBranding, sitePath);
    this.selectedGeography = null;
  }

  /**
   * Sets up the indicator by merging Google Sheets data with GeoJSON features
   * Updates the map source with enriched feature properties
   */
  async setupIndicator(year: number | null): Promise<boolean> {
    await super.setupIndicator?.(year);
    this.removeOldEvents();

    // Access protected map property through type assertion
    const map = (this as any).map as Map;
    const data = this.data;

    const source: any = map.getSource(data.source_name);
    const geojson = await source.getData();
    geojson.features = geojson.features.map((feature: any) => {
      let properties = data.google_sheets_data.data.find(
        (row: any) => +row.geoid === +feature.properties.geoid
      );
      Object.keys(properties).forEach((key: string) => {
        if(properties[key] === null || properties[key] === undefined) {
          delete properties[key];
        }
      });
      if (properties) {
        return {
          type: "Feature",
          geometry: feature.geometry,
          properties: properties,
        };
      }
      return false;
    });


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
   * Adds event handlers for mouse interactions on area features
   * Handles hover highlighting, popup display, and click selection
   */
  addNewEvents() {
    super.addNewEvents();
    const map = (this as any).map as Map;
    const mainLayer = this.data.layers.main;
    if (!map) return;
    const data = this.data;

    this.events.mousemove = (event: any) => {
      if(this.frozenPopup) return;
      // Create popup once
      this.createPopupIfNeeded();
      const features = map.queryRenderedFeatures(event.point, {
        layers: [mainLayer],
      });
      const harmonizedOutlineLayer = data.layers.outline;
      if (features.length > 0) {
        if (
          this.highlightedGeoid &&
          this.highlightedGeoid === features[0].properties.geoid
        ) {
          return;
        }
        this.highlightedGeoid = this.highlightedGeoid || features[0];
      } else {
        this.emitter?.emit(
          `feature-${this.side || "left"}-hovered`,
          null as any
        );
        if (harmonizedOutlineLayer) {
          map.setPaintProperty(harmonizedOutlineLayer, "line-color", [
            "case",
            ["==", ["get", "geoid"], "" + this.selectedGeography],
            ["literal", "#08ff"],
            "#0000",
          ]);
        }
        this.removePopup();
        return;
      }
      const feature = features[0];
      const properties = feature.properties;
      if (harmonizedOutlineLayer) {
        map.setPaintProperty(harmonizedOutlineLayer, "line-color", [
          "case",
          ["==", ["get", "geoid"], "" + properties.geoid],
          ["literal", "#000f"],
          ["==", ["get", "geoid"], "" + this.selectedGeography],
          ["literal", "#08ff"],
          "#0000",
        ]);
      }
      // Show popup with Vue component
      this.showPopup(
        event.lngLat,
        feature.properties,
        this.side as "left" | "right"
      );
      this.emitter?.emit(
        `feature-${this.side || "left"}-hovered`,
        feature.properties.geoid
      );
    };

    map.on("mousemove", this.events.mousemove);

    this.events.click = (event: any) => {
      if (!map) return;
      const features = map.queryRenderedFeatures(event.point, {
        layers: [mainLayer],
      });

      if (features.length === 0 || features[0].properties.geoid === this.selectedGeography) {
        this.emitter?.emit(
          `feature-${this.side || "left"}-clicked`,
          null as any
        );
        this.selectedGeography = null;
        if (data.layers.outline) {
          map.setPaintProperty(data.layers.outline, "line-color", "#0000");
        }
        return;
      }


      if(map.getLayer(data.layers.outline)) {
        map.setPaintProperty(data.layers.outline, "line-color", [
          "case",
          ["==", ["get", "geoid"], features[0].properties.geoid],
          ["literal", "#08ff"],
          "#0000",
        ]);
      }
      this.emitter?.emit(
        `feature-${this.side || "left"}-clicked`,
        features[0].properties.geoid
      );
      this.selectedGeography = features[0].properties.geoid;
    };
    map.on("click", this.events.click);
  }

 
  /**
   * Applies paint and layout properties to area layers
   * Sets fill color gradient based on data values and makes layers visible
   */
  async setPaintAndLayoutProperties(year: number | null) {
    await super.setPaintAndLayoutProperties(year);
    const map = (this as any).map as Map;
    if (!map) return false;
    const data = this.data;
    const fillColor = this.getGradientExpression();
    console.log(fillColor);
    if (!fillColor) {
      console.error("Failed to generate gradient expression");
      return false;
    }
    
    map.setPaintProperty(data.layers.main, "fill-color", fillColor);
    map.setLayoutProperty(data.layers.main, "visibility", "visible");
    if (data.layers.supplementary) {
      data.layers.supplementary.forEach((layer: string) => {
        console.log(layer);
        map.setLayoutProperty(layer, "visibility", "visible");
      });
    }
    return true;
  }

  /**
   * Area data uses existing GeoJSON sources, so this is a no-op
   * The GeoJSON is already loaded from the map style
   */
  generateGeojson() {
    super.generateGeojson();
  }
}
