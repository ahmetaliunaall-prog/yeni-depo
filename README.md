# Ahmet Ali Ünal — kişisel hukuk arşivi

Yayımlanmış metinleri ve araştırma notlarını öne çıkaran, Türkçe ve mobil öncelikli kişisel site. Arayüz bu depoda sıfırdan kuruldu; mevcut Supabase projesine eklemeli ve veri koruyucu biçimde bağlanır.

## Cloudflare Pages kurulumu

1. Cloudflare Pages’te GitHub’daki `ahmetaliunaall-prog/yeni-depo` deposunu bağla ve Pages proje adını `yeni-depo` seç.
2. Build komutunu boş, çıktı dizinini `.` bırak. Kök dizindeki `wrangler.toml`, Pages Functions ayarlarını, Supabase proje URL’sini ve **publishable** anahtarı içerir.
3. Cloudflare yapılandırma dosyası kullanımı isterse Wrangler ayarlarını etkinleştir. Publishable anahtar web uygulamaları için tasarlanmıştır ve kaynakta herkese açıktır; erişimi RLS politikaları sınırlar. Secret/service-role anahtarlarını Pages’e veya GitHub’a koyma.
4. Turnstile kullanacaksan `TURNSTILE_SITE_KEY` değerini Cloudflare Pages’te, `TURNSTILE_SECRET_KEY` değerini ise Supabase Edge Function secrets içinde ayarla. Turnstile isteğe bağlıdır.
5. İlk dağıtımdan sonra oluşan tam Pages alan adını Supabase Edge Function’ın izinli kaynak yapılandırmasına ekle. Veritabanındaki site-origin izin listesine de aynı alan adını ekle.
6. Supabase Auth → URL Configuration bölümünde Pages alan adını Site URL ve gereken Redirect URLs listesine ekle. Ardından herkese açık içerik, yönetici girişi, iletişim formu ve medya yüklemeyi HTTPS üzerinden kontrol et.

## İçerik ve yetki

- Herkese açık içerik yalnızca yayımlanmış, silinmemiş ve demo olmayan kayıtlarla sınırlanır.
- Yönetim Supabase Auth kullanır; `profiles.role = admin` ayrıca doğrulanır. Var olan iki yönetici korunmuştur.
- AI taslakları mevcut `ai-assistant` işlevine gider; Gemini anahtarı tarayıcıya gönderilmez.
- İletişim, onay alarak ve kişisel IP saklamadan `contact-intake` işlevine gider.
- Site hukuki danışmanlık veya kişiye özel hukuki görüş sunmaz.

## Yerel önizleme

Statik kabuk için herhangi bir paket kurulumu gerekmez. Supabase API ayarları `wrangler.toml` üzerinden Pages Functions’a verilir. Cloudflare Pages yerel geliştirmesi için Wrangler’ın Pages dev komutunu kullan.

## Yapı

- `index.html`, `assets/site.css`, `assets/site.js`: halka açık site ve yönetim uygulaması.
- `functions/api/config.js`: Pages ortamından Supabase istemci ayarını sunar.
- `functions/sitemap.xml.js`: yayımlanmış yazılardan site haritası üretir.
- `wrangler.toml`: Cloudflare Pages yapılandırması ve public Supabase değişkenleri.
- `supabase/migrations`: canlı veritabanı iyileştirmeleri ve demo kayıtlarını geri alınabilir biçimde arşivleme.
- `tests/smoke.mjs`: yerel statik bütünlük denetimleri.
