-- Run as the database administrator before migration 0081.
-- This role owns only the narrowly scoped account-link and member-lookup functions.
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='sep_account_linker') THEN
  CREATE ROLE sep_account_linker NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
 END IF;
END $$;
-- The migrator can transfer function ownership; its other functions do not inherit this role.
GRANT sep_account_linker TO sep_migrator WITH INHERIT FALSE, SET TRUE;
