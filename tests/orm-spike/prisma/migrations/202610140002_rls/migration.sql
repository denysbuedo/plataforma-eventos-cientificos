ALTER TABLE private_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_records FORCE ROW LEVEL SECURITY;
CREATE POLICY event_scope ON private_records FOR ALL TO sep_spike_runtime
  USING (
    organization_id = nullif(current_setting('sep.organization_id', true), '')::uuid
    AND event_id = nullif(current_setting('sep.event_id', true), '')::uuid
  )
  WITH CHECK (
    organization_id = nullif(current_setting('sep.organization_id', true), '')::uuid
    AND event_id = nullif(current_setting('sep.event_id', true), '')::uuid
  );
GRANT USAGE ON SCHEMA public TO sep_spike_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON private_records TO sep_spike_runtime;
