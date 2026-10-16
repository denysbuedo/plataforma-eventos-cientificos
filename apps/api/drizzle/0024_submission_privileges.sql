ALTER TABLE work_files FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE work_versions FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE work_history FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON work_files TO sep_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT ON work_versions, work_history TO sep_runtime;
--> statement-breakpoint
GRANT UPDATE (status, submitted_at, response_deadline, manuscript, submitted_content, call_snapshot) ON author_works TO sep_runtime;
