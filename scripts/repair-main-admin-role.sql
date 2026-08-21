BEGIN;

-- The original Payload bootstrap admin is the oldest account that has an e-mail.
-- Consultant accounts created by the current panel are phone/username based.
UPDATE users
SET role = 'admin'
WHERE id = (
  SELECT id
  FROM users
  WHERE email IS NOT NULL AND btrim(email) <> ''
  ORDER BY id ASC
  LIMIT 1
);

UPDATE users
SET role = 'agent'
WHERE role IS NULL;

COMMIT;

SELECT id, email, username, phone, role, is_active
FROM users
ORDER BY id ASC;
