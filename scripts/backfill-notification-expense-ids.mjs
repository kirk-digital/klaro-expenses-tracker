import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const unlinked = await prisma.notification.findMany({
    where: { expenseId: null },
    select: {
      id: true,
      message: true,
      userId: true,
      organizationId: true,
      createdAt: true,
    },
  });

  console.log(`Found ${unlinked.length} unlinked notifications`);

  let linked = 0;
  let skipped = 0;

  for (const n of unlinked) {
    const match = n.message.match(/"([^"]+)"/);
    if (!match) {
      console.log(`  SKIP (no merchant found): ${n.message}`);
      skipped++;
      continue;
    }

    const merchant = match[1];

    const candidates = await prisma.expense.findMany({
      where: {
        organizationId: n.organizationId,
        merchant: { equals: merchant, mode: "insensitive" },
      },
      select: { id: true, date: true },
    });

    if (candidates.length === 0) {
      console.log(`  SKIP (no matching expense for merchant "${merchant}")`);
      skipped++;
      continue;
    }

    const best = candidates.reduce((prev, curr) => {
      const prevDiff = Math.abs(new Date(prev.date).getTime() - new Date(n.createdAt).getTime());
      const currDiff = Math.abs(new Date(curr.date).getTime() - new Date(n.createdAt).getTime());
      return currDiff < prevDiff ? curr : prev;
    });

    await prisma.notification.update({
      where: { id: n.id },
      data: { expenseId: best.id },
    });

    console.log(`  LINKED ${n.id} → expense ${best.id} (merchant: "${merchant}")`);
    linked++;
  }

  console.log(`\nDone. Linked: ${linked}, Skipped: ${skipped}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
