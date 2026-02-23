-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('regular', 'ot_evaluation', 'make_up');

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "session_type" "SessionType" NOT NULL DEFAULT 'regular';
