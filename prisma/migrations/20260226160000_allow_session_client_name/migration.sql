ALTER TABLE "sessions"
ADD COLUMN "client_name" TEXT;

ALTER TABLE "sessions"
ALTER COLUMN "client_id" DROP NOT NULL;