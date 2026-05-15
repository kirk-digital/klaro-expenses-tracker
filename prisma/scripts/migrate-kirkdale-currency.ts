/**
 * One-time script: set Kirkdale Home organisation currency from USD to GBP.
 * Run: npx tsx prisma/scripts/migrate-kirkdale-currency.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.organization.updateMany({
    where: { name: "Kirkdale Home", currency: "USD" },
    data: { currency: "GBP" },
  });
  console.log(`Updated ${result.count} organisation(s) to GBP.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
