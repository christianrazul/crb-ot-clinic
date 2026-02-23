DO $$ BEGIN
  CREATE TYPE "AttendancePaymentStatus" AS ENUM ('UNPAID', 'PAID');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "attendance_logs"
ADD COLUMN IF NOT EXISTS "payment_status" "AttendancePaymentStatus" NOT NULL DEFAULT 'UNPAID';
