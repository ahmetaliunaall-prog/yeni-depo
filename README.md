# Ahmet Ali Ünal — kişisel hukuk arşivi

Yayımlanmış metinleri ve araştırma notlarını öne çıkaran, Türkçe ve mobil öncelikli kişisel site. Arayüz bu depoda sıfırdan kuruldu; mevcut Supabase projesine eklemeli ve veri koruyucu biçimde bağlanır.

## Cloudflare Workers dağıtımı

Bu depo, `npx wrangler deploy` komutuyla dağıtılacak bir Cloudflare Worker ve statik varlıklar olarak yapılandırılmıştır.

1. Cloudflare Workers Builds içinde GitHub’daki `ahmetaliunaall-prog/yeni-depo` deposunu bağla.
2. Build komutunu boş bırak; ek paket kurulumu veya derleme adımı gerekmez. Deploy komutu `npx wrangler deploy` olsun.
3. Kök dizindeki `wrangler.toml`, Worker giriş noktasını, statik varlıkları ve Supabase proje URL’si ile publishable anahtarı tanımlar. `.assetsignore` yalnızca site için gereken dosyaların yayımlanmasını sağlar.
4. Publishable anahtar tarayıcı uygulamaları için tasarlanmıştır ve herkese açık olabilir; erişimi RLS politikaları sınırlar. Secret/service-role anahtarlarını Cloudflare’a veya GitHub’a koyma.
5. Turnstile kullanacaksan `TURNSTILE_SITE_KEY` değerini Worker değişkenlerine, `TURNSTILE_SECRET_KEY` değerini Supabase Edge Function secrets içine ekle. Turnstile isteğe bağlıdır.
6. İlk dağıtımdan sonra oluşan Workers alan adını Supabase Edge Function’ın izinli kaynak yapılandırmasına ve veritabanındaki site-origin izin listesine ekle. Supabase Auth → URL Configuration bölümünde alan adını Site URL ve gereken Redirect URLs listesine de ekle.
7. HTTPS üzerinden herkese açık içerik, yönetici girişi, iletişim formu ve medya yüklemeyi kontrol et.

Bu proje Workers yapılandırması kullanır. Cloudflare Pages projesine dağıtılacaksa Pages için ayrı bir proje ve `wrangler pages deploy` akışı gerekir.

## İçerik ve yetki

- Herkese açık içerik yalnızca yayımlanmış, silinmemiş ve demo olmayan kayıtlarla sınırlanır.
- Yönetim Supabase Auth kullanır; `profiles.role = admin` ayrıca doğrulanır. Var olan iki yönetici korunmuştur.
- AI taslakları mevcut `ai-assistant` işlevine gider; Gemini anahtarı tarayıcıya gönderilmez.
- İletişim, onay alarak ve kişisel IP saklamadan `contact-intake` işlevine gider.
- Site hukuki danışmanlık veya kişiye özel hukuki görüş sunmaz.

## Yapı

- `index.html`, `assets/site.css`, `assets/site.js`: halka açık site ve yönetim uygulaması.
- `worker.js`: Supabase istemci ayarını ve sitemap’i sunar; diğer istekleri statik varlık katmanına aktarır.
- `wrangler.toml`: Worker girişi, statik varlık ayarları ve public Supabase değişkenleri.
- `supabase/migrations`: canlı veritabanı iyileştirmeleri ve demo kayıtlarını geri alınabilir biçimde arşivleme.
- `tests/smoke.mjs`: yerel statik bütünlük denetimleri.
