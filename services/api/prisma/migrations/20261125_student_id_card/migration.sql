-- CreateTable
CREATE TABLE "StudentIdCard" (
    "userId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentIdCard_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "StudentIdCard" ADD CONSTRAINT "StudentIdCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

