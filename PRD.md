---
tags: [project/captura, prd, backend, nestjs]
date: 2026-06-02
status: living-document
parent: [[../PRD|Captura AI PRD]]
---

# Captura Backend PRD

## 1. Ringkasan

Backend Captura adalah pusat API, data, autentikasi, transaksi, lisensi, dan orkestrasi AI. Backend bertugas menghubungkan frontend, database, payment gateway, storage, dan [[../ai-service/PRD|AI Service PRD]] agar foto street photography dapat diunggah, dianalisis, dicari, dibeli, dan diunduh secara aman.

Backend mengacu pada [[../PRD|Captura AI PRD]] sebagai konteks produk utama.

## 2. Tujuan Backend

- Menyediakan API stabil untuk frontend.
- Menyimpan dan mengelola data users, photographers, moments, licenses, orders, dan AI metadata.
- Mengorkestrasi proses upload foto sampai searchable.
- Mengintegrasikan AI service untuk analisis foto.
- Mendukung search multi-parameter.
- Mengelola order, payment webhook, lisensi, dan download access.
- Menyediakan struktur DDD-style yang mudah dikembangkan per domain.

## 3. Domain Utama

## 3.1 Users

Mewakili akun pengguna platform.

Kebutuhan:

- Register/login.
- Role user, photographer, admin.
- Session/token management.
- Identitas dasar untuk order dan ownership.

## 3.2 Photographers

Mewakili profil fotografer.

Kebutuhan:

- Photographer onboarding.
- Public profile.
- Area operasi.
- Statistik dasar.
- Relasi ke uploaded moments.

## 3.3 Moments

Mewakili foto atau momen yang diunggah fotografer.

Kebutuhan:

- Create/update/list/detail.
- Metadata lokasi dan waktu.
- Photographer ownership.
- License relation.
- AI metadata.
- Searchable fields.
- Embedding vector untuk semantic search.

## 3.4 License Types

Mewakili jenis lisensi foto.

Kebutuhan:

- Personal use.
- Commercial use.
- Print/download rules.
- Price configuration.

## 3.5 Orders

Mewakili transaksi pembelian foto/lisensi.

Kebutuhan:

- Create checkout.
- Order item.
- Billing info.
- Payment gateway.
- Payment status.
- Webhook idempotency.
- Download access setelah pembayaran valid.

## 4. Search Requirements

Backend harus mendukung pencarian moments berdasarkan:

- Location filter.
- Time filter.
- Plate number full/partial.
- Vehicle type.
- Visual tags.
- Text query.
- Photographer.
- License availability.

Untuk MVP, search dapat menggabungkan:

- SQL filter untuk lokasi/waktu/vehicle/license.
- Fuzzy or partial plate matching.
- Vector similarity untuk embedding visual/text.
- Ranking sederhana berbasis score gabungan.

## 5. AI Orchestration Requirements

Backend mengirim foto ke ai-service ketika:

- Fotografer mengunggah foto baru.
- Admin meminta re-analysis.
- Pipeline retry diperlukan.

Backend menerima dan menyimpan:

- EXIF metadata.
- Vehicle detections.
- Plate OCR candidates.
- CLIP visual tags.
- Embedding vector.
- Confidence score.
- Processing status.
- Error/partial result metadata.

Backend tidak harus menjalankan model AI secara langsung. Tanggung jawab model ada pada [[../ai-service/PRD|AI Service PRD]].

## 6. API Requirements

## 6.1 Authentication API

- Register.
- Login.
- Refresh token.
- Magic link or OTP if enabled.
- Current user.

## 6.2 Moments API

- Create moment.
- Update moment.
- List my moments.
- Search moments.
- Moment detail.
- Attach license.
- Trigger AI analysis.

## 6.3 Photographers API

- Onboard photographer.
- List photographers.
- Photographer detail.
- Update photographer profile.
- List photographer moments.

## 6.4 Orders API

- Create checkout.
- List orders.
- Order detail.
- Payment webhook.
- Download access.

## 6.5 License API

- List license types.
- Create/update license types for admin.

## 7. Data Model Requirements

Data penting untuk Moment:

- `id`
- `photographer_id`
- `title`
- `description`
- `image_url`
- `captured_at`
- `location_name`
- `latitude`
- `longitude`
- `vehicle_type`
- `plate_text`
- `plate_confidence`
- `visual_tags`
- `embedding`
- `ai_processing_status`
- `published_status`

Data penting untuk Photographer:

- `id`
- `user_id`
- `display_name`
- `slug`
- `bio`
- `operating_cities`
- `specialties`
- `avatar_url`
- `rating_summary`

Data penting untuk Order:

- `id`
- `buyer_id`
- `status`
- `payment_gateway`
- `payment_method`
- `subtotal`
- `tax`
- `service_fee`
- `total`
- `currency`
- `paid_at`
- `download_expires_at`

## 8. Non-Functional Requirements

## 8.1 Reliability

- Webhook payment harus idempotent.
- AI callback/result storage harus tahan partial result.
- Upload processing harus retryable.

## 8.2 Security

- API protected by auth where necessary.
- Photographer hanya dapat mengelola moments miliknya.
- Admin endpoint harus dilindungi role guard.
- Download URL harus terbatas dan tidak publik permanen.

## 8.3 Privacy

- Plate number harus diperlakukan sebagai sensitive metadata.
- Public API sebaiknya dapat mask plate number.
- Request removal flow harus disiapkan.

## 8.4 Performance

- Search endpoint harus mendukung pagination.
- Query filter harus indexed.
- Vector search harus memakai pgvector atau service khusus yang efisien.

## 9. Integration Requirements

## 9.1 Frontend

Backend menyediakan API untuk [[../frontend/PRD|Frontend PRD]].

## 9.2 AI Service

Backend mengirim request analisis dan menerima hasil dari [[../ai-service/PRD|AI Service PRD]].

## 9.3 Payment Gateway

Backend harus mendukung payment method Indonesia seperti QRIS, VA, dan e-wallet melalui gateway seperti Midtrans.

## 9.4 Storage

Backend perlu mendukung penyimpanan image original dan derivatif. Storage dapat berupa local/dev storage pada MVP dan object storage pada production.

## 10. MVP Acceptance Criteria

- User dapat login/register.
- Photographer dapat di-onboard.
- Moment dapat dibuat dan disimpan.
- Moment dapat dianalisis oleh AI service.
- Search moment dapat menerima filter lokasi, waktu, vehicle, plate, dan text query.
- Photographer directory dapat mengambil data dari API.
- Checkout dapat membuat order.
- Payment webhook dapat mengubah status order.
- Download access tersedia setelah order paid.

## 11. Open Questions

- Apakah upload foto langsung dari frontend ke storage atau via backend?
- Apakah AI processing berjalan synchronous pada upload kecil atau selalu asynchronous?
- Apakah search vector akan dilakukan di PostgreSQL pgvector atau FAISS/ai-service?
- Bagaimana aturan masking plat nomor di public result?
- Bagaimana mekanisme request removal untuk subjek foto?
