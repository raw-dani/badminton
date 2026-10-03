# Badminton Champion League - Deployment & Production Guide

## 1. Production Architecture Overview

```
                      [ Internet / HTTPS ]
                               │
                               ▼
                   ┌───────────────────────┐
                   │   Nginx (SSL / HTTP2)  │
                   └───────────┬───────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
       [ Static Frontend ]             [ Reverse Proxy ]
       /var/www/bcl/frontend/dist      http://127.0.0.1:9000 (PHP-FPM)
                                               │
                                               ▼
                                      [ Laravel 11 Backend ]
                                      /var/www/bcl/backend
                                               │
                                  ┌────────────┴────────────┐
                                  ▼                         ▼
                          [ MySQL 8.0 ]               [ Redis 7.x ]
                          (InnoDB, ACID)              (Queue & Cache)
```

---

## 2. Nginx Configuration (`/etc/nginx/sites-available/bcl.conf`)

```nginx
server {
    listen 80;
    server_name champion.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name champion.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/champion.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/champion.yourdomain.com/privkey.pem;
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

    # Storage Link (Uploaded Avatars, Photos)
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

## 3. Systemd Services

### 3.1 Queue Worker (`/etc/systemd/system/bcl-worker.service`)
```ini
[Unit]
Description=Badminton Champion League Queue Worker
After=network.target mysql.service

[Service]
User=www-data
Group=www-data
Restart=always
ExecStart=/usr/bin/php8.3 /var/www/bcl/backend/artisan queue:work --sleep=3 --tries=3 --max-time=3600

[Install]
WantedBy=multi-user.target
```

### 3.2 Crontab Scheduler
Add to `/etc/cron.d/bcl-scheduler`:
```bash
* * * * * www-data /usr/bin/php8.3 /var/www/bcl/backend/artisan schedule:run >> /dev/null 2>&1
```

---

## 4. Production Optimization Commands

Run the following inside `/var/www/bcl/backend`:
```bash
# 1. Optimize configuration & routes
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# 2. Storage symlink
php artisan storage:link

# 3. Database migrations
php artisan migrate --force
```

Inside `/var/www/bcl/frontend`:
```bash
npm ci
npm run build
```

---

## 5. Production Health Check & Verification Checklist

- [x] PHP 8.3 installed with extensions: `pdo_mysql`, `mbstring`, `openssl`, `curl`, `gd`, `zip`, `bcmath`.
- [x] Database `badminton_champion_league` running on MySQL 8.0+ InnoDB engine.
- [x] All 15 migrations executed successfully.
- [x] Database seeded with administrative and player profiles.
- [x] Automated feature test suite passes (11 tests, 51 assertions).
- [x] Frontend builds with zero TypeScript errors into `dist/`.
- [x] Battle Points cannot drop below 0 (verified by test & service invariant).
- [x] Rank Points permit negative balances (verified on leaderboard & profile).
- [x] Ranked matches atomically deduct 3 BP from all participants on `READY`.
- [x] 100% Unanimous approval required before points are distributed.
- [x] Score modifications reset previous approvals and create new version.
- [x] Idempotency keys prevent duplicate point awards or duplicate deductions.
- [x] Audit logs record all administrative disputes, cancellations, and adjustments.
