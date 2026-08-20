ivila account/mobile admin fix v1

Changes:
- Login renders immediately; no Payload health pre-check delay and no first-admin creation toggle.
- Mobile dashboard nav fixed: bottom nav no longer gets trapped inside the top sticky header.
- Agents can change their own password from Profile (current password required).
- Admin can suspend/reactivate or delete consultant accounts.
- Suspended accounts are blocked at login and property API access.
- Agent creation form prevents browser autofill with current admin credentials.
- Agent list only loads consultants, with skeleton while fetching.
- Safe schema adds users.is_active only; no db push / no drops.

Keep IVILA_BOOTSTRAP_SCHEMA disabled.
