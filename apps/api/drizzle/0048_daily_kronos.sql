CREATE TABLE "work_notice_reads" (
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"work_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"seen_ids" uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
	CONSTRAINT "work_notice_reads_organization_id_event_id_work_id_person_id_pk" PRIMARY KEY("organization_id","event_id","work_id","person_id")
);
--> statement-breakpoint
ALTER TABLE "work_notice_reads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "work_history" ADD COLUMN "author_feedback" jsonb;--> statement-breakpoint
ALTER TABLE "work_notice_reads" ADD CONSTRAINT "work_notice_reads_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_notice_reads" ADD CONSTRAINT "work_notice_reads_organization_id_event_id_work_id_author_works_organization_id_event_id_id_fk" FOREIGN KEY ("organization_id","event_id","work_id") REFERENCES "public"."author_works"("organization_id","event_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "work_history_notices_idx" ON "work_history" USING btree ("organization_id","event_id","work_id","action","created_at");--> statement-breakpoint
CREATE POLICY "context_scope" ON "work_notice_reads" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("work_notice_reads"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid AND "work_notice_reads"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "work_notice_reads"."event_id" = nullif(current_setting('sep.event_id',true),'')::uuid AND EXISTS (SELECT 1 FROM author_works w WHERE w.id="work_notice_reads"."work_id" AND w.organization_id="work_notice_reads"."organization_id" AND w.event_id="work_notice_reads"."event_id")) WITH CHECK ("work_notice_reads"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid AND "work_notice_reads"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "work_notice_reads"."event_id" = nullif(current_setting('sep.event_id',true),'')::uuid AND EXISTS (SELECT 1 FROM author_works w WHERE w.id="work_notice_reads"."work_id" AND w.organization_id="work_notice_reads"."organization_id" AND w.event_id="work_notice_reads"."event_id"));
--> statement-breakpoint
ALTER TABLE work_notice_reads FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON work_notice_reads TO sep_runtime;
