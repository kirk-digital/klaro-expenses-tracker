export const runtime = "nodejs";

import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getReceiptPath } from "@/lib/storage";

type Params = { params: { id: string } };

function contentTypeFromPath(filePath: string, mimeType: string): string {
  if (mimeType && mimeType !== "application/octet-stream") {
    return mimeType;
  }
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".pdf") return "application/pdf";
  return "application/octet-stream";
}

async function resolveFilePath(storagePath: string): Promise<string> {
  if (path.isAbsolute(storagePath)) {
    return storagePath;
  }
  return getReceiptPath(storagePath);
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorised", { status: 401 });
  }

  const receipt = await prisma.receipt.findUnique({
    where: { id: params.id },
    include: { expense: { select: { organizationId: true, submittedById: true } } },
  });

  if (!receipt) {
    return new NextResponse("Not found", { status: 404 });
  }

  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId: receipt.expense.organizationId,
      userId: session.user.id,
    },
  });
  if (!member) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const filePath = await resolveFilePath(receipt.storagePath);
    const file = await readFile(filePath);
    const contentType = contentTypeFromPath(filePath, receipt.mimeType);

    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${receipt.filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("File not found on disk", { status: 404 });
  }
}
