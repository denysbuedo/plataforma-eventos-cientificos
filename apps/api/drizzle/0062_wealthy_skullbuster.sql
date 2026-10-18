CREATE TABLE "communication_contacts" (
	"person_id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "communication_contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "event_announcements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"message_es" text NOT NULL,
	"message_en" text NOT NULL,
	"audience" text NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "announcement_values" CHECK ("event_announcements"."audience" IN ('registrants','reviewers') AND "event_announcements"."category" IN ('operational','optional'))
);
--> statement-breakpoint
ALTER TABLE "event_announcements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "event_notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"source_key" text NOT NULL,
	"kind" text NOT NULL,
	"target" text NOT NULL,
	"resource_id" uuid,
	"category" text DEFAULT 'operational' NOT NULL,
	"message_es" text DEFAULT '' NOT NULL,
	"message_en" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	CONSTRAINT "event_notifications_organization_id_event_id_source_key_person_id_unique" UNIQUE("organization_id","event_id","source_key","person_id"),
	CONSTRAINT "event_notifications_organization_id_event_id_id_unique" UNIQUE("organization_id","event_id","id"),
	CONSTRAINT "notification_category" CHECK ("event_notifications"."category" IN ('operational','optional'))
);
--> statement-breakpoint
ALTER TABLE "event_notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mail_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"delivery_id" uuid NOT NULL,
	"status" text NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mail_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mail_deliveries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"notification_id" uuid NOT NULL,
	"recipient" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"lease_id" uuid,
	"lease_until" timestamp with time zone,
	"next_attempt_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	CONSTRAINT "mail_deliveries_notification_id_unique" UNIQUE("notification_id"),
	CONSTRAINT "mail_deliveries_organization_id_event_id_id_unique" UNIQUE("organization_id","event_id","id"),
	CONSTRAINT "mail_delivery_status" CHECK ("mail_deliveries"."status" IN ('pending','processing','retry','sent','failed','suppressed','blocked') AND "mail_deliveries"."attempts">=0)
);
--> statement-breakpoint
ALTER TABLE "mail_deliveries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"optional_email" boolean DEFAULT false NOT NULL,
	"locale" text DEFAULT 'es' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "notification_preferences_organization_id_event_id_person_id_pk" PRIMARY KEY("organization_id","event_id","person_id"),
	CONSTRAINT "notification_preferences_values" CHECK ("notification_preferences"."revision">0 AND "notification_preferences"."locale" IN ('es','en'))
);
--> statement-breakpoint
ALTER TABLE "notification_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "communication_contacts" ADD CONSTRAINT "communication_contacts_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_announcements" ADD CONSTRAINT "event_announcements_actor_id_people_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_announcements" ADD CONSTRAINT "event_announcements_organization_id_event_id_events_organization_id_id_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_notifications" ADD CONSTRAINT "event_notifications_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_notifications" ADD CONSTRAINT "event_notifications_organization_id_event_id_events_organization_id_id_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_attempts" ADD CONSTRAINT "mail_attempts_organization_id_event_id_delivery_id_mail_deliveries_organization_id_event_id_id_fk" FOREIGN KEY ("organization_id","event_id","delivery_id") REFERENCES "public"."mail_deliveries"("organization_id","event_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_deliveries" ADD CONSTRAINT "mail_deliveries_organization_id_event_id_notification_id_event_notifications_organization_id_event_id_id_fk" FOREIGN KEY ("organization_id","event_id","notification_id") REFERENCES "public"."event_notifications"("organization_id","event_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_organization_id_event_id_events_organization_id_id_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_inbox_idx" ON "event_notifications" USING btree ("organization_id","event_id","person_id","created_at");--> statement-breakpoint
CREATE INDEX "mail_due_idx" ON "mail_deliveries" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE POLICY "context_scope" ON "communication_contacts" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("communication_contacts"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid) WITH CHECK ("communication_contacts"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "communication_registry" ON "communication_contacts" AS PERMISSIVE FOR SELECT TO "sep_migrator" USING (current_setting('sep.communication_rpc',true)='true');--> statement-breakpoint
CREATE POLICY "announcement_staff" ON "event_announcements" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("event_announcements"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "event_announcements"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.communication_staff',true)='true');--> statement-breakpoint
CREATE POLICY "announcement_create" ON "event_announcements" AS PERMISSIVE FOR INSERT TO "sep_runtime" WITH CHECK ("event_announcements"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "event_announcements"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.communication_staff',true)='true' AND "event_announcements"."actor_id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "communication_registry" ON "event_announcements" AS PERMISSIVE FOR ALL TO "sep_migrator" USING (current_setting('sep.communication_rpc',true)='true' AND "event_announcements"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "event_announcements"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid) WITH CHECK (current_setting('sep.communication_rpc',true)='true' AND "event_announcements"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "event_announcements"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid);--> statement-breakpoint
CREATE POLICY "notification_read" ON "event_notifications" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("event_notifications"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "event_notifications"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND ("event_notifications"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid OR current_setting('sep.communication_staff',true)='true'));--> statement-breakpoint
CREATE POLICY "notification_mark" ON "event_notifications" AS PERMISSIVE FOR UPDATE TO "sep_runtime" USING ("event_notifications"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "event_notifications"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND "event_notifications"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid) WITH CHECK ("event_notifications"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "event_notifications"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND "event_notifications"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "communication_registry" ON "event_notifications" AS PERMISSIVE FOR ALL TO "sep_migrator" USING (current_setting('sep.communication_rpc',true)='true' AND "event_notifications"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "event_notifications"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid) WITH CHECK (current_setting('sep.communication_rpc',true)='true' AND "event_notifications"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "event_notifications"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid);--> statement-breakpoint
CREATE POLICY "mail_attempt_staff" ON "mail_attempts" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("mail_attempts"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "mail_attempts"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.communication_staff',true)='true');--> statement-breakpoint
CREATE POLICY "communication_registry" ON "mail_attempts" AS PERMISSIVE FOR ALL TO "sep_migrator" USING (current_setting('sep.communication_rpc',true)='true' AND "mail_attempts"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "mail_attempts"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid) WITH CHECK (current_setting('sep.communication_rpc',true)='true' AND "mail_attempts"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "mail_attempts"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid);--> statement-breakpoint
CREATE POLICY "mail_delivery_staff" ON "mail_deliveries" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("mail_deliveries"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "mail_deliveries"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.communication_staff',true)='true');--> statement-breakpoint
CREATE POLICY "communication_registry" ON "mail_deliveries" AS PERMISSIVE FOR ALL TO "sep_migrator" USING (current_setting('sep.communication_rpc',true)='true' AND "mail_deliveries"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "mail_deliveries"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid) WITH CHECK (current_setting('sep.communication_rpc',true)='true' AND "mail_deliveries"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "mail_deliveries"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid);--> statement-breakpoint
CREATE POLICY "context_scope" ON "notification_preferences" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("notification_preferences"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "notification_preferences"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND "notification_preferences"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid) WITH CHECK ("notification_preferences"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "notification_preferences"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND "notification_preferences"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "communication_registry" ON "notification_preferences" AS PERMISSIVE FOR ALL TO "sep_migrator" USING (current_setting('sep.communication_rpc',true)='true' AND "notification_preferences"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "notification_preferences"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid) WITH CHECK (current_setting('sep.communication_rpc',true)='true' AND "notification_preferences"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "notification_preferences"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid);