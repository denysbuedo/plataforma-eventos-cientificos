CREATE TABLE "authorship_claims" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"work_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"claimant_id" uuid NOT NULL,
	"claimant_name" text NOT NULL,
	"declaration" jsonb NOT NULL,
	"basis" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"decided_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	CONSTRAINT "authorship_claim_status" CHECK ("authorship_claims"."status" IN ('pending','approved','rejected','revoked')),
	CONSTRAINT "authorship_claim_basis" CHECK ("authorship_claims"."basis" IN ('account','email','orcid')),
	CONSTRAINT "authorship_claim_revision" CHECK ("authorship_claims"."revision">0)
);
--> statement-breakpoint
ALTER TABLE "authorship_claims" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "work_collaborations" ADD COLUMN "responsibility_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "authorship_claims" ADD CONSTRAINT "authorship_claims_claimant_id_people_id_fk" FOREIGN KEY ("claimant_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authorship_claims" ADD CONSTRAINT "authorship_claims_decided_by_people_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authorship_claims" ADD CONSTRAINT "authorship_claims_organization_id_event_id_work_id_author_works_organization_id_event_id_id_fk" FOREIGN KEY ("organization_id","event_id","work_id") REFERENCES "public"."author_works"("organization_id","event_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "authorship_open_claim_unique" ON "authorship_claims" USING btree ("work_id","author_id","claimant_id") WHERE "authorship_claims"."status" IN ('pending','approved');--> statement-breakpoint
CREATE INDEX "authorship_claim_event_idx" ON "authorship_claims" USING btree ("organization_id","event_id","created_at");--> statement-breakpoint
CREATE POLICY "authorship_rpc" ON "audit_entries" AS PERMISSIVE FOR INSERT TO "sep_migrator" WITH CHECK (current_setting('sep.authorship_rpc',true)='true' AND "audit_entries"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "audit_entries"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND "audit_entries"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "authorship_rpc" ON "author_works" AS PERMISSIVE FOR ALL TO "sep_migrator" USING (current_setting('sep.authorship_rpc',true)='true' AND "author_works"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "author_works"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid) WITH CHECK (current_setting('sep.authorship_rpc',true)='true' AND "author_works"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "author_works"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid);--> statement-breakpoint
CREATE POLICY "authorship_rpc" ON "event_configurations" AS PERMISSIVE FOR SELECT TO "sep_migrator" USING (current_setting('sep.authorship_rpc',true)='true' AND "event_configurations"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "event_configurations"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid);--> statement-breakpoint
CREATE POLICY "authorship_rpc" ON "events" AS PERMISSIVE FOR SELECT TO "sep_migrator" USING (current_setting('sep.authorship_rpc',true)='true' AND "events"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "events"."id"=nullif(current_setting('sep.event_id',true),'')::uuid);--> statement-breakpoint
CREATE POLICY "authorship_actor" ON "memberships" AS PERMISSIVE FOR SELECT TO "sep_migrator" USING (current_setting('sep.authorship_rpc',true)='true' AND "memberships"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "authorship_actor" ON "orcid_connections" AS PERMISSIVE FOR SELECT TO "sep_migrator" USING (current_setting('sep.authorship_rpc',true)='true' AND "orcid_connections"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "authorship_actor" ON "role_assignments" AS PERMISSIVE FOR SELECT TO "sep_migrator" USING (current_setting('sep.authorship_rpc',true)='true' AND EXISTS(SELECT 1 FROM memberships m WHERE m.id="role_assignments"."membership_id" AND m.person_id=nullif(current_setting('sep.person_id',true),'')::uuid));--> statement-breakpoint
CREATE POLICY "authorship_rpc" ON "work_collaborations" AS PERMISSIVE FOR ALL TO "sep_migrator" USING (current_setting('sep.authorship_rpc',true)='true' AND "work_collaborations"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "work_collaborations"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid) WITH CHECK (current_setting('sep.authorship_rpc',true)='true' AND "work_collaborations"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "work_collaborations"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid);--> statement-breakpoint
CREATE POLICY "authorship_rpc" ON "work_history" AS PERMISSIVE FOR INSERT TO "sep_migrator" WITH CHECK (current_setting('sep.authorship_rpc',true)='true' AND "work_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "work_history"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND "work_history"."actor_id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "authorship_rpc" ON "authorship_claims" AS PERMISSIVE FOR ALL TO "sep_migrator" USING (current_setting('sep.authorship_rpc',true)='true' AND "authorship_claims"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "authorship_claims"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid) WITH CHECK (current_setting('sep.authorship_rpc',true)='true' AND "authorship_claims"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "authorship_claims"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid);