ivila - Vercel Blob OIDC direct upload

Changed/added files:
- collections/Properties.ts
- lib/property-repository.ts
- components/admin/IvilaPropertyForm.tsx
- components/admin/IvilaAdmin.module.css
- app/(frontend)/api/ivila-media-health/route.ts
- app/(frontend)/api/ivila-blob-upload/route.ts

Required dependency:
  npm install @vercel/blob@2.6.1 --save

One-time schema update is required because Properties now has imageUrls (hasMany text).
For the current demo/dev phase, temporarily set IVILA_BOOTSTRAP_SCHEMA=1 for one successful Vercel deploy,
then set it back to 0/remove it immediately after the deploy succeeds.

BLOB_READ_WRITE_TOKEN is NOT required on Vercel for this path.
The route uses the official @vercel/blob SDK, which authenticates with Vercel OIDC when deployed on Vercel.
