ALTER TABLE site_drafts FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE site_publications FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON site_drafts, site_publications TO sep_runtime;
--> statement-breakpoint
GRANT UPDATE (status) ON events TO sep_runtime;
