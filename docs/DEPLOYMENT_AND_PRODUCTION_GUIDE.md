# Badminton Champion League - Deployment & Production Guide

Dokumen ini berisi panduan komprehensif untuk melakukan deployment aplikasi **Badminton Champion League (BCL)** ke server produksi, dengan fokus khusus pada control panel **CyberPanel (OpenLiteSpeed)** menggunakan subdomain **`bcl.pemain12.com`**, serta panduan alternatif untuk web server Nginx.

---

## 1. Production Architecture Overview

```
                      [ Internet / HTTPS ]
                                │
                                ▼
                    ┌───────────────────────┐
                    │  CyberPanel / OLS     │
                    │  (bcl.pemain12.com)   │
                    └───────────┬───────────┘
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
        [ Static Frontend ]             [ Laravel API ]
        React Vite SPA                  PHP 8.3 (LSPHP)
        /public_html                    /backend/public
                │                               │
                └───────────────┬───────────────┘
                                │
                                ▼
                       [ MySQL 8.0 Database ]
                       [ Redis 7.x Queue/Cache ]
```

---

## 2. Panduan Instalasi di CyberPanel (Subdomain: `bcl.pemain12.com`)

### 2.1 Persiapan Sistem & Prasyarat CyberPanel
Pastikan server CyberPanel Anda telah terpasang paket berikut:
1. **PHP 8.3 (LSPHP83):**
   ```bash
   # Install ekstensi PHP 8.3 yang diperlukan melalui terminal SSH:
   apt-get install -y lsphp83 lsphp83-common lsphp83-mysql lsphp83-opcache \
   lsphp83-curl lsphp83-mbstring lsphp83-gd lsphp83-zip lsphp83-bcmath \
   lsphp83-intl lsphp83-redis
   ```
2. **Composer (Global):**
   ```bash
   php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
   php composer-setup.php --install-dir=/usr/local/bin --filename=composer
   rm composer-setup.php
   ```
3. **Node.js (v18+ atau v20+) & NPM:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt-get install -y nodejs
   ```
4. **Redis Server (Opsional tapi direkomendasikan untuk Queue & Cache):**
   ```bash
   apt-get install -y redis-server
   systemctl enable --now redis-server
   ```

---

### 2.2 Langkah 1: Buat Website / Child Domain di CyberPanel
1. Buka dashboard CyberPanel Anda (`https://IP_SERVER:8090`).
2. Masuk ke menu **Websites** > **Create Website**:
   - **Select Package:** Default
   - **Select Owner:** admin (atau user yang Anda inginkan)
   - **Domain Name:** `bcl.pemain12.com` *(Jika `pemain12.com` sudah ada, Anda juga dapat menggunakan menu **Websites** > **Create Child Domain** dengan memilih master domain `pemain12.com` dan subdomain `bcl`)*.
   - **Email:** `admin@pemain12.com`
   - **Select PHP:** `PHP 8.3`
   - **Additional Features:** Centang **SSL**, **open_basedir Protection**.
3. Klik **Create Website**.
4. Path root website Anda di server biasanya berada di:
   ```bash
   /home/bcl.pemain12.com/public_html
   # ATAU (jika sebagai child domain):
   /home/pemain12.com/bcl.pemain12.com
   ```
   *(Untuk panduan di bawah, kita asumsikan path root adalah `/home/bcl.pemain12.com`)*.

---

### 2.3 Langkah 2: Buat Database MySQL di CyberPanel
1. Masuk ke CyberPanel > **Databases** > **Create Database**.
2. Pilih domain: `bcl.pemain12.com`.
3. Masukkan rincian:
   - **Database Name:** `bcl_db` (nama database lengkap: `bcl_db` atau `admin_bcl_db`)
   - **Username:** `bcl_user` (username lengkap: `bcl_user` atau `admin_bcl_user`)
   - **Password:** *Buat password yang kuat dan simpan untuk file `.env`*.
4. Klik **Create Database**.

---

### 2.4 Langkah 3: Clone / Upload Source Code Aplikasi
Masuk ke terminal server Anda melalui SSH dan jalankan perintah:

```bash
# 1. Masuk ke direktori home domain
cd /home/bcl.pemain12.com

# 2. Clone repositori ke folder aplikasi
git clone https://github.com/raw-dani/badminton.git app_src

# 3. Pindahkan folder backend dan frontend ke posisi yang rapi
mv app_src/backend ./backend
mv app_src/frontend ./frontend
rm -rf app_src
```

Struktur folder akhir yang direkomendasikan di `/home/bcl.pemain12.com`:
```text
/home/bcl.pemain12.com/
├── backend/                  <-- Aplikasi Laravel 11
│   ├── app/
│   ├── bootstrap/
│   ├── database/
│   ├── storage/
│   ├── .env
│   └── ...
├── frontend/                 <-- Source code React Vite
│   ├── src/
│   ├── dist/                 <-- Output build frontend
│   └── ...
└── public_html/              <-- Live Document Root OpenLiteSpeed
    ├── index.html            <-- Entry file React SPA
    ├── assets/               <-- File CSS, JS, dan gambar frontend
    ├── api                   <-- Symlink ke /home/bcl.pemain12.com/backend/public
    ├── storage               <-- Symlink ke /home/bcl.pemain12.com/backend/storage/app/public
    └── .htaccess             <-- Routing OpenLiteSpeed
```

---

### 2.5 Langkah 4: Konfigurasi Backend Laravel
Masuk ke direktori `backend` dan atur file environment:

```bash
cd /home/bcl.pemain12.com/backend

# Copy file .env.example
cp .env.example .env

# Edit file .env menggunakan nano atau vi
nano .env
```

Sesuaikan konfigurasi kunci pada `/home/bcl.pemain12.com/backend/.env`:
```ini
APP_NAME="Badminton Champion League"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://bcl.pemain12.com

# URL Frontend untuk CORS & Sanctum
FRONTEND_URL=https://bcl.pemain12.com
SANCTUM_STATEFUL_DOMAINS=bcl.pemain12.com
SESSION_DOMAIN=.pemain12.com

LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=error

# Konfigurasi Database (sesuai yang dibuat di CyberPanel)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=nama_database_anda
DB_USERNAME=nama_user_database_anda
DB_PASSWORD=password_database_anda

# Queue & Cache Driver
BROADCAST_CONNECTION=log
FILESYSTEM_DISK=public
QUEUE_CONNECTION=database
CACHE_STORE=file
SESSION_DRIVER=database

# Jika menggunakan Redis:
# QUEUE_CONNECTION=redis
# CACHE_STORE=redis
# REDIS_HOST=127.0.0.1
# REDIS_PORT=6379
```

Lakukan instalasi dependensi backend dan migrasi database:
```bash
cd /home/bcl.pemain12.com/backend

# 1. Install dependensi via Composer
/usr/local/lsws/lsphp83/bin/php /usr/local/bin/composer install --no-dev --optimize-autoloader

# 2. Generate Application Key
/usr/local/lsws/lsphp83/bin/php artisan key:generate --force

# 3. Jalankan Migrasi Database & Seeder
/usr/local/lsws/lsphp83/bin/php artisan migrate --force
/usr/local/lsws/lsphp83/bin/php artisan db:seed --force

# 4. Buat Storage Link Laravel
/usr/local/lsws/lsphp83/bin/php artisan storage:link

# 5. Optimasi Cache Laravel
/usr/local/lsws/lsphp83/bin/php artisan config:cache
/usr/local/lsws/lsphp83/bin/php artisan route:cache
/usr/local/lsws/lsphp83/bin/php artisan view:cache
```

---

### 2.6 Langkah 5: Build dan Deploy Frontend React Vite
Masuk ke direktori `frontend`, konfigurasikan file `.env` produksi, lalu build:

```bash
cd /home/bcl.pemain12.com/frontend

# 1. Buat file .env produksi untuk frontend
cat << 'EOF' > .env
VITE_API_BASE_URL=https://bcl.pemain12.com/api/v1
EOF

# 2. Install dependensi frontend dan build
npm ci
npm run build

# 3. Bersihkan isi folder public_html lama (jika ada file index.html bawaan CyberPanel)
rm -rf /home/bcl.pemain12.com/public_html/*

# 4. Salin seluruh isi folder dist/ ke public_html
cp -r dist/* /home/bcl.pemain12.com/public_html/
```

---

### 2.7 Langkah 6: Hubungkan API & Storage Menggunakan Symlink (Untuk Single Subdomain)
> [!NOTE]
> Jika Anda menggunakan **subdomain terpisah `api.bcl.pemain12.com`** khusus untuk backend Laravel, **lewati langkah ini** (tidak perlu membuat symlink di `public_html/` frontend). Langsung ikuti panduan lengkap pada **Bagian 3**.

Jalankan perintah ini hanya jika Anda menggabungkan Frontend dan Backend di dalam 1 subdomain yang sama (`bcl.pemain12.com`):

```bash
cd /home/bcl.pemain12.com/public_html

# 1. Buat symlink untuk API Backend
ln -s /home/bcl.pemain12.com/backend/public api

# 2. Buat symlink untuk file upload (foto bersama pemain, avatar profil, dll.)
ln -s /home/bcl.pemain12.com/backend/storage/app/public storage
```

---

### 2.8 Langkah 7: Konfigurasi OpenLiteSpeed Rewrite Rules (`.htaccess`)
CyberPanel menggunakan OpenLiteSpeed yang membaca aturan rewrite dari file `.htaccess`.

Buat atau edit file `/home/bcl.pemain12.com/public_html/.htaccess`:

```bash
nano /home/bcl.pemain12.com/public_html/.htaccess
```

Isi dengan konfigurasi berikut:

```apache
# ==============================================================================
# Badminton Champion League - OpenLiteSpeed Configuration (.htaccess)
# Domain: bcl.pemain12.com
# ==============================================================================

<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    # 1. Paksa HTTPS & Non-WWW
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

    # 2. Izinkan akses langsung ke file aset fisik frontend (JS, CSS, PNG, JPG, ICO, dll.)
    RewriteCond %{REQUEST_FILENAME} -f
    RewriteRule ^ - [L]

    # 3. Routing untuk File Storage Upload (Foto Bersama & Avatar Pemain)
    RewriteRule ^storage/(.*)$ storage/$1 [L]

    # 4. Routing untuk Endpoint REST API Laravel Backend
    RewriteCond %{REQUEST_URI} ^/api
    RewriteRule ^api/(.*)$ api/index.php [L]

    # 5. Routing React SPA (React Router fallback jika bukan file fisik)
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^ index.html [L]
</IfModule>

# ==============================================================================
# Security & Caching Headers
# ==============================================================================
<IfModule mod_headers.c>
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# Blokir akses ke file sensitif
<FilesMatch "^\.">
    Order allow,deny
    Deny from all
</FilesMatch>
```

---

### 2.9 Langkah 8: Atur Hak Akses File (Permissions)
Pastikan user CyberPanel memiliki hak akses penuh ke direktori aplikasi:

```bash
# Ganti 'bcl.pemain12.com' dengan nama user website Anda di CyberPanel
USER_CYBERPANEL="bcl.pemain12.com"

chown -R $USER_CYBERPANEL:$USER_CYBERPANEL /home/bcl.pemain12.com/backend
chown -R $USER_CYBERPANEL:$USER_CYBERPANEL /home/bcl.pemain12.com/frontend
chown -R $USER_CYBERPANEL:$USER_CYBERPANEL /home/bcl.pemain12.com/public_html

# Berikan izin tulis untuk storage dan cache Laravel
chmod -R 775 /home/bcl.pemain12.com/backend/storage
chmod -R 775 /home/bcl.pemain12.com/backend/bootstrap/cache
```

---

### 2.10 Langkah 9: Pasang SSL Let's Encrypt di CyberPanel
1. Buka dashboard CyberPanel > **SSL** > **Manage SSL**.
2. Pilih website `bcl.pemain12.com`.
3. Klik **Issue SSL**.
4. Pastikan DNS Record subdomain `bcl.pemain12.com` (tipe `A`) sudah mengarah ke IP Server VPS Anda.

---

### 2.11 Langkah 10: Jalankan Queue Worker & Cron Scheduler

#### A. Cron Scheduler Laravel (Setiap Menit)
1. Buka CyberPanel > **Websites** > **List Websites**.
2. Klik tombol **Manage** pada `bcl.pemain12.com`.
3. Scroll ke bagian **Cron Jobs** > **Add Cron Job**:
   - **Minute:** `*`
   - **Hour:** `*`
   - **Day of month:** `*`
   - **Month:** `*`
   - **Day of week:** `*`
   - **Command:**
     ```bash
     /usr/local/lsws/lsphp83/bin/php /home/bcl.pemain12.com/backend/artisan schedule:run >> /dev/null 2>&1
     ```
4. Klik **Add**.

#### B. Queue Worker Daemon (Systemd Service)
Untuk memproses antrean email, notifikasi, dan kalkulasi asynchronous:
Buat file service di `/etc/systemd/system/bcl-worker.service`:

```bash
cat << 'EOF' > /etc/systemd/system/bcl-worker.service
[Unit]
Description=Badminton Champion League Queue Worker
After=network.target mysql.service

[Service]
User=root
Group=root
Restart=always
ExecStart=/usr/local/lsws/lsphp83/bin/php /home/bcl.pemain12.com/backend/artisan queue:work --sleep=3 --tries=3 --max-time=3600

[Install]
WantedBy=multi-user.target
EOF

# Reload dan aktifkan service:
systemctl daemon-reload
systemctl enable --now bcl-worker.service
```

Cek status worker:
```bash
systemctl status bcl-worker.service
```

---

### 2.12 Restart OpenLiteSpeed
Setelah konfigurasi selesai, restart OpenLiteSpeed agar semua aturan rewrite aktif:
```bash
systemctl restart lsws
```

---

## 3. Panduan Setup Dual Subdomain: `api.bcl.pemain12.com` (Backend) & `bcl.pemain12.com` (Frontend)

Opsi ini adalah arsitektur paling bersih, aman, dan standar industri di mana **Backend Laravel** dan **Frontend React** berada pada virtual host terpisah di CyberPanel.

### 3.1 Struktur Direktori Dua Subdomain di CyberPanel

```text
/home/
├── api.bcl.pemain12.com/           <-- WEBSITE 1: BACKEND LARAVEL
│   ├── backend/                    <-- Source code Laravel lengkap
│   │   ├── app/
│   │   ├── bootstrap/
│   │   ├── storage/
│   │   ├── public/                 <-- index.php & public storage link
│   │   └── .env
│   └── public_html                 <-- Symlink langsung ke /backend/public
│
└── bcl.pemain12.com/               <-- WEBSITE 2: FRONTEND REACT SPA
    └── public_html/                <-- Isi hasil build frontend (dist/*)
        ├── index.html
        ├── assets/
        └── .htaccess               <-- Cukup aturan rewrite React Router
```

---

### 3.2 Langkah Setup Website 1: `api.bcl.pemain12.com` (Laravel Backend)

1. **Buat Website di CyberPanel:**
   - Masuk ke CyberPanel > **Websites** > **Create Website** (atau **Create Child Domain**).
   - Domain: `api.bcl.pemain12.com`
   - PHP: `8.3`
   - Centang **SSL**.

2. **Upload / Clone Backend:**
   ```bash
   cd /home/api.bcl.pemain12.com
   git clone https://github.com/raw-dani/badminton.git temp_src
   mv temp_src/backend ./backend
   rm -rf temp_src
   ```

3. **Arahkan `public_html` ke `backend/public`:**
   Di CyberPanel / OpenLiteSpeed, agar web server langsung membaca folder `public` milik Laravel:
   ```bash
   cd /home/api.bcl.pemain12.com
   # Hapus folder public_html default
   rm -rf public_html
   # Buat symlink public_html ke folder public Laravel
   ln -s /home/api.bcl.pemain12.com/backend/public public_html
   ```

4. **Konfigurasi Environment Backend (`/home/api.bcl.pemain12.com/backend/.env`):**
   ```ini
   APP_NAME="Badminton Champion League"
   APP_ENV=production
   APP_KEY=base64:...
   APP_DEBUG=false
   APP_URL=https://api.bcl.pemain12.com

   # URL Frontend & Konfigurasi Cross-Domain Cookies Sanctum
   FRONTEND_URL=https://bcl.pemain12.com
   SANCTUM_STATEFUL_DOMAINS=bcl.pemain12.com
   SESSION_DOMAIN=.pemain12.com

   # Database
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=nama_db_anda
   DB_USERNAME=nama_user_db_anda
   DB_PASSWORD=password_db_anda

   # File upload disk
   FILESYSTEM_DISK=public
   ```

5. **Install Dependensi & Symlink Storage di Backend:**
   ```bash
   cd /home/api.bcl.pemain12.com/backend

   # Install composer
   /usr/local/lsws/lsphp83/bin/php /usr/local/bin/composer install --no-dev --optimize-autoloader

   # Buat link storage (untuk foto bersama dan avatar)
   /usr/local/lsws/lsphp83/bin/php artisan storage:link

   # Migrasi & Seeder
   /usr/local/lsws/lsphp83/bin/php artisan migrate --force
   /usr/local/lsws/lsphp83/bin/php artisan db:seed --force

   # Optimasi Cache
   /usr/local/lsws/lsphp83/bin/php artisan config:cache
   /usr/local/lsws/lsphp83/bin/php artisan route:cache
   /usr/local/lsws/lsphp83/bin/php artisan view:cache
   ```

6. **Atur Permissions Backend:**
   ```bash
   USER_API="api.bcl.pemain12.com"
   chown -R $USER_API:$USER_API /home/api.bcl.pemain12.com/backend
   chown -h $USER_API:$USER_API /home/api.bcl.pemain12.com/public_html
   chmod -R 775 /home/api.bcl.pemain12.com/backend/storage
   chmod -R 775 /home/api.bcl.pemain12.com/backend/bootstrap/cache
   ```

7. **File `.htaccess` untuk Backend (`/home/api.bcl.pemain12.com/backend/public/.htaccess`):**
   Gunakan file `.htaccess` bawaan Laravel yang sudah mendukung API routing:
   ```apache
   <IfModule mod_rewrite.c>
       <IfModule mod_negotiation.c>
           Options -MultiViews -Indexes
       </IfModule>

       RewriteEngine On

       # Handle Authorization Header
       RewriteCond %{HTTP:Authorization} .
       RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

       # Redirect Trailing Slashes If Not A Folder...
       RewriteCond %{REQUEST_FILENAME} !-d
       RewriteCond %{REQUEST_URI} (.+)/$
       RewriteRule ^ %1 [L,R=301]

       # Send Requests To Front Controller...
       RewriteCond %{REQUEST_FILENAME} !-d
       RewriteCond %{REQUEST_FILENAME} !-f
       RewriteRule ^ index.php [L]
   </IfModule>
   ```

---

### 3.3 Langkah Setup Website 2: `bcl.pemain12.com` (React Vite Frontend)

1. **Buat Website di CyberPanel:**
   - Domain: `bcl.pemain12.com`
   - PHP: `8.3`
   - Centang **SSL**.

2. **Build Frontend dengan Endpoint `api.bcl.pemain12.com`:**
   Di komputer lokal Anda atau di server:
   ```bash
   cd frontend

   # Buat file .env frontend dengan URL API Subdomain
   cat << 'EOF' > .env
   VITE_API_BASE_URL=https://api.bcl.pemain12.com/api/v1
   EOF

   # Install & Build
   npm ci
   npm run build
   ```

3. **Upload Isi Folder `dist/` ke `public_html` `bcl.pemain12.com`:**
   ```bash
   # Bersihkan file lama di public_html
   rm -rf /home/pemain12.com/bcl.pemain12.com/public_html/*
   # (atau /home/bcl.pemain12.com/public_html/* tergantung struktur user CyberPanel Anda)

   # Salin hasil build dist ke public_html
   cp -r frontend/dist/* /home/pemain12.com/bcl.pemain12.com/public_html/
   ```

4. **Hubungkan Storage Backend ke Frontend Menggunakan Symlink (Sangat Direkomendasikan):**
   Agar request foto profil atau bukti pertandingan baik yang dipanggil lewat `https://bcl.pemain12.com/storage/...` maupun `https://api.bcl.pemain12.com/storage/...` keduanya langsung tampil tanpa 404:
   ```bash
   cd /home/pemain12.com/bcl.pemain12.com/public_html
   ln -s /home/pemain12.com/api.bcl.pemain12.com/backend/storage/app/public storage
   ```

5. **Buat File `.htaccess` Khusus Frontend (`/home/pemain12.com/bcl.pemain12.com/public_html/.htaccess`):**
   Karena backend sudah berada di subdomain lain, file `.htaccess` di frontend menjadi **sangat sederhana** hanya untuk React Router SPA fallback dan HTTPS:

   ```apache
   <IfModule mod_rewrite.c>
       RewriteEngine On
       RewriteBase /

       # 1. Force HTTPS
       RewriteCond %{HTTPS} off
       RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

       # 2. Akses langsung file fisik statis (JS, CSS, PNG, JPG, ICO, dll.)
       RewriteCond %{REQUEST_FILENAME} -f
       RewriteRule ^ - [L]

       # 3. React Router SPA Fallback
       RewriteCond %{REQUEST_FILENAME} !-f
       RewriteCond %{REQUEST_FILENAME} !-d
       RewriteRule ^ index.html [L]
   </IfModule>

   <IfModule mod_headers.c>
       Header always set X-Frame-Options "SAMEORIGIN"
       Header always set X-Content-Type-Options "nosniff"
   </IfModule>
   ```

5. **Atur Permissions Frontend:**
   ```bash
   USER_WEB="bcl.pemain12.com"
   chown -R $USER_WEB:$USER_WEB /home/bcl.pemain12.com/public_html
   ```

6. **Restart OpenLiteSpeed:**
   ```bash
   systemctl restart lsws
   ```

---

### 3.4 Keuntungan Utama Arsitektur Dual Subdomain Ini:
1. **Tidak Memerlukan Symlink Antara Frontend dan Backend:** Folder frontend dan backend terisolasi total, menghindari masalah open_basedir atau izin file silang di CyberPanel.
2. **Foto & Media Tersimpan Rapi:** Foto bersama pemain dan avatar langsung diakses via `https://api.bcl.pemain12.com/storage/...` yang ditangani langsung oleh storage link bawaan Laravel.
3. **Pemberian Izin CORS Otomatis:** File `backend/config/cors.php` telah dikonfigurasi untuk secara otomatis mengizinkan domain `*.pemain12.com` dan URL `FRONTEND_URL`.
4. **Maintenance Bebas Gangguan:** Frontend dapat di-update atau di-build ulang kapan saja tanpa mengganggu proses backend, cron job, atau queue worker.

---

## 4. Standalone Nginx Configuration (`/etc/nginx/sites-available/bcl.conf`)

Bagi server VPS mandiri tanpa panel (Ubuntu/Debian) yang menggunakan Nginx:

```nginx
server {
    listen 80;
    server_name bcl.pemain12.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bcl.pemain12.com;

    ssl_certificate /etc/letsencrypt/live/bcl.pemain12.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bcl.pemain12.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend Single Page App
    root /var/www/bcl/frontend/dist;
    index index.html;

    # React Router fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Requests Proxy to Laravel Backend
    location /api {
        alias /var/www/bcl/backend/public;
        try_files $uri $uri/ @backend;

        location ~ \.php$ {
            include fastcgi_params;
            fastcgi_param SCRIPT_FILENAME /var/www/bcl/backend/public/index.php;
            fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
            fastcgi_index index.php;
            fastcgi_buffers 16 16k;
            fastcgi_buffer_size 32k;
        }
    }

    location @backend {
        rewrite /api/(.*)$ /api/$1 break;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME /var/www/bcl/backend/public/index.php;
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
    }

    # Storage Link (Uploaded Avatars, Match Photos)
    location /storage {
        alias /var/www/bcl/backend/storage/app/public;
        access_log off;
        expires max;
    }

    # Disable access to hidden files
    location ~ /\. {
        deny all;
    }
}
```

---

## 5. Production Optimization Commands

Jalankan perintah ini setiap kali Anda melakukan update kode atau deployment baru:

### Backend:
```bash
cd /home/bcl.pemain12.com/backend

# 1. Bersihkan & re-cache konfigurasi
/usr/local/lsws/lsphp83/bin/php artisan config:cache
/usr/local/lsws/lsphp83/bin/php artisan route:cache
/usr/local/lsws/lsphp83/bin/php artisan view:cache
/usr/local/lsws/lsphp83/bin/php artisan event:cache

# 2. Database migrations
/usr/local/lsws/lsphp83/bin/php artisan migrate --force

# 3. Restart queue worker agar membaca kode baru
systemctl restart bcl-worker.service
```

### Frontend:
```bash
cd /home/bcl.pemain12.com/frontend
npm ci
npm run build
cp -r dist/* /home/bcl.pemain12.com/public_html/
```

---

## 6. Production Health Check & Verification Checklist

Setelah proses instalasi selesai di `bcl.pemain12.com`, lakukan checklist berikut:

- [ ] **Akses URL Domain:** Buka `https://bcl.pemain12.com` di browser dan pastikan halaman utama Badminton Champion League termuat dengan benar dan gembok SSL aktif.
- [ ] **Endpoint API:** Akses `https://bcl.pemain12.com/api/v1/leaderboard/battle` dan pastikan respon JSON 200 OK.
- [ ] **Autentikasi Akun:** Lakukan registrasi akun pemain baru dan login. Pastikan cookie Sanctum / Bearer Token bekerja normal.
- [ ] **Submit Match & Upload Foto:** Coba buat pertandingan dan input skor dengan mengunggah foto bersama pemain. Pastikan foto tersimpan dan dapat dimuat via `https://bcl.pemain12.com/storage/match_photos/...`.
- [ ] **Komentar Pertandingan:** Beri komentar pada pertandingan yang sudah `COMPLETED`. Uji coba pengetikan kata kasar/rasis untuk memverifikasi sensor filter bekerja.
- [ ] **Queue Worker:** Pastikan `systemctl status bcl-worker.service` dalam status `active (running)`.
- [ ] **Scheduler:** Pastikan cron job dieksekusi setiap menit melalui log CyberPanel.
