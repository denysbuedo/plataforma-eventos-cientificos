CREATE TABLE "event_configurations" (
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"start_date" date,
	"end_date" date,
	"modality" text DEFAULT 'in_person' NOT NULL,
	"languages" text[] DEFAULT ARRAY['es','en']::text[] NOT NULL,
	"default_language" text DEFAULT 'es' NOT NULL,
	"lifecycle" text DEFAULT 'planning' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "event_configurations_organization_id_event_id_pk" PRIMARY KEY("organization_id","event_id"),
	CONSTRAINT "event_configuration_dates" CHECK (("event_configurations"."start_date" IS NULL AND "event_configurations"."end_date" IS NULL) OR ("event_configurations"."start_date" IS NOT NULL AND "event_configurations"."end_date" IS NOT NULL AND "event_configurations"."end_date" >= "event_configurations"."start_date")),
	CONSTRAINT "event_configuration_modality" CHECK ("event_configurations"."modality" IN ('in_person','virtual','hybrid')),
	CONSTRAINT "event_configuration_languages" CHECK (cardinality("event_configurations"."languages") BETWEEN 1 AND 2 AND "event_configurations"."languages" <@ ARRAY['es','en']::text[] AND "event_configurations"."default_language" = ANY("event_configurations"."languages")),
	CONSTRAINT "event_configuration_lifecycle" CHECK ("event_configurations"."lifecycle" IN ('planning','scheduled','ongoing','completed','cancelled')),
	CONSTRAINT "event_configuration_revision" CHECK ("event_configurations"."revision" > 0),
	CONSTRAINT "event_configuration_scheduled_dates" CHECK ("event_configurations"."lifecycle" NOT IN ('scheduled','ongoing','completed') OR "event_configurations"."start_date" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "event_configurations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "event_configurations" ADD CONSTRAINT "event_configurations_organization_id_event_id_events_organization_id_id_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "context_scope" ON "event_configurations" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("event_configurations"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND
  ("event_configurations"."event_id" = nullif(current_setting('sep.event_id', true), '')::uuid OR current_setting('sep.organization_admin', true) = 'true')) WITH CHECK ("event_configurations"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND
  ("event_configurations"."event_id" = nullif(current_setting('sep.event_id', true), '')::uuid OR current_setting('sep.organization_admin', true) = 'true'));