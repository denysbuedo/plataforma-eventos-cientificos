ALTER TABLE scientific_call_drafts FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE scientific_call_publications FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON scientific_call_drafts TO sep_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON scientific_call_publications TO sep_runtime;
