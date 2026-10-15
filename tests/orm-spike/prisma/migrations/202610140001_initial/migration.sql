-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "organization_id" UUID NOT NULL,
    "id" UUID NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("organization_id","id")
);

-- CreateTable
CREATE TABLE "private_records" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "private_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "private_records_organization_id_event_id_idx" ON "private_records"("organization_id", "event_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_records" ADD CONSTRAINT "private_records_organization_id_event_id_fkey" FOREIGN KEY ("organization_id", "event_id") REFERENCES "events"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
