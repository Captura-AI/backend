# Authentication — Setup & Local Testing Guide

Panduan ini menjelaskan seluruh metode autentikasi yang tersedia, cara menyiapkan environment-nya, dan cara mengetes setiap endpoint di local.

---

## URL Structure

Server menggunakan global prefix `/api`. Semua endpoint authentication berada di:

```
http://localhost:1337/api/authentication/...
```

| Kelompok       | Base URL                                   |
| -------------- | ------------------------------------------ |
| Authentication | `http://localhost:1337/api/authentication` |
| Health check   | `http://localhost:1337/api/health`         |
| Swagger docs   | `http://localhost:1337/docs`               |

---

## Daftar Isi

1. [Prerequisites](#prerequisites)
2. [Setup Environment](#setup-environment)
3. [Menjalankan di Local](#menjalankan-di-local)
4. [Swagger UI](#swagger-ui)
5. [Metode Autentikasi](#metode-autentikasi)
   - [Username & Password](#1-username--password)
   - [Register](#2-register)
   - [Phone OTP (WhatsApp/SMS)](#3-phone-otp-whatsappsms)
   - [Email Magic Link](#4-email-magic-link)
   - [Google OAuth2](#5-google-oauth2)
   - [Apple Sign In](#6-apple-sign-in)
   - [Refresh Token](#7-refresh-token)
   - [Profile](#8-profile)
6. [Rate Limiting](#rate-limiting)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool                                     | Versi Minimum | Keterangan                                 |
| ---------------------------------------- | ------------- | ------------------------------------------ |
| [Bun](https://bun.sh)                    | 1.x           | Package manager & runtime                  |
| [Node.js](https://nodejs.org)            | 20.x          | Diperlukan oleh NestJS CLI                 |
| [Docker](https://www.docker.com)         | 24.x          | Untuk PostgreSQL & Redis                   |
| [Redis](https://redis.io)                | 7.x           | Penyimpanan OTP, magic link, refresh token |
| [PostgreSQL](https://www.postgresql.org) | 16.x          | Database utama                             |

> Jika tidak ingin menginstall PostgreSQL dan Redis secara manual, gunakan `docker-compose up postgres redis -d` untuk menjalankannya via Docker.

---

## Setup Environment

### 1. Salin file `.env`

```bash
cp .env.example .env
```

### 2. Isi variabel yang wajib diisi

Buka `.env` dan lengkapi bagian-bagian berikut:

#### Wajib (app tidak akan berjalan tanpa ini)

```env
# Database — sesuaikan jika berbeda dari default
DATABASE_HOST=localhost
DATABASE_NAME=nestjs_starter_kit
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_PORT=5432

# JWT — gunakan string random yang kuat
JWT_SECRET=isi-dengan-secret-yang-kuat-minimal-32-karakter

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### Untuk Phone OTP via WhatsApp (Fonnte)

Daftar di [fonnte.com](https://fonnte.com), lalu ambil API token dari dashboard:

```env
FONNTE_TOKEN=token-dari-dashboard-fonnte
OTP_CHANNEL=whatsapp   # atau: sms
```

> Fonnte memiliki free tier. WhatsApp OTP menggunakan nomor yang sudah terdaftar di akun Fonnte.

#### Untuk Email Magic Link

Gunakan [Mailtrap](https://mailtrap.io) untuk testing lokal (free tier tersedia):

```env
MAIL_FROM=noreply@captura.ai
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=username-dari-mailtrap
MAIL_PASSWORD=password-dari-mailtrap

# URL yang akan dikirim ke email — arahkan ke frontend
MAGIC_LINK_BASE_URL=http://localhost:3000/auth/magic-link/verify
```

#### Untuk Google OAuth2 (opsional)

Buat credentials di [Google Cloud Console](https://console.cloud.google.com):

1. Buka **APIs & Services → Credentials → Create OAuth 2.0 Client ID**
2. Application type: **Web application**
3. Authorized redirect URIs: `http://localhost:1337/api/authentication/google/callback`

```env
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_CALLBACK_URL=http://localhost:1337/api/authentication/google/callback
```

> Jika `GOOGLE_CLIENT_ID` tidak diisi, strategy tidak akan didaftarkan dan app tetap berjalan normal.

#### Untuk Apple Sign In (opsional)

Membutuhkan Apple Developer Account. Ikuti panduan [Sign in with Apple setup](https://developer.apple.com/sign-in-with-apple/get-started/):

```env
APPLE_CLIENT_ID=com.captura.app
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_KEY_ID=XXXXXXXXXX
# Isi konten file .p8 dengan newline diganti \n
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIGT...\n-----END PRIVATE KEY-----
APPLE_CALLBACK_URL=http://localhost:1337/api/authentication/apple/callback
```

> Apple Sign In hanya bisa ditest di production domain. Untuk testing lokal, gunakan metode lain.

---

## Menjalankan di Local

### Opsi A — Manual (PostgreSQL & Redis sudah terinstall)

```bash
# 1. Install dependencies
bun install

# 2. Jalankan migrasi database
npx typeorm migration:run -d src/database/postgres/postgres-data-source.ts

# 3. Jalankan server
bun run start:dev
```

### Opsi B — Docker Compose (semua service via Docker)

```bash
# Jalankan PostgreSQL dan Redis saja, app di host
docker compose up postgres redis -d

# Kemudian jalankan app
bun run start:dev
```

```bash
# Atau jalankan semuanya di Docker
docker compose up --build
```

Server berjalan di: **http://localhost:1337**

---

## Swagger UI

Setelah server berjalan, buka browser dan akses:

```
http://localhost:1337/docs
```

Semua endpoint autentikasi tersedia di sana. Untuk endpoint yang butuh JWT:

1. Klik tombol **Authorize** di pojok kanan atas
2. Masukkan: `Bearer <access_token>`

---

## Metode Autentikasi

### 1. Username & Password

Flow klasik — login menggunakan username dan password yang sudah didaftarkan.

**Endpoint:** `POST /api/authentication/login`

```bash
curl -X POST http://localhost:1337/api/authentication/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "password": "rahasia123"
  }'
```

**Response:**

```json
{
  "statusCode": 200,
  "message": "User logged in successfully",
  "result": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

---

### 2. Register

Mendaftarkan user baru dengan email, password, dan username.

**Endpoint:** `POST /api/authentication/register`

```bash
curl -X POST http://localhost:1337/api/authentication/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "username": "johndoe",
    "password": "rahasia123"
  }'
```

**Response:**

```json
{
  "statusCode": 201,
  "message": "User registered successfully",
  "result": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

---

### 3. Phone OTP (WhatsApp/SMS)

Login atau register menggunakan nomor HP. OTP dikirim via WhatsApp (default) atau SMS melalui Fonnte.

> **Setup yang diperlukan:** `FONNTE_TOKEN` harus diisi di `.env`. Pastikan nomor WA sudah terdaftar di akun Fonnte.

#### Step 1 — Minta OTP

**Endpoint:** `POST /api/authentication/phone/init`

```bash
curl -X POST http://localhost:1337/api/authentication/phone/init \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "081234567890",
    "countryCode": "+62"
  }'
```

**Response:**

```json
{
  "statusCode": 200,
  "message": "OTP sent successfully. Please check your WhatsApp/SMS.",
  "result": null
}
```

> `countryCode` bersifat opsional, default `+62` (Indonesia). Nomor akan dinormalisasi otomatis: `081234567890` → `628123456789`.

#### Step 2 — Verifikasi OTP

**Endpoint:** `POST /api/authentication/phone/verify`

```bash
curl -X POST http://localhost:1337/api/authentication/phone/verify \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "081234567890",
    "otp": "123456"
  }'
```

**Response:**

```json
{
  "statusCode": 200,
  "message": "Phone number verified successfully",
  "result": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

**Catatan penting:**

- OTP berlaku selama **5 menit**
- Maksimum **5 percobaan kirim** per nomor per periode
- OTP hanya bisa digunakan **1 kali** (langsung dihapus setelah verifikasi berhasil)
- Jika nomor belum terdaftar, user baru akan dibuat otomatis

---

### 4. Email Magic Link

Login tanpa password — link dikirim ke email dan langsung memberikan akses saat diklik.

> **Setup yang diperlukan:** Isi variabel `MAIL_*` di `.env`. Gunakan Mailtrap untuk testing.

#### Step 1 — Minta Magic Link

**Endpoint:** `POST /api/authentication/magic-link/init`

```bash
curl -X POST http://localhost:1337/api/authentication/magic-link/init \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com"
  }'
```

**Response:**

```json
{
  "statusCode": 200,
  "message": "Magic link sent. Please check your email.",
  "result": null
}
```

#### Step 2 — Verifikasi Token dari Email

Setelah email masuk, ambil query param `token` dari URL di email, lalu:

**Endpoint:** `GET /api/authentication/magic-link/verify?token=<token>`

```bash
curl "http://localhost:1337/api/authentication/magic-link/verify?token=abc123def456..."
```

**Response:**

```json
{
  "statusCode": 200,
  "message": "Magic link verified successfully",
  "result": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

**Catatan penting:**

- Magic link berlaku selama **15 menit**
- Token hanya bisa digunakan **1 kali**
- Jika email belum terdaftar, user baru dibuat otomatis

---

### 5. Google OAuth2

Login menggunakan akun Google.

> **Setup yang diperlukan:** `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` harus diisi di `.env`.

#### Flow via Browser

1. Buka browser, navigasi ke:
   ```
   http://localhost:1337/api/authentication/google
   ```
2. Akan diredirect ke halaman consent Google
3. Setelah login, Google akan redirect ke callback URL
4. Response berisi `accessToken` dan `refreshToken`

> Google OAuth tidak bisa ditest via `curl` langsung karena membutuhkan browser untuk flow consent. Gunakan browser atau Postman dengan fitur OAuth2.

---

### 6. Apple Sign In

Login menggunakan Apple ID.

> **Setup yang diperlukan:** Membutuhkan Apple Developer Account dan semua variabel `APPLE_*` diisi. Testing hanya bisa dilakukan di domain yang sudah terdaftar di Apple Developer.

#### Flow via Browser

1. Buka browser, navigasi ke:
   ```
   http://localhost:1337/api/authentication/apple
   ```
2. Akan diredirect ke halaman Sign in with Apple
3. Apple akan POST ke callback URL setelah login berhasil

> Berbeda dengan Google (GET callback), Apple menggunakan **POST callback**. Pastikan frontend bisa menangani redirect ini.

---

### 7. Refresh Token

Mendapatkan `accessToken` baru menggunakan `refreshToken` yang masih valid.

**Endpoint:** `POST /api/authentication/refresh`

```bash
curl -X POST http://localhost:1337/api/authentication/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGci..."
  }'
```

**Response:**

```json
{
  "statusCode": 200,
  "message": "Access token refreshed successfully",
  "result": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

**Catatan:**

- `refreshToken` berlaku selama **7 hari**
- Setiap refresh menghasilkan pasangan token baru
- `refreshToken` lama langsung tidak berlaku setelah digunakan (rotation)

---

### 8. Profile

Mendapatkan data user yang sedang login. Membutuhkan `accessToken`.

**Endpoint:** `GET /api/authentication/profile`

```bash
curl http://localhost:1337/api/authentication/profile \
  -H "Authorization: Bearer eyJhbGci..."
```

**Response:**

```json
{
  "statusCode": 200,
  "message": "Authenticated user profile has been retrieved successfully",
  "result": {
    "id": "uuid",
    "email": "john@example.com",
    "username": "johndoe",
    "name": "John Doe",
    "avatar": null,
    "phoneNumber": null,
    "providers": ["google"],
    "isEmailVerified": true,
    "isPhoneVerified": false
  }
}
```

---

## Rate Limiting

Beberapa endpoint memiliki batas request untuk mencegah penyalahgunaan:

| Endpoint                                   | Limit       | Window                |
| ------------------------------------------ | ----------- | --------------------- |
| `POST /api/authentication/phone/init`      | 3 request   | per 60 detik          |
| `POST /api/authentication/phone/verify`    | 10 request  | per 60 detik          |
| `POST /api/authentication/magic-link/init` | 3 request   | per 60 detik          |
| Semua endpoint lain                        | 100 request | per 60 detik (global) |

Jika melebihi limit, server akan merespons dengan `429 Too Many Requests`.

---

## Troubleshooting

### App gagal start — "Configuration key does not exist"

Pastikan semua variabel wajib di `.env` sudah diisi. Cek bagian [Setup Environment](#setup-environment).

### OTP tidak diterima di WhatsApp

1. Pastikan `FONNTE_TOKEN` valid dan akun Fonnte aktif
2. Pastikan nomor HP tujuan sudah terdaftar sebagai device di dashboard Fonnte
3. Cek apakah `OTP_CHANNEL=whatsapp` di `.env`
4. Nomor harus dalam format internasional tanpa `+`: `628123456789`

### Email magic link tidak masuk

1. Pastikan kredensial `MAIL_*` sudah benar
2. Untuk testing lokal, gunakan [Mailtrap](https://mailtrap.io) — email akan tertangkap di inbox sandbox
3. Cek folder spam jika menggunakan SMTP production

### Google/Apple OAuth tidak bekerja

1. Pastikan variabel `GOOGLE_CLIENT_ID` / `APPLE_CLIENT_ID` terisi di `.env`
2. Cek apakah callback URL di Google Console / Apple Developer sudah sama persis dengan yang ada di `.env`:
   - Google: `http://localhost:1337/api/authentication/google/callback`
   - Apple: `http://localhost:1337/api/authentication/apple/callback`
3. Restart server setelah mengubah variabel OAuth

### Error "Invalid or expired OTP"

OTP sudah kadaluarsa (> 5 menit) atau sudah pernah digunakan. Minta OTP baru via `POST /api/authentication/phone/init`.

### Error "Invalid or expired magic link token"

Token sudah kadaluarsa (> 15 menit) atau sudah pernah digunakan. Minta magic link baru via `POST /api/authentication/magic-link/init`.

### Redis connection refused

Pastikan Redis berjalan:

```bash
# Cek status
redis-cli ping   # harus balas: PONG

# Atau jalankan via Docker
docker compose up redis -d
```

### Database migration belum dijalankan

Jika ada error kolom tidak ditemukan (`column "phone_number" does not exist`), jalankan migrasi:

```bash
npx typeorm migration:run -d src/database/postgres/postgres-data-source.ts
```
