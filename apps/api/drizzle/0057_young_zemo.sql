CREATE TABLE "program_spaces" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"capacity" integer,
	"active" boolean DEFAULT true NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "program_spaces_organization_id_event_id_id_unique" UNIQUE("organization_id","event_id","id"),
	CONSTRAINT "program_space_code_unique" UNIQUE("organization_id","event_id","code"),
	CONSTRAINT "program_space_kind" CHECK ("program_spaces"."kind" IN ('physical','virtual')),
	CONSTRAINT "program_space_capacity" CHECK ("program_spaces"."capacity" IS NULL OR "program_spaces"."capacity" BETWEEN 1 AND 1000000),
	CONSTRAINT "program_space_revision" CHECK ("program_spaces"."revision">0)
);
--> statement-breakpoint
ALTER TABLE "program_spaces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "program_drafts" ADD COLUMN "activities" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "program_spaces" ADD CONSTRAINT "program_spaces_organization_id_event_id_events_organization_id_id_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "program_space_name_unique" ON "program_spaces" USING btree ("organization_id","event_id","kind",lower(regexp_replace(btrim("name"),'\s+',' ','g')),lower(regexp_replace(btrim("location"),'\s+',' ','g')));--> statement-breakpoint
CREATE POLICY "context_scope" ON "program_spaces" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("program_spaces"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "program_spaces"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.submissions_staff',true)='true') WITH CHECK ("program_spaces"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "program_spaces"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.submissions_staff',true)='true');
--> statement-breakpoint
GRANT SELECT,INSERT,UPDATE ON program_spaces TO sep_runtime;
CREATE POLICY program_catalog_migration ON program_drafts FOR ALL TO sep_migrator USING(true) WITH CHECK(true);
--> statement-breakpoint
INSERT INTO program_spaces(id,organization_id,event_id,code,name,kind,location,active,revision)
SELECT gen_random_uuid(),organization_id,event_id,'LEGACY-'||upper(substr(md5(kind||':'||name_key),1,12)),min(name),kind,'',true,1
FROM(SELECT d.organization_id,d.event_id,btrim(s->>'room') AS name,lower(regexp_replace(btrim(s->>'room'),'\s+',' ','g')) AS name_key,CASE WHEN s->>'modality'='virtual' THEN 'virtual' ELSE 'physical' END AS kind FROM program_drafts d CROSS JOIN LATERAL jsonb_array_elements(d.sessions)s WHERE length(btrim(s->>'room'))>0)x
GROUP BY organization_id,event_id,kind,name_key;
--> statement-breakpoint
DO $$
DECLARE d record; s jsonb; updated jsonb; space_id uuid; mode text; items jsonb;
BEGIN
 FOR d IN SELECT * FROM program_drafts WHERE jsonb_array_length(sessions)>0 LOOP
  updated:='[]'::jsonb;
  FOR s IN SELECT * FROM jsonb_array_elements(d.sessions) LOOP
   mode:=s->>'modality';
   SELECT r.id INTO space_id FROM program_spaces r WHERE r.organization_id=d.organization_id AND r.event_id=d.event_id AND r.kind=CASE WHEN mode='virtual' THEN 'virtual' ELSE 'physical' END AND lower(regexp_replace(btrim(r.name),'\s+',' ','g'))=lower(regexp_replace(btrim(s->>'room'),'\s+',' ','g')) LIMIT 1;
   SELECT coalesce(jsonb_agg(p||jsonb_build_object('format','oral','modality',CASE WHEN mode='virtual' THEN 'virtual' ELSE 'in_person' END,'displayCode','')),'[]'::jsonb) INTO items FROM jsonb_array_elements(s->'slots')p;
   updated:=updated||jsonb_build_array(s||jsonb_build_object('type','oral','activityId',null,'roomId',CASE WHEN mode<>'virtual' THEN space_id ELSE null END,'virtualRoomId',CASE WHEN mode='virtual' THEN space_id ELSE null END,'descriptionEs','','descriptionEn','','participants','[]'::jsonb,'slots',items));
  END LOOP;
  UPDATE program_drafts SET sessions=updated,revision=revision+1 WHERE organization_id=d.organization_id AND event_id=d.event_id;
 END LOOP;
END $$;
--> statement-breakpoint
DROP POLICY program_catalog_migration ON program_drafts;
ALTER TABLE program_spaces FORCE ROW LEVEL SECURITY;
