CREATE TABLE "attendance_operator_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_name" text NOT NULL,
	"active" boolean NOT NULL,
	"revision" integer NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_operator_history_revision_unique" UNIQUE("organization_id","event_id","person_id","revision")
);
--> statement-breakpoint
ALTER TABLE "attendance_operator_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "attendance_operators" (
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"active" boolean NOT NULL,
	"revision" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_operators_organization_id_event_id_person_id_pk" PRIMARY KEY("organization_id","event_id","person_id"),
	CONSTRAINT "attendance_operator_revision" CHECK ("attendance_operators"."revision">0)
);
--> statement-breakpoint
ALTER TABLE "attendance_operators" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "attendance_operator_history" ADD CONSTRAINT "attendance_operator_history_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_operator_history" ADD CONSTRAINT "attendance_operator_history_actor_id_people_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_operator_history" ADD CONSTRAINT "attendance_operator_history_grant_fk" FOREIGN KEY ("organization_id","event_id","person_id") REFERENCES "public"."attendance_operators"("organization_id","event_id","person_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_operators" ADD CONSTRAINT "attendance_operators_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_operators" ADD CONSTRAINT "attendance_operator_event_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "attendance_team_read" ON "memberships" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING (current_setting('sep.attendance_team',true)='true' AND "memberships"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "memberships"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid);--> statement-breakpoint
CREATE POLICY "attendance_team_read" ON "people" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING (current_setting('sep.attendance_team',true)='true' AND EXISTS(SELECT 1 FROM memberships m WHERE m.person_id="people"."id" AND m.organization_id=nullif(current_setting('sep.organization_id',true),'')::uuid AND m.event_id=nullif(current_setting('sep.event_id',true),'')::uuid AND m.active));--> statement-breakpoint
CREATE POLICY "operator_history_read" ON "attendance_operator_history" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("attendance_operator_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "attendance_operator_history"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.attendance_team',true)='true');--> statement-breakpoint
CREATE POLICY "operator_history_insert" ON "attendance_operator_history" AS PERMISSIVE FOR INSERT TO "sep_runtime" WITH CHECK ("attendance_operator_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "attendance_operator_history"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.attendance_team',true)='true' AND "attendance_operator_history"."actor_id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "operator_read" ON "attendance_operators" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("attendance_operators"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "attendance_operators"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND ("attendance_operators"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid OR current_setting('sep.attendance_team',true)='true'));--> statement-breakpoint
CREATE POLICY "operator_write" ON "attendance_operators" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("attendance_operators"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "attendance_operators"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.attendance_team',true)='true') WITH CHECK ("attendance_operators"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "attendance_operators"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.attendance_team',true)='true');
--> statement-breakpoint
ALTER TABLE attendance_operators FORCE ROW LEVEL SECURITY;
ALTER TABLE attendance_operator_history FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON attendance_operators TO sep_runtime;
GRANT SELECT,INSERT ON attendance_operator_history TO sep_runtime;
CREATE TRIGGER attendance_operator_history_immutable BEFORE UPDATE OR DELETE ON attendance_operator_history FOR EACH ROW EXECUTE FUNCTION sep_registration_history_immutable();
