/**
 * Username/password auth on top of Supabase.
 *
 * Supabase auth is email-based, so each account gets a synthetic address
 * derived from the username. Users never see it — they sign in with the
 * username; we map it to the email under the hood. Accounts are created
 * server-side (see /api/auth/signup) with the email pre-confirmed.
 */

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/i;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72; // bcrypt limit

/** Canonical (lowercase) username → the synthetic auth email. */
export const usernameToEmail = (username: string) =>
  `${username.trim().toLowerCase()}@users.fitnext.app`;

export function validateSignup(username: unknown, password: unknown): string | null {
  if (typeof username !== "string" || !USERNAME_RE.test(username.trim())) {
    return "Username must be 3-20 characters: letters, numbers, underscores.";
  }
  if (typeof password !== "string" || password.length < PASSWORD_MIN) {
    return `Password must be at least ${PASSWORD_MIN} characters.`;
  }
  if (password.length > PASSWORD_MAX) {
    return `Password must be at most ${PASSWORD_MAX} characters.`;
  }
  return null;
}
