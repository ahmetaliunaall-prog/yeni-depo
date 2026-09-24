const jsonResponse = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  },
});

function xmlEscape(value) {
  return String(value).replace(/[<>&'"]/g, (char) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;",
  })[char]);
}

function canonicalOrigin(env, request) {
  try {
    const configured = new URL(env.SITE_URL || "");
    if (configured.protocol === "https:") return configured.origin;
  } catch {}
  return new URL(request.url).origin;
}

async function sitemap(request, env) {
  const base = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || "";
  if (!base || !key) {
    return new Response("Sitemap is not configured.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  const path = "articles?select=slug,updated_at&status=eq.published&deleted_at=is.null&is_demo=eq.false&published_at=lte."
    + encodeURIComponent(new Date().toISOString())
    + "&order=updated_at.desc&limit=500";

  try {
    const response = await fetch(base + "/rest/v1/" + path, {
      headers: { apikey: key, authorization: "Bearer " + key },
    });
    if (!response.ok) {
      return new Response("Published pages are temporarily unavailable.", {
        status: 502,
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
      });
    }

    const rows = await response.json();
    const origin = canonicalOrigin(env, request);
    const urls = [
      "<url><loc>" + xmlEscape(origin + "/") + "</loc></url>",
      ...rows.filter((row) => row.slug).map((row) =>
        "<url><loc>" + xmlEscape(origin + "/?yazi=" + encodeURIComponent(row.slug))
          + "</loc><lastmod>" + xmlEscape(row.updated_at || new Date().toISOString())
          + "</lastmod></url>"
      ),
    ];
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        + urls.join("") + "</urlset>",
      { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=300" } },
    );
  } catch {
    return new Response("Published pages are temporarily unavailable.", {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/admin") {
      return Response.redirect(new URL("/?admin=1", request.url), 302);
    }

    if (url.pathname === "/api/config") {
      if (request.method !== "GET") {
        return new Response("Method not allowed.", {
          status: 405,
          headers: { allow: "GET", "content-type": "text/plain; charset=utf-8" },
        });
      }
      const supabaseUrl = env.SUPABASE_URL || "";
      const publishableKey = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || "";
      const configured = Boolean(supabaseUrl && publishableKey);
      return jsonResponse({
        configured,
        supabaseUrl,
        publishableKey,
        turnstileSiteKey: env.TURNSTILE_SITE_KEY || "",
      }, configured ? 200 : 503);
    }

    if (url.pathname === "/sitemap.xml") {
      if (request.method !== "GET") {
        return new Response("Method not allowed.", {
          status: 405,
          headers: { allow: "GET", "content-type": "text/plain; charset=utf-8" },
        });
      }
      return sitemap(request, env);
    }

    if (url.pathname === "/robots.txt") {
      if (request.method !== "GET") {
        return new Response("Method not allowed.", {
          status: 405,
          headers: { allow: "GET", "content-type": "text/plain; charset=utf-8" },
        });
      }
      const origin = canonicalOrigin(env, request);
      return new Response(
        "User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /?admin=\nSitemap: " + origin + "/sitemap.xml\n",
        { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } },
      );
    }

    return env.ASSETS.fetch(request);
  },
};
