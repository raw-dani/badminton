# Badminton Champion League 🏸🏆

> **A modern, competitive badminton tournament management and player ranking platform.**  
> Supports Singles (1v1) & Doubles (2v2), dual Battle & Ranked ladder systems, 100% unanimous multi-set score approvals, immutable point transaction audit ledger, affiliate/referral bonus program, and bilingual support (ID & EN).

---

## 🌟 Key Features

1. **Dual Ladder Progression Engine**
   - **🔥 Battle Points (BP):** Activity & casual participation currency (+3 Win, +1 Loss, never negative). Acts as entry stake for Ranked matches.
   - **🏆 Rank Points (RP):** Official competitive season ladder (+3 Win, -1 Loss, season tier resets).
2. **Singles (1v1) & Doubles (2v2) Match Modes**
   - Automated participant invitations with acceptance/rejection flow.
   - Partner & opponent selection validation (prevents selecting oneself as partner or opponent).
   - Optional live streaming broadcast URL integration (YouTube, TikTok, Twitch, etc.).
3. **100% Unanimous Score Approvals & Arbiter Center**
   - Every match participant must review and approve the submitted score sets.
   - If any participant submits a revised score, all prior approvals reset automatically.
   - Full dispute management system with admin inspection and binding resolution.
4. **Immutable Point Transaction Audit Ledger**
   - Every point movement has a unique verifiable transaction code (`TX-BATTLE-...`, `TX-RANK-...`).
   - Cleanly separated ledger histories for Battle Points and Rank Points.
   - Automatic refund handling (+3 BP) if a ranked match is cancelled by an administrator.
5. **Player Affiliate & Referral Program**
   - Unique referral link for each player (`/register?ref=USERNAME`).
   - Free **100 Battle Points** for the referrer AND **100 Battle Points** for the new player once the new player completes their first match.
   - Real-time referral dashboard tracking total invited, pending, completed, and points earned.
6. **Bilingual UI & Rich Design**
   - Full support for **Bahasa Indonesia (ID)** and **English (EN)** with one-click switcher.
   - Sleek dark theme with gold gradients, glassmorphism, responsive desktop & mobile drawers.
   - Custom golden trophy logo and optimized desktop navigation.

---

## 🛠️ Technology Stack

### Backend
- **Framework:** Laravel 12 (PHP 8.3+)
- **Authentication:** Laravel Sanctum (Token-based API auth)
- **Database:** MySQL 8.0+
- **Architecture:** Controller-Service pattern with atomic database transactions (`DB::transaction`) and row locking (`lockForUpdate`)

### Frontend
- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite
- **Styling:** TailwindCSS + Custom Glassmorphism Design Tokens
- **Icons:** Lucide React
- **Charts:** Recharts

---

## 🚀 Quick Start & Installation

### Prerequisites
- PHP 8.3+ with `pdo_mysql`, `mbstring`, `openssl`, `bcmath`, `curl` extensions
- Composer 2+
- Node.js 18+ and npm
- MySQL Server

### 1. Backend Setup
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Configure your MySQL database in `backend/.env`:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=badminton_champion_league
DB_USERNAME=root
DB_PASSWORD=
```

Run database migrations and seeders:
```bash
php artisan migrate:fresh --seed
```

Start the backend API server:
```bash
php artisan serve --port=8000
```
API will run at `http://127.0.0.1:8000`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend will run at `http://127.0.0.1:5173`.

---

## 👥 Seeded Demo Accounts (for Testing)

| Role | Username / Email | Password | Description |
|---|---|---|---|
| **Admin** | `admin` / `admin@bcl.com` | `password123` | Platform Administrator & Arbiter |
| **Player** | `demoplayer` / `player@bcl.com` | `password123` | Demo Player (Taufik Hidayat) |
| **Player** | `viktor` / `viktor@bcl.com` | `password123` | Viktor Axelsen |
| **Player** | `anthonyginting` / `ginting@bcl.com` | `password123` | Anthony Sinisuka Ginting |

---

## 📖 Technical Documentation

Comprehensive documentation is available in the [`docs/`](./docs) folder:
- [System Architecture & State Machines](./docs/SYSTEM_ARCHITECTURE.md)
- [Database ERD & Schema Design](./docs/DATABASE_ERD.md)
- [REST API Specifications](./docs/REST_API_SPECIFICATION.md)
- [Point Calculation & Workflow Engine](./docs/POINT_ENGINE_AND_WORKFLOW.md)
- [Production Deployment Guide](./docs/DEPLOYMENT_AND_PRODUCTION_GUIDE.md)

---

## 📄 License
Open-source under the MIT License.
