-- Adds support for Google sign-in (residents only). LOCAL accounts keep using
-- password_hash; GOOGLE accounts store a random unusable hash there instead
-- (password_hash stays NOT NULL) and authenticate purely via verified Google ID tokens.

ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL';
ALTER TABLE users ADD CONSTRAINT chk_user_auth_provider CHECK (auth_provider IN ('LOCAL','GOOGLE'));