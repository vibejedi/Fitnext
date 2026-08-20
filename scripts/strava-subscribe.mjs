/**
 * Manage the app's Strava webhook subscription (one per Strava app).
 * Run AFTER deploying, so Strava can reach the callback for its handshake.
 *
 * Usage:
 *   node scripts/strava-subscribe.mjs                 # create (default callback)
 *   node scripts/strava-subscribe.mjs --url https://fitnext.vercel.app/api/strava/webhook
 *   node scripts/strava-subscribe.mjs --list
 *   node scripts/strava-subscribe.mjs --delete <id>
 *
 * Env (from .env.local or the environment):
 *   NEXT_PUBLIC_STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_VERIFY_TOKEN
 */

import { readFileSync, existsSync } from "node:fs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const id = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
const secret = process.env.STRAVA_CLIENT_SECRET;
const verify = process.env.STRAVA_VERIFY_TOKEN;
if (!id || !secret || !verify) {
  console.error("Missing NEXT_PUBLIC_STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET / STRAVA_VERIFY_TOKEN.");
  process.exit(1);
}

const ENDPOINT = "https://www.strava.com/api/v3/push_subscriptions";
const argv = process.argv.slice(2);
const arg = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 ? argv[i + 1] : null;
};

if (argv.includes("--list")) {
  const res = await fetch(`${ENDPOINT}?client_id=${id}&client_secret=${secret}`);
  console.log(JSON.stringify(await res.json(), null, 2));
  process.exit(0);
}

const delId = arg("delete");
if (delId) {
  const res = await fetch(`${ENDPOINT}/${delId}?client_id=${id}&client_secret=${secret}`, {
    method: "DELETE",
  });
  console.log(res.status === 204 ? `deleted subscription ${delId}` : `delete failed: ${res.status}`);
  process.exit(res.status === 204 ? 0 : 1);
}

const callback = arg("url") ?? "https://fitnext.vercel.app/api/strava/webhook";
const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: id,
    client_secret: secret,
    callback_url: callback,
    verify_token: verify,
  }),
});
const body = await res.json().catch(() => ({}));
if (res.ok) {
  console.log(`subscribed (id ${body.id}) → ${callback}`);
} else {
  console.error(`subscribe failed: ${res.status}`, JSON.stringify(body));
  process.exit(1);
}
