-- A unique seat for every confirmed student, printed on the souvenir e-ticket
-- as coach and berth (see src/utils/berth.js). Given once, when the student
-- is approved, and never reused or changed afterwards.
ALTER TABLE "User" ADD COLUMN "seatNo" INTEGER;

-- Students who are already confirmed get seats in the order they were
-- approved (then by sign-up time).
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY "passwordIssuedAt" NULLS LAST, "createdAt", id) AS n
  FROM "User"
  WHERE role = 'STUDENT' AND "verificationStatus" = 'VERIFIED'
)
UPDATE "User" u SET "seatNo" = o.n FROM ordered o WHERE u.id = o.id;

CREATE UNIQUE INDEX "User_seatNo_key" ON "User"("seatNo");
