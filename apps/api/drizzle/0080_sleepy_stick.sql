CREATE TABLE "local_accounts" (
	"person_id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"verified_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"credential_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "local_accounts_email_unique" UNIQUE("email"),
	CONSTRAINT "local_email_normalized" CHECK ("local_accounts"."email"=lower(trim("local_accounts"."email")) AND length("local_accounts"."email") BETWEEN 3 AND 254),
	CONSTRAINT "local_credential_version" CHECK ("local_accounts"."credential_version">0)
);
--> statement-breakpoint
ALTER TABLE "local_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "local_auth_limits" (
	"bucket_hash" text PRIMARY KEY NOT NULL,
	"attempts" integer NOT NULL,
	"window_at" timestamp with time zone NOT NULL,
	CONSTRAINT "local_limit_hash" CHECK ("local_auth_limits"."bucket_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
ALTER TABLE "local_auth_limits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "local_challenges" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"person_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "local_challenge_hash" CHECK ("local_challenges"."token_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "local_challenge_purpose" CHECK ("local_challenges"."purpose" IN ('verify','reset'))
);
--> statement-breakpoint
ALTER TABLE "local_challenges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "local_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"person_id" uuid NOT NULL,
	"credential_version" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "local_session_hash" CHECK ("local_sessions"."token_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
ALTER TABLE "local_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "local_accounts" ADD CONSTRAINT "local_accounts_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_challenges" ADD CONSTRAINT "local_challenges_person_id_local_accounts_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."local_accounts"("person_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_sessions" ADD CONSTRAINT "local_sessions_person_id_local_accounts_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."local_accounts"("person_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "local_challenge_person_idx" ON "local_challenges" USING btree ("person_id","purpose");--> statement-breakpoint
CREATE INDEX "local_session_person_idx" ON "local_sessions" USING btree ("person_id");--> statement-breakpoint
CREATE POLICY "local_identity_insert" ON "identities" AS PERMISSIVE FOR INSERT TO "sep_migrator" WITH CHECK (current_setting('sep.local_auth',true)='true' AND "identities"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid AND "identities"."issuer"='sep-local' AND "identities"."subject"="identities"."person_id"::text);--> statement-breakpoint
CREATE POLICY "local_identity_read" ON "people" AS PERMISSIVE FOR SELECT TO "sep_migrator" USING (current_setting('sep.local_auth',true)='true' AND "people"."id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "local_identity_insert" ON "people" AS PERMISSIVE FOR INSERT TO "sep_migrator" WITH CHECK (current_setting('sep.local_auth',true)='true' AND "people"."id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "local_identity_update" ON "people" AS PERMISSIVE FOR UPDATE TO "sep_migrator" USING (current_setting('sep.local_auth',true)='true' AND "people"."id" = nullif(current_setting('sep.person_id', true), '')::uuid) WITH CHECK (current_setting('sep.local_auth',true)='true' AND "people"."id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "local_identity_service" ON "local_accounts" AS PERMISSIVE FOR ALL TO "sep_migrator" USING (current_setting('sep.local_auth',true)='true') WITH CHECK (current_setting('sep.local_auth',true)='true');--> statement-breakpoint
CREATE POLICY "local_identity_service" ON "local_auth_limits" AS PERMISSIVE FOR ALL TO "sep_migrator" USING (current_setting('sep.local_auth',true)='true') WITH CHECK (current_setting('sep.local_auth',true)='true');--> statement-breakpoint
CREATE POLICY "local_identity_service" ON "local_challenges" AS PERMISSIVE FOR ALL TO "sep_migrator" USING (current_setting('sep.local_auth',true)='true') WITH CHECK (current_setting('sep.local_auth',true)='true');--> statement-breakpoint
CREATE POLICY "local_identity_service" ON "local_sessions" AS PERMISSIVE FOR ALL TO "sep_migrator" USING (current_setting('sep.local_auth',true)='true') WITH CHECK (current_setting('sep.local_auth',true)='true');
--> statement-breakpoint
ALTER TABLE local_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE local_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE local_challenges FORCE ROW LEVEL SECURITY;
ALTER TABLE local_auth_limits FORCE ROW LEVEL SECURITY;
REVOKE ALL ON local_accounts,local_sessions,local_challenges,local_auth_limits FROM PUBLIC,sep_runtime;
--> statement-breakpoint
CREATE FUNCTION sep_local_identity(command text,d jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=on AS $$
DECLARE a public.local_accounts%ROWTYPE; c public.local_challenges%ROWTYPE; who uuid; label text; attempts_now integer; ok boolean;
BEGIN
 PERFORM set_config('sep.local_auth','true',true);
 IF command='rate' THEN
  INSERT INTO public.local_auth_limits(bucket_hash,attempts,window_at) VALUES(d->>'bucket',1,now())
  ON CONFLICT(bucket_hash) DO UPDATE SET attempts=CASE WHEN local_auth_limits.window_at<now()-interval '15 minutes' THEN 1 ELSE local_auth_limits.attempts+1 END,
   window_at=CASE WHEN local_auth_limits.window_at<now()-interval '15 minutes' THEN now() ELSE local_auth_limits.window_at END RETURNING attempts INTO attempts_now;
  RETURN to_jsonb(attempts_now<=CASE WHEN (d->>'global')::boolean THEN 600 ELSE 10 END);
 ELSIF command='register' THEN
  IF d->>'email' IS NULL OR length(d->>'email')>254 OR d->>'email'<>lower(trim(d->>'email')) OR length(trim(d->>'name')) NOT BETWEEN 2 AND 120
   OR coalesce(d->>'passwordHash','') !~ '^scrypt[$]131072[$]8[$]1[$][a-f0-9]{32}[$][a-f0-9]{128}$' THEN RAISE EXCEPTION 'Invalid registration' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('local-email:'||(d->>'email'),0));
  SELECT * INTO a FROM public.local_accounts WHERE email=d->>'email' FOR UPDATE;
  IF FOUND AND (a.verified_at IS NOT NULL OR NOT a.active) THEN RETURN jsonb_build_object('send',false); END IF;
  IF a.person_id IS NULL THEN
   who=gen_random_uuid(); PERFORM set_config('sep.person_id',who::text,true);
   INSERT INTO public.people(id,name) VALUES(who,trim(d->>'name'));
   INSERT INTO public.identities(id,person_id,issuer,subject) VALUES(gen_random_uuid(),who,'sep-local',who::text);
   INSERT INTO public.local_accounts(person_id,email,password_hash) VALUES(who,d->>'email',d->>'passwordHash') RETURNING * INTO a;
  END IF;
  -- The verification ticket binds the password chosen in this exact request.
  -- A previous pending registration cannot activate a different password.
  INSERT INTO public.local_challenges(token_hash,person_id,purpose,payload,expires_at) VALUES(d->>'tokenHash',a.person_id,'verify',jsonb_build_object('passwordHash',d->>'passwordHash','name',trim(d->>'name')),now()+interval '24 hours');
  RETURN jsonb_build_object('send',true);
 ELSIF command='credentials' THEN
  SELECT * INTO a FROM public.local_accounts WHERE email=d->>'email' AND active;
  IF NOT FOUND THEN RETURN NULL; END IF;
  PERFORM set_config('sep.person_id',a.person_id::text,true);
  SELECT name INTO label FROM public.people WHERE id=a.person_id AND active;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('personId',a.person_id,'email',a.email,'name',label,'passwordHash',a.password_hash,'version',a.credential_version,'verified',a.verified_at IS NOT NULL);
 ELSIF command='session-create' THEN
  SELECT * INTO a FROM public.local_accounts WHERE person_id=(d->>'personId')::uuid AND active AND verified_at IS NOT NULL AND credential_version=(d->>'version')::integer FOR SHARE;
  IF NOT FOUND THEN RETURN 'false'::jsonb; END IF;
  PERFORM set_config('sep.person_id',a.person_id::text,true);
  IF NOT EXISTS(SELECT 1 FROM public.people WHERE id=a.person_id AND active) THEN RETURN 'false'::jsonb; END IF;
  INSERT INTO public.local_sessions(token_hash,person_id,credential_version,expires_at) VALUES(d->>'tokenHash',a.person_id,a.credential_version,now()+interval '8 hours');
  RETURN 'true'::jsonb;
 ELSIF command='session-read' THEN
  SELECT x.* INTO a FROM public.local_sessions s JOIN public.local_accounts x ON x.person_id=s.person_id WHERE s.token_hash=d->>'tokenHash' AND s.expires_at>now() AND x.active AND x.verified_at IS NOT NULL AND s.credential_version=x.credential_version;
  IF NOT FOUND THEN RETURN NULL; END IF;
  PERFORM set_config('sep.person_id',a.person_id::text,true);
  IF NOT EXISTS(SELECT 1 FROM public.people WHERE id=a.person_id AND active) THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('personId',a.person_id,'email',a.email);
 ELSIF command='logout' THEN
  DELETE FROM public.local_sessions WHERE token_hash=d->>'tokenHash';RETURN 'true'::jsonb;
 ELSIF command='challenge-issue' THEN
  SELECT * INTO a FROM public.local_accounts WHERE email=d->>'email' AND active FOR UPDATE;
  IF NOT FOUND OR (d->>'purpose'='verify' AND a.verified_at IS NOT NULL) OR (d->>'purpose'='reset' AND a.verified_at IS NULL) OR d->>'purpose' NOT IN ('verify','reset') THEN RETURN 'false'::jsonb; END IF;
  PERFORM set_config('sep.person_id',a.person_id::text,true);
  SELECT name INTO label FROM public.people WHERE id=a.person_id AND active;
  IF NOT FOUND THEN RETURN 'false'::jsonb; END IF;
  INSERT INTO public.local_challenges(token_hash,person_id,purpose,payload,expires_at) VALUES(d->>'tokenHash',a.person_id,d->>'purpose',jsonb_build_object('passwordHash',a.password_hash,'name',label),now()+CASE WHEN d->>'purpose'='verify' THEN interval '24 hours' ELSE interval '30 minutes' END);
  RETURN 'true'::jsonb;
 ELSIF command='challenge-consume' THEN
  SELECT person_id INTO who FROM public.local_challenges WHERE token_hash=d->>'tokenHash' AND purpose=d->>'purpose';
  IF NOT FOUND THEN RETURN 'false'::jsonb; END IF;
  SELECT * INTO a FROM public.local_accounts WHERE person_id=who AND active FOR UPDATE;
  IF NOT FOUND THEN RETURN 'false'::jsonb; END IF;
  SELECT * INTO c FROM public.local_challenges WHERE token_hash=d->>'tokenHash' AND purpose=d->>'purpose' AND consumed_at IS NULL AND expires_at>now() FOR UPDATE;
  IF NOT FOUND THEN RETURN 'false'::jsonb; END IF;
  PERFORM set_config('sep.person_id',who::text,true);
  IF NOT EXISTS(SELECT 1 FROM public.people WHERE id=who AND active) THEN RETURN 'false'::jsonb; END IF;
  IF c.purpose='verify' AND a.verified_at IS NULL THEN
   UPDATE public.local_accounts SET verified_at=now(),password_hash=c.payload->>'passwordHash',credential_version=credential_version+1 WHERE person_id=who;
   UPDATE public.people SET name=c.payload->>'name' WHERE id=who;
  ELSIF c.purpose='reset' AND a.verified_at IS NOT NULL AND coalesce(d->>'passwordHash','') ~ '^scrypt[$]131072[$]8[$]1[$][a-f0-9]{32}[$][a-f0-9]{128}$' THEN
   UPDATE public.local_accounts SET password_hash=d->>'passwordHash',credential_version=credential_version+1 WHERE person_id=who;
  ELSE RETURN 'false'::jsonb; END IF;
  UPDATE public.local_challenges SET consumed_at=now() WHERE person_id=who AND consumed_at IS NULL;
  DELETE FROM public.local_sessions WHERE person_id=who;
  RETURN 'true'::jsonb;
 END IF;
 RAISE EXCEPTION 'Unknown local identity operation' USING ERRCODE='22023';
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION sep_local_identity(text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sep_local_identity(text,jsonb) TO sep_runtime;
