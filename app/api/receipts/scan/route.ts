export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorised", { status: 401 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OCR not configured" }, { status: 503 });
  }

  const openai = new OpenAI({ apiKey });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mimeType = file.type || "image/jpeg";

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: "auto",
              },
            },
            {
              type: "text",
              text: `Extract the following from this receipt image and return ONLY valid JSON with these exact keys:
{
  "merchant": "store or business name (string)",
  "date": "date of purchase in YYYY-MM-DD format or null if unclear",
  "total": "the final amount the customer actually paid after all discounts, as a number without currency symbol — NOT a subtotal, NOT a pre-discount total, NOT a balance to pay before discount. If multiple totals are shown, use the last/lowest 'Total' or 'Amount Due' line. Return null if unclear.",
  "vatRate": "dominant VAT rate if shown (20, 5, or 0) — if multiple rates are present return the highest one, or null if not shown"
}
Look carefully at the full receipt. Read dates and numbers precisely — do not approximate.
Do not include any explanation or markdown. Return only the JSON object.`,
            },
          ],
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";

    // Strip markdown code fences if GPT wrapped the response (e.g. ```json ... ```)
    const content = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    console.log("[ocr] raw response:", raw);
    console.log("[ocr] cleaned content:", content);

    let parsed: {
      merchant?: string;
      date?: string;
      total?: number;
      vatRate?: string;
    } = {};

    try {
      parsed = JSON.parse(content);
      console.log("[ocr] parsed:", parsed);
    } catch (e) {
      console.warn("[ocr] JSON parse failed:", e, "| content was:", content);
    }

    // Normalise total — GPT sometimes returns it as a string
    const total = parsed.total != null ? parseFloat(String(parsed.total)) : null;

    return NextResponse.json({
      merchant: parsed.merchant ?? null,
      date: parsed.date ?? null,
      total: Number.isFinite(total) ? total : null,
      vatRate: parsed.vatRate ?? null,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    console.error("[ocr] OpenAI error:", message);
    return NextResponse.json({ error: "OCR failed", detail: message }, { status: 500 });
  }
}
