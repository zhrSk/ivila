ivila automatic sea/forest distance v1

What changes:
- Admin no longer types sea/forest distance manually.
- Clicking a property location calls /api/spatial/distances.
- PostGIS calculates meters to nearest coastline / forest geometry.
- Properties.beforeChange recalculates on the backend too, so client values are never trusted.
- Reference GIS data lives in Neon table ivila_spatial_features.
- A one-time Vercel importer can populate that table from OpenStreetMap Overpass.

Apply:
1) Replace/add the files in this zip.
2) IMPORTANT: IVILA_BOOTSTRAP_SCHEMA should remain removed/0 now that Payload schema exists.
3) In Vercel -> Settings -> Environment Variables add temporarily:
     IVILA_IMPORT_SPATIAL_OSM = 1
   Production only.
4) Redeploy.
5) Build log should contain:
     [ivila spatial import] ready: coastline=..., forest=...
6) Remove IVILA_IMPORT_SPATIAL_OSM (or set 0) immediately after successful import.
7) Open /admin/new and click a location. Sea + forest distance should calculate automatically.

Optional coverage override:
  IVILA_SPATIAL_BBOX=36.25,51.15,36.90,52.65
Format: south,west,north,east

Notes:
- Runtime calculation is Neon/PostGIS only. Overpass is only used during the one-time import.
- If the import service is temporarily unavailable, the Vercel build will fail rather than replacing good spatial data with empty data. Redeploy later or use another Overpass endpoint via IVILA_OVERPASS_URL.
- The table is outside Payload's managed collection schema on purpose because it stores mixed LineString/Polygon GIS geometries.
