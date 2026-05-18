-- CreateTable
CREATE TABLE "ExpenseHistory" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ExpenseHistory" ADD CONSTRAINT "ExpenseHistory_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseHistory" ADD CONSTRAINT "ExpenseHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
