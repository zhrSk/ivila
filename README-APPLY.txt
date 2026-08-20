ivila CRM / Customer Visits V1

Replace/add only the files in this ZIP.

What this adds:
- /admin/crm (rewritten internally to /ivila-panel/crm)
- Customers per consultant
- Property visits / calls
- Visit outcome and offer
- Next follow-up date
- Mark follow-up as done
- Admin can filter CRM by consultant
- Quick "register visit" action on published property cards
- Safe production DDL creates only ivila_customers and ivila_visits; nothing is dropped

No new npm package is required.
Do NOT enable IVILA_BOOTSTRAP_SCHEMA.
Keep IVILA_IMPORT_SPATIAL_OSM off if GIS import has already completed.
