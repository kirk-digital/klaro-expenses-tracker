import { prisma } from "@/lib/prisma";
import { createXeroClient, tokenExpiresAt } from "@/lib/xero-config";

export async function pushExpenseToXero(expenseId: string) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      organization: { include: { xeroConnection: true } },
      category: true,
      submittedBy: true,
    },
  });

  const conn = expense?.organization.xeroConnection;
  if (!conn) return;

  const xero = createXeroClient({ scopes: [] });

  if (new Date() > conn.expiresAt) {
    xero.setTokenSet({
      refresh_token: conn.refreshToken,
      access_token: conn.accessToken,
    });
    const newTokens = await xero.refreshWithRefreshToken(
      process.env.XERO_CLIENT_ID!,
      process.env.XERO_CLIENT_SECRET!,
      conn.refreshToken
    );
    await prisma.xeroConnection.update({
      where: { organizationId: conn.organizationId },
      data: {
        accessToken: newTokens.access_token!,
        refreshToken: newTokens.refresh_token ?? conn.refreshToken,
        expiresAt: tokenExpiresAt(newTokens),
      },
    });
    xero.setTokenSet(newTokens);
  } else {
    xero.setTokenSet({
      access_token: conn.accessToken,
      refresh_token: conn.refreshToken,
    });
  }

  await xero.updateTenants();

  await xero.accountingApi.createBankTransactions(conn.tenantId, {
    bankTransactions: [
      {
        type: "SPEND" as never,
        contact: { name: expense!.merchant },
        lineItems: [
          {
            description: expense!.notes ?? expense!.merchant,
            quantity: 1,
            unitAmount: Number(expense!.amount),
            accountCode: "429",
          },
        ],
        bankAccount: { code: "090" },
        date: new Date(expense!.date).toISOString().slice(0, 10),
        reference: `ET-${expense!.id.slice(0, 8).toUpperCase()}`,
      },
    ],
  });
}
