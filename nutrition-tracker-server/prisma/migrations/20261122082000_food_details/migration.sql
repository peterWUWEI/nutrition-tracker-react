/*
  Replaces the starter food columns (calories, protein, carbs, fat) with the full food design.
  Existing starter foods are removed: they have no type, serving size or picture, which are
  now required.
*/
-- Remove starter foods
TRUNCATE TABLE "foods" RESTART IDENTITY;

-- CreateEnum
CREATE TYPE "food_type" AS ENUM ('food', 'beverage');

-- CreateEnum
CREATE TYPE "serving_unit" AS ENUM ('gram', 'ml');

-- AlterTable
ALTER TABLE "foods" DROP COLUMN "calories",
DROP COLUMN "carbs",
DROP COLUMN "fat",
DROP COLUMN "protein",
ADD COLUMN     "brand" VARCHAR(100),
ADD COLUMN     "carbs_in_gram" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "cholesterol_in_mg" DOUBLE PRECISION,
ADD COLUMN     "dietary_fibre_in_gram" DOUBLE PRECISION,
ADD COLUMN     "energy_in_kcal" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "fat_in_gram" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "picture_url" TEXT NOT NULL,
ADD COLUMN     "protein_in_gram" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "serving_size" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "serving_unit" "serving_unit" NOT NULL,
ADD COLUMN     "servings_per_package" DOUBLE PRECISION,
ADD COLUMN     "sodium_in_mg" DOUBLE PRECISION,
ADD COLUMN     "type" "food_type" NOT NULL;
