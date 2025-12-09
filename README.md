# 🎣 Fish It Store - Roblox Joki & Top Up Platform

**Fish It Store** adalah platform layanan Joki dan Top Up game Roblox modern yang dibangun dengan performa tinggi menggunakan **ElysiaJS** dan **Bun**. Aplikasi ini menampilkan antarmuka pengguna yang menarik dengan gaya **Glassmorphism**, animasi mulus, dan pengalaman pengguna yang responsif.

## 🚀 Fitur Utama

### 🌟 User Interface (Frontend)

- **Desain Modern**: Glassmorphism UI, animasi float, dan gradien yang menarik.
- **Layanan Lengkap**: Menampilkan layanan Top Up Gems, Joki Level, dan Item Rare.
- **Order Tracking**: Fitur pelacakan status pesanan secara real-time menggunakan Username Roblox.
- **Formulir Pesanan Dinamis**: Kalkulasi harga otomatis dan validasi input.
- **Testimonial & FAQ**: Bagian informasi untuk meningkatkan kepercayaan pelanggan.
- **HTMX Integration**: Interaksi server yang mulus tanpa reload halaman penuh.

### 🛡️ Admin Panel (Backend)

- **Dashboard Analitik**: Ringkasan pendapatan, total order, dan order aktif.
- **Manajemen Pesanan**: Lihat, proses, dan update status pesanan.
- **Keamanan**: Login admin terproteksi dan perlindungan CSRF.
- **Database SQLite**: Penyimpanan data yang ringan dan cepat.

## 🛠️ Tech Stack

- **Runtime**: [Bun](https://bun.sh) (Super cepat JavaScript runtime)
- **Framework**: [ElysiaJS](https://elysiajs.com) (Framework web ergonomis untuk Bun)
- **Database**: SQLite (Built-in via `bun:sqlite`)
- **Frontend**:
  - HTML & CSS (Vanilla + TailwindCSS via CDN)
  - [HTMX](https://htmx.org) (Untuk interaksi dinamis)
  - [Hyperscript](https://hyperscript.org) (Scripting ringan untuk frontend)
- **Styling**: TailwindCSS, Google Fonts (Outfit).

## 📦 Struktur Folder

```
.
├── app/
│   ├── src/
│   │   └── index.ts      # Kode utama aplikasi (Server, Routes, UI Components)
│   ├── public/           # Aset statis
│   ├── fish_it.sqlite    # Database (Dibuat otomatis saat dijalankan)
│   └── package.json      # Dependensi proyek
└── package.json          # Root configuration
```

## 🏃‍♂️ Cara Menjalankan

Pastikan Anda sudah menginstal **Bun** di komputer Anda. Jika belum, instal di [bun.sh](https://bun.sh).

1.  **Clone repository ini** (atau masuk ke folder proyek):

    ```bash
    cd fish-it-store-elysia
    ```

2.  **Masuk ke direktori aplikasi**:

    ```bash
    cd app
    ```

3.  **Install dependencies**:

    ```bash
    bun install
    ```

4.  **Jalankan server development**:

    ```bash
    bun run dev
    ```

5.  **Buka aplikasi**:
    Buka browser dan kunjungi `http://localhost:3000`.

## 🔐 Akun Admin Default

Untuk mengakses Admin Panel, kunjungi `/login`.

- **Password**: `admin123`
  _(Catatan: Segera ganti password di kode produksi `src/index.ts`)_

## 📝 Catatan Pengembangan

- Database `fish_it.sqlite` akan dibuat secara otomatis saat pertama kali aplikasi dijalankan.
- Data produk awal (seeding) otomatis ditambahkan jika tabel kosong.

---

Dikembangkan dengan ❤️ menggunakan **ElysiaJS**.