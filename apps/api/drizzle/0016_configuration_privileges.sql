ALTER TABLE event_configurations FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON event_configurations TO sep_runtime;
--> statement-breakpoint
GRANT UPDATE (timezone) ON events TO sep_runtime;
