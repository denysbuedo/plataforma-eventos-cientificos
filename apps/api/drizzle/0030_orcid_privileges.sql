ALTER TABLE orcid_connections FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON orcid_connections TO sep_runtime;
--> statement-breakpoint
GRANT UPDATE (require_submitting_author_orcid) ON event_configurations TO sep_runtime;
