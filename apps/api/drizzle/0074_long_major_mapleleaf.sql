CREATE TABLE "logistics_drafts" (
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"content" jsonb NOT NULL,
	CONSTRAINT "logistics_drafts_organization_id_event_id_pk" PRIMARY KEY("organization_id","event_id")
);
--> statement-breakpoint
ALTER TABLE "logistics_drafts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "operations_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"person_id" uuid,
	"actor_id" uuid NOT NULL,
	"actor_name" text NOT NULL,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "operations_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "session_bookings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"registration_id" uuid NOT NULL,
	"registration_revision" integer NOT NULL,
	"name" text NOT NULL,
	"modality" text NOT NULL,
	"state" text NOT NULL,
	"revision" integer NOT NULL,
	"fingerprint" text NOT NULL,
	"context" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_booking_person_unique" UNIQUE("organization_id","event_id","session_id","person_id"),
	CONSTRAINT "session_booking_state" CHECK ("session_bookings"."state" IN ('confirmed','waitlisted','cancelled') AND "session_bookings"."revision">0)
);
--> statement-breakpoint
ALTER TABLE "session_bookings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "session_channels" (
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"content" jsonb NOT NULL,
	CONSTRAINT "session_channels_organization_id_event_id_session_id_pk" PRIMARY KEY("organization_id","event_id","session_id")
);
--> statement-breakpoint
ALTER TABLE "session_channels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "session_policies" (
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"content" jsonb NOT NULL,
	CONSTRAINT "session_policies_organization_id_event_id_session_id_pk" PRIMARY KEY("organization_id","event_id","session_id")
);
--> statement-breakpoint
ALTER TABLE "session_policies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "logistics_drafts" ADD CONSTRAINT "logistics_event_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations_history" ADD CONSTRAINT "operations_history_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations_history" ADD CONSTRAINT "operations_history_actor_id_people_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations_history" ADD CONSTRAINT "operations_history_event_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_bookings" ADD CONSTRAINT "session_bookings_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_bookings" ADD CONSTRAINT "session_booking_registration_fk" FOREIGN KEY ("organization_id","event_id","registration_id","person_id") REFERENCES "public"."registration_entries"("organization_id","event_id","id","person_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_channels" ADD CONSTRAINT "session_channel_event_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_policies" ADD CONSTRAINT "session_policy_event_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "operations_history_event_idx" ON "operations_history" USING btree ("organization_id","event_id","created_at");--> statement-breakpoint
CREATE INDEX "session_booking_queue_idx" ON "session_bookings" USING btree ("organization_id","event_id","session_id","state","created_at");--> statement-breakpoint
CREATE POLICY "operations_members" ON "memberships" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING (current_setting('sep.operations_staff',true)='true' AND "memberships"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "memberships"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid);--> statement-breakpoint
CREATE POLICY "operations_names" ON "people" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING (current_setting('sep.operations_staff',true)='true' AND EXISTS(SELECT 1 FROM memberships m WHERE m.person_id="people"."id" AND m.organization_id=nullif(current_setting('sep.organization_id',true),'')::uuid AND m.event_id=nullif(current_setting('sep.event_id',true),'')::uuid AND m.active));--> statement-breakpoint
CREATE POLICY "operations_program_read" ON "program_drafts" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("program_drafts"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "program_drafts"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.operations_staff',true)='true');--> statement-breakpoint
CREATE POLICY "operations_space_read" ON "program_spaces" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("program_spaces"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "program_spaces"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND (current_setting('sep.operations_staff',true)='true' OR current_setting('sep.operations_rpc',true)='true'));--> statement-breakpoint
CREATE POLICY "operations_registration_read" ON "registration_entries" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("registration_entries"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "registration_entries"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND (current_setting('sep.operations_staff',true)='true' OR current_setting('sep.operations_rpc',true)='true'));--> statement-breakpoint
CREATE POLICY "context_scope" ON "logistics_drafts" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("logistics_drafts"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "logistics_drafts"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.operations_staff',true)='true') WITH CHECK ("logistics_drafts"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "logistics_drafts"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.operations_staff',true)='true');--> statement-breakpoint
CREATE POLICY "operations_history_read" ON "operations_history" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("operations_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "operations_history"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND (current_setting('sep.operations_staff',true)='true' OR "operations_history"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "operations_history_insert" ON "operations_history" AS PERMISSIVE FOR INSERT TO "sep_runtime" WITH CHECK ("operations_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "operations_history"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND "operations_history"."actor_id" = nullif(current_setting('sep.person_id', true), '')::uuid AND (current_setting('sep.operations_staff',true)='true' OR current_setting('sep.operations_rpc',true)='true'));--> statement-breakpoint
CREATE POLICY "session_booking_read" ON "session_bookings" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("session_bookings"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "session_bookings"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND ("session_bookings"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid OR current_setting('sep.operations_staff',true)='true' OR current_setting('sep.operations_rpc',true)='true' OR current_setting('sep.attendance_staff',true)='true'));--> statement-breakpoint
CREATE POLICY "session_booking_write" ON "session_bookings" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("session_bookings"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "session_bookings"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND (current_setting('sep.operations_staff',true)='true' OR current_setting('sep.operations_rpc',true)='true')) WITH CHECK ("session_bookings"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "session_bookings"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND (current_setting('sep.operations_staff',true)='true' OR current_setting('sep.operations_rpc',true)='true'));--> statement-breakpoint
CREATE POLICY "context_scope" ON "session_channels" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("session_channels"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "session_channels"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.operations_staff',true)='true') WITH CHECK ("session_channels"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "session_channels"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.operations_staff',true)='true');--> statement-breakpoint
CREATE POLICY "session_channel_rpc" ON "session_channels" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("session_channels"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "session_channels"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.operations_rpc',true)='true');--> statement-breakpoint
CREATE POLICY "context_scope" ON "session_policies" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("session_policies"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "session_policies"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.operations_staff',true)='true') WITH CHECK ("session_policies"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "session_policies"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.operations_staff',true)='true');--> statement-breakpoint
CREATE POLICY "session_policy_read" ON "session_policies" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("session_policies"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "session_policies"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND (nullif(current_setting('sep.person_id',true),'') IS NOT NULL OR current_setting('sep.attendance_staff',true)='true'));
--> statement-breakpoint
ALTER TABLE logistics_drafts FORCE ROW LEVEL SECURITY;
ALTER TABLE session_policies FORCE ROW LEVEL SECURITY;
ALTER TABLE session_bookings FORCE ROW LEVEL SECURITY;
ALTER TABLE session_channels FORCE ROW LEVEL SECURITY;
ALTER TABLE operations_history FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON logistics_drafts,session_policies,session_bookings,session_channels TO sep_runtime;
GRANT SELECT,INSERT ON operations_history TO sep_runtime;
CREATE TRIGGER operations_history_immutable BEFORE UPDATE OR DELETE ON operations_history FOR EACH ROW EXECUTE FUNCTION sep_registration_history_immutable();

--> statement-breakpoint
CREATE FUNCTION sep_operations_notices() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE previous text:=current_setting('sep.communication_rpc',true);
BEGIN
 IF NEW.person_id IS NOT NULL AND NEW.action IN ('booking_created','booking_cancelled','booking_invalidated','booking_promoted') THEN
  PERFORM set_config('sep.communication_rpc','true',true);
  PERFORM public.sep_enqueue_notice(NEW.organization_id,NEW.event_id,NEW.person_id,'operations:'||NEW.id::text,'session.booking.updated','sessions',NEW.resource_id);
  PERFORM set_config('sep.communication_rpc',coalesce(previous,''),true);
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION sep_operations_notices() FROM PUBLIC;
CREATE TRIGGER operations_notices AFTER INSERT ON operations_history FOR EACH ROW EXECUTE FUNCTION sep_operations_notices();
