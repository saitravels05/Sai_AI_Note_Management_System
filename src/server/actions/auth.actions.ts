"use server";

import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { setSessionCookie, clearSessionCookie, getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { checkRateLimit, resetRateLimit } from "@/lib/security/ratelimit";
import { validatePasswordStrength } from "@/lib/security/sanitize";
import { AuditAction, Role, UserStatus } from "@prisma/client";
import { redirect } from "next/navigation";

export interface AuthResponse {
  success: boolean;
  error?: string;
  redirectTo?: string;
}

function formatDbError(err: any): string {
  const msg = String(err?.message || "");
  if (
    msg.includes("Can't reach database") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("PrismaClientInitializationError") ||
    msg.includes("connect ECONNREFUSED") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("connection closed")
  ) {
    return "Cannot connect to the database server. Please ensure PostgreSQL is running (run 'npm run db:start').";
  }
  if (msg.includes("does not exist in the current database")) {
    return "Database table missing. Please run 'npm run db:push' to sync your database schema.";
  }
  return err?.message || "An unexpected error occurred during authentication.";
}

export async function loginAction(formData: FormData): Promise<AuthResponse> {
  try {
    const email = (formData.get("email") as string)?.toLowerCase().trim();
    const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, error: "Please enter both email and password." };
  }

  // 1. Rate Limiting & Account Lockout Defense (5 attempts per 15 minutes)
  const rateLimitKey = `login:${email}`;
  const rateCheck = checkRateLimit(rateLimitKey, {
    windowMs: 15 * 60 * 1000,
    maxAttempts: 5,
    lockoutDurationMs: 15 * 60 * 1000,
  });

  if (!rateCheck.allowed) {
    const minutes = Math.ceil((rateCheck.retryAfterSeconds || 60) / 60);
    return {
      success: false,
      error: `Too many failed login attempts. Account temporarily locked for security. Please try again in ${minutes} minute(s).`,
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Audit failed attempt without revealing user existence
    await logAudit({
      userId: "anonymous",
      action: AuditAction.LOGIN,
      details: `Failed login attempt for non-existent email: ${email}`,
    });
    return { success: false, error: "Invalid email or password." };
  }

  if (user.status === UserStatus.PENDING_APPROVAL) {
    return {
      success: false,
      error: "Your account is pending Owner approval. Please contact the administrator.",
    };
  }

  if (user.status === UserStatus.SUSPENDED) {
    return {
      success: false,
      error: "This account has been suspended. Please contact the administrator.",
    };
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    await logAudit({
      userId: user.id,
      action: AuditAction.LOGIN,
      details: `Failed password verification for user ${user.email} (Remaining attempts: ${rateCheck.remaining})`,
    });
    return { success: false, error: "Invalid email or password." };
  }

  // Reset rate limit on successful credentials
  resetRateLimit(rateLimitKey);

  const { createSessionToken } = await import("@/lib/auth/session");
  const token = await createSessionToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  });

  await setSessionCookie(token);

  await logAudit({
    userId: user.id,
    action: AuditAction.LOGIN,
    details: `User logged in successfully (${user.email})`,
  });

  if (user.mustChangePassword) {
    return { success: true, redirectTo: "/change-password" };
  }

  return { success: true, redirectTo: "/" };
  } catch (err: any) {
    console.error("[AUTH ERROR] loginAction:", err);
    return { success: false, error: formatDbError(err) };
  }
}

export async function signupAction(formData: FormData): Promise<AuthResponse> {
  try {
    const name = (formData.get("name") as string)?.trim();
    const email = (formData.get("email") as string)?.toLowerCase().trim();
    const password = formData.get("password") as string;

    if (!name || !email || !password) {
      return { success: false, error: "All fields are required." };
    }

    // Enforce enterprise password policy
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.reason };
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { success: false, error: "An account with this email already exists." };
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: Role.STAFF,
        status: UserStatus.PENDING_APPROVAL,
        mustChangePassword: false,
      },
    });

    return {
      success: true,
      redirectTo: "/login?message=Account+created.+Please+wait+for+Owner+approval.",
    };
  } catch (err: any) {
    console.error("[AUTH ERROR] signupAction:", err);
    return { success: false, error: formatDbError(err) };
  }
}

export async function changePasswordAction(formData: FormData): Promise<AuthResponse> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized session. Please log in again." };
    }

    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    // Verify current password if user is not in forced-first-login mode
    const dbUser = await prisma.user.findUnique({ where: { id: session.id } });
    if (!dbUser) {
      return { success: false, error: "User record not found." };
    }

    // Enforce current password verification unless user is in forced-first-login bootstrap mode
    if (!dbUser.mustChangePassword) {
      if (!currentPassword) {
        return { success: false, error: "Current password is required." };
      }
      const isCurrentValid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
      if (!isCurrentValid) {
        return { success: false, error: "Current password does not match." };
      }
    }

    // Enforce password policy
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.reason };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: "New passwords do not match." };
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: session.id },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    // Re-issue session cookie with mustChangePassword = false
    const { createSessionToken } = await import("@/lib/auth/session");
    const token = await createSessionToken({
      id: session.id,
      email: session.email,
      name: session.name,
      role: session.role,
      mustChangePassword: false,
    });
    await setSessionCookie(token);

    await logAudit({
      userId: session.id,
      action: AuditAction.UPDATE_RECORD,
      entityType: "User",
      entityId: session.id,
      details: "User updated password and completed security validation.",
    });

    return { success: true, redirectTo: "/" };
  } catch (err: any) {
    console.error("[AUTH ERROR] changePasswordAction:", err);
    return { success: false, error: formatDbError(err) };
  }
}

export async function logoutAction(): Promise<void> {
  const session = await getSession();
  if (session) {
    await logAudit({
      userId: session.id,
      action: AuditAction.LOGOUT,
      details: "User logged out.",
    });
  }
  await clearSessionCookie();
  redirect("/login");
}
