/**
 * Export reward payouts — every Hall-enrolled athlete with a wallet, their
 * laurels, and the token amount to send. Owner-side tool (needs the
 * service-role key; RLS hides other users from the anon key).
 *
 * Usage:
 *   node scripts/export-payouts.mjs [--rate 1] [--min 50]
 *
 *   --rate  tokens per laurel (default 1)
 *   --min   skip athletes below this many laurels (default 1)
 *
 * Env (read from .env.local or the environment):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Writes payouts-<date>.csv (spreadsheet) and payouts-<date>.json
 * ([{address, amount}] — the shape batch-transfer tools take).
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

// minimal .env.local loader (plain node doesn't read Next's env files)
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
    "The service-role key is in the Supabase dashboard → Settings → API. " +
    "Keep it out of git; put it in .env.local."
  );
  process.exit(1);
}

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  const v = i !== -1 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(v) ? v : fallback;
};
const RATE = arg("rate", 1); // tokens per laurel
const MIN = arg("min", 1);   // minimum laurels to be included

// Rewards are paid on Solana (base58 addresses). Legacy 0x entries predate
// the migration — counted separately so the owner can chase stragglers.
const SOL_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const ETH_RE = /^0x[a-fA-F0-9]{40}$/;

const sb = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await sb
  .from("profiles")
  .select("id, laurels, wallet_address, hall_joined")
  .eq("hall_joined", true)
  .not("wallet_address", "is", null)
  .order("laurels", { ascending: false });

if (error) {
  console.error("Query failed:", error.message);
  process.exit(1);
}

const rows = (data ?? []).filter(
  (r) => SOL_RE.test(r.wallet_address ?? "") && (r.laurels ?? 0) >= MIN
);
const legacyEth = (data ?? []).filter((r) => ETH_RE.test(r.wallet_address ?? "")).length;
const skipped = (data ?? []).length - rows.length;

const day = new Date().toISOString().slice(0, 10);
const csv = [
  "user_id,wallet_address,laurels,tokens",
  ...rows.map((r) => `${r.id},${r.wallet_address},${r.laurels},${r.laurels * RATE}`),
].join("\n");
const json = rows.map((r) => ({
  address: r.wallet_address,
  amount: String(r.laurels * RATE),
}));

writeFileSync(`payouts-${day}.csv`, csv + "\n");
writeFileSync(`payouts-${day}.json`, JSON.stringify(json, null, 2) + "\n");

const total = rows.reduce((a, r) => a + r.laurels * RATE, 0);
console.log(
  `${rows.length} payout${rows.length === 1 ? "" : "s"} · ${total.toLocaleString()} LAUREL total` +
  ` (rate ${RATE}/laurel, min ${MIN} laurels${skipped > 0 ? `, ${skipped} skipped — no valid Solana wallet or below min` : ""})`
);
if (legacyEth > 0) {
  console.log(
    `⚠ ${legacyEth} athlete${legacyEth === 1 ? " still has" : "s still have"} a legacy Ethereum address on file — they see a migrate nudge in the Hall.`
  );
}
console.log(`→ payouts-${day}.csv, payouts-${day}.json`);
