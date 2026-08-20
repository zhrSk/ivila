ivila public bugfix v1

Changed files:
- components/SiteHeader.tsx
- components/PropertyLocationMap.tsx
- components/PropertyGallery.tsx
- lib/property-repository.ts
- app/globals.css
- components/admin/IvilaPropertyForm.tsx

Fixes:
1) Public location is now a secret-derived approximate point about 0.9–1.4 km from the real property, and the detail map shows an approximate area circle instead of an exact-looking pin.
2) Header links are absolute home links, Search/Login buttons work, and the mobile menu actually opens.
3) Legacy Payload gallery uses original media URLs instead of the 1600px detail derivative. Main gallery image is loaded eagerly and without visual filtering.
4) Future phone uploads keep up to 3200px and start at WebP quality 0.90, while retaining the existing ~3.8 MB request safety limit.

No DB migration and no new package are required.
Existing Blob photos that were already compressed to 2400px are not re-encoded automatically; re-upload only if a particular old photo remains visibly soft.
