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
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: "low",
              },
            },
            {
              type: "text",
              text: `Extract the following from this receipt image and return ONLY valid JSON with these exact keys:
{
  "merchant": "store or business name (string)",
  "date": "date of purchase in YYYY-MM-DD format or null if unclear",
  "total": "total amount paid as a number without currency symbol, or null if unclear",
  "vatRate": "VAT rate if shown (20, 5, 0, or null)"
}
Do not include any explanation or markdown. Return only the JSON object.`,
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";

    let parsed: {
      merchant?: string;
      date?: string;
      total?: number;
      vatRate?: string;
    } = {};

    try {
      parsed = JSON.parse(content);
    } catch {
      // GPT returned non-JSON — return empty result gracefully
    }

    return NextResponse.json({
      merchant: parsed.merchant ?? null,
      date: parsed.date ?? null,
      total: parsed.total ?? null,
      vatRate: parsed.vatRate ?? null,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    console.error("[ocr] OpenAI error:", message);
    return NextResponse.json({ error: "OCR failed", detail: message }, { status: 500 });
  }
}
