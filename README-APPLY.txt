ivila - Phone Login V1

Changed:
- Login UI uses mobile number + password.
- Payload auth enables username login; username is synchronized with phone.
- Email is no longer required for new users.
- Agent creation uses mobile number instead of email.
- Team list and profile no longer show email.
- Safe production schema adds users.username and drops NOT NULL from users.email without db push.
- Existing users with phone numbers get username populated automatically.
- Email login remains enabled in Payload only as a temporary migration fallback for the old admin account; UI does not expose it.

Important after deploy:
1) Open /admin/profile while still logged in as the existing admin.
2) Save a valid mobile number once.
3) Future logins can use that mobile number.

Do NOT enable IVILA_BOOTSTRAP_SCHEMA.
