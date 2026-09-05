-- CreateTable
CREATE TABLE "set_dates" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "create_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "set_dates_pkey" PRIMARY KEY ("id")
);
