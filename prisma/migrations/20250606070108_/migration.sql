/*
  Warnings:

  - You are about to drop the `fashion_items` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "fashion_items";

-- CreateTable
CREATE TABLE "fashion_patterns" (
    "id" SERIAL NOT NULL,
    "itemId" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION,
    "invisibilityLevel" INTEGER NOT NULL DEFAULT 95,
    "patternDensity" INTEGER NOT NULL DEFAULT 30,
    "encodingMethod" TEXT NOT NULL DEFAULT 'micro',
    "imageWidth" INTEGER,
    "imageHeight" INTEGER,
    "patternHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "scanCount" INTEGER NOT NULL DEFAULT 0,
    "lastScannedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fashion_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fashion_patterns_itemId_key" ON "fashion_patterns"("itemId");
