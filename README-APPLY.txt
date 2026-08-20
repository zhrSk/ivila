ivila - explicit Vercel Blob OIDC upload fix

Changed files only:
- app/(frontend)/api/ivila-blob-upload/route.ts
- app/(frontend)/api/ivila-media-health/route.ts
- components/admin/IvilaPropertyForm.tsx

What changed:
- Reads x-vercel-oidc-token from the actual request and explicitly passes oidcToken + BLOB_STORE_ID to @vercel/blob put/del/list.
- Keeps SDK request-context fallback when the header is not directly visible.
- Upload route now returns sanitized Blob error code/detail instead of only BLOB_UPLOAD_FAILED.
- Admin form shows the useful failure reason.

No new dependency and no schema/database change.
Do NOT enable IVILA_BOOTSTRAP_SCHEMA.
Do NOT rerun IVILA_IMPORT_SPATIAL_OSM.
