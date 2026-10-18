CREATE TABLE "payment_charges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"registration_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"fee_id" uuid NOT NULL,
	"snapshot" jsonb NOT NULL,
	"state" text DEFAULT 'open' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"settlement" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "charge_event_id_person" UNIQUE("organization_id","event_id","id","person_id"),
	CONSTRAINT "charge_state" CHECK ("payment_charges"."state" IN ('open','reported','paid','waived','cancelled','refunded') AND "payment_charges"."revision">0)
);
--> statement-breakpoint
ALTER TABLE "payment_charges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payment_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"charge_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_name" text NOT NULL,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"details" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payment_settings" (
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"content" jsonb NOT NULL,
	CONSTRAINT "payment_settings_organization_id_event_id_pk" PRIMARY KEY("organization_id","event_id")
);
--> statement-breakpoint
ALTER TABLE "payment_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payment_settings_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_name" text NOT NULL,
	"reason" text NOT NULL,
	"before" jsonb NOT NULL,
	"after" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_settings_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payment_charges" ADD CONSTRAINT "charge_registration_fk" FOREIGN KEY ("organization_id","event_id","registration_id","person_id") REFERENCES "public"."registration_entries"("organization_id","event_id","id","person_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_actor_id_people_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_charge_fk" FOREIGN KEY ("organization_id","event_id","charge_id","person_id") REFERENCES "public"."payment_charges"("organization_id","event_id","id","person_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_settings" ADD CONSTRAINT "payment_settings_event_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_settings_history" ADD CONSTRAINT "payment_settings_history_actor_id_people_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_settings_history" ADD CONSTRAINT "payment_settings_history_event_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "charge_one_active_fee" ON "payment_charges" USING btree ("organization_id","event_id","person_id","fee_id") WHERE "payment_charges"."state"<>'cancelled';--> statement-breakpoint
CREATE INDEX "charge_event_queue" ON "payment_charges" USING btree ("organization_id","event_id","state");--> statement-breakpoint
CREATE POLICY "report_read" ON "attendance_records" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("attendance_records"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "attendance_records"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.reports_read',true)='true');--> statement-breakpoint
CREATE POLICY "report_read" ON "author_works" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("author_works"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "author_works"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.reports_read',true)='true');--> statement-breakpoint
CREATE POLICY "report_read" ON "certificate_templates" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("certificate_templates"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "certificate_templates"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.reports_read',true)='true');--> statement-breakpoint
CREATE POLICY "report_read" ON "certificates" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("certificates"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "certificates"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.reports_read',true)='true');--> statement-breakpoint
CREATE POLICY "report_read" ON "gallery_releases" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("gallery_releases"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "gallery_releases"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.reports_read',true)='true');--> statement-breakpoint
CREATE POLICY "report_read" ON "logistics_drafts" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("logistics_drafts"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "logistics_drafts"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.reports_read',true)='true');--> statement-breakpoint
CREATE POLICY "report_read" ON "mail_deliveries" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("mail_deliveries"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "mail_deliveries"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.reports_read',true)='true');--> statement-breakpoint
CREATE POLICY "report_read" ON "program_publications" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("program_publications"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "program_publications"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.reports_read',true)='true');--> statement-breakpoint
CREATE POLICY "report_read" ON "program_spaces" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("program_spaces"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "program_spaces"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.reports_read',true)='true');--> statement-breakpoint
CREATE POLICY "report_read" ON "publication_releases" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("publication_releases"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "publication_releases"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.reports_read',true)='true');--> statement-breakpoint
CREATE POLICY "report_read" ON "registration_entries" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("registration_entries"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "registration_entries"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.reports_read',true)='true');--> statement-breakpoint
CREATE POLICY "finance_registration_read" ON "registration_entries" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("registration_entries"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "registration_entries"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.finance_staff',true)='true');--> statement-breakpoint
CREATE POLICY "report_read" ON "registration_publications" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("registration_publications"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "registration_publications"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.reports_read',true)='true');--> statement-breakpoint
CREATE POLICY "report_read" ON "review_assignments" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("review_assignments"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_assignments"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.reports_read',true)='true');--> statement-breakpoint
CREATE POLICY "report_read" ON "scientific_call_publications" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("scientific_call_publications"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "scientific_call_publications"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.reports_read',true)='true');--> statement-breakpoint
CREATE POLICY "report_read" ON "session_bookings" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("session_bookings"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "session_bookings"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.reports_read',true)='true');--> statement-breakpoint
CREATE POLICY "booking_program_read" ON "session_bookings" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("session_bookings"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "session_bookings"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.submissions_staff',true)='true');--> statement-breakpoint
CREATE POLICY "report_read" ON "session_channels" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("session_channels"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "session_channels"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.reports_read',true)='true');--> statement-breakpoint
CREATE POLICY "report_read" ON "session_policies" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("session_policies"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "session_policies"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.reports_read',true)='true');--> statement-breakpoint
CREATE POLICY "report_read" ON "site_publications" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("site_publications"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "site_publications"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.reports_read',true)='true');--> statement-breakpoint
CREATE POLICY "report_read" ON "sponsor_commitments" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("sponsor_commitments"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "sponsor_commitments"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.reports_read',true)='true');--> statement-breakpoint
CREATE POLICY "report_read" ON "sponsorship_releases" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("sponsorship_releases"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "sponsorship_releases"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.reports_read',true)='true');--> statement-breakpoint
CREATE POLICY "report_read" ON "sponsorship_settings" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("sponsorship_settings"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "sponsorship_settings"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.reports_read',true)='true');--> statement-breakpoint
CREATE POLICY "charge_read" ON "payment_charges" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("payment_charges"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "payment_charges"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND ("payment_charges"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid OR current_setting('sep.finance_staff',true)='true' OR current_setting('sep.reports_read',true)='true'));--> statement-breakpoint
CREATE POLICY "charge_write" ON "payment_charges" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("payment_charges"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "payment_charges"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND ("payment_charges"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid OR current_setting('sep.finance_staff',true)='true')) WITH CHECK ("payment_charges"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "payment_charges"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND ("payment_charges"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid OR current_setting('sep.finance_staff',true)='true'));--> statement-breakpoint
CREATE POLICY "payment_history_read" ON "payment_history" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("payment_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "payment_history"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND ("payment_history"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid OR current_setting('sep.finance_staff',true)='true'));--> statement-breakpoint
CREATE POLICY "payment_history_insert" ON "payment_history" AS PERMISSIVE FOR INSERT TO "sep_runtime" WITH CHECK ("payment_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "payment_history"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND "payment_history"."actor_id" = nullif(current_setting('sep.person_id', true), '')::uuid AND ("payment_history"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid OR current_setting('sep.finance_staff',true)='true'));--> statement-breakpoint
CREATE POLICY "context_scope" ON "payment_settings" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("payment_settings"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "payment_settings"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.finance_staff',true)='true') WITH CHECK ("payment_settings"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "payment_settings"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.finance_staff',true)='true');--> statement-breakpoint
CREATE POLICY "payment_settings_read" ON "payment_settings" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("payment_settings"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "payment_settings"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND nullif(current_setting('sep.person_id',true),'') IS NOT NULL);--> statement-breakpoint
CREATE POLICY "payment_settings_history_read" ON "payment_settings_history" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("payment_settings_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "payment_settings_history"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.finance_staff',true)='true');--> statement-breakpoint
CREATE POLICY "payment_settings_history_insert" ON "payment_settings_history" AS PERMISSIVE FOR INSERT TO "sep_runtime" WITH CHECK ("payment_settings_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "payment_settings_history"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.finance_staff',true)='true' AND "payment_settings_history"."actor_id" = nullif(current_setting('sep.person_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE payment_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE payment_charges FORCE ROW LEVEL SECURITY;
ALTER TABLE payment_history FORCE ROW LEVEL SECURITY;
ALTER TABLE payment_settings_history FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON payment_settings,payment_charges TO sep_runtime;
GRANT SELECT,INSERT ON payment_history,payment_settings_history TO sep_runtime;
CREATE TRIGGER payment_history_immutable BEFORE UPDATE OR DELETE ON payment_history FOR EACH ROW EXECUTE FUNCTION sep_registration_history_immutable();
CREATE TRIGGER payment_settings_history_immutable BEFORE UPDATE OR DELETE ON payment_settings_history FOR EACH ROW EXECUTE FUNCTION sep_registration_history_immutable();
CREATE UNIQUE INDEX payment_reference_unique ON payment_charges(organization_id,event_id,(settlement->>'methodId'),(settlement->>'reference')) WHERE state IN ('paid','refunded');
CREATE FUNCTION sep_payment_charge_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Payment preservation' USING ERRCODE='42501'; END IF;
 IF NEW.id<>OLD.id OR NEW.organization_id<>OLD.organization_id OR NEW.event_id<>OLD.event_id OR NEW.person_id<>OLD.person_id OR NEW.registration_id<>OLD.registration_id OR NEW.fee_id<>OLD.fee_id OR NEW.snapshot IS DISTINCT FROM OLD.snapshot OR NEW.created_at<>OLD.created_at OR NEW.revision<>OLD.revision+1 THEN RAISE EXCEPTION 'Charge snapshot is immutable' USING ERRCODE='42501'; END IF;
 IF NEW.state IN ('paid','waived','refunded','cancelled') AND current_setting('sep.finance_staff',true) IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Staff payment verification required' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER payment_charge_immutable BEFORE UPDATE OR DELETE ON payment_charges FOR EACH ROW EXECUTE FUNCTION sep_payment_charge_immutable();
--> statement-breakpoint
CREATE FUNCTION sep_payment_notices() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE previous text:=current_setting('sep.communication_rpc',true); recipient uuid;
BEGIN
 PERFORM set_config('sep.communication_rpc','true',true);
 PERFORM public.sep_enqueue_notice(NEW.organization_id,NEW.event_id,NEW.person_id,'payment:'||NEW.id::text,'payment.updated','payments',NEW.charge_id);
 IF NEW.action='reported' THEN
  FOR recipient IN SELECT DISTINCT m.person_id FROM public.memberships m JOIN public.role_assignments r ON r.membership_id=m.id WHERE m.organization_id=NEW.organization_id AND m.event_id=NEW.event_id AND m.active AND r.active AND r.role='organizer' AND r.valid_from<=now() AND (r.valid_until IS NULL OR r.valid_until>now()) LOOP
   PERFORM public.sep_enqueue_notice(NEW.organization_id,NEW.event_id,recipient,'payment-staff:'||NEW.id::text,'payment.reported','payments-admin',NEW.charge_id);
  END LOOP;
 END IF;
 PERFORM set_config('sep.communication_rpc',coalesce(previous,''),true); RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION sep_payment_notices() FROM PUBLIC;
CREATE TRIGGER payment_notices AFTER INSERT ON payment_history FOR EACH ROW EXECUTE FUNCTION sep_payment_notices();
CREATE FUNCTION sep_gallery_notices() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE previous text:=current_setting('sep.communication_rpc',true);
BEGIN
 IF NEW.action IN ('published','withdrawn','authorization_revoked') THEN
  PERFORM set_config('sep.communication_rpc','true',true);
  PERFORM public.sep_enqueue_notice(NEW.organization_id,NEW.event_id,NEW.owner_id,'gallery:'||NEW.id::text,'gallery.updated','posters',NEW.work_id);
  PERFORM set_config('sep.communication_rpc',coalesce(previous,''),true);
 END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION sep_gallery_notices() FROM PUBLIC;
CREATE TRIGGER gallery_notices AFTER INSERT ON gallery_history FOR EACH ROW EXECUTE FUNCTION sep_gallery_notices();
