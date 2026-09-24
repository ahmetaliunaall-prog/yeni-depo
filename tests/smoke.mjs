Y™Áäx-ÆÈ‹j◊ù¢Îi∫⁄+äßj[hëÈ‹¢ÈÌÛÕì¢÷•¢Îi∫ŸbùÎ5import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const [html, css, redesign, app, migration, worker, sitemap, wrangler] = await Promise.all([
  read("index.html"), read("assets/site.css"), read("assets/redesign.css"), read("assets/site.js"),
  read("supabase/migrations/20260924140000_media_storage_and_public_demo_filter.sql"),
  read("worker.js"), read("functions/sitemap.xml.js"), read("wrangler.toml")
]);
assert.match(html, /<html lang="tr">/);
assert.match(html, /id="heroTitle">Ahmet Ali<br><span>√únal/);
assert.match(html, /id="themeToggle"/);
assert.match(html, /rel="canonical"/);
assert.maﬂÕ≠¢Gß≤⁄Óù∆≠y—/);
assert.match(migration, /private\.is_admin\(\)/);
assert.match(migration, /is_demo is not true/);
assert.match(migration, /get_homepage_visibility/);
assert.match(worker, /SUPABASE_PUBLISHABLE_KEY/);
assert.match(worker, /canonicalOrigin/);
assert.match(worker, /robots.txt/);
assert.match(wrangler, /"\/robots\.txt"/);
assert.match(sitemap, /status=eq\.published/);
assert.doesNotMatch(app, /service_role|GEMINI_API_KEY|TELEGRAM_BOT_TOKEN/i);
assert.doesNotMatch(html, /AIza[0-9A-Za-z_-]{20,}|sb_secret_[A-Za-z0-9]+/);
console.log("Smoke checks passed: personal redesign, responsive and reduced-motion styles, empty-content handling, persistent admin modes, protected access, SEO endpoints, live integrations, and secret boundaries.");
