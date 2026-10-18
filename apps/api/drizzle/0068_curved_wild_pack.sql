ALTER TABLE "editorial_selections" ADD COLUMN "permission_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "publication_releases" ADD COLUMN "proof" text NOT NULL;