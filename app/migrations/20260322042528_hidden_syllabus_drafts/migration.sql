-- CreateTable
CREATE TABLE "HiddenSyllabusDraft" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedByUserId" TEXT NOT NULL,
    "syllabusVersionId" TEXT NOT NULL,

    CONSTRAINT "HiddenSyllabusDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HiddenSyllabusDraft_deletedByUserId_createdAt_idx" ON "HiddenSyllabusDraft"("deletedByUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "HiddenSyllabusDraft_deletedByUserId_syllabusVersionId_key" ON "HiddenSyllabusDraft"("deletedByUserId", "syllabusVersionId");

-- AddForeignKey
ALTER TABLE "HiddenSyllabusDraft" ADD CONSTRAINT "HiddenSyllabusDraft_deletedByUserId_fkey" FOREIGN KEY ("deletedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiddenSyllabusDraft" ADD CONSTRAINT "HiddenSyllabusDraft_syllabusVersionId_fkey" FOREIGN KEY ("syllabusVersionId") REFERENCES "SyllabusVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
