# Spatial architecture notes

## Why the UI is polygon-first

Royan and its surrounding market does not map cleanly to a single city/neighborhood hierarchy. A property can be simultaneously:

- inside a village boundary,
- inside a sales team's custom territory,
- part of a forest-side or coastal commercial zone,
- and within a customer-drawn search polygon.

For that reason, the final system should not store `neighborhood` as the only location concept. Each property stores a real geographic Point, while named regions are stored as Polygon/MultiPolygon records in PostGIS.

## UI → API contract for drawn areas

The current demo filters in the browser. In production the map will send GeoJSON:

```json
{
  "type": "Polygon",
  "coordinates": [[[51.95,36.56],[51.98,36.56],[51.98,36.54],[51.95,36.54],[51.95,36.56]]]
}
```

The API will apply the remaining filters (deal type, property type, price, area, bedrooms) and a spatial predicate such as `ST_Within` / `ST_Intersects`.

## Privacy

For public listing pages we can support two map modes per property:

1. **Exact point** for files the agency wants to disclose.
2. **Approximate area** for sensitive listings; the exact Point remains admin-only while the public map renders a blurred circle / parent area.

## North-specific distance filters

The UI now exposes **distance to sea** and **distance to forest** as first-class filters. The demo uses seeded meter values so the experience can be tested without a backend. Production should not trust manually entered distances.

PostGIS should store environmental GIS layers in `spatial_features`:

- `coastline`: LineString / MultiLineString representing the actual shoreline.
- `forest`: Polygon / MultiPolygon representing forest coverage or the agency's curated forest boundary.

The API can then use `ST_DWithin` for fast filtering and `ST_Distance` for display / sorting. Both property points and spatial feature geometries should have GiST indexes.

This is intentionally separate from named sales areas (`geo_areas`). A village boundary answers “is this property inside this village?”, while the coastline layer answers “how many meters is this property from the sea?”.
