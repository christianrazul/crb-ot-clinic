DO $$ BEGIN
  CREATE TYPE "SessionType" AS ENUM ('regular', 'ot_evaluation', 'make_up');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "sessions"
ADD COLUMN IF NOT EXISTS "session_type" "SessionType" NOT NULL DEFAULT 'regular';
