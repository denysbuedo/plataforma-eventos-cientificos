CREATE TABLE "orcid_connections" (
	"person_id" uuid PRIMARY KEY NOT NULL,
	"orcid" text,
	"environment" text DEFAULT 'production' NOT NULL,
	"connected_at" timestamp with time zone,
	"state_hash" text,
	"expires_at" timestamp with time zone,
	"return_to" text,
	CONSTRAINT "orcid_connections_environment_orcid_unique" UNIQUE("environment","orcid"),
	CONSTRAINT "orcid_environment" CHECK ("orcid_connections"."environment" IN ('production','sandbox'))
);
--> statement-breakpoint
ALTER TABLE "orcid_connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "event_configurations" ADD COLUMN "require_submitting_author_orcid" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orcid_connections" ADD CONSTRAINT "orcid_connections_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "context_scope" ON "orcid_connections" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("orcid_connections"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid) WITH CHECK ("orcid_connections"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid);