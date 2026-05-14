import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const RECEIPT_ROOT =
  process.env.RECEIPT_STORAGE_PATH ?? "/var/data/expenses-tracker/receipts";

export async function saveReceipt(
  orgId: string,
  expenseId: string,
  file: { buffer: Buffer; originalname: string; mimetype: string }
): Promise<{ storagePath: string; filename: string }> {
  const ext = path.extname(file.originalname) || ".bin";
  const safeBase = path
    .basename(file.originalname, ext)
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .slice(0, 80);
  const filename = `${safeBase || "receipt"}-${randomUUID()}${ext}`;
  const dir = path.join(RECEIPT_ROOT, orgId, expenseId);
  await mkdir(dir, { recursive: true });
  const absolutePath = path.join(dir, filename);
  await writeFile(absolutePath, file.buffer);
  const storagePath = path.join(orgId, expenseId, filename);
  return { storagePath, filename };
}

export async function getReceiptPath(storagePath: string): Promise<string> {
  return path.join(RECEIPT_ROOT, storagePath);
}
