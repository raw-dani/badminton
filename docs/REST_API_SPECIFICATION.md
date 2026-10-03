# Badminton Champion League - REST API Specification

**Base URL:** `/api/v1`  
**Authentication Scheme:** HTTP Bearer Token (Laravel Sanctum)  
**Standard Header:** `Accept: application/json`

---

## 1. Authentication Endpoints

### 1.1 Register
- **Endpoint:** `POST /api/v1/auth/register`
- **Auth:** Public
- **Body:**
```json
{
  "name": "Jane Doe",
  "username": "janedoe",
  "email": "jane@example.com",
  "password": "Password123!",
  "password_confirmation": "Password123!",
  "phone": "+6281234567890",
  "city": "Jakarta",
  "gender": "female",
  "playing_position": "both"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Registration successful.",
  "data": {
    "user": {
      "id": 12,
      "name": "Jane Doe",
      "username": "janedoe",
      "email": "jane@example.com",
      "role": "player",
      "status": "active"
    },
    "token": "1|sanctum_token_string..."
  }
}
```

### 1.2 Login
- **Endpoint:** `POST /api/v1/auth/login`
- **Auth:** Public
- **Body:**
```json
{
  "login": "janedoe", // Accepts email or username
  "password": "Password123!"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": { ... },
    "token": "2|sanctum_token_string..."
  }
}
```

### 1.3 Me / Current Profile
- **Endpoint:** `GET /api/v1/auth/me`
- **Auth:** Bearer Token

### 1.4 Logout
- **Endpoint:** `POST /api/v1/auth/logout`
- **Auth:** Bearer Token

---

## 2. Player Profiles & Public Profiles

### 2.1 Get Public Profile by Username or ID
- **Endpoint:** `GET /api/v1/players/{idOrUsername}`
- **Auth:** Public
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Viktor Axelsen",
    "username": "viktor_axelsen",
    "profile": {
      "player_id": "BCL-000001",
      "city": "Odense",
      "gender": "male",
      "playing_position": "singles",
      "bio": "Olympic Gold Medalist & World Champion.",
      "date_joined": "2026-10-01"
    },
    "balance": {
      "battle_points": 45,
      "rank_points": 38,
      "total_matches": 15,
      "total_wins": 13,
      "total_losses": 2,
      "win_rate": 86.67,
      "current_winning_streak": 5,
      "longest_winning_streak": 8
    },
    "ranking": {
      "battle_rank": 1,
      "rank_ladder_rank": 1
    }
  }
}
```

### 2.2 Update Profile
- **Endpoint:** `PUT /api/v1/players/profile`
- **Auth:** Bearer Token

---

## 3. Matches & Score Management

### 3.1 List Matches
- **Endpoint:** `GET /api/v1/matches?type=battle&status=completed&page=1`
- **Auth:** Bearer Token (optional filter by participant)

### 3.2 Create Match
- **Endpoint:** `POST /api/v1/matches`
- **Auth:** Bearer Token
- **Body:**
```json
{
  "match_type": "ranked",
  "match_mode": "singles",
  "match_date": "2026-10-05",
  "match_time": "19:00",
  "venue": "Senayan Sports Hall, Court 3",
  "description": "Friendly ranking showdown",
  "team_a": [1],
  "team_b": [2]
}
```

### 3.3 Accept Invitation
- **Endpoint:** `POST /api/v1/matches/{id}/accept`
- **Auth:** Bearer Token (Target player only)
- **Behavior:**
  - If match is `battle`, status moves to `ready` once 100% accepted.
  - If match is `ranked`, system atomically checks that **each participant has >= 3 Battle Points**. If valid, atomically deducts 3 BP from all players and moves match to `ready`.

### 3.4 Reject Invitation
- **Endpoint:** `POST /api/v1/matches/{id}/reject`
- **Auth:** Bearer Token (Target player only)
- **Behavior:** Status moves to `rejected`. No points deducted.

### 3.5 Submit Score
- **Endpoint:** `POST /api/v1/matches/{id}/score`
- **Auth:** Participant only
- **Body:**
```json
{
  "sets": [
    { "set_number": 1, "team_a_score": 21, "team_b_score": 18 },
    { "set_number": 2, "team_a_score": 19, "team_b_score": 21 },
    { "set_number": 3, "team_a_score": 21, "team_b_score": 17 }
  ]
}
```
- **Behavior:**
  - Validates badminton score rules (winner has at least 21 points, 2-point difference unless 30-29 cap).
  - Determines match winning team based on best-of-three sets.
  - Creates new `match_score_version`.
  - Sets match status to `waiting_approval`.
  - Automatically records submitter's approval for this new version.

### 3.6 Approve Score
- **Endpoint:** `POST /api/v1/matches/{id}/approve`
- **Auth:** Participant only
- **Body:**
```json
{
  "version_id": 1,
  "comments": "Approved. Well played!"
}
```
- **Behavior:**
  - Validates `version_id` matches current active score version.
  - When 100% of participants have approved the current version:
    - Match status becomes `completed`.
    - Points are calculated and awarded:
      - Battle Match: Winners +3 BP, Losers +1 BP.
      - Ranked Match: Winners +3 RP, Losers -1 RP.
    - Idempotency key prevents duplicate execution.

### 3.7 Dispute Match
- **Endpoint:** `POST /api/v1/matches/{id}/dispute`
- **Auth:** Participant only
- **Body:**
```json
{
  "version_id": 1,
  "reason": "Set 2 score was 21-17, not 21-15 as recorded."
}
```
- **Behavior:**
  - Match status becomes `disputed`.
  - Notifications dispatched to admin and players.
  - Point awarding is strictly halted until resolution.

---

## 4. Points & Ledger

### 4.1 Get My Balance
- **Endpoint:** `GET /api/v1/points/balance`
- **Auth:** Bearer Token

### 4.2 Get Transaction History
- **Endpoint:** `GET /api/v1/points/transactions?point_type=BATTLE&page=1`
- **Auth:** Bearer Token
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 105,
        "transaction_code": "TX-0105-A7B2C",
        "point_type": "BATTLE",
        "category": "BATTLE_MATCH_WIN",
        "change_amount": 3,
        "previous_balance": 12,
        "new_balance": 15,
        "description": "Won Battle match against Player B",
        "created_at": "2026-10-02T19:30:00Z"
      }
    ],
    "current_page": 1,
    "last_page": 5
  }
}
```

---

## 5. Leaderboards

### 5.1 Battle Leaderboard
- **Endpoint:** `GET /api/v1/leaderboards/battle?city=Jakarta&search=viktor&page=1`
- **Auth:** Public
- **Sorting:** `battle_points DESC`, `win_rate DESC`, `total_wins DESC`

### 5.2 Rank Leaderboard
- **Endpoint:** `GET /api/v1/leaderboards/rank?season_id=1&page=1`
- **Auth:** Public
- **Sorting:** `rank_points DESC`, `win_rate DESC`, `total_wins DESC`
- **Notes:** Negative Rank Points supported and rendered faithfully.

---

## 6. Administration

### 6.1 Admin Stats & Overview
- **Endpoint:** `GET /api/v1/admin/dashboard`
- **Auth:** Admin Role

### 6.2 Manual Point Adjustment
- **Endpoint:** `POST /api/v1/admin/points/adjust`
- **Auth:** Admin Role
- **Body:**
```json
{
  "user_id": 4,
  "point_type": "BATTLE",
  "change_amount": 5,
  "reason": "Compensation for court cancellation during registered match"
}
```
- **Behavior:**
  - Enforces mandatory reason.
  - Updates balance transactionally.
  - Creates immutable `point_transactions` row with category `ADMIN_ADJUSTMENT`.
  - Writes detailed record to `audit_logs`.

### 6.3 Resolve Dispute
- **Endpoint:** `POST /api/v1/admin/disputes/{id}/resolve`
- **Auth:** Admin Role
- **Body:**
```json
{
  "action": "confirm_score | request_resubmit | cancel_match",
  "resolution_notes": "Reviewed official scoresheet from court umpire."
}
```
- **Behavior:** If `cancel_match` on a ranked match that was `READY`, automatically executes full 3-BP refunds with `RANKED_MATCH_REFUND` ledger entries.
