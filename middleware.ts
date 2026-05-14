import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { ORG_SLUG_HEADER } from "@/lib/constants";

const secret = () => process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: secret(),
  });

  const isApiAuth = pathname.startsWith("/api/auth");
  const isPublicAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    /\.(?:png|jpg|jpeg|gif|svg|webp|ico)$/i.test(pathname);

  if (isApiAuth || isPublicAsset) {
    return NextResponse.next();
  }

  const isAuthPage = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  const isAppArea = pathname.startsWith("/onboarding") || pathname.startsWith("/org");

  if (isAppArea && !token) {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signIn);
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (pathname.startsWith("/org/")) {
    const parts = pathname.split("/").filter(Boolean);
    const slug = parts[1];
    if (slug) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set(ORG_SLUG_HEADER, slug);
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
