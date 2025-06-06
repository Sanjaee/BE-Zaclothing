/*
  Warnings:

  - You are about to drop the `FashionItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ScanHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "FashionItem" DROP CONSTRAINT "FashionItem_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "ScanHistory" DROP CONSTRAINT "ScanHistory_fashionItemId_fkey";

-- DropForeignKey
ALTER TABLE "ScanHistory" DROP CONSTRAINT "ScanHistory_scannedById_fkey";

-- DropTable
DROP TABLE "FashionItem";

-- DropTable
DROP TABLE "ScanHistory";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "fashion_items" (
    "id" SERIAL NOT NULL,
    "brandName" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "encodingMethod" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fashion_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fashion_items_itemId_key" ON "fashion_items"("itemId");
