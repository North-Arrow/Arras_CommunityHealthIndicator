import { ARCGIS_TOKEN } from "./arcgisConfig";
import { sources, layers } from "./addedData.json";
import { applyMunicipalSuffixStripToStyle } from "./mapLabelExpressions";
export default async function createArcGISStyle(sitePath: string) {
  const USE_LOCAL_STYLE = true;
  if(USE_LOCAL_STYLE) {
    const local = await fetch(
      sitePath + 'assets/localStyle.json'
    ).then((res) => res.json());
    applyMunicipalSuffixStripToStyle(local);
    return local;
  }
  const _token = ARCGIS_TOKEN;
  const STYLES = {
    "navigation": "styles/open/navigation",
    "human-detail":"styles/arcgis/human-geography/detail",
    "light-gray":"styles/arcgis/light-gray"
  }
  const styleName = "light-gray";
  const style = await fetch(
    `https://basemapstyles-api.arcgis.com/arcgis/rest/services/styles/v2/${STYLES[styleName]}?token=${_token}`
  ).then((res) => res.json());
  
  style.sources = {
    ...style.sources,
    ...JSON.parse(
      JSON.stringify(sources)
      .replace(/\$\{sitePath\}/g, sitePath)
      .replace(/\$\{_token\}/g, _token)
    ) as any
  };
  
  const indexOfPlacesLabel = style.layers.findIndex(
    (layer: any) => layer.id === "admin 2"
  );
  style.layers.splice(indexOfPlacesLabel, 0, ...(layers["under-labels"] as any));
  style.layers.push(...(layers["over-labels"] as any));

  return style;
}
