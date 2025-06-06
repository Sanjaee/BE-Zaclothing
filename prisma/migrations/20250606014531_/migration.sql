-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "socialMedia" JSONB,
    "profileImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FashionItem" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "material" TEXT,
    "size" TEXT,
    "color" TEXT,
    "price" DOUBLE PRECISION,
    "patternType" TEXT NOT NULL,
    "invisibility" INTEGER NOT NULL,
    "density" INTEGER NOT NULL,
    "patternData" JSONB NOT NULL,
    "signature" TEXT NOT NULL,
    "originalImage" TEXT NOT NULL,
    "processedImage" TEXT NOT NULL,
    "thumbnailImage" TEXT,
    "description" TEXT,
    "tags" TEXT[],
    "customData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "FashionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanHistory" (
    "id" TEXT NOT NULL,
    "fashionItemId" TEXT NOT NULL,
    "scannedById" TEXT,
    "location" JSONB,
    "deviceInfo" JSONB,
    "scanMethod" TEXT NOT NULL,
    "scanSuccess" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "FashionItem_itemId_key" ON "FashionItem"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "FashionItem_signature_key" ON "FashionItem"("signature");

-- CreateIndex
CREATE INDEX "FashionItem_itemId_idx" ON "FashionItem"("itemId");

-- CreateIndex
CREATE INDEX "FashionItem_signature_idx" ON "FashionItem"("signature");

-- CreateIndex
CREATE INDEX "FashionItem_ownerId_idx" ON "FashionItem"("ownerId");

-- CreateIndex
CREATE INDEX "ScanHistory_fashionItemId_idx" ON "ScanHistory"("fashionItemId");

-- CreateIndex
CREATE INDEX "ScanHistory_scannedById_idx" ON "ScanHistory"("scannedById");

-- AddForeignKey
ALTER TABLE "FashionItem" ADD CONSTRAINT "FashionItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanHistory" ADD CONSTRAINT "ScanHistory_fashionItemId_fkey" FOREIGN KEY ("fashionItemId") REFERENCES "FashionItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanHistory" ADD CONSTRAINT "ScanHistory_scannedById_fkey" FOREIGN KEY ("scannedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
