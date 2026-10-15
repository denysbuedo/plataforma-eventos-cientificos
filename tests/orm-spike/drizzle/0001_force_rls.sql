ALTER TABLE private_records FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO sep_spike_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON private_records TO sep_spike_runtime;
