/**
 * One-time script: archive legacy Kirkdale Home categories and seed HMRC-aligned business categories.
 * Run: npm run fix:categories
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst({
    where: { OR: [{ slug: "kirkdale-home" }, { name: "Kirkdale Home" }] },
  });

  if (!org) {
    console.error("Organisation not found");
    process.exit(1);
  }

  console.log(`Found org: ${org.name} (${org.id})`);

  const archived = await prisma.category.updateMany({
    where: { organizationId: org.id, archived: false },
    data: { archived: true },
  });
  console.log(`Archived ${archived.count} existing categories`);

  const hmrcCategories = [
    { name: "Office and equipment", hmrcCategory: "Office, property and equipment" },
    { name: "Car and travel", hmrcCategory: "Car, van and travel expenses" },
    { name: "Clothing", hmrcCategory: "Clothing expenses" },
    { name: "Staff costs", hmrcCategory: "Staff expenses" },
    { name: "Materials and stock", hmrcCategory: "Reselling goods" },
    { name: "Legal and financial", hmrcCategory: "Legal and financial costs" },
    {
      name: "Marketing and subscriptions",
      hmrcCategory: "Marketing, entertainment and subscriptions",
    },
    { name: "Training", hmrcCategory: "Training courses" },
    { name: "Premises costs", hmrcCategory: "Premises costs (business property)" },
    { name: "Other allowable expenses", hmrcCategory: "Other allowable business expenses" },
  ];

  for (const cat of hmrcCategories) {
    await prisma.category.create({
      data: {
        organizationId: org.id,
        name: cat.name,
        hmrcCategory: cat.hmrcCategory,
        archived: false,
      },
    });
  }

  console.log(`Created ${hmrcCategories.length} HMRC categories`);
  console.log("Done ✓");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
