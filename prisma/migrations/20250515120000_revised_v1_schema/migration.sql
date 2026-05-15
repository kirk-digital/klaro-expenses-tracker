-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('sole_trader', 'business', 'charity');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('receipted', 'mileage');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "type" "OrgType" NOT NULL DEFAULT 'business';

-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "currency" SET DEFAULT 'GBP';

-- AlterTable
ALTER TABLE "Category" ADD COLUMN "hmrcCategory" TEXT;

-- CreateTable
CREATE TABLE "Fund" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fund_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "currency",
ADD COLUMN     "expenseType" "ExpenseType" NOT NULL DEFAULT 'receipted',
ADD COLUMN     "miles" DECIMAL(65,30),
ADD COLUMN     "amapRate" DECIMAL(65,30),
ADD COLUMN     "fundId" TEXT,
ADD COLUMN     "fundType" TEXT;

-- AddForeignKey
ALTER TABLE "Fund" ADD CONSTRAINT "Fund_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE SET NULL ON UPDATE CASCADE;
