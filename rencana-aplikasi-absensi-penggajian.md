# Rencana Pengembangan Aplikasi Absensi & Penggajian Berbasis Web

Dokumen ini merinci spesifikasi teknis, arsitektur sistem, desain antarmuka pengguna (UI/UX), dan tahapan pengembangan untuk aplikasi absensi dan rekapitulasi gaji anggota berbasis web yang dioptimalkan untuk perangkat *smartphone* (Mobile-First) serta siap di-deploy ke **Vercel**.

---

## 1. Ringkasan & Tujuan Proyek

Aplikasi ini dirancang untuk mempermudah operasional satu admin/pengelola dalam mencatat kehadiran harian anggota secara kolektif (batch selection) serta menghitung estimasi maupun finalisasi gaji berdasarkan jumlah hari kerja secara otomatis, fleksibel, dan akurat.

### Kebutuhan Fungsional Utama
1. **Autentikasi Admin (Single User):** Sistem login aman khusus bagi pengelola utama untuk menjaga kerahasiaan data anggota dan penggajian.
2. **Manajemen Data Master Anggota:** Pengelolaan profil anggota (CRUD: Tambah, Lihat, Ubah, Nonaktifkan/Hapus) termasuk pengaturan **nominal upah harian default** per anggota.
3. **Pencatatan Absensi Harian (Multi-Select):** Antarmuka cepat berbasis *checklist* untuk memilih anggota yang hadir pada tanggal tertentu dalam satu kali simpan.
4. **Rekapitulasi & Kalkulasi Gaji Fleksibel:** Perhitungan otomatis berbasis rumus:
   $$	ext{Total Gaji} = 	ext{Total Hari Kerja} 	imes 	ext{Nominal Upah Harian}$$
   Dilengkapi dengan fitur **editable rate** (nominal upah harian dapat diubah langsung saat proses rekapitulasi untuk penyesuaian lembur, bonus, atau potongan tanpa merusak data master).

---

## 2. Arsitektur & Stack Teknologi

Pemilihan teknologi difokuskan pada performa tinggi di perangkat seluler, kemudahan pemeliharaan, dan kompatibilitas penuh dengan ekosistem **Vercel**.

| Komponen | Teknologi yang Direkomendasikan | Alasan Pemilihan |
| :--- | :--- | :--- |
| **Framework Utama** | **Next.js 15 (App Router)** + TypeScript | Mendukung *Server Actions* untuk mutasi data cepat, *SSR/RSC* untuk loading ringan di jaringan seluler, dan integrasi native dengan Vercel. |
| **Styling & UI** | **Tailwind CSS** + **Shadcn/UI** (Lucide Icons) | Memudahkan penerapan palet warna kustom (Orange-Putih), komponen aksesibel, dan *bundle size* yang sangat ringkas. |
| **Database** | **PostgreSQL** (via **Supabase** atau **Neon**) | Database relasional yang andal untuk integritas data absensi dan transaksi gaji, memiliki *free-tier* yang ramah untuk deployment Vercel. |
| **ORM** | **Prisma** atau **Drizzle ORM** | *Type-safe database queries*, migrasi skema yang rapi, dan performa eksekusi kueri yang cepat di *serverless environment*. |
| **Autentikasi** | **Auth.js (NextAuth v5)** (Credentials Provider) | Cukup dengan satu akun admin yang terenkripsi (hashed password) menggunakan sesi berbasis JWT/Cookie yang aman. |
| **State & Form** | **React Hook Form** + **Zod** | Validasi input nominal mata uang dan tanggal secara ketat di sisi klien maupun server. |
| **Deployment** | **Vercel** | *Zero-configuration deployment*, CI/CD otomatis dari Git, serta distribusi CDN global. |

---

## 3. Desain Database (Skema Relasional)

Struktur tabel dirancang ringkas namun menjaga histori data agar perubahan master di masa depan tidak merusak catatan gaji periode sebelumnya.

### A. Tabel `users` (Admin)
Menyimpan kredensial pengelola tunggal.
* `id`: UUID (Primary Key)
* `username`: String (Unique)
* `password_hash`: String
* `created_at`: Timestamp

### B. Tabel `members` (Master Anggota)
Menyimpan daftar anggota beserta tarif upah harian bawaan.
* `id`: UUID (Primary Key)
* `full_name`: String (Nama lengkap anggota)
* `role_or_division`: String (Opsional — misal: Tukang, Staf, Kurir, dll.)
* `phone_number`: String (Opsional — untuk keperluan kirim slip via WhatsApp)
* `daily_wage`: Integer / Decimal (Nominal gaji per hari dalam Rupiah)
* `is_active`: Boolean (Default: `true` — agar anggota yang keluar tidak muncul di form absen baru namun histori gajinya tetap aman)
* `created_at`: Timestamp
* `updated_at`: Timestamp

### C. Tabel `attendances` (Log Kehadiran)
Mencatat kehadiran harian per anggota.
* `id`: UUID (Primary Key)
* `member_id`: UUID (Foreign Key -> `members.id`)
* `attendance_date`: Date (Format: `YYYY-MM-DD`)
* `status`: Enum (`PRESENT`, `HALF_DAY` - opsional untuk pengembangan)
* `notes`: String (Opsional)
* `created_at`: Timestamp
* **Constraint:** `UNIQUE(member_id, attendance_date)` untuk mencegah duplikasi absensi anggota di tanggal yang sama.

### D. Tabel `payroll_records` (Arsip Rekap Gaji - Opsional/Recommended)
Menyimpan hasil finalisasi rekap gaji periode tertentu jika admin ingin mengunci laporan bulanan/mingguan.
* `id`: UUID (Primary Key)
* `member_id`: UUID (Foreign Key -> `members.id`)
* `period_start`: Date
* `period_end`: Date
* `total_days`: Integer
* `applied_daily_wage`: Integer (Menyimpan nominal aktual yang digunakan setelah diedit pada saat rekap)
* `total_payout`: Integer (`total_days * applied_daily_wage`)
* `is_paid`: Boolean (Status sudah dibayarkan atau belum)
* `created_at`: Timestamp

---

## 4. Desain UI/UX (Mobile-First & Tema Modern Minimalist)

Karena fokus utama pengguna adalah **smartphone**, desain mengikuti prinsip ergonomis penggunaan satu tangan (*thumb-friendly zone*), kontras tinggi untuk penggunaan di luar ruangan, dan bebas dari elemen visual yang berlebihan.

### A. Palet Warna (Orange-Putih Modern Minimalist)
* **Primary Brand (Energetic Orange):** `#F97316` (Tailwind `orange-500`) — Digunakan untuk tombol aksi utama (Simpan Absen, Tambah Anggota), indikator aktif, dan aksen penting.
* **Primary Hover / Active:** `#EA580C` (Tailwind `orange-600`) — Memberikan umpan balik visual yang jelas saat disentuh.
* **Soft Tint / Surface Accent:** `#FFF7ED` (Tailwind `orange-50`) — Digunakan sebagai latar belakang kartu anggota yang sedang dipilih/dicentang atau badge status.
* **Background Utama:** `#FFFFFF` (Pure White) & `#F8FAFC` (Slate-50 untuk pemisah area halaman).
* **Teks Utama:** `#0F172A` (Slate-900) untuk keterbacaan maksimal.
* **Teks Sekunder:** `#64748B` (Slate-500) untuk informasi pendukung (misal: rincian nominal/hari).
* **Border & Divider:** `#E2E8F0` (Slate-200) tipis (1px) untuk menjaga kesan bersih dan modern.

### B. Struktur Navigasi Mobile
* **Top Header (Sticky):** Menampilkan judul halaman aktif, pemilih tanggal cepat (pada halaman Absensi), atau tombol aksi tambah (`+`) pada halaman Master.
* **Bottom Navigation Bar (Fixed):** 3 menu utama di bagian bawah layar agar mudah dijangkau ibu jari:
  1. **Absensi** (Ikon Kalender/Check-Square) — Halaman default setelah login.
  2. **Rekap Gaji** (Ikon Dompet/Kalkulator) — Halaman perhitungan dan ekspor gaji.
  3. **Master Anggota** (Ikon Pengguna/Users) — Halaman kelola data anggota dan nominal harian.

### C. Alur Layar Utama (Wireframe Concept)

#### 1. Layar Input Absensi Harian
* **Pemilih Tanggal:** Bar horizontal di bagian atas menampilkan tanggal hari ini dengan tombol `<` (kemarin) dan `>` (besok) serta opsi buka kalender.
* **Search & Quick Action:** Kolom pencarian cepat nama anggota + tombol *"Pilih Semua / Batal Semua"*.
* **Daftar Kartu Anggota (Touch-Friendly Cards):**
  * Tinggi kartu minimal `64px` agar mudah diketuk.
  * Menampilkan Nama Anggota, Keterangan singkat, dan Checkbox besar di sisi kanan.
  * Saat dipilih, border kartu berubah menjadi `#F97316` dan latar belakang menjadi `#FFF7ED`.
* **Floating Action Bar (Di atas Bottom Nav):** Menampilkan ringkasan *"Terpilih: X Anggota"* beserta tombol oranye solid **"Simpan Absensi"**.

#### 2. Layar Rekapitulasi Gaji
* **Filter Periode:** Preset cepat (*Minggu Ini*, *Bulan Ini*, *Bulan Lalu*) serta *Custom Date Range* (Tanggal Mulai – Tanggal Akhir).
* **Kartu Ringkasan Total:** Kotak aksen oranye lembut di bagian atas menampilkan total keseluruhan pengeluaran gaji pada periode terpilih.
* **Daftar Rincian Gaji per Anggota:**
  * Nama Anggota & Badge jumlah hari hadir (misal: `22 Hari`).
  * **Input Nominal Editable:** Kolom input angka berformat Rupiah (`Rp 150.000`) yang terisi otomatis dari data master, namun dapat langsung diketik ulang oleh user. Jika nominal diubah dari nilai master, muncul indikator kecil *"Diubah dari master"*.
  * **Subtotal Real-time:** Otomatis memperbarui hasil perkalian `Hari × Nominal` seketika saat angka diketik.
  * **Aksi Ekspor/Bagikan:** Tombol salin ringkasan teks (siap tempel ke WhatsApp) atau unduh laporan PDF/CSV.

#### 3. Layar Master Anggota
* **Daftar Anggota:** Menampilkan nama, status aktif/nonaktif, dan tarif harian saat ini.
* **Bottom Sheet / Drawer Form:** Saat menambah atau mengedit anggota, formulir muncul dari bawah layar (*slide-up drawer*) yang nyaman diisi menggunakan keyboard smartphone.

---

## 5. Rincian Alur Kerja Sistem (User Flow)

1. **Login:** Admin membuka URL aplikasi di browser HP -> memasukkan username & password -> masuk ke halaman Absensi Hari Ini.
2. **Setup Awal (Jika Data Kosong):** Admin membuka tab **Master** -> menambahkan daftar nama anggota beserta nominal gaji hariannya masing-masing.
3. **Operasional Harian:**
   * Admin membuka tab **Absensi** (otomatis terpilih tanggal hari ini).
   * Jika pada tanggal tersebut sudah pernah diabsen, sistem otomatis mencentang anggota yang sebelumnya disimpan (mode edit absensi).
   * Admin mengetuk nama-nama anggota yang hadir hari ini -> menekan **Simpan Absensi**.
4. **Proses Penggajian (Mingguan/Bulanan):**
   * Admin membuka tab **Rekap Gaji** -> memilih rentang tanggal penggajian.
   * Sistem menghitung jumlah kehadiran setiap anggota pada rentang tanggal tersebut dan mengalikannya dengan `daily_wage` dari Master.
   * Jika ada anggota yang mendapat penyesuaian tarif (misal: tarif harian dinaikkan khusus periode ini), admin langsung mengubah angka pada kolom **Nominal/Hari** anggota tersebut.
   * Total gaji terhitung ulang secara instan -> Admin dapat menyalin rincian untuk dikirim ke anggota atau menyimpan arsip pembayaran.

---

## 6. Tahapan Pengembangan (Roadmap)

### Fase 1: Inisialisasi & Infrastruktur (Hari 1–2)
* Setup proyek Next.js (TypeScript, Tailwind CSS, ESLint).
* Konfigurasi database PostgreSQL (Supabase/Neon) dan skema Prisma/Drizzle.
* Setup Auth.js untuk autentikasi single-user admin dan pembuatan akun admin awal (*seeding*).
* Konfigurasi tema warna Orange-Putih di `tailwind.config.ts` dan instalasi komponen dasar Shadcn/UI.

### Fase 2: Modul Master Anggota (Hari 3–4)
* Pembuatan API / Server Actions untuk CRUD data anggota.
* Pembuatan antarmuka daftar anggota, fitur pencarian, dan *Bottom Drawer* tambah/edit anggota.
* Pemformatan mata uang Rupiah (`Intl.NumberFormat('id-ID')`) pada input form.

### Fase 3: Modul Absensi Harian (Hari 5–6)
* Pembuatan UI pemilih tanggal dan daftar kartu anggota interaktif.
* Implementasi logika *upsert* (simpan baru atau perbarui absensi pada tanggal terpilih) dengan transaksi database agar konsisten.
* Penambahan notifikasi *toast* yang jelas saat data berhasil disimpan.

### Fase 4: Modul Rekapitulasi Gaji & Editable Nominal (Hari 7–8)
* Pembuatan kueri agregasi jumlah hari hadir berdasarkan rentang tanggal.
* Pembuatan UI kartu rekap gaji dengan input nominal harian yang *editable* dan kalkulasi *real-time* di sisi klien.
* Penambahan fitur ekspor ringkasan ke format teks WhatsApp dan cetak/PDF.

### Fase 5: Pengujian Mobile & Deployment Vercel (Hari 9–10)
* Pengujian responsivitas di berbagai ukuran layar smartphone (360px hingga 430px) dan optimasi performa (Lighthouse Mobile Score).
* Konfigurasi *Environment Variables* (`DATABASE_URL`, `AUTH_SECRET`, dll.) di dashboard Vercel.
* Deployment ke production Vercel dan pengujian end-to-end.

---

## 7. Struktur Direktori Proyek (Next.js App Router)

```text
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx          # Halaman login admin
│   ├── (dashboard)/
│   │   ├── layout.tsx            # Layout utama dengan Top Header & Bottom Nav
│   │   ├── page.tsx              # Halaman utama: Input Absensi Harian
│   │   ├── payroll/
│   │   │   └── page.tsx          # Halaman Rekapitulasi & Kalkulasi Gaji
│   │   └── members/
│   │       └── page.tsx          # Halaman Kelola Master Anggota
│   └── api/
│       └── auth/[...nextauth]/   # Endpoint autentikasi
├── components/
│   ├── ui/                       # Komponen dasar (Button, Input, Drawer, Toast)
│   ├── attendance/               # Komponen kartu absensi & date switcher
│   ├── payroll/                  # Komponen kalkulator gaji editable & filter periode
│   └── members/                  # Komponen form & list master anggota
├── lib/
│   ├── db.ts                     # Koneksi Prisma/Drizzle
│   ├── auth.ts                   # Konfigurasi Auth.js
│   └── utils.ts                  # Helper format Rupiah & manipulasi tanggal
└── actions/
    ├── member-actions.ts         # Server Actions CRUD Master
    ├── attendance-actions.ts     # Server Actions simpan/ambil absensi
    └── payroll-actions.ts        # Server Actions agregasi rekap gaji
```

---

## 8. Pertimbangan Teknis Penting

* **Penanganan Zona Waktu (Timezone):** Karena operasional absensi sangat bergantung pada tanggal lokal (WIB/WITA/WIT), penyimpanan tanggal absensi sebaiknya menggunakan tipe data `DATE` murni (`YYYY-MM-DD`) atau dinormalisasi ke zona waktu lokal Indonesia (`Asia/Jakarta`) agar absensi malam hari tidak bergeser ke tanggal berikutnya akibat perbedaan UTC server Vercel.
* **Optimistic UI:** Pada saat mencentang absensi dan menekan tombol simpan di jaringan seluler yang mungkin kurang stabil, gunakan status *loading* yang jelas dan cegah *double-submit* pada tombol aksi.
* **PWA (Progressive Web App) Ready:** Menambahkan file `manifest.json` dan ikon aplikasi memungkinkan pengguna menyematkan aplikasi web ini ke *Home Screen* smartphone sehingga terasa dan berjalan layaknya aplikasi native tanpa bilah URL browser.
