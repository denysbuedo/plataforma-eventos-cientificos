CREATE TABLE "sponsor_commitments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"content" jsonb NOT NULL,
	"revision" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sponsor_commitment_revision" CHECK ("sponsor_commitments"."revision">0)
);
--> statement-breakpoint
ALTER TABLE "sponsor_commitments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sponsors" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"content" jsonb NOT NULL,
	"revision" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sponsor_event_id_unique" UNIQUE("organization_id","event_id","id"),
	CONSTRAINT "sponsor_revision" CHECK ("sponsors"."revision">0)
);
--> statement-breakpoint
ALTER TABLE "sponsors" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sponsorship_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_name" text NOT NULL,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"revision" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sponsorship_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sponsorship_releases" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"edition" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"fingerprint" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"published_by" uuid NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone,
	"withdrawal_reason" text,
	CONSTRAINT "sponsorship_release_edition_unique" UNIQUE("organization_id","event_id","edition"),
	CONSTRAINT "sponsorship_release_state" CHECK ("sponsorship_releases"."edition">0 AND "sponsorship_releases"."active"=("sponsorship_releases"."withdrawn_at" IS NULL) AND ("sponsorship_releases"."active" OR coalesce(length(btrim("sponsorship_releases"."withdrawal_reason")),0)>=10))
);
--> statement-breakpoint
ALTER TABLE "sponsorship_releases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sponsorship_settings" (
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"content" jsonb NOT NULL,
	"revision" integer NOT NULL,
	CONSTRAINT "sponsorship_settings_organization_id_event_id_pk" PRIMARY KEY("organization_id","event_id"),
	CONSTRAINT "sponsorship_settings_revision" CHECK ("sponsorship_settings"."revision">0)
);
--> statement-breakpoint
ALTER TABLE "sponsorship_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sponsor_commitments" ADD CONSTRAINT "sponsor_commitment_partner_fk" FOREIGN KEY ("organization_id","event_id","partner_id") REFERENCES "public"."sponsors"("organization_id","event_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsor_event_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorship_history" ADD CONSTRAINT "sponsorship_history_actor_id_people_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorship_history" ADD CONSTRAINT "sponsorship_history_event_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorship_releases" ADD CONSTRAINT "sponsorship_releases_published_by_people_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorship_releases" ADD CONSTRAINT "sponsorship_release_event_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorship_settings" ADD CONSTRAINT "sponsorship_settings_event_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sponsorship_one_active_release" ON "sponsorship_releases" USING btree ("organization_id","event_id") WHERE "sponsorship_releases"."active";--> statement-breakpoint
CREATE POLICY "sponsorship_members" ON "memberships" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING (current_setting('sep.sponsorship_staff',true)='true' AND "memberships"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "memberships"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid);--> statement-breakpoint
CREATE POLICY "sponsorship_names" ON "people" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING (current_setting('sep.sponsorship_staff',true)='true' AND EXISTS(SELECT 1 FROM memberships m WHERE m.person_id="people"."id" AND m.organization_id=nullif(current_setting('sep.organization_id',true),'')::uuid AND m.event_id=nullif(current_setting('sep.event_id',true),'')::uuid AND m.active));--> statement-breakpoint
CREATE POLICY "context_scope" ON "sponsor_commitments" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("sponsor_commitments"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "sponsor_commitments"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.sponsorship_staff',true)='true') WITH CHECK ("sponsor_commitments"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "sponsor_commitments"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.sponsorship_staff',true)='true');--> statement-breakpoint
CREATE POLICY "context_scope" ON "sponsors" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("sponsors"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "sponsors"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.sponsorship_staff',true)='true') WITH CHECK ("sponsors"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "sponsors"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.sponsorship_staff',true)='true');--> statement-breakpoint
CREATE POLICY "sponsorship_history_read" ON "sponsorship_history" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("sponsorship_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "sponsorship_history"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.sponsorship_staff',true)='true');--> statement-breakpoint
CREATE POLICY "sponsorship_history_insert" ON "sponsorship_history" AS PERMISSIVE FOR INSERT TO "sep_runtime" WITH CHECK ("sponsorship_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "sponsorship_history"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.sponsorship_staff',true)='true' AND "sponsorship_history"."actor_id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "context_scope" ON "sponsorship_releases" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("sponsorship_releases"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "sponsorship_releases"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.sponsorship_staff',true)='true') WITH CHECK ("sponsorship_releases"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "sponsorship_releases"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.sponsorship_staff',true)='true');--> statement-breakpoint
CREATE POLICY "sponsorship_public_read" ON "sponsorship_releases" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("sponsorship_releases"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "sponsorship_releases"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.sponsorship_public',true)='true' AND "sponsorship_releases"."active");--> statement-breakpoint
CREATE POLICY "context_scope" ON "sponsorship_settings" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("sponsorship_settings"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "sponsorship_settings"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.sponsorship_staff',true)='true') WITH CHECK ("sponsorship_settings"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "sponsorship_settings"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.sponsorship_staff',true)='true');
--> statement-breakpoint
ALTER TABLE sponsorship_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE sponsors FORCE ROW LEVEL SECURITY;
ALTER TABLE sponsor_commitments FORCE ROW LEVEL SECURITY;
ALTER TABLE sponsorship_releases FORCE ROW LEVEL SECURITY;
ALTER TABLE sponsorship_history FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON sponsorship_settings,sponsors,sponsor_commitments,sponsorship_releases TO sep_runtime;
GRANT SELECT,INSERT ON sponsorship_history TO sep_runtime;
CREATE TRIGGER sponsorship_history_immutable BEFORE UPDATE OR DELETE ON sponsorship_history FOR EACH ROW EXECUTE FUNCTION sep_registration_history_immutable();
CREATE FUNCTION sep_sponsorship_release_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Sponsorship releases are preserved' USING ERRCODE='42501'; END IF;
 IF NOT OLD.active OR NEW.active OR NEW.id<>OLD.id OR NEW.organization_id<>OLD.organization_id OR NEW.event_id<>OLD.event_id OR NEW.edition<>OLD.edition OR NEW.snapshot IS DISTINCT FROM OLD.snapshot OR NEW.fingerprint<>OLD.fingerprint OR NEW.published_by<>OLD.published_by OR NEW.published_at<>OLD.published_at THEN RAISE EXCEPTION 'Sponsorship snapshot is immutable' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER sponsorship_release_immutable BEFORE UPDATE OR DELETE ON sponsorship_releases FOR EACH ROW EXECUTE FUNCTION sep_sponsorship_release_immutable();
