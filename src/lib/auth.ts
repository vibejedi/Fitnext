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

const SYNTHETIC_DOMAIN_TAIL = "@users.fitnext.app";

/**
 * Turns a Supabase email-change error into something an athlete can act on.
 *
 * The trap: with "Secure email change" enabled (Supabase's default) a
 * change is confirmed from BOTH addresses, so GoTrue validates the account's
 * CURRENT address too. Training-only accounts carry a synthetic address on a
 * domain that doesn't resolve, so the call fails naming an address the
 * athlete has never seen. Never show them that — it's ours to fix, in the
 * dashboard: Authentication → Sign In / Providers → Email → Secure email
 * change → off.
 */
export function emailChangeError(message: string): string {
  if (message.includes(SYNTHETIC_DOMAIN_TAIL)) {
    console.error(
      "[auth] Email change rejected against the synthetic address. Disable " +
      "'Secure email change' in Supabase → Authentication → Sign In / Providers → Email.",
      message
    );
    return "We couldn't start the email change — that's on us, not you. Try again in a moment.";
  }
  if (/already/i.test(message)) return "That email already belongs to another account.";
  if (/rate|too many/i.test(message)) return "Too many attempts. Wait a minute, then try again.";
  return message;
}

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
