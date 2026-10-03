import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { Role, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

const COOKIE_NAME = "sai_session";

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    throw new Error(
      "CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET must be at least 32 characters long in production."
    );
  }
  return new TextEncoder().encode(
    secret || "sai-books-super-secret-production-grade-key-2026-secure-random-bytes"
  );
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  mustChangePassword?: boolean;
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    mustChangePassword: user.mustChangePassword ?? false,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h") // Shortened to 24 hours for financial security
    .sign(getSecretKey());
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, getSecretKey());
    const userId = payload.id as string;

    // Database revocation & suspension check (Defense-in-depth)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, status: true, mustChangePassword: true },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      // User account was suspended, deleted, or revoked
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };
  } catch {
    return null;
  }
}

/**
 * Server-side RBAC Permission Checker
 */
export function hasPermission(userRole: Role, requiredRole: Role): boolean {
  const hierarchy: Record<Role, number> = {
    [Role.OWNER]: 5,
    [Role.ADMIN]: 4,
    [Role.MANAGER]: 3,
    [Role.STAFF]: 2,
    [Role.VISITOR]: 1,
  };

  return (hierarchy[userRole] || 0) >= (hierarchy[requiredRole] || 0);
}
