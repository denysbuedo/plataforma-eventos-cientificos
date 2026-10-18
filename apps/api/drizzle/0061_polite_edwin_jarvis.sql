CREATE TABLE "certificate_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"certificate_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_name" text NOT NULL,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "certificate_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "certificate_templates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"content" jsonb NOT NULL,
	"revision" integer NOT NULL,
	CONSTRAINT "certificate_templates_organization_id_event_id_id_unique" UNIQUE("organization_id","event_id","id"),
	CONSTRAINT "certificate_template_revision" CHECK ("certificate_templates"."revision">0)
);
--> statement-breakpoint
ALTER TABLE "certificate_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"subject_key" text NOT NULL,
	"summary" jsonb NOT NULL,
	"snapshot" jsonb NOT NULL,
	"code" text NOT NULL,
	"status" text DEFAULT 'issued' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"pdf" "bytea" NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "certificates_code_unique" UNIQUE("code"),
	CONSTRAINT "certificates_organization_id_event_id_id_person_id_unique" UNIQUE("organization_id","event_id","id","person_id"),
	CONSTRAINT "certificate_status" CHECK ("certificates"."status" IN ('issued','revoked') AND ("certificates"."status"='revoked')=("certificates"."revoked_at" IS NOT NULL) AND "certificates"."revision">0)
);
--> statement-breakpoint
ALTER TABLE "certificates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "certificate_history" ADD CONSTRAINT "certificate_history_actor_id_people_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_history" ADD CONSTRAINT "certificate_history_organization_id_event_id_certificate_id_person_id_certificates_organization_id_event_id_id_person_id_fk" FOREIGN KEY ("organization_id","event_id","certificate_id","person_id") REFERENCES "public"."certificates"("organization_id","event_id","id","person_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_templates" ADD CONSTRAINT "certificate_templates_organization_id_event_id_events_organization_id_id_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_organization_id_event_id_template_id_certificate_templates_organization_id_event_id_id_fk" FOREIGN KEY ("organization_id","event_id","template_id") REFERENCES "public"."certificate_templates"("organization_id","event_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "certificate_active_unique" ON "certificates" USING btree ("organization_id","event_id","template_id","person_id","subject_key") WHERE "certificates"."status"='issued';--> statement-breakpoint
CREATE POLICY "certificate_source_read" ON "attendance_records" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("attendance_records"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "attendance_records"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.certificate_staff',true)='true');--> statement-breakpoint
CREATE POLICY "certificate_members" ON "memberships" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("memberships"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "memberships"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.certificate_staff',true)='true');--> statement-breakpoint
CREATE POLICY "certificate_names" ON "people" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING (current_setting('sep.certificate_staff',true)='true' AND EXISTS(SELECT 1 FROM memberships m WHERE m.person_id="people"."id" AND m.organization_id=nullif(current_setting('sep.organization_id',true),'')::uuid AND m.event_id=nullif(current_setting('sep.event_id',true),'')::uuid));--> statement-breakpoint
CREATE POLICY "certificate_source_read" ON "registration_entries" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("registration_entries"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "registration_entries"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.certificate_staff',true)='true');--> statement-breakpoint
CREATE POLICY "certificate_source_read" ON "review_assignments" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("review_assignments"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_assignments"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.certificate_staff',true)='true');--> statement-breakpoint
CREATE POLICY "certificate_history_read" ON "certificate_history" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("certificate_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "certificate_history"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND (current_setting('sep.certificate_staff',true)='true' OR "certificate_history"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "certificate_history_insert" ON "certificate_history" AS PERMISSIVE FOR INSERT TO "sep_runtime" WITH CHECK ("certificate_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "certificate_history"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.certificate_staff',true)='true' AND "certificate_history"."actor_id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "context_scope" ON "certificate_templates" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("certificate_templates"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "certificate_templates"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.certificate_staff',true)='true') WITH CHECK ("certificate_templates"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "certificate_templates"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.certificate_staff',true)='true');--> statement-breakpoint
CREATE POLICY "certificate_read" ON "certificates" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("certificates"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND (("certificates"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND (current_setting('sep.certificate_staff',true)='true' OR "certificates"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid)) OR ("certificates"."code"=current_setting('sep.certificate_code',true) AND (nullif(current_setting('sep.event_id',true),'') IS NULL OR "certificates"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid))));--> statement-breakpoint
CREATE POLICY "certificate_write" ON "certificates" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("certificates"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "certificates"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.certificate_staff',true)='true') WITH CHECK ("certificates"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "certificates"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.certificate_staff',true)='true');
--> statement-breakpoint
ALTER TABLE certificate_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE certificates FORCE ROW LEVEL SECURITY;
ALTER TABLE certificate_history FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON certificate_templates,certificates TO sep_runtime;
GRANT SELECT,INSERT ON certificate_history TO sep_runtime;
CREATE TRIGGER certificate_history_immutable BEFORE UPDATE OR DELETE ON certificate_history FOR EACH ROW EXECUTE FUNCTION sep_registration_history_immutable();
--> statement-breakpoint
CREATE FUNCTION sep_certificate_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF OLD.status='revoked' OR NEW.id<>OLD.id OR NEW.organization_id<>OLD.organization_id OR NEW.event_id<>OLD.event_id OR NEW.template_id<>OLD.template_id OR NEW.person_id<>OLD.person_id OR NEW.subject_key<>OLD.subject_key OR NEW.summary IS DISTINCT FROM OLD.summary OR NEW.snapshot IS DISTINCT FROM OLD.snapshot OR NEW.pdf IS DISTINCT FROM OLD.pdf OR NEW.code<>OLD.code OR NEW.issued_at<>OLD.issued_at OR NEW.status<>'revoked' OR NEW.revision<>OLD.revision+1 OR NEW.revoked_at IS NULL THEN RAISE EXCEPTION 'Issued certificate is immutable' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER certificate_immutable BEFORE UPDATE ON certificates FOR EACH ROW EXECUTE FUNCTION sep_certificate_immutable();
