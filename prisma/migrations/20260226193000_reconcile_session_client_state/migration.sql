-- Reconcile sessions client linkage state across environments.
-- Safe forward-only migration for mixed histories.

ALTER TABLE "sessions"
ADD COLUMN IF NOT EXISTS "client_name" TEXT;

ALTER TABLE "sessions"
ALTER COLUMN "client_id" DROP NOT NULL;

ALTER TABLE "sessions"
DROP CONSTRAINT IF EXISTS "sessions_client_id_fkey";

ALTER TABLE "sessions"
ADD CONSTRAINT "sessions_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
