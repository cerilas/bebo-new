-- Seed dummy data for product_detail table
-- Product: Tablo Prowood Series (id=7, slug=wall-art)
-- Run AFTER migrations/0015_add_product_detail.sql

INSERT INTO "product_detail" (
  "product_id",
  "short_description",
  "short_description_en",
  "short_description_fr",
  "long_description_html",
  "long_description_html_en",
  "long_description_html_fr",
  "gallery_images",
  "video_url"
) VALUES (
  7,

  -- Kısa açıklamalar (3 dil)
  'Yapay zeka ile tasarladığın anı, %100 masif ahşap Prowood çerçevede tablo oluyor. 4 boyut, 5 çerçeve rengi — tamamen sana özel.',
  'Turn your AI-designed moment into a wall art piece with 100% solid wood Prowood framing. 4 sizes, 5 frame colors — uniquely yours.',
  'Transformez votre design IA en tableau mural avec le cadre Prowood en bois massif 100%. 4 tailles, 5 couleurs de cadre — uniquement le vôtre.',

  -- Uzun açıklama HTML (TR)
  '<div class="product-detail">
  <h2>Prowood Series Hakkında</h2>
  <p>Birebiro Tablo Prowood Serisi, yapay zeka ile oluşturulan tasarımlarınızı gerçek birer sanat eserine dönüştürür. Her tablo, %100 masif ahşaptan üretilen el yapımı çerçevesiyle uzun yıllar boyunca duvarınızı süsler.</p>

  <h3>Neden Prowood?</h3>
  <ul>
    <li><strong>%100 Masif Ahşap</strong> — Sunta veya MDF değil, gerçek ağaç</li>
    <li><strong>UV Dayanımlı Baskı</strong> — Renkler solmaz, 10 yıl renk garantisi</li>
    <li><strong>Hazır Askı Sistemi</strong> — Kutudan çıkar çıkmaz asmaya hazır</li>
    <li><strong>Kırılmaz Cam Seçeneği</strong> — İsteğe bağlı koruyucu cam ile birlikte</li>
  </ul>

  <h3>Boyutlar ve Fiyatlar</h3>
  <table>
    <thead><tr><th>Boyut</th><th>Ölçü</th></tr></thead>
    <tbody>
      <tr><td>Küçük</td><td>30×40 cm</td></tr>
      <tr><td>Orta</td><td>40×50 cm</td></tr>
      <tr><td>Büyük</td><td>50×70 cm</td></tr>
      <tr><td>Ekstra Büyük</td><td>70×100 cm</td></tr>
    </tbody>
  </table>

  <h3>Çerçeve Seçenekleri</h3>
  <p>Siyah, Beyaz, Ceviz ve Meşe olmak üzere 4 farklı çerçeve rengi; ayrıca çerçevesiz seçenek de mevcuttur. Her çerçeve elle işlenmiş ve zımparalanmış masif ahşaptan üretilmektedir.</p>

  <h3>Üretim ve Teslimat</h3>
  <p>Siparişiniz onaylandıktan sonra üretim <strong>2-4 iş günü</strong> içinde tamamlanır. Türkiye genelinde ücretsiz kargo ile kapınıza teslim edilir. Uluslararası gönderim de mevcuttur.</p>

  <h3>Bakım Talimatları</h3>
  <p>Kuru bez ile silin. Doğrudan güneş ışığına ve nemli ortamlara maruz bırakmayın. Optimum sıcaklık 15-25°C arasındadır.</p>
</div>',

  -- Uzun açıklama HTML (EN)
  '<div class="product-detail">
  <h2>About Prowood Series</h2>
  <p>Birebiro Tablo Prowood Series transforms your AI-generated designs into real pieces of art. Each print comes in a handcrafted 100% solid wood frame that will adorn your walls for years to come.</p>

  <h3>Why Prowood?</h3>
  <ul>
    <li><strong>100% Solid Wood</strong> — Real wood, not particle board or MDF</li>
    <li><strong>UV-Resistant Printing</strong> — Colors won''t fade, 10-year color guarantee</li>
    <li><strong>Ready-to-Hang System</strong> — Ready to hang right out of the box</li>
    <li><strong>Shatterproof Glass Option</strong> — Optional protective glass available</li>
  </ul>

  <h3>Sizes</h3>
  <table>
    <thead><tr><th>Size</th><th>Dimensions</th></tr></thead>
    <tbody>
      <tr><td>Small</td><td>30×40 cm</td></tr>
      <tr><td>Medium</td><td>40×50 cm</td></tr>
      <tr><td>Large</td><td>50×70 cm</td></tr>
      <tr><td>Extra Large</td><td>70×100 cm</td></tr>
    </tbody>
  </table>

  <h3>Frame Options</h3>
  <p>Available in Black, White, Walnut, and Oak — plus a frameless option. Every frame is hand-finished and sanded from solid wood.</p>

  <h3>Production & Delivery</h3>
  <p>Production is completed within <strong>2-4 business days</strong> after your order is confirmed. Free shipping across Turkey. International shipping available.</p>

  <h3>Care Instructions</h3>
  <p>Wipe with a dry cloth. Avoid direct sunlight and humid environments. Optimal temperature range is 15-25°C.</p>
</div>',

  -- Uzun açıklama HTML (FR)
  '<div class="product-detail">
  <h2>À propos de la Série Prowood</h2>
  <p>La série Birebiro Tablo Prowood transforme vos créations IA en véritables œuvres d''art. Chaque impression est encadrée à la main en bois massif 100% pour décorer vos murs pendant des années.</p>

  <h3>Pourquoi Prowood?</h3>
  <ul>
    <li><strong>Bois Massif 100%</strong> — Vrai bois, pas de panneau de particules ou de MDF</li>
    <li><strong>Impression Résistante aux UV</strong> — Les couleurs ne s''estompent pas, garantie 10 ans</li>
    <li><strong>Système Prêt à Accrocher</strong> — Prêt à accrocher dès la sortie de la boîte</li>
    <li><strong>Option Verre Incassable</strong> — Verre de protection optionnel disponible</li>
  </ul>

  <h3>Dimensions</h3>
  <table>
    <thead><tr><th>Taille</th><th>Dimensions</th></tr></thead>
    <tbody>
      <tr><td>Petit</td><td>30×40 cm</td></tr>
      <tr><td>Moyen</td><td>40×50 cm</td></tr>
      <tr><td>Grand</td><td>50×70 cm</td></tr>
      <tr><td>Très Grand</td><td>70×100 cm</td></tr>
    </tbody>
  </table>

  <h3>Options de Cadre</h3>
  <p>Disponible en Noir, Blanc, Noyer et Chêne — plus une option sans cadre. Chaque cadre est fini à la main en bois massif.</p>

  <h3>Production et Livraison</h3>
  <p>La production est terminée en <strong>2-4 jours ouvrables</strong>. Livraison gratuite en Turquie. Expédition internationale disponible.</p>
</div>',

  -- Galeri görselleri (mevcut ürün görsellerinden)
  '[
    "https://admin.birebiro.com/api/files/2026/03/1774262536963-9d5bbc54efd4.jpg",
    "https://admin.birebiro.com/api/files/2026/04/1775480431320-cba012c7527c.png",
    "https://admin.birebiro.com/api/files/2026/03/1774262541425-b1ef64811fe5.jpg",
    "https://admin.birebiro.com/api/files/2026/03/1774267050129-8ee6ec6be6a3.jpg"
  ]',

  -- Video URL (YouTube kısa veya uzun URL, ya da direkt mp4 linki)
  NULL -- Örnek: 'https://youtu.be/dQw4w9WgXcQ' veya 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
)
ON CONFLICT (product_id) DO UPDATE SET
  "short_description"        = EXCLUDED."short_description",
  "short_description_en"     = EXCLUDED."short_description_en",
  "short_description_fr"     = EXCLUDED."short_description_fr",
  "long_description_html"    = EXCLUDED."long_description_html",
  "long_description_html_en" = EXCLUDED."long_description_html_en",
  "long_description_html_fr" = EXCLUDED."long_description_html_fr",
  "gallery_images"           = EXCLUDED."gallery_images",
  "video_url"                = EXCLUDED."video_url",
  "updated_at"               = now();
