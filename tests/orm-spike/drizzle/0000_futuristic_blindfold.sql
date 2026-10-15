CREATE TABLE "events" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	CONSTRAINT "events_organization_id_id_pk" PRIMARY KEY("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "private_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"title" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "private_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private_records" ADD CONSTRAINT "private_records_organization_id_event_id_events_organization_id_id_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "private_records_organization_id_event_id_idx" ON "private_records" USING btree ("organization_id","event_id");--> statement-breakpoint
CREATE POLICY "event_scope" ON "private_records" AS PERMISSIVE FOR ALL TO "sep_spike_runtime" USING ("private_records"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid
    AND "private_records"."event_id" = nullif(current_setting('sep.event_id', true), '')::uuid) WITH CHECK ("private_records"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid
    AND "private_records"."event_id" = nullif(current_setting('sep.event_id', true), '')::uuid);