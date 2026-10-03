/**
 * Sanitization & Injection Defense Library
 * Compliant with OWASP ASVS & CWE-1236 (Improper Neutralization of Formula Elements in CSV)
 */

/**
 * Neutralizes Excel / CSV formula injection characters.
 * Any string that starts with '=', '+', '-', '@', '\t', '\r' is prepended with a single quote "'"
 * so spreadsheet applications treat it strictly as inert plain text.
 */
export function sanitizeForSpreadsheet(val: any): any {
  if (typeof val !== "string") {
    return val;
  }

  const trimmed = val.trim();
  if (!trimmed) return val;

  const dangerousPrefixes = ["=", "+", "-", "@", "\t", "\r"];
  const firstChar = trimmed.charAt(0);

  if (dangerousPrefixes.includes(firstChar)) {
    return `'${val}`;
  }

  return val;
}

/**
 * Recursively sanitizes all string properties in a row object for spreadsheet export.
 */
export function sanitizeRowForExport<T extends Record<string, any>>(row: T): T {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(row)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeForSpreadsheet(value);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeRowForExport(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Basic HTML output encoder to prevent cross-site scripting (XSS)
 */
export function encodeHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Validates whether a password meets the enterprise security policy:
 * - At least 10 characters long
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special symbol (!@#$%^&*...)
 * - Not a commonly breached sequence
 */
export function validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
  if (!password || password.length < 10) {
    return { valid: false, reason: "Password must be at least 10 characters long." };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one uppercase letter (A-Z)." };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one lowercase letter (a-z)." };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one number (0-9)." };
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one special symbol (e.g. !@#$%^&*)." };
  }

  const commonPasswords = [
    "password123",
    "password1234",
    "admin12345",
    "saitours123",
    "saipassport123",
    "1234567890",
    "welcome123",
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    return { valid: false, reason: "This password is too common and easily guessed. Please choose a unique passphrase." };
  }

  return { valid: true };
}
