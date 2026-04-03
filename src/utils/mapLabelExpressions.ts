/**
 * MapLibre layout expressions to drop a trailing municipal-type suffix.
 * Strips " town", " Town", " city", " City" when they appear as the final segment
 * (e.g. "Lockhart town" -> "Lockhart").
 */
function stripMunicipalSuffixExpression(property: string): unknown[] {
  return [
    "let",
    "n",
    ["coalesce", ["get", property], ""],
    [
      "case",
      [
        "all",
        [">=", ["length", ["var", "n"]], 5],
        [
          "==",
          ["index-of", " town", ["var", "n"]],
          ["-", ["length", ["var", "n"]], 5],
        ],
      ],
      ["slice", ["var", "n"], 0, ["-", ["length", ["var", "n"]], 5]],
      [
        "all",
        [">=", ["length", ["var", "n"]], 5],
        [
          "==",
          ["index-of", " Town", ["var", "n"]],
          ["-", ["length", ["var", "n"]], 5],
        ],
      ],
      ["slice", ["var", "n"], 0, ["-", ["length", ["var", "n"]], 5]],
      [
        "all",
        [">=", ["length", ["var", "n"]], 5],
        [
          "==",
          ["index-of", " city", ["var", "n"]],
          ["-", ["length", ["var", "n"]], 5],
        ],
      ],
      ["slice", ["var", "n"], 0, ["-", ["length", ["var", "n"]], 5]],
      [
        "all",
        [">=", ["length", ["var", "n"]], 5],
        [
          "==",
          ["index-of", " City", ["var", "n"]],
          ["-", ["length", ["var", "n"]], 5],
        ],
      ],
      ["slice", ["var", "n"], 0, ["-", ["length", ["var", "n"]], 5]],
      ["var", "n"],
    ],
  ];
}

const LEGACY_TEXT_FIELD_TOKENS: Record<string, string> = {
  "{_name_global}": "_name_global",
  "{_name}": "_name",
};

/**
 * Mutates a loaded MapLibre style: replaces simple {token} text fields with
 * suffix-stripping expressions for place-style labels.
 */
export function applyMunicipalSuffixStripToStyle(style: { layers?: any[] }) {
  if (!style?.layers?.length) return;
  for (const layer of style.layers) {
    if (layer?.type !== "symbol" || !layer.layout?.["text-field"]) continue;
    const tf = layer.layout["text-field"];
    if (typeof tf !== "string") continue;
    const prop = LEGACY_TEXT_FIELD_TOKENS[tf];
    if (!prop) continue;
    layer.layout["text-field"] = stripMunicipalSuffixExpression(prop);
  }
}
