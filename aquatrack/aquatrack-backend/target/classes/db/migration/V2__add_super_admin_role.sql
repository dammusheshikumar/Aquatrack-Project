-- Flyway Migration V2: Update chk_user_role constraint to include SUPER_ADMIN

ALTER TABLE users DROP CHECK chk_user_role;
ALTER TABLE users ADD CONSTRAINT chk_user_role CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'RESIDENT'));
