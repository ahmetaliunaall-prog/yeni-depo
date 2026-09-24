import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const [html, css, app, migration, worker, sitemap] = await Promise.all([
  read("index.html"), read("assets/site.css"), read("assets/site.js"),
  read("supabase/migrations/20260924140000_media_storage_and_public_demo_filter.sql"),
  read("functions/api/config.js"), read("functions/sitemap.xml.js")
]);
assert.match(html, /<html lang="tr">/);
for (const id of ["yazilar","yaklasim","arsiv","iletisim","contactForm","adminRoot"]) assert.ok(html.includes('id="'+id+'"'), "missing "+id);
assert.match(css, /max-width:680px/);
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /admin-nav/);
assert.match(app, /profiles/);
assert.match(app, /role!=="admin"/);
assert.match(app, /functions\/v1\/contact-intake/);
assert.match(app, /functions\/v1\/ai-assistant/);
assert.match(app, /is_demo/);
assert.match(app, /site-media/);
assert.match(migration, /private\.is_admin\(\)/);
assert.match(migration, /is_demo is not true/);
assert.match(migration, /get_homepage_visibility/);
assert.match(worker, /SUPABASE_PUBLISHABLE_KEY/);
assert.match(sitemap, /status=eq\.published/);
assert.doesNotMatch(app, /service_role|GEMINI_API_KEY|TELEGRAM_BOT_TOKEN/i);
assert.doesNotMatch(html, /AIza[0-9A-Za-z_-]{20,}|sb_secret_[A-Za-z0-9]+/);
console.log("Smoke checks passed: public shell, mobile rules, protected admin, live integrations, and secret boundaries.");
