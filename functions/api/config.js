export async function onRequest({ env }) {
  const url = env.SUPABASE_URL || "";
  const key = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || "";
  const configured = Boolean(url && key);
  return new Response(JSON.stringify({
    configured, supabaseUrl: url, publishableKey: key, turnstileSiteKey: env.TURNSTILE_SITE_KEY || ""
  }), { status: configured ? 200 : 503, headers: {
    "content-type":"application/json; charset=utf-8", "cache-control":"no-store", "x-content-type-options":"nosniff"
  }});
}
