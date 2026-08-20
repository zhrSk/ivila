ivila consultant minimum fields + GPS accuracy fix

Changed files only:
- components/admin/IvilaPropertyForm.tsx
- components/admin/IvilaAdmin.module.css
- collections/Properties.ts
- scripts/ensure-ivila-production-schema.ts

Consultant minimum required fields:
1) exact property location
2) at least one photo
3) area (m2)
4) owner name + owner phone

All other commercial fields may stay incomplete while status is draft.
Main admin must complete commercial fields before publishing.

GPS changes:
- uses watchPosition instead of accepting the first browser location
- waits up to 20 seconds for a better high-accuracy fix
- accepts immediately at <= 80m accuracy
- rejects fixes worse than 250m instead of silently saving a network/Wi-Fi/IP location
- shows GPS accuracy and guidance in the form
- manual map selection remains available

Database:
The existing safe schema script only DROP NOT NULL on fields that are allowed to be incomplete in consultant drafts. It does NOT drop tables or GIS data.
Keep IVILA_BOOTSTRAP_SCHEMA disabled.
Keep IVILA_IMPORT_SPATIAL_OSM disabled if GIS import is already complete.
