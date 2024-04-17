-- Migration number: 0001 	 2024-04-16T00:54:24.740Z
-- CreateTable
CREATE TABLE "URLs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "originalURL" TEXT NOT NULL,
    "isAnalyticsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "analyticsData" TEXT NOT NULL,
    "customSlug" TEXT NOT NULL,
    "createdUser" TEXT NOT NULL DEFAULT 'anonymous'
);

-- CreateIndex
CREATE UNIQUE INDEX "URLs_originalURL_key" ON "URLs"("originalURL");

-- CreateIndex
CREATE UNIQUE INDEX "URLs_customSlug_key" ON "URLs"("customSlug");

