/*
  Join links replace email invitations (ADR-037).

  - All email-bound invitation rows are deleted: any invitation link that was
    previously emailed becomes inert, and no legacy row can linger as an
    active (non-revoked) link.
  - `email` and `acceptedAt` are dropped: links are multi-use and no longer
    bound to an invited address, so there is no single-use claim to stamp.
*/

-- DeleteRows
DELETE FROM "shared_map_invitations";

-- DropIndex
DROP INDEX "shared_map_invitations_mapId_email_idx";

-- AlterTable
ALTER TABLE "shared_map_invitations" DROP COLUMN "acceptedAt",
DROP COLUMN "email";

-- CreateIndex
CREATE INDEX "shared_map_invitations_mapId_idx" ON "shared_map_invitations"("mapId");
