import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { stravaConfigured } from "@/lib/strava";

export const runtime = "nodejs";

/** Connection state for the signed-in athlete — powers the Train panel. */
export async function GET() {
  if (!stravaConfigured) return NextResponse.json({ configured: false, connected: false });
  const sb = await getSupabaseServer();
  const user = sb ? (await sb.auth.getUser()).data.user : null;
  if (!sb || !user) {
    return NextResponse.json({ configured: true, connected: false, signedIn: false });
  }
  const { data } = await sb
    .from("strava_connections")
    .select("athlete_id, connected_at")
    .eq("user_id", user.id)
    .single();
  return NextResponse.json({
    configured: true,
    signedIn: true,
    connected: !!data,
    connectedAt: data?.connected_at ?? null,
  });
}

/** Disconnect: drop the stored tokens (and tell Strava to revoke ours). */
export async function DELETE() {
  const sb = await getSupabaseServer();
  const user = sb ? (await sb.auth.getUser()).data.user : null;
  if (!sb || !user) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });

  const { data } = await sb
    .from("strava_connections")
    .select("access_token")
    .eq("user_id", user.id)
    .single();
  if (data?.access_token) {
    // best-effort revoke on Strava's side
    void fetch("https://www.strava.com/oauth/deauthorize", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.access_token}` },
    }).catch(() => {});
  }
  await sb.from("strava_connections").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
