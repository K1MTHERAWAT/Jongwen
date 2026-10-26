-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'STAFF', 'APPROVER_L2', 'APPROVER_L1', 'ADMIN');

-- CreateEnum
CREATE TYPE "VenueType" AS ENUM ('meeting', 'pavilion', 'field', 'yard', 'training');

-- CreateEnum
CREATE TYPE "VenueStatus" AS ENUM ('available', 'maintenance');

-- CreateEnum
CREATE TYPE "EquipmentCategory" AS ENUM ('audio', 'tent', 'it');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('booking', 'borrow', 'repair');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('pending_staff', 'pending_l2', 'pending_l1', 'approved', 'rejected', 'cancelled', 'borrowing', 'return_inspect', 'returned', 'repair_submitted', 'repair_in_progress', 'repair_awaiting_acceptance', 'repair_done');

-- CreateEnum
CREATE TYPE "SignLevel" AS ENUM ('staff', 'l2', 'l1');

-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('approve', 'reject');

-- CreateEnum
CREATE TYPE "PeriodKind" AS ENUM ('current', 'reschedule');

-- CreateEnum
CREATE TYPE "HandoverPhase" AS ENUM ('before', 'after');

-- CreateEnum
CREATE TYPE "ActivityKind" AS ENUM ('user', 'role', 'resource', 'request');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "initial" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "position" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "line_name" TEXT,
    "line_user_id" TEXT,
    "permissions" JSONB NOT NULL,
    "signature" TEXT,
    "pin" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "VenueType" NOT NULL,
    "building" TEXT NOT NULL,
    "floor" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" "VenueStatus" NOT NULL DEFAULT 'available',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "facilities" TEXT[],
    "open_time" TEXT NOT NULL,
    "close_time" TEXT NOT NULL,
    "open_days" INTEGER[],
    "advance_days" INTEGER NOT NULL,
    "form_name" TEXT NOT NULL,
    "approval_levels" INTEGER NOT NULL DEFAULT 3,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "EquipmentCategory" NOT NULL,
    "stock" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "RequestType" NOT NULL,
    "status" "RequestStatus" NOT NULL,
    "requester_id" TEXT NOT NULL,
    "requester_name" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "requester_signature" TEXT,
    "written_at" TEXT,
    "requester_position" TEXT,
    "address_house_no" TEXT,
    "address_moo" TEXT,
    "address_subdistrict" TEXT,
    "address_district" TEXT,
    "address_province" TEXT,
    "purpose_items" JSONB,
    "purpose" TEXT,
    "activity" TEXT,
    "attendees" INTEGER,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pickup_date" DATE,
    "return_date" DATE,
    "return_requested_at" TIMESTAMPTZ(3),
    "returned_at" TIMESTAMPTZ(3),
    "repair_building" TEXT,
    "repair_floor" TEXT,
    "repair_location" TEXT,
    "repair_category" TEXT,
    "repair_detail" TEXT,
    "repair_photos" INTEGER,
    "repair_resolution" TEXT,
    "repair_staff_signature" TEXT,
    "repair_staff_signer_name" TEXT,
    "repair_accept_signature" TEXT,
    "repair_accepted_at" TIMESTAMPTZ(3),
    "repair_started_at" TIMESTAMPTZ(3),
    "repair_finished_at" TIMESTAMPTZ(3),
    "repair_accepted_by_requester_at" TIMESTAMPTZ(3),
    "created_by_staff_id" TEXT,
    "created_by_staff_signature" TEXT,
    "reject_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_venues" (
    "request_id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,

    CONSTRAINT "request_venues_pkey" PRIMARY KEY ("request_id","venue_id")
);

-- CreateTable
CREATE TABLE "request_periods" (
    "id" SERIAL NOT NULL,
    "request_id" TEXT NOT NULL,
    "kind" "PeriodKind" NOT NULL DEFAULT 'current',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "start_time" TIMESTAMPTZ(3) NOT NULL,
    "end_time" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "request_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_items" (
    "id" SERIAL NOT NULL,
    "request_id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,

    CONSTRAINT "request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signature_records" (
    "id" SERIAL NOT NULL,
    "request_id" TEXT NOT NULL,
    "level" "SignLevel" NOT NULL,
    "signer_id" TEXT NOT NULL,
    "signer_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "decision" "Decision" NOT NULL,
    "signature" TEXT,
    "note" TEXT,
    "signed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signature_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handover_records" (
    "id" SERIAL NOT NULL,
    "request_id" TEXT NOT NULL,
    "phase" "HandoverPhase" NOT NULL,
    "checklist" JSONB NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "staff_id" TEXT NOT NULL,
    "staff_name" TEXT,
    "citizen_signature" TEXT,
    "staff_signature" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "handover_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "kind" "ActivityKind" NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_username_key" ON "accounts"("username");

-- CreateIndex
CREATE INDEX "accounts_role_idx" ON "accounts"("role");

-- CreateIndex
CREATE UNIQUE INDEX "requests_code_key" ON "requests"("code");

-- CreateIndex
CREATE INDEX "requests_requester_id_idx" ON "requests"("requester_id");

-- CreateIndex
CREATE INDEX "requests_type_status_idx" ON "requests"("type", "status");

-- CreateIndex
CREATE INDEX "requests_created_at_idx" ON "requests"("created_at");

-- CreateIndex
CREATE INDEX "request_venues_venue_id_idx" ON "request_venues"("venue_id");

-- CreateIndex
CREATE INDEX "request_periods_request_id_idx" ON "request_periods"("request_id");

-- CreateIndex
CREATE INDEX "request_periods_start_time_end_time_idx" ON "request_periods"("start_time", "end_time");

-- CreateIndex
CREATE INDEX "request_items_request_id_idx" ON "request_items"("request_id");

-- CreateIndex
CREATE INDEX "request_items_equipment_id_idx" ON "request_items"("equipment_id");

-- CreateIndex
CREATE INDEX "signature_records_signer_id_idx" ON "signature_records"("signer_id");

-- CreateIndex
CREATE UNIQUE INDEX "signature_records_request_id_level_key" ON "signature_records"("request_id", "level");

-- CreateIndex
CREATE UNIQUE INDEX "handover_records_request_id_phase_key" ON "handover_records"("request_id", "phase");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_idx" ON "notifications"("user_id", "read");

-- CreateIndex
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_created_by_staff_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_venues" ADD CONSTRAINT "request_venues_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_venues" ADD CONSTRAINT "request_venues_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_periods" ADD CONSTRAINT "request_periods_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_items" ADD CONSTRAINT "request_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_items" ADD CONSTRAINT "request_items_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signature_records" ADD CONSTRAINT "signature_records_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signature_records" ADD CONSTRAINT "signature_records_signer_id_fkey" FOREIGN KEY ("signer_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_records" ADD CONSTRAINT "handover_records_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_records" ADD CONSTRAINT "handover_records_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
