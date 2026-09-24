# Ahmet Ali Ünal — kişisel hukuk arşivi

Yayımlanmış metinleri ve araştırma notlarını öne çıkaran, Türkçe ve mobil öncelikli kişisel site. Arayüz bu depoda sıfırdan kuruldu; Supabase tarafı mevcut, içerikli hukuk platformuna eklemeli ve veri koruyucu biçimde bağlanır.

## Yerel önizleme

Herhangi bir paket kurulumu gerekmez. Proje klasörünü basit bir statik sunucuyla açın. Canlı içerik için Supabase bağlantı değerleri gereken sunucu tarafı /api/config Pages Function'ı üzerinden sağlanır. Anahtarları dosyalara veya Git'e koymayın.

## Cloudflare Pages kurulumu

1. Cloudflare Pages içinde ahmetaliunaall-prog/yeni-depo deposunu bağlayın.
2. Build komutu boş, çıktı dizini nokta olsun.
3. Pages proje ayarlarında Functions ortam değişkenlerini tanımlayın: SUPABASE_URL ve SUPABASE_PUBLISHABLE_KEY (alternatif: SUPABASE_ANON_KEY).
4. Turnstile etkinleştirilmişse TURNSTILE_SITE_KEY tanımlayın.
5. Dağıtım tamamlandıktan sonra Supabase Edge Function ortamındaki SITE_ORIGIN değerini tam yayın alan adıyla eşleştirin. Site adresi ayrıca veritabanındaki site-origin izin listesinde bulunmalıdır; contact-intake ve seo-autopilot bu kontrolü uygular.
6. HTTPS, giriş, yayınlama ve iletişim akışlarını gerçek yayın alanında doğrulayın.

Publishable key istemci uygulaması için tasarlanmıştır. Service role veya secret key hiçbir zaman web ortamına eklenmemelidir.

## İçerik ve yetki

- Herkese açık içerik yalnızca yayımlanmış, silinmemiş ve demo olmayan kayıtlarla sınırlanır.
- Yönetim Supabase Auth kullanır; profiles.role = admin ayrıca doğrulanır. Var olan iki yönetici korunur.
- AI taslakları mevcut ai-assistant işlevine gider; Gemini anahtarı tarayıcıya gönderilmez.
- İletişim, kişisel IP kaydetmeden ve onay alarak contact-intake işlevine gider.
- Site hukuki danışmanlık veya kişiye özel hukuki görüş sunmaz.

## Yapı

- index.html, assets/site.css, assets/site.js: halka açık site ve yönetim uygulaması.
- functions/api/config.js: Pages ortamından istemci ayarını sunar.
- functions/sitemap.xml.js: gerçek yayımlanmış yazılardan site haritası üretir.
- supabase/migrations: eklemeli canlı veritabanı iyileştirmesi.
- tests/smoke.mjs: yerel statik bütünlük denetimleri.
