-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "items_name_idx" ON "items"("name");

-- CreateTable
CREATE TABLE "safes" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "description" TEXT,
    "deposit_item_at" TIMESTAMP(3) NOT NULL,
    "member_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "safes_item_id_idx" ON "safes"("item_id");

-- CreateIndex
CREATE INDEX "safes_member_id_idx" ON "safes"("member_id");

-- CreateIndex
CREATE INDEX "safes_deposit_item_at_idx" ON "safes"("deposit_item_at");

-- AddForeignKey
ALTER TABLE "safes" ADD CONSTRAINT "safes_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safes" ADD CONSTRAINT "safes_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
