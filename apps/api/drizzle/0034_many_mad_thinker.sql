CREATE TABLE "researcher_profiles" (
	"person_id" uuid PRIMARY KEY NOT NULL,
	"affiliations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"discoverable" boolean DEFAULT false NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "researcher_profile_revision" CHECK ("researcher_profiles"."revision">0)
);
--> statement-breakpoint
ALTER TABLE "researcher_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "researcher_profiles" ADD CONSTRAINT "researcher_profiles_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "directory_lookup" ON "orcid_connections" AS PERMISSIVE FOR SELECT TO "sep_migrator" USING (current_setting('sep.directory_read',true)='true' AND EXISTS(SELECT 1 FROM researcher_profiles p WHERE p.person_id="orcid_connections"."person_id" AND p.discoverable));--> statement-breakpoint
CREATE POLICY "directory_actor" ON "people" AS PERMISSIVE FOR SELECT TO "sep_migrator" USING ("people"."id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "directory_lookup" ON "people" AS PERMISSIVE FOR SELECT TO "sep_migrator" USING (current_setting('sep.directory_read',true)='true' AND EXISTS(SELECT 1 FROM researcher_profiles p WHERE p.person_id="people"."id" AND p.discoverable));--> statement-breakpoint
CREATE POLICY "context_scope" ON "researcher_profiles" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("researcher_profiles"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid) WITH CHECK ("researcher_profiles"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "directory_projection" ON "researcher_profiles" AS PERMISSIVE FOR SELECT TO "sep_migrator" USING ("researcher_profiles"."discoverable");--> statement-breakpoint
ALTER POLICY "context_scope" ON "audit_entries" TO sep_runtime USING ("audit_entries"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "audit_entries"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid AND
    (("audit_entries"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND
  ("audit_entries"."event_id" = nullif(current_setting('sep.event_id', true), '')::uuid OR current_setting('sep.organization_admin', true) = 'true')) OR ("audit_entries"."event_id" IS NULL AND "audit_entries"."action" = 'invitation.accepted' AND EXISTS
      (SELECT 1 FROM organization_invitations i WHERE i.id = "audit_entries"."resource_id" AND i.organization_id = "audit_entries"."organization_id"
        AND i.status = 'accepted' AND i.accepted_by = "audit_entries"."person_id" AND i.token_hash = current_setting('sep.invitation_hash', true)))
      OR ("audit_entries"."event_id" IS NULL AND "audit_entries"."action" = 'identity.orcid.connected' AND "audit_entries"."resource_id" = "audit_entries"."person_id"
        AND EXISTS (SELECT 1 FROM orcid_connections o WHERE o.person_id="audit_entries"."person_id" AND o.orcid IS NOT NULL AND o.connected_at IS NOT NULL))
      OR ("audit_entries"."event_id" IS NULL AND "audit_entries"."action" = 'identity.profile.updated' AND "audit_entries"."resource_id" = "audit_entries"."person_id"
        AND EXISTS (SELECT 1 FROM researcher_profiles p WHERE p.person_id="audit_entries"."person_id")))) WITH CHECK ("audit_entries"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "audit_entries"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid AND
    (("audit_entries"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND
  ("audit_entries"."event_id" = nullif(current_setting('sep.event_id', true), '')::uuid OR current_setting('sep.organization_admin', true) = 'true')) OR ("audit_entries"."event_id" IS NULL AND "audit_entries"."action" = 'invitation.accepted' AND EXISTS
      (SELECT 1 FROM organization_invitations i WHERE i.id = "audit_entries"."resource_id" AND i.organization_id = "audit_entries"."organization_id"
        AND i.status = 'accepted' AND i.accepted_by = "audit_entries"."person_id" AND i.token_hash = current_setting('sep.invitation_hash', true)))
      OR ("audit_entries"."event_id" IS NULL AND "audit_entries"."action" = 'identity.orcid.connected' AND "audit_entries"."resource_id" = "audit_entries"."person_id"
        AND EXISTS (SELECT 1 FROM orcid_connections o WHERE o.person_id="audit_entries"."person_id" AND o.orcid IS NOT NULL AND o.connected_at IS NOT NULL))
      OR ("audit_entries"."event_id" IS NULL AND "audit_entries"."action" = 'identity.profile.updated' AND "audit_entries"."resource_id" = "audit_entries"."person_id"
        AND EXISTS (SELECT 1 FROM researcher_profiles p WHERE p.person_id="audit_entries"."person_id"))));