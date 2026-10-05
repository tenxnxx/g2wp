-- CreateEnum
CREATE TYPE "TypeServerKind" AS ENUM ('official', 'premium');

-- CreateTable
CREATE TABLE "servers" (
    "id" TEXT NOT NULL,
    "server_name" TEXT NOT NULL,
    "is_use" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "servers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "servers_server_name_idx" ON "servers"("server_name");

-- CreateIndex
CREATE INDEX "servers_is_use_idx" ON "servers"("is_use");

-- CreateTable
CREATE TABLE "type_servers" (
    "id" TEXT NOT NULL,
    "type" "TypeServerKind" NOT NULL,
    "is_use" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "type_servers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "type_servers_type_idx" ON "type_servers"("type");

-- CreateIndex
CREATE INDEX "type_servers_is_use_idx" ON "type_servers"("is_use");

-- CreateTable
CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "city_name" TEXT NOT NULL,
    "is_use" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cities_city_name_idx" ON "cities"("city_name");

-- CreateIndex
CREATE INDEX "cities_is_use_idx" ON "cities"("is_use");

-- CreateTable
CREATE TABLE "bosses" (
    "id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "server_id" TEXT NOT NULL,
    "type_server_id" TEXT NOT NULL,
    "create_by" TEXT NOT NULL,
    "update_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bosses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bosses_city_id_idx" ON "bosses"("city_id");

-- CreateIndex
CREATE INDEX "bosses_server_id_idx" ON "bosses"("server_id");

-- CreateIndex
CREATE INDEX "bosses_type_server_id_idx" ON "bosses"("type_server_id");

-- CreateIndex
CREATE INDEX "bosses_created_at_idx" ON "bosses"("created_at");

-- AddForeignKey
ALTER TABLE "bosses" ADD CONSTRAINT "bosses_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bosses" ADD CONSTRAINT "bosses_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bosses" ADD CONSTRAINT "bosses_type_server_id_fkey" FOREIGN KEY ("type_server_id") REFERENCES "type_servers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
