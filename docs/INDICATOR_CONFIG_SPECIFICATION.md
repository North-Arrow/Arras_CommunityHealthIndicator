# Indicator Configuration Specification

This document specifies the format for indicator configuration JSON files used in the Arras Community Health Indicator application. The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

## File Structure

Each configuration file MUST be a valid JSON object containing a single `indicators` array.

```json
{
  "indicators": [
    {
      // indicator object
    }
  ]
}
```

## Indicator Object

Each indicator object in the `indicators` array represents a single data visualization indicator.

### Required Properties

The following properties MUST be present in every indicator object:

#### `title` (string)
- **Type**: String
- **Description**: REQUIRED. Human-readable display name for the indicator
- **Example**: `"Adults with Bachelor's Degree or Higher"`

#### `short_title` (string)
- **Type**: String
- **Description**: REQUIRED. Shortened version of the title for use in UI components with limited space
- **Usage**: MUST be provided. The full `title` is often too long for compact UI elements (e.g., dropdown menus, small buttons, tooltips)
- **Example**: `"Bachelor's Degree"` (for title "Adults with Bachelor's Degree or Higher")

#### ~~`geolevel` (string)~~
#### DEPRICATED (Moved to main.json config)
- **Type**: String
- **Description**: Geographic level of the data visualization
- **Allowed Values**: 
  - `"area"` - For area-based visualizations (tracts, counties)
  - `"point"` - For point-based visualizations (schools, facilities)
- **Example**: `"area"`

#### `geotype` (string)
- **Type**: String
- **Description**: Specific geographic type for the indicator
- **Allowed Values**: 
  - `"tract"` - Census tracts
  - `"county"` - Counties
  - `"school"` - Schools
  - `"facility"` - Facilities
- **Example**: `"tract"`

#### `default` (string | boolean)
- **Type**: String or Boolean
- **Description**: Default map side for this indicator when the category is first loaded
- **Allowed Values**: 
  - `"left"` - Display on left map by default
  - `"right"` - Display on right map by default
  - `false` - Do not display by default (user must select)
- **Note**: Empty string (`""`) MUST NOT be used; use `false` instead
- **Example**: `"left"` or `false`

#### `google_sheets_url` (string)
- **Type**: String (URL)
- **Description**: Public Google Sheets CSV export URL containing the indicator data
- **Format**: MUST be a valid URL ending with `&output=csv`
- **Example**: `"https://docs.google.com/spreadsheets/d/e/.../pub?gid=123&single=true&output=csv"`

#### ~~`source_name` (string)~~
#### DEPRICATED (Moved to main.json config)
- **Type**: String
- **Description**: MapLibre GL source identifier for the geographic data
- **Common Values**: 
  - `"tracts-harmonized"` - For tract-level area data
  - `"counties-source"` - For county-level area data
  - `"points-source"` - For point-based data
- **Example**: `"tracts-harmonized"`

#### `short_name` (string)
- **Type**: String
- **Description**: REQUIRED. Unique identifier for the indicator (used in URLs and internal references)
- **Format**: SHOULD be lowercase with underscores or hyphens, no spaces or special characters
- **Example**: `"bachelor_degree"` or `"no_health_insurance"`

#### ~~`layers` (object)~~
#### DEPRICATED (Moved to main.json config)
- **Type**: Object
- **Description**: MapLibre GL layer identifiers for rendering
- **Required Properties**:
  - `main` (string) - REQUIRED. Main layer identifier
- **Optional Properties**:
  - `outline` (string | null) - Outline layer identifier for area-based indicators, or `null` if not applicable
  - `circle` (string | boolean | null) - Circle layer identifier for point-based indicators, `false` if disabled, or `null` if not applicable
- **Example**:
  ```json
  {
    "main": "tracts-harmonized-fill",
    "outline": "tracts-harmonized-outline"
  }
  ```
  or for points:
  ```json
  {
    "main": "point-data",
    "circle": false
  }
  ```

#### `timeline` (object)
- **Type**: Object
- **Description**: Configuration for timeline visualization
- **Required Properties**:
  - `yearValuePrefix` (string) - REQUIRED. Prefix for year-based data columns (e.g., `"pct_"`, `"count_"`, `"pop_"`)
  - `yearValueShortFormat` (string) - REQUIRED. Format string for displaying values in timeline, using `{{value}}` placeholder
  - `filterOut` (array) - REQUIRED. Array of strings representing geoid patterns to exclude from visualization. MUST be an array (empty array `[]` if no filters)
- **Example**:
  ```json
  {
    "yearValuePrefix": "pct_",
    "yearValueShortFormat": "{{value}}%",
    "filterOut": []
  }
  ```

#### `popup` (object)
- **Type**: Object
- **Description**: Configuration for popup display when clicking/hovering features
- **Required Properties**:
  - `format` (object) - REQUIRED. Format strings for popup display
    - `title` (string) - REQUIRED. Title format string using placeholders like `{{pct}}`, `{{count}}`, `{{pop}}`
    - `subtitle` (string | null) - OPTIONAL. Subtitle format string, or `null` if no subtitle
- **Example**:
  ```json
  {
    "format": {
      "title": "{{pct}}% of adults",
      "subtitle": "{{count}} adults"
    }
  }
  ```

#### `legend` (object)
- **Type**: Object
- **Description**: Configuration for color legend display
- **Required Properties**:
  - At least one of the following MUST be present:
    - `title` (string) - Primary legend title format string
    - `title-column` (string) - Column type (`"pct"`, `"count"`, or `"pop"`) used to populate the title
- **Optional Properties**:
  - `title-column` (string) - Column type for primary title (SHOULD be used when `title` uses placeholders like `{{pct}}`)
  - `secondary-title-column` (string) - Column type for secondary title
  - `secondary-title` (string) - Secondary legend title format string
- **Note**: If `title-column` is provided, `title` SHOULD use the corresponding placeholder (e.g., `{{pct}}` if `title-column` is `"pct"`)
- **Example**:
  ```json
  {
    "title-column": "pct",
    "title": "{{pct}}% of adults"
  }
  ```
  or with secondary title:
  ```json
  {
    "title-column": "pop",
    "title": "{{pop}} students tested",
    "secondary-title-column": "pct",
    "secondary-title": "{{pct}}% of students ready"
  }
  ```

### Optional Properties

The following properties MAY be present in indicator objects:

#### `tooltip-info` (string)
- **Type**: String
- **Description**: OPTIONAL. Longer descriptive text shown in UI tooltips/info panels for the indicator (definition, context, caveats, and data notes)
- **Usage**: Recommended for providing a plain-language explanation and interpretation guidance (e.g., what higher/lower values mean, and key limitations)
- **Example**: `"This indicator measures the share of adults who smoke cigarettes. Values are shown by census tract and year where available. Higher values indicate a larger share of adults who smoke."`

#### `map` (object)
- **Type**: Object
- **Description**: Configuration for map visualization styling
- **Properties**:
  - `size` (string) - OPTIONAL. Column type used for point size (`"count"`, `"pop"`, or `"pct"`). Used for point-based indicators only
  - `color` (string | null) - OPTIONAL. Column type used for color gradient (`"pct"`, `"count"`, or `"pop"`), or `null` for single color
- **Example**:
  ```json
  {
    "size": "pop",
    "color": "pct"
  }
  ```
  or for area-based indicators:
  ```json
  {
    "color": "pct"
  }
  ```
  
## Data Column Naming Convention

Google Sheets data MUST follow this column naming convention:
- Year-based columns MUST use the format: `{prefix}_{year}` where:
  - `prefix` is one of: `pct_`, `count_`, or `pop_`
  - `year` is a 4-digit year (e.g., `2020`)
- Examples: `pct_2020`, `count_2020`, `pop_2020`

## Template String Placeholders

The following placeholders MAY be used in format strings:
- `{{pct}}` - Percentage value
- `{{count}}` - Count value
- `{{pop}}` - Population value
- `{{value}}` - Generic value (used in timeline format)

## Property Ordering

While property order does not affect functionality, the following order is RECOMMENDED for consistency:
1. `title`
2. `short_title` (if present)
3. `geolevel`
4. `geotype`
4. `default`
5. `google_sheets_url`
6. `source_name`
7. `short_name`
8. `layers`
9. `timeline`
10. `popup`
11. `legend`
12. `map` (if present)

## Examples

### Area-Based Indicator (Tract)
```json
{
  "title": "Adults with Bachelor's Degree or Higher",
  "short_title": "Bachelor's Degree",
  "geolevel": "area",
  "geotype": "tract",
  "default": "left",
  "google_sheets_url": "https://docs.google.com/spreadsheets/d/e/.../pub?gid=123&single=true&output=csv",
  "source_name": "tracts-harmonized",
  "short_name": "bachelor_degree",
  "layers": {
    "main": "tracts-harmonized-fill",
    "outline": "tracts-harmonized-outline"
  },
  "timeline": {
    "yearValuePrefix": "pct_",
    "yearValueShortFormat": "{{value}}%",
    "filterOut": []
  },
  "popup": {
    "format": {
      "title": "{{pct}}% of adults",
      "subtitle": "{{count}} adults"
    }
  },
  "legend": {
    "title-column": "pct",
    "title": "{{pct}}% of adults"
  },
  "map": {
    "color": "pct"
  }
}
```

### Point-Based Indicator (School)
```json
{
  "title": "3rd Grade Math Readiness",
  "short_title": "3rd Grade Math Ready",
  "geolevel": "point",
  "geotype": "school",
  "default": false,
  "google_sheets_url": "https://docs.google.com/spreadsheets/d/e/.../pub?gid=456&single=true&output=csv",
  "source_name": "points-source",
  "short_name": "3rdGradeMathReadiness",
  "layers": {
    "main": "point-data",
    "circle": false
  },
  "timeline": {
    "yearValuePrefix": "pct_",
    "yearValueShortFormat": "{{value}}%",
    "filterOut": []
  },
  "popup": {
    "format": {
      "title": "{{pct}}% of students",
      "subtitle": "{{count}} out of {{pop}} students"
    }
  },
  "legend": {
    "title-column": "pop",
    "title": "{{pop}} students tested",
    "secondary-title-column": "pct",
    "secondary-title": "{{pct}}% of students ready"
  },
  "map": {
    "size": "pop",
    "color": "pct"
  }
}
```

## Validation Checklist

When creating a new indicator configuration, verify:
- [ ] All REQUIRED properties are present
- [ ] `default` is `"left"`, `"right"`, or `false` (not empty string)
- [ ] `geolevel` is `"area"` or `"point"`
- [ ] `geotype` matches the data type
- [ ] `google_sheets_url` is a valid CSV export URL
- [ ] `short_name` is unique and URL-safe
- [ ] `layers.main` is a valid layer identifier
- [ ] `timeline.filterOut` is an array
- [ ] `legend` has either `title` or `title-column`
- [ ] All format strings use valid placeholders
- [ ] `map.size` is only present for point-based indicators
- [ ] Property order follows recommended structure

