ALTER TABLE author_works FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT ON author_works TO sep_runtime;
--> statement-breakpoint
GRANT UPDATE (title, abstract, keywords, language, track_id, contribution_type_id, revision, updated_at) ON author_works TO sep_runtime;
