-- T-shirt size picked at registration (XS ... XXXL; checked by the API).
-- Empty for students who registered before the field existed.
ALTER TABLE "User" ADD COLUMN "tshirtSize" TEXT;
