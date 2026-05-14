export const runtime = "nodejs";

import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgFromRequest } from "@/lib/api-helpers";
import { canViewAllExpenses } from "@/lib/permissions";
import { getReceiptPath } from "@/lib/storage";

type Params = { params: { id: string } };

export async function GET(request: Request, context: Params) {
  const org = await requireOrgFromRequest(request);
  if (org instanceof Response) return org;

  const { id } = context.params;

  const expense = await prisma.expense.findFirst({
    where: { id, organizationId: org.organization.id },
    include: { receipts: { take: 1, orderBy: { createdAt: "desc" } } },
  });

  if (!expense || expense.receipts.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canSee =
    canViewAllExpenses(org.role) || expense.submittedById === org.userId;
  if (!canSee) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const receipt = expense.receipts[0];
  const absolute = await getReceiptPath(receipt.storagePath);
  const file = await readFile(absolute);

  return new NextResponse(file, {
    headers: {
      "Content-Type": receipt.mimeType,
      "Content-Disposition": `inline; filename="${receipt.filename}"`,
    },
  });
}
