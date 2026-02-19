-- CreateEnum
CREATE TYPE "PaymentSource" AS ENUM ('client', 'dswd', 'cswdo', 'other_govt');

-- CreateEnum
CREATE TYPE "CreditType" AS ENUM ('regular', 'advance', 'no_payment');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'none';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "credit_type" "CreditType" NOT NULL DEFAULT 'regular',
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "payment_source" "PaymentSource" NOT NULL DEFAULT 'client',
ADD COLUMN     "recorded_by_id" TEXT,
ADD COLUMN     "sessions_paid" INTEGER NOT NULL DEFAULT 1;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
