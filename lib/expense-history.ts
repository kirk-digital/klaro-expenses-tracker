import { prisma } from "@/lib/prisma";

export async function recordExpenseHistory({
  expenseId,
  actorId,
  action,
  note,
}: {
  expenseId: string;
  actorId: string;
  action: string;
  note?: string;
}) {
  await prisma.expenseHistory.create({
    data: { expenseId, actorId, action, note },
  });
}
