ivila safe production schema patch

Replace/add only these files:
- package.json
- collections/Properties.ts
- lib/property-repository.ts
- components/admin/IvilaPropertyForm.tsx
- scripts/ensure-ivila-production-schema.ts

IMPORTANT:
1) Remove IVILA_BOOTSTRAP_SCHEMA from Vercel (or set it to 0). It is no longer used by prebuild.
2) Keep IVILA_IMPORT_SPATIAL_OSM=0 unless you explicitly want to re-import OSM reference data.
3) Do NOT answer "y" to any old Payload db-push prompt that wants to delete ivila_spatial_features.
4) This patch stores Blob URLs as JSON text in properties.image_urls_json, added safely with ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
