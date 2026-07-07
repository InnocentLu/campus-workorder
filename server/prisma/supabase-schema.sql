-- ============================================================
-- Campus WorkOrder System — Database Schema for Supabase
-- ============================================================

-- Clean up existing objects (safe to re-run)
DROP TABLE IF EXISTS "order_log" CASCADE;
DROP TABLE IF EXISTS "notification" CASCADE;
DROP TABLE IF EXISTS "repair_record" CASCADE;
DROP TABLE IF EXISTS "work_order" CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;
DROP TYPE IF EXISTS "OrderStatus" CASCADE;
DROP TYPE IF EXISTS "OrderPriority" CASCADE;
DROP TYPE IF EXISTS "UserRole" CASCADE;

-- Enums
CREATE TYPE "UserRole" AS ENUM ('STU', 'TCH', 'WRK', 'ADM');
CREATE TYPE "OrderPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'ASSIGNED', 'PROCESSING', 'COMPLETED', 'CLOSED', 'CANCELLED');

-- User table
CREATE TABLE "user" (
    "id" SERIAL PRIMARY KEY,
    "username" VARCHAR(50) NOT NULL UNIQUE,
    "password" VARCHAR(255) NOT NULL,
    "real_name" VARCHAR(50) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STU',
    "phone" VARCHAR(20),
    "email" VARCHAR(100),
    "department" VARCHAR(100),
    "student_id" VARCHAR(50),
    "employee_id" VARCHAR(50),
    "avatar" VARCHAR(255),
    "trade" VARCHAR(50),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- WorkOrder table
CREATE TABLE "work_order" (
    "id" SERIAL PRIMARY KEY,
    "order_no" VARCHAR(30) NOT NULL UNIQUE,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50) NOT NULL,
    "priority" "OrderPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "submitter_id" INTEGER NOT NULL REFERENCES "user"("id"),
    "submitter_role" "UserRole" NOT NULL,
    "submitter_name" VARCHAR(50),
    "assignee_id" INTEGER REFERENCES "user"("id"),
    "assigner_id" INTEGER REFERENCES "user"("id"),
    "location" VARCHAR(200),
    "contact_phone" VARCHAR(20),
    "scheduled_time" TIMESTAMP(3),
    "images" JSONB,
    "accepted_at" TIMESTAMP(3),
    "processing_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "rating" INTEGER,
    "feedback" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "work_order_submitter_id_idx" ON "work_order"("submitter_id");
CREATE INDEX "work_order_assignee_id_idx" ON "work_order"("assignee_id");
CREATE INDEX "work_order_status_idx" ON "work_order"("status");
CREATE INDEX "work_order_category_idx" ON "work_order"("category");

-- RepairRecord
CREATE TABLE "repair_record" (
    "id" SERIAL PRIMARY KEY,
    "order_id" INTEGER NOT NULL REFERENCES "work_order"("id") ON DELETE CASCADE,
    "content" TEXT NOT NULL,
    "cost" DECIMAL(10, 2) DEFAULT 0,
    "used_parts" TEXT,
    "handler_id" INTEGER REFERENCES "user"("id"),
    "images" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Notification
CREATE TABLE "notification" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT,
    "link" VARCHAR(255),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "notification_user_id_idx" ON "notification"("user_id");

-- OrderLog
CREATE TABLE "order_log" (
    "id" SERIAL PRIMARY KEY,
    "order_id" INTEGER NOT NULL REFERENCES "work_order"("id") ON DELETE CASCADE,
    "operator_id" INTEGER REFERENCES "user"("id"),
    "action" VARCHAR(50) NOT NULL,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "order_log_order_id_idx" ON "order_log"("order_id");

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "user" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_order_updated_at BEFORE UPDATE ON "work_order" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
