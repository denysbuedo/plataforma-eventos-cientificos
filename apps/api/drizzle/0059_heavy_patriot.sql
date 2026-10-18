CREATE TABLE "attendance_credentials" (
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"registration_id" uuid PRIMARY KEY NOT NULL,
	"person_id" uuid NOT NULL,
	"hash" text NOT NULL,
	"active" boolean NOT NULL,
	"revision" integer NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_credentials_hash_unique" UNIQUE("hash"),
	CONSTRAINT "attendance_credential_revision" CHECK ("attendance_credentials"."revision">0)
);
--> statement-breakpoint
ALTER TABLE "attendance_credentials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "attendance_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"record_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_name" text NOT NULL,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"state" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"registration_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"target_key" text NOT NULL,
	"context" jsonb NOT NULL,
	"state" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_records_organization_id_event_id_registration_id_target_key_unique" UNIQUE("organization_id","event_id","registration_id","target_key"),
	CONSTRAINT "attendance_records_organization_id_event_id_id_person_id_unique" UNIQUE("organization_id","event_id","id","person_id"),
	CONSTRAINT "attendance_record_state" CHECK ("attendance_records"."state" IN ('present','voided')),
	CONSTRAINT "attendance_record_revision" CHECK ("attendance_records"."revision">0)
);
--> statement-breakpoint
ALTER TABLE "attendance_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "attendance_credentials" ADD CONSTRAINT "attendance_credentials_organization_id_event_id_registration_id_person_id_registration_entries_organization_id_event_id_id_person_id_fk" FOREIGN KEY ("organization_id","event_id","registration_id","person_id") REFERENCES "public"."registration_entries"("organization_id","event_id","id","person_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_history" ADD CONSTRAINT "attendance_history_actor_id_people_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_history" ADD CONSTRAINT "attendance_history_organization_id_event_id_record_id_person_id_attendance_records_organization_id_event_id_id_person_id_fk" FOREIGN KEY ("organization_id","event_id","record_id","person_id") REFERENCES "public"."attendance_records"("organization_id","event_id","id","person_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_organization_id_event_id_registration_id_person_id_registration_entries_organization_id_event_id_id_person_id_fk" FOREIGN KEY ("organization_id","event_id","registration_id","person_id") REFERENCES "public"."registration_entries"("organization_id","event_id","id","person_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "attendance_registration_read" ON "registration_entries" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("registration_entries"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "registration_entries"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.attendance_staff',true)='true');--> statement-breakpoint
CREATE POLICY "context_scope" ON "attendance_credentials" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("attendance_credentials"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "attendance_credentials"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND (current_setting('sep.attendance_staff',true)='true' OR "attendance_credentials"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid)) WITH CHECK ("attendance_credentials"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "attendance_credentials"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND (current_setting('sep.attendance_staff',true)='true' OR "attendance_credentials"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "attendance_history_read" ON "attendance_history" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("attendance_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "attendance_history"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND (current_setting('sep.attendance_staff',true)='true' OR "attendance_history"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "attendance_history_insert" ON "attendance_history" AS PERMISSIVE FOR INSERT TO "sep_runtime" WITH CHECK ("attendance_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "attendance_history"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.attendance_staff',true)='true' AND "attendance_history"."actor_id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "attendance_record_read" ON "attendance_records" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("attendance_records"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "attendance_records"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND (current_setting('sep.attendance_staff',true)='true' OR "attendance_records"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "attendance_record_write" ON "attendance_records" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("attendance_records"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "attendance_records"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.attendance_staff',true)='true') WITH CHECK ("attendance_records"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "attendance_records"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.attendance_staff',true)='true');
--> statement-breakpoint
ALTER TABLE attendance_credentials FORCE ROW LEVEL SECURITY;
ALTER TABLE attendance_records FORCE ROW LEVEL SECURITY;
ALTER TABLE attendance_history FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON attendance_credentials,attendance_records TO sep_runtime;
GRANT SELECT,INSERT ON attendance_history TO sep_runtime;
--> statement-breakpoint
CREATE TRIGGER attendance_history_immutable BEFORE UPDATE OR DELETE ON attendance_history FOR EACH ROW EXECUTE FUNCTION sep_registration_history_immutable();
--> statement-breakpoint
CREATE FUNCTION sep_attendance_context_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.context IS DISTINCT FROM OLD.context OR NEW.person_id<>OLD.person_id OR NEW.registration_id<>OLD.registration_id OR NEW.organization_id<>OLD.organization_id OR NEW.event_id<>OLD.event_id OR NEW.target_key<>OLD.target_key OR NEW.id<>OLD.id THEN RAISE EXCEPTION 'Attendance context is immutable' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER attendance_context_immutable BEFORE UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION sep_attendance_context_immutable();
