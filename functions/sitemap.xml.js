export async function onRequest({ request, env }) {
  const origin = new URL(request.url).origin, base = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || "";
  if (!base || !key) return new Response("Sitemap is not configured.", {status:503,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"}});
  const path = "articles?select=slug,updated_at&status=eq.published&deleted_at=is.null&is_demo=eq.false&published_at=lte." + encodeURIComponent(new Date().toISOString()) + "&order=updated_at.desc&limit=500";
  const response = await fetch(base + "/rest/v1/" + path,{headers:{apikey:key,authorization:"Bearer "+key}});
  if (!response.ok) return new Response("Published pages are temporarily unavailable.",{status:502,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"}});
  const rows = await response.json(), esc = (value) => String(value).replace(/[<>&'"]/g,(c)=>({"<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;"}[c]));
  const urls = ["<url><loc>"+esc(origin+"/")+"</loc></url>",...rows.filter(r=>r.slug).map(r=>"<url><loc>"+esc(origin+"/?yazi="+encodeURIComponent(r.slug))+"</loc><lastmod>"+esc(r.updated_at||new Date().toISOString())+"</lastmod></url>")];
  return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.join("")+"</urlset>",{headers:{"content-type":"application/xml; charset=utf-8","cache-control":"public, max-age=300"}});
}
