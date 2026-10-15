CREATE TABLE "organization_invitations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_by" uuid,
	"accepted_at" timestamp with time zone,
	CONSTRAINT "organization_invitations_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "invitation_status_check" CHECK ("organization_invitations"."status" IN ('pending','accepted','revoked')),
	CONSTRAINT "invitation_dates_check" CHECK ("organization_invitations"."expires_at" > "organization_invitations"."created_at"),
	CONSTRAINT "invitation_acceptance_check" CHECK (("organization_invitations"."status" = 'accepted') = ("organization_invitations"."accepted_by" IS NOT NULL AND "organization_invitations"."accepted_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "organization_invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_created_by_people_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_accepted_by_people_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invitation_pending_email_unique" ON "organization_invitations" USING btree ("organization_id","email") WHERE "organization_invitations"."status" = 'pending';--> statement-breakpoint
CREATE POLICY "invitation_read" ON "organization_invitations" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("organization_invitations"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND
    (current_setting('sep.organization_admin', true) = 'true' OR "organization_invitations"."token_hash" = current_setting('sep.invitation_hash', true)));--> statement-breakpoint
CREATE POLICY "invitation_create" ON "organization_invitations" AS PERMISSIVE FOR INSERT TO "sep_runtime" WITH CHECK ("organization_invitations"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND current_setting('sep.organization_admin', true) = 'true' AND "organization_invitations"."created_by" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "invitation_update" ON "organization_invitations" AS PERMISSIVE FOR UPDATE TO "sep_runtime" USING ("organization_invitations"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND (current_setting('sep.organization_admin', true) = 'true' OR "organization_invitations"."token_hash" = current_setting('sep.invitation_hash', true))) WITH CHECK ("organization_invitations"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND (current_setting('sep.organization_admin', true) = 'true' OR ("organization_invitations"."token_hash" = current_setting('sep.invitation_hash', true) AND "organization_invitations"."accepted_by" = nullif(current_setting('sep.person_id', true), '')::uuid)));