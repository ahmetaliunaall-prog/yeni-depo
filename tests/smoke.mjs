import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const [html, css, redesign, app, migration, worker, sitemap, wrangler] = await Promise.all([
  read("index.html"), read("assets/site.css"), read("assets/redesign.css"), read("assets/site.js"),
  read("supabase/migrations/20260924140000_media_storage_and_public_demo_filter.sql"),
  read("worker.js"), read("functions/sitemap.xml.js"), read("wrangler.toml")
]);
assert.match(html, /<html lang="tr">/);
assert.match(html, /id="heroTitle">Ahmet Ali<br><span>Ünal/);
assert.match(html, /id="themeToggle"/);
assert.match(html, /rel="canonical"/);
assert.match(html, /id="yazilar"[^>]*hidden/);
assert.match(html, /id="arsiv"[^>]*hidden/);
assert.doesNotMatch(html, /Hukuku anlamak, analiz etmek ve paylaşmak|Netlik, iyi bir başlangıçtır|Kavramlar, kararlar, izler/);
for (const id of ["yazilar","yaklasim","arsiv","iletisim","contactForm","adminRoot"]) assert.ok(html.includes('id="'+id+'"'), "missing "+id);
assert.match(css, /max-width:680px/);
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /admin-nav/);
assert.match(redesign, /data-theme="light"/);
assert.match(redesign, /hero-art/);
assert.match(redesign, /max-width:680px/);
assert.match(redesign, /prefers-reduced-motion/);
assert.match(app, /profiles/);
assert.match(app, /role!=="admin"/);
assert.match(app, /state.view=state.mode==="developer"\?"tools":"overview"/);
assert.match(app, /localStorage.setItem\("ahmet_admin_mode:"/);
assert.match(app, /themeButton\?\.addEventListener\("click"/);
assert.match(app, /#yazilar"\).hidden=articles.length===0/);
assert.match(app, /functions\/v1\/contact-intake/);
assert.match(app, /functions\/v1\/ai-assistant/);
assert.match(app, /is_demo/);
assert.match(app, /site-media/);
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
