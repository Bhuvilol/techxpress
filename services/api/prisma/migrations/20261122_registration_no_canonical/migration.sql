-- Registration numbers have one canonical form: no whitespace, upper-case
-- (see src/utils/registrationNo.js). Backfill existing rows, then enforce it.
-- With the existing unique indexes this makes registration numbers
-- effectively case- and whitespace-insensitively unique.
--
-- A CHECK constraint (not an index on upper(...)) so `prisma migrate dev`
-- doesn't see an unknown index and try to drop it.
--
-- Staging checked 2026-11-21: no near-duplicates, so the backfill can't
-- collide. If it ever does, this migration fails loudly on the unique index
-- and the duplicates must be merged by hand first.

UPDATE "User"
SET "registrationNo" = upper(regexp_replace("registrationNo", '\s', '', 'g'))
WHERE "registrationNo" IS NOT NULL
  AND "registrationNo" <> upper(regexp_replace("registrationNo", '\s', '', 'g'));

UPDATE "CollegeRegistry"
SET "registrationNo" = upper(regexp_replace("registrationNo", '\s', '', 'g'))
WHERE "registrationNo" <> upper(regexp_replace("registrationNo", '\s', '', 'g'));

ALTER TABLE "User"
  ADD CONSTRAINT "User_registrationNo_canonical"
  CHECK ("registrationNo" IS NULL OR "registrationNo" = upper(regexp_replace("registrationNo", '\s', '', 'g')));

ALTER TABLE "CollegeRegistry"
  ADD CONSTRAINT "CollegeRegistry_registrationNo_canonical"
  CHECK ("registrationNo" = upper(regexp_replace("registrationNo", '\s', '', 'g')));
