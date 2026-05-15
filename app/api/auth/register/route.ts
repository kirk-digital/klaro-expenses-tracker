export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { CredentialsSignin } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request: Request) {
  let body: { name?: string; email?: string; password?: string };
  try {
    body = (await request.json()) as { name?: string; email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password;

  if (!name || name.length < 2) {
    return NextResponse.json(
      { error: "Enter your full name (at least 2 characters)", field: "name" },
      { status: 400 }
    );
  }
  if (!email) {
    return NextResponse.json({ error: "Email is required", field: "email" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address", field: "email" }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters", field: "password" },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists", field: "email" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: { name, email, passwordHash },
    });
  } catch (e) {
    console.error("[register] Database error", e);
    return NextResponse.json(
      { error: "Could not reach the database. Please try again later." },
      { status: 503 }
    );
  }

  let signedIn = false;
  try {
    await signIn("credentials", { email, password, redirect: false });
    signedIn = true;
  } catch (e) {
    if (e instanceof CredentialsSignin) {
      console.error("[register] Auto sign-in failed after account creation", e);
    } else {
      console.error("[register] Unexpected sign-in error", e);
    }
  }

  if (signedIn) {
    try {
      await sendWelcomeEmail({ to: email, name });
    } catch (e) {
      console.error("[register] Welcome email failed", e);
    }
  }

  return NextResponse.json({ success: true, signedIn });
}
