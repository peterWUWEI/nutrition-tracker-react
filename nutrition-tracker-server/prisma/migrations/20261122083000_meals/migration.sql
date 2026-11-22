-- CreateEnum
CREATE TYPE "meal_title" AS ENUM ('breakfast', 'lunch', 'dinner', 'snacks', 'others');

-- CreateTable
CREATE TABLE "meals" (
    "id" SERIAL NOT NULL,
    "title" "meal_title" NOT NULL,
    "eaten_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_items" (
    "id" SERIAL NOT NULL,
    "meal_id" INTEGER NOT NULL,
    "food_id" INTEGER NOT NULL,
    "quantity_consumed" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "meal_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meals_eaten_at_idx" ON "meals"("eaten_at");

-- CreateIndex
CREATE UNIQUE INDEX "meal_items_meal_id_food_id_key" ON "meal_items"("meal_id", "food_id");

-- AddForeignKey
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
