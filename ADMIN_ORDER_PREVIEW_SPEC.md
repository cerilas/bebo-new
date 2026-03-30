# Admin Panel: Sipariş Ön İzleme — Teknik Spesifikasyon

## Amaç

Admin panelinde bir sipariş detay sayfasında, kullanıcının ürettiği görselin çerçeve üzerinde konumlandırılmış halini **birebir yeniden üretmek**. Ekstra hesaplama gerekmez; mevcut bileşenler ve veritabanındaki veriler yeterlidir.

---

## Gerekli Veritabanı Sorgusu

```ts
// Drizzle ORM ile (src/models/Schema.ts'e göre)
import { eq } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { orderSchema, productFrameSchema } from '@/models/Schema';

const result = await db
  .select({
    orderId: orderSchema.id,
    merchantOid: orderSchema.merchantOid,
    imageUrl: orderSchema.imageUrl,
    imageTransform: orderSchema.imageTransform,  // JSON string: { x, y, scale }
    orientation: orderSchema.orientation,         // 'landscape' | 'portrait'
    previewImageUrl: orderSchema.previewImageUrl, // Kullanıcının gördüğü ekran görüntüsü
    finalProductImageUrl: orderSchema.finalProductImageUrl,
    paymentStatus: orderSchema.paymentStatus,
    createdAt: orderSchema.createdAt,
    // Product frame
    mockupTemplate: productFrameSchema.mockupTemplate,
    mockupConfig: productFrameSchema.mockupConfig,
    mockupTemplateVertical: productFrameSchema.mockupTemplateVertical,
    mockupConfigVertical: productFrameSchema.mockupConfigVertical,
  })
  .from(orderSchema)
  .leftJoin(productFrameSchema, eq(orderSchema.productFrameId, productFrameSchema.id))
  .where(eq(orderSchema.id, orderId));

const order = result[0];
```

---

## Render Mantığı

### 1. Orientation'a Göre Mockup Seç

```ts
const isPortrait = order.orientation === 'portrait';

const activeMockupTemplate = isPortrait && order.mockupTemplateVertical
  ? order.mockupTemplateVertical
  : order.mockupTemplate;

const activeMockupConfigRaw = isPortrait && order.mockupConfigVertical
  ? order.mockupConfigVertical
  : order.mockupConfig;
```

### 2. Verileri Parse Et

```ts
import { parseMockupConfig } from '@/utils/mockupUtils';
import type { ImageTransform } from '@/components/MockupEditor';

const mockupConfig = parseMockupConfig(activeMockupConfigRaw ?? null);

const imageTransform: ImageTransform = order.imageTransform
  ? JSON.parse(order.imageTransform)
  : { x: 0, y: 0, scale: 1 };
```

### 3. `MockupPreview` Bileşenini Kullan

Mevcut `MockupPreview` bileşeni (`src/components/MockupPreview.tsx`) tüm render mantığını zaten içeriyor. Admin sayfasında doğrudan kullan:

```tsx
import { MockupPreview } from '@/components/MockupPreview';
import { parseMockupConfig } from '@/utils/mockupUtils';

// Server component ise, MockupPreview 'use client' olduğu için
// bunu bir Client Component wrapper içinde kullan.

<MockupPreview
  imageUrl={order.imageUrl}
  mockupTemplate={activeMockupTemplate ?? undefined}
  mockupType={mockupConfig.type ?? 'frame'}
  mockupConfig={mockupConfig}
  imageTransform={imageTransform}
  className="w-full max-w-lg rounded-xl"
/>
```

---

## Admin Sayfası Dosya Yapısı (Öneri)

```
src/app/[locale]/admin/orders/[orderId]/
  page.tsx          ← Server Component: veriyi çeker
  OrderPreview.tsx  ← Client Component: MockupPreview'ı render eder
```

### `page.tsx` (Server Component)

```tsx
import { eq } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { orderSchema, productFrameSchema } from '@/models/Schema';
import { parseMockupConfig } from '@/utils/mockupUtils';
import type { ImageTransform } from '@/components/MockupEditor';
import { OrderPreview } from './OrderPreview';

export default async function AdminOrderDetailPage({
  params,
}: {
  params: { orderId: string };
}) {
  const result = await db
    .select({ /* yukarıdaki alanlar */ })
    .from(orderSchema)
    .leftJoin(productFrameSchema, eq(orderSchema.productFrameId, productFrameSchema.id))
    .where(eq(orderSchema.id, Number(params.orderId)));

  const order = result[0];
  if (!order) return <div>Sipariş bulunamadı</div>;

  const isPortrait = order.orientation === 'portrait';
  const activeMockupTemplate = isPortrait && order.mockupTemplateVertical
    ? order.mockupTemplateVertical
    : order.mockupTemplate;
  const activeMockupConfigRaw = isPortrait && order.mockupConfigVertical
    ? order.mockupConfigVertical
    : order.mockupConfig;

  const mockupConfig = parseMockupConfig(activeMockupConfigRaw ?? null);
  const imageTransform: ImageTransform = order.imageTransform
    ? JSON.parse(order.imageTransform)
    : { x: 0, y: 0, scale: 1 };

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-4 text-2xl font-bold">Sipariş #{order.merchantOid}</h1>
      <p>Durum: {order.paymentStatus}</p>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-semibold text-gray-700">
            Kullanıcının Yerleşimi ({order.orientation})
          </h2>
          {order.imageUrl && activeMockupTemplate ? (
            <OrderPreview
              imageUrl={order.imageUrl}
              mockupTemplate={activeMockupTemplate}
              mockupConfig={mockupConfig}
              imageTransform={imageTransform}
            />
          ) : (
            <img
              src={order.previewImageUrl ?? order.imageUrl ?? ''}
              alt="Önizleme"
              className="w-full rounded-xl"
            />
          )}
        </div>

        {/* Ekstra: hızlı referans olarak screenshot */}
        {order.previewImageUrl && (
          <div>
            <h2 className="mb-2 font-semibold text-gray-700">
              Kaydedilmiş Önizleme (Screenshot)
            </h2>
            <img
              src={order.previewImageUrl}
              alt="Kaydedilmiş önizleme"
              className="w-full rounded-xl border"
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

### `OrderPreview.tsx` (Client Component)

```tsx
'use client';

import { MockupPreview } from '@/components/MockupPreview';
import type { MockupConfig } from '@/utils/mockupUtils';
import type { ImageTransform } from '@/components/MockupEditor';

type Props = {
  imageUrl: string;
  mockupTemplate: string;
  mockupConfig: MockupConfig;
  imageTransform: ImageTransform;
};

export function OrderPreview({ imageUrl, mockupTemplate, mockupConfig, imageTransform }: Props) {
  return (
    <MockupPreview
      imageUrl={imageUrl}
      mockupTemplate={mockupTemplate}
      mockupType={mockupConfig.type ?? 'frame'}
      mockupConfig={mockupConfig}
      imageTransform={imageTransform}
      className="w-full rounded-xl border shadow"
    />
  );
}
```

---

## `imageTransform` Değerlerinin Anlamı

| Alan    | Tip      | Açıklama |
|---------|----------|----------|
| `x`     | `number` | Görselin X eksenindeki kayması (%). `0` = ortada. Sağa: pozitif, sola: negatif. |
| `y`     | `number` | Y eksenindeki kayma (%). `0` = ortada. Aşağı: pozitif, yukarı: negatif. |
| `scale` | `number` | Büyütme faktörü. `1` = tam sığdır, `1.5` = %150 zoom, `0.8` = %80 küçük. |

Saklama formatı: `text` kolonu, JSON string → `'{"x": 5.2, "y": -3.1, "scale": 1.25}'`

---

## `mockupConfig` Değerlerinin Anlamı

`productFrame.mockupConfig` ve `productFrame.mockupConfigVertical` kolonlarından JSON olarak okunur.

| Alan          | Tip      | Açıklama |
|---------------|----------|----------|
| `type`        | `string` | `'frame'` (çerçeve üstte, görsel arkada) \| `'overlay'` (görsel üstte) \| `'perspective'` |
| `x`           | `number` | Sanat alanının sol kenarı (% cinsinden mockup genişliğine oranla) |
| `y`           | `number` | Sanat alanının üst kenarı (%) |
| `width`       | `number` | Sanat alanının genişliği (%) |
| `height`      | `number` | Sanat alanının yüksekliği (%) |
| `rotation`    | `number` | Döndürme açısı (derece) |

---

## Alternatif: Sadece Screenshot Göster

Eğer `MockupPreview` bileşenini admin paneline entegre etmek istemiyorsan, `order.previewImageUrl` kolonundaki URL'yi doğrudan `<img>` ile gösterebilirsin. Bu, ödeme sırasında `html2canvas` ile alınan ekran görüntüsüdür — kullanıcının gördüğü sonuca birebir eşittir.

```tsx
<img
  src={order.previewImageUrl}
  alt="Sipariş önizlemesi"
  className="w-full rounded-xl"
/>
```

> **Öneri:** `previewImageUrl` varsa onu göster (hızlı ve güvenilir). Yoksa veya daha yüksek kalite gerekiyorsa `MockupPreview` bileşenini kullan.

---

## Özet Akış

```
Admin Sipariş Sayfası
  ↓
DB: order JOIN product_frame (orientation bazlı mockup + config seç)
  ↓
imageTransform: JSON.parse(order.image_transform)
mockupConfig: parseMockupConfig(order.mockup_config veya vertical)
  ↓
<MockupPreview
  imageUrl={order.image_url}
  mockupTemplate={activeMockupTemplate}
  mockupType={mockupConfig.type}
  mockupConfig={mockupConfig}
  imageTransform={imageTransform}
/>
```
