Register/Edit + Draft Workflow Hardening
========================================

Changed files only:
1) components/admin/IvilaPropertyForm.tsx
2) collections/Properties.ts

What is fixed:
- Custom amenity text is normalized, deduplicated, capped at 30, and is also saved if the user typed it but forgot to press Add.
- Editing can now truly clear optional old values instead of silently keeping stale data after PATCH.
- Switching Sale -> Rent clears the old sale price.
- Switching Rent -> Sale clears old deposit/monthly-rent values.
- Agent submissions are always forced to Draft + Pending on the server.
- Admin review decisions (Changes requested / Rejected) now win over contradictory client status values.
- Admin Approved review forces Published on the server.
- Amenities are normalized again server-side.

Suggested checks:
A) Create draft as agent, add a custom amenity, save, reopen: amenity must remain.
B) Edit a property, clear an optional field, save, reopen: it must stay empty.
C) Change Sale to Rent: old sale price must disappear after save/reopen.
D) Agent save/resave: status must remain Draft and review status Pending.
E) Admin choose Changes requested: property must remain Draft.
F) Admin choose Approved: property must become Published.

No CSS/database migration/package change in this patch.

v4.1 build fix:
- Fixed TypeScript TS2367 in IvilaPropertyForm.tsx numberOrNull helper.
- numeric() returns number | undefined, so empty values are now converted with `parsed ?? null`.
- No runtime workflow behavior changed by this fix.
