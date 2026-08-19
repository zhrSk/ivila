ivila — Spatial Search + Real GIS Map v2

Changed / new files only:
- components/MapExplorer.tsx
- lib/spatial-map.ts
- app/(frontend)/api/spatial/layers/route.ts
- app/(frontend)/api/spatial/properties-within/route.ts
- app/globals.css

What changed:
1) Map renders real coastline / forest reference geometries from Neon/PostGIS.
2) Viewport GIS is loaded on map move with server caching and geometry simplification.
3) Existing approximate zones remain only as a graceful fallback.
4) Draw-area search is now verified server-side using Payload's Point `within` spatial query.
5) Local point-in-polygon remains only as network fallback.

No new npm package is required.
Do NOT re-enable IVILA_IMPORT_SPATIAL_OSM after the one-time import has completed.
