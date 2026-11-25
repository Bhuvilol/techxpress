-- Human-friendly, unique reference for every user (TXP-XXXX-XXXX) and team
-- (TXT-XXXX-XXXX). The alphabet leaves out 0, 1, I, L, O and U so the codes
-- are easy to read out loud. Existing rows are filled in here.
ALTER TABLE "User" ADD COLUMN "publicId" TEXT;
ALTER TABLE "Team" ADD COLUMN "publicId" TEXT;

DO $$
DECLARE
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  rec record;
  code text;
  i int;
BEGIN
  FOR rec IN SELECT id FROM "User" LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    UPDATE "User" SET "publicId" = 'TXP-' || substr(code, 1, 4) || '-' || substr(code, 5, 4) WHERE id = rec.id;
  END LOOP;

  FOR rec IN SELECT id FROM "Team" LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    UPDATE "Team" SET "publicId" = 'TXT-' || substr(code, 1, 4) || '-' || substr(code, 5, 4) WHERE id = rec.id;
  END LOOP;
END $$;

ALTER TABLE "User" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "Team" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "User_publicId_key" ON "User"("publicId");
CREATE UNIQUE INDEX "Team_publicId_key" ON "Team"("publicId");
