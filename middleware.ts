import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { ORG_SLUG_HEADER } from "@/lib/constants";

const secret = () => process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

/**
 * Edge middleware cannot import `lib/auth` because the credentials provider pulls in
 * bcryptjs (Node-only). Session checks use JWT via getToken instead of the Auth.js
 * middleware wrapper.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Auth.js v5 changed the cookie name from "next-auth.session-token" to
  // "authjs.session-token" (and "__Secure-authjs.session-token" on HTTPS).
  // getToken() defaults to the v4 name, so we must pass the correct name explicitly.
  const isProd = process.env.NODE_ENV === "production";
  const cookieName = isProd
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  const token = await getToken({
    req: request,
    secret: secret(),
    cookieName,
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
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
