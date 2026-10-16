ALTER TABLE work_collaborations FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON work_collaborations TO sep_runtime;
