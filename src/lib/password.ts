import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function verifyPassword(plainPassword: string, passwordHash: string): Promise<boolean> {
  if (!passwordHash) return false;
  return bcrypt.compare(plainPassword, passwordHash);
}

const MIN_PASSWORD_LENGTH = 10;

/** Server-side password strength check — never trust client-side validation alone. */
export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, message: "Password must include an uppercase letter, a lowercase letter, and a number." };
  }
  return { valid: true };
}
