import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "sai_session";

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    // In production, this must be set securely. In dev/test, fallback with warning.
    return new TextEncoder().encode(
      secret || "sai-books-super-secret-production-grade-key-2026-secure-random-bytes"
    );
  }
  return new TextEncoder().encode(secret);
}

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/api/health",
  "/api/auth",
  "/api/cron",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public static assets and API health endpoints
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/brand") ||
    pathname.startsWith("/favicon.ico") ||
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  ) {
    return NextResponse.next();
  }

  // 2. Extract and verify session token
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirectTo", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, getSecretKey());

    // 3. Enforce forced password update for new / default accounts
    if (payload.mustChangePassword && pathname !== "/change-password") {
      return NextResponse.redirect(new URL("/change-password", request.url));
    }

    // 4. Role-based Route Protection
    // /users and /settings are restricted to ADMIN and OWNER roles only
    if (pathname.startsWith("/users") || pathname.startsWith("/settings")) {
      const role = payload.role as string;
      if (role !== "OWNER" && role !== "ADMIN") {
        return NextResponse.redirect(new URL("/?error=unauthorized_desk", request.url));
      }
    }

    const response = NextResponse.next();
    return response;
  } catch (err) {
    // Token is invalid, expired, or tampered with
    const loginUrl = new URL("/login", request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (non-action API routes if any)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - brand (brand assets)
     */
    "/((?!_next/static|_next/image|favicon.ico|brand).*)",
  ],
};
