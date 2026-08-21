Patch: Main admin role recovery + published price validation (v2)

Replace/add only the files in this ZIP, preserving their paths.

Fixes:
- The original/legacy main admin is no longer treated as a consultant when its newer role metadata is missing or was migrated incorrectly.
- The same effective-role rule is used by the property form, dashboard, CRM, profile, consultant manager, Users collection and Properties collection.
- The production schema repair marks the oldest e-mail-based Payload account as admin; current consultant accounts remain phone/username based agents.
- Saving the legacy admin profile also self-heals its stored role to admin.
- Published sale properties require a positive sale price in both UI validation and Payload server validation.
- Published rent properties require positive deposit and monthly-rent values in both UI validation and Payload server validation.
- Consultant drafts can still omit price; only the main admin can publish.

Important deployment note:
- Keep IVILA_BOOTSTRAP_SCHEMA disabled.
- Use the existing safe ensure-ivila-production-schema flow during deployment so the users.role repair is applied.
- If your deployment does NOT execute that safe schema script, run scripts/repair-main-admin-role.sql once against the same production database.
- No new npm package is required.

Expected test after deployment:
1) Login with the original main admin.
2) Open /admin/new.
3) Before choosing deal type, the consultant-only 'price is optional' notice must NOT appear.
4) Choose Sale + Published: sale price is mandatory and zero is rejected.
5) Choose Rent + Published: both deposit and monthly rent are mandatory and zero is rejected.
6) Login as a consultant: draft price remains optional and the file cannot be published directly.
