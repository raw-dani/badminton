<?php

namespace Database\Seeders;

use App\Models\AuditLog;
use App\Models\GameMatch;
use App\Models\MatchInvitation;
use App\Models\MatchPlayer;
use App\Models\MatchScore;
use App\Models\MatchScoreApproval;
use App\Models\MatchScoreVersion;
use App\Models\Notification;
use App\Models\PlayerPointBalance;
use App\Models\PlayerProfile;
use App\Models\PointTransaction;
use App\Models\Referral;
use App\Models\Season;
use App\Models\SeasonPlayerStatistic;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. System Settings
        SystemSetting::set('battle_win_points', 3, 'integer', 'Points awarded for winning a Battle Match');
        SystemSetting::set('battle_loss_points', 1, 'integer', 'Points awarded for losing a Battle Match');
        SystemSetting::set('ranked_win_points', 3, 'integer', 'Rank points awarded for winning a Ranked Match');
        SystemSetting::set('ranked_loss_points', -1, 'integer', 'Rank points deducted for losing a Ranked Match');
        SystemSetting::set('ranked_entry_cost_bp', 3, 'integer', 'Battle Points required and deducted to enter a Ranked Match');
        SystemSetting::set('allow_negative_rank_points', true, 'boolean', 'Whether Rank Points can drop below 0');

        // 2. Active Season
        $season = Season::create([
            'name' => 'Season 1 - 2026 Premier Championship',
            'code' => 'S1-2026',
            'start_date' => now()->startOfMonth()->toDateString(),
            'end_date' => now()->addMonths(4)->endOfMonth()->toDateString(),
            'is_active' => true,
            'status' => 'active',
            'description' => 'The inaugural badminton championship league season with Battle and Ranked ladders.',
            'battle_point_reset' => false,
            'rank_point_reset' => true,
        ]);

        // 3. Admin Account
        $admin = User::create([
            'name' => 'System Administrator',
            'username' => 'admin',
            'email' => 'admin@bcl.com',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'status' => 'active',
            'phone' => '+628110000001',
            'email_verified_at' => now(),
        ]);
        PlayerProfile::create([
            'user_id' => $admin->id,
            'player_code' => 'BCL-ADM1',
            'city' => 'Jakarta',
            'gender' => 'other',
            'bio' => 'Badminton Champion League Chief Tournament Arbiter.',
            'preferred_position' => 'all_round',
            'visibility' => 'public',
        ]);
        PlayerPointBalance::create([
            'user_id' => $admin->id,
            'battle_points' => 50,
            'rank_points' => 25,
            'total_matches' => 10,
            'total_wins' => 8,
            'total_losses' => 2,
        ]);

        // 4. Demo Player Account (For easy testing)
        $demoUser = User::create([
            'name' => 'Taufik Hidayat',
            'username' => 'demoplayer',
            'email' => 'player@bcl.com',
            'password' => Hash::make('password123'),
            'role' => 'player',
            'status' => 'active',
            'phone' => '+628123456789',
            'email_verified_at' => now(),
        ]);
        PlayerProfile::create([
            'user_id' => $demoUser->id,
            'player_code' => 'BCL-0002',
            'city' => 'Bandung',
            'gender' => 'male',
            'bio' => 'Olympic champion & aggressive backhand smash specialist. Always ready for a ranked showdown.',
            'preferred_position' => 'singles',
            'visibility' => 'public',
        ]);
        $demoBalance = PlayerPointBalance::create([
            'user_id' => $demoUser->id,
            'battle_points' => 14,
            'rank_points' => 8,
            'total_matches' => 6,
            'battle_matches' => 3,
            'ranked_matches' => 3,
            'total_wins' => 5,
            'total_losses' => 1,
            'singles_wins' => 4,
            'singles_losses' => 1,
            'doubles_wins' => 1,
            'doubles_losses' => 0,
            'current_streak' => 3,
            'longest_streak' => 4,
        ]);

        // 5. Elite Players
        $playersData = [
            [
                'name' => 'Viktor Axelsen',
                'username' => 'viktor',
                'email' => 'viktor@bcl.com',
                'city' => 'Copenhagen',
                'gender' => 'male',
                'pos' => 'singles',
                'bio' => 'World #1 singles player. Powerful smashes, steep angles, unwavering consistency.',
                'bp' => 22,
                'rp' => 18,
                'wins' => 8,
                'losses' => 1,
            ],
            [
                'name' => 'Anthony Sinisuka Ginting',
                'username' => 'anthonyginting',
                'email' => 'ginting@bcl.com',
                'city' => 'Jakarta',
                'gender' => 'male',
                'pos' => 'singles',
                'bio' => 'High speed, deceptive net play, and explosive cross-court footwork.',
                'bp' => 18,
                'rp' => 12,
                'wins' => 6,
                'losses' => 2,
            ],
            [
                'name' => 'Lee Zii Jia',
                'username' => 'leezijia',
                'email' => 'lzj@bcl.com',
                'city' => 'Kuala Lumpur',
                'gender' => 'male',
                'pos' => 'singles',
                'bio' => 'All England champion known for blistering backhand smashes.',
                'bp' => 15,
                'rp' => 9,
                'wins' => 5,
                'losses' => 2,
            ],
            [
                'name' => 'Kevin Sanjaya Sukamuljo',
                'username' => 'kevinsanjaya',
                'email' => 'kevin@bcl.com',
                'city' => 'Jakarta',
                'gender' => 'male',
                'pos' => 'doubles_front',
                'bio' => 'Lightning fast front-court interceptor. Masters the drive game.',
                'bp' => 25,
                'rp' => 15,
                'wins' => 9,
                'losses' => 1,
            ],
            [
                'name' => 'Marcus Fernaldi Gideon',
                'username' => 'marcusgideon',
                'email' => 'marcus@bcl.com',
                'city' => 'Jakarta',
                'gender' => 'male',
                'pos' => 'doubles_back',
                'bio' => 'Tenacious defense, continuous jump smashes, and high court coverage.',
                'bp' => 24,
                'rp' => 14,
                'wins' => 8,
                'losses' => 2,
            ],
            [
                'name' => 'Hendra Setiawan',
                'username' => 'hendrasetiawan',
                'email' => 'hendra@bcl.com',
                'city' => 'Surabaya',
                'gender' => 'male',
                'pos' => 'doubles_front',
                'bio' => 'The Daddies legend. Elegant placement, icy composure, and supreme net play.',
                'bp' => 20,
                'rp' => 11,
                'wins' => 7,
                'losses' => 3,
            ],
            [
                'name' => 'Mohammad Ahsan',
                'username' => 'mohammadahsan',
                'email' => 'ahsan@bcl.com',
                'city' => 'Palembang',
                'gender' => 'male',
                'pos' => 'doubles_back',
                'bio' => 'Relentless rear-court firepower and master of deceptive drops.',
                'bp' => 19,
                'rp' => 10,
                'wins' => 7,
                'losses' => 3,
            ],
            [
                'name' => 'Kento Momota',
                'username' => 'kentomomota',
                'email' => 'momota@bcl.com',
                'city' => 'Tokyo',
                'gender' => 'male',
                'pos' => 'singles',
                'bio' => 'Impenetrable defense and textbook shot quality.',
                'bp' => 8,
                'rp' => -2, // Supporting negative Rank Points showcase!
                'wins' => 3,
                'losses' => 5,
            ],
        ];

        $createdPlayers = [$demoUser];

        foreach ($playersData as $idx => $p) {
            $user = User::create([
                'name' => $p['name'],
                'username' => $p['username'],
                'email' => $p['email'],
                'password' => Hash::make('password123'),
                'role' => 'player',
                'status' => 'active',
                'phone' => '+62810' . str_pad((string) ($idx + 3), 7, '0', STR_PAD_LEFT),
                'email_verified_at' => now(),
            ]);

            PlayerProfile::create([
                'user_id' => $user->id,
                'player_code' => 'BCL-' . str_pad((string) $user->id, 4, '0', STR_PAD_LEFT),
                'city' => $p['city'],
                'gender' => $p['gender'],
                'bio' => $p['bio'],
                'preferred_position' => $p['pos'],
                'visibility' => 'public',
            ]);

            $totMatches = $p['wins'] + $p['losses'];
            PlayerPointBalance::create([
                'user_id' => $user->id,
                'battle_points' => $p['bp'],
                'rank_points' => $p['rp'],
                'total_matches' => $totMatches,
                'battle_matches' => (int) ceil($totMatches / 2),
                'ranked_matches' => (int) floor($totMatches / 2),
                'total_wins' => $p['wins'],
                'total_losses' => $p['losses'],
                'singles_wins' => $p['pos'] === 'singles' ? $p['wins'] : 0,
                'singles_losses' => $p['pos'] === 'singles' ? $p['losses'] : 0,
                'doubles_wins' => $p['pos'] !== 'singles' ? $p['wins'] : 0,
                'doubles_losses' => $p['pos'] !== 'singles' ? $p['losses'] : 0,
                'current_streak' => max(0, $p['wins'] - 2),
                'longest_streak' => $p['wins'],
            ]);

            SeasonPlayerStatistic::create([
                'season_id' => $season->id,
                'user_id' => $user->id,
                'rank_points' => $p['rp'],
                'battle_points' => $p['bp'],
                'matches_played' => $totMatches,
                'wins' => $p['wins'],
                'losses' => $p['losses'],
            ]);

            $createdPlayers[] = $user;
        }

        // 6. Create Historical Completed Matches with Point Transactions
        // Match 1: Completed Singles Ranked Match (Demo Player vs Anthony Ginting)
        $ginting = $createdPlayers[2]; // Ginting
        $match1 = GameMatch::create([
            'match_code' => 'M-' . date('Ymd') . '-001',
            'season_id' => $season->id,
            'creator_id' => $demoUser->id,
            'type' => 'RANKED',
            'mode' => 'SINGLES',
            'venue' => 'Istora Senayan, Court 1',
            'scheduled_at' => now()->subDays(3)->setTime(14, 0),
            'description' => 'Season opening high-stakes ranked singles encounter.',
            'status' => 'COMPLETED',
            'winning_team' => 'TEAM_A',
            'current_score_version' => 1,
            'battle_deducted' => true,
            'points_awarded' => true,
            'points_awarded_at' => now()->subDays(3)->setTime(15, 30),
        ]);

        MatchPlayer::create([
            'match_id' => $match1->id,
            'user_id' => $demoUser->id,
            'team' => 'TEAM_A',
            'slot' => 1,
            'invitation_status' => 'ACCEPTED',
            'points_earned' => 3,
            'point_type_earned' => 'RANK',
        ]);
        MatchPlayer::create([
            'match_id' => $match1->id,
            'user_id' => $ginting->id,
            'team' => 'TEAM_B',
            'slot' => 1,
            'invitation_status' => 'ACCEPTED',
            'points_earned' => -1,
            'point_type_earned' => 'RANK',
        ]);

        // Sets
        MatchScore::create(['match_id' => $match1->id, 'version' => 1, 'set_number' => 1, 'team_a_score' => 21, 'team_b_score' => 18]);
        MatchScore::create(['match_id' => $match1->id, 'version' => 1, 'set_number' => 2, 'team_a_score' => 19, 'team_b_score' => 21]);
        MatchScore::create(['match_id' => $match1->id, 'version' => 1, 'set_number' => 3, 'team_a_score' => 21, 'team_b_score' => 16]);

        MatchScoreVersion::create([
            'match_id' => $match1->id,
            'version' => 1,
            'submitted_by' => $demoUser->id,
            'winning_team' => 'TEAM_A',
            'summary' => '21-18, 19-21, 21-16',
            'sets_data' => [
                ['set_number' => 1, 'team_a_score' => 21, 'team_b_score' => 18],
                ['set_number' => 2, 'team_a_score' => 19, 'team_b_score' => 21],
                ['set_number' => 3, 'team_a_score' => 21, 'team_b_score' => 16],
            ],
        ]);

        MatchScoreApproval::create(['match_id' => $match1->id, 'version' => 1, 'user_id' => $demoUser->id, 'status' => 'APPROVED']);
        MatchScoreApproval::create(['match_id' => $match1->id, 'version' => 1, 'user_id' => $ginting->id, 'status' => 'APPROVED']);

        // Record point transactions for Match 1
        PointTransaction::create([
            'transaction_code' => 'TX-BATTLE-' . date('Ymd') . '-001',
            'user_id' => $demoUser->id,
            'match_id' => $match1->id,
            'point_type' => 'BATTLE',
            'category' => 'RANKED_MATCH_ENTRY_DEDUCTION',
            'amount' => -3,
            'previous_balance' => 17,
            'new_balance' => 14,
            'description' => "Ranked Match #{$match1->match_code} entry deduction (-3 BP)",
            'idempotency_key' => "seed_entry_m1_{$demoUser->id}",
        ]);
        PointTransaction::create([
            'transaction_code' => 'TX-BATTLE-' . date('Ymd') . '-002',
            'user_id' => $ginting->id,
            'match_id' => $match1->id,
            'point_type' => 'BATTLE',
            'category' => 'RANKED_MATCH_ENTRY_DEDUCTION',
            'amount' => -3,
            'previous_balance' => 21,
            'new_balance' => 18,
            'description' => "Ranked Match #{$match1->match_code} entry deduction (-3 BP)",
            'idempotency_key' => "seed_entry_m1_{$ginting->id}",
        ]);
        PointTransaction::create([
            'transaction_code' => 'TX-RANK-' . date('Ymd') . '-003',
            'user_id' => $demoUser->id,
            'match_id' => $match1->id,
            'point_type' => 'RANK',
            'category' => 'RANKED_MATCH_WIN',
            'amount' => 3,
            'previous_balance' => 5,
            'new_balance' => 8,
            'description' => "Ranked Match #{$match1->match_code} (Win: +3 RP)",
            'idempotency_key' => "seed_award_m1_{$demoUser->id}",
        ]);
        PointTransaction::create([
            'transaction_code' => 'TX-RANK-' . date('Ymd') . '-004',
            'user_id' => $ginting->id,
            'match_id' => $match1->id,
            'point_type' => 'RANK',
            'category' => 'RANKED_MATCH_LOSS',
            'amount' => -1,
            'previous_balance' => 13,
            'new_balance' => 12,
            'description' => "Ranked Match #{$match1->match_code} (Loss: -1 RP)",
            'idempotency_key' => "seed_award_m1_{$ginting->id}",
        ]);

        // Match 2: Battle Match Completed (Lee Zii Jia vs Viktor Axelsen)
        $lzj = $createdPlayers[3];
        $viktor = $createdPlayers[1];
        $match2 = GameMatch::create([
            'match_code' => 'M-' . date('Ymd') . '-002',
            'season_id' => $season->id,
            'creator_id' => $viktor->id,
            'type' => 'BATTLE',
            'mode' => 'SINGLES',
            'venue' => 'Kuala Lumpur Arena, Court 3',
            'scheduled_at' => now()->subDays(2)->setTime(19, 0),
            'description' => 'Casual evening Battle match.',
            'status' => 'COMPLETED',
            'winning_team' => 'TEAM_A',
            'current_score_version' => 1,
            'battle_deducted' => false,
            'points_awarded' => true,
            'points_awarded_at' => now()->subDays(2)->setTime(20, 0),
        ]);
        MatchPlayer::create(['match_id' => $match2->id, 'user_id' => $viktor->id, 'team' => 'TEAM_A', 'slot' => 1, 'invitation_status' => 'ACCEPTED', 'points_earned' => 3, 'point_type_earned' => 'BATTLE']);
        MatchPlayer::create(['match_id' => $match2->id, 'user_id' => $lzj->id, 'team' => 'TEAM_B', 'slot' => 1, 'invitation_status' => 'ACCEPTED', 'points_earned' => 1, 'point_type_earned' => 'BATTLE']);
        MatchScore::create(['match_id' => $match2->id, 'version' => 1, 'set_number' => 1, 'team_a_score' => 21, 'team_b_score' => 17]);
        MatchScore::create(['match_id' => $match2->id, 'version' => 1, 'set_number' => 2, 'team_a_score' => 21, 'team_b_score' => 19]);
        MatchScoreVersion::create([
            'match_id' => $match2->id,
            'version' => 1,
            'submitted_by' => $viktor->id,
            'winning_team' => 'TEAM_A',
            'summary' => '21-17, 21-19',
            'sets_data' => [
                ['set_number' => 1, 'team_a_score' => 21, 'team_b_score' => 17],
                ['set_number' => 2, 'team_a_score' => 21, 'team_b_score' => 19],
            ],
        ]);
        MatchScoreApproval::create(['match_id' => $match2->id, 'version' => 1, 'user_id' => $viktor->id, 'status' => 'APPROVED']);
        MatchScoreApproval::create(['match_id' => $match2->id, 'version' => 1, 'user_id' => $lzj->id, 'status' => 'APPROVED']);

        PointTransaction::create([
            'transaction_code' => 'TX-BATTLE-' . date('Ymd') . '-005',
            'user_id' => $viktor->id,
            'match_id' => $match2->id,
            'point_type' => 'BATTLE',
            'category' => 'BATTLE_MATCH_WIN',
            'amount' => 3,
            'previous_balance' => 25,
            'new_balance' => 28,
            'description' => "Battle Match #{$match2->match_code} (Win: +3 BP)",
            'idempotency_key' => "seed_award_m2_{$viktor->id}",
        ]);
        PointTransaction::create([
            'transaction_code' => 'TX-BATTLE-' . date('Ymd') . '-006',
            'user_id' => $lzj->id,
            'match_id' => $match2->id,
            'point_type' => 'BATTLE',
            'category' => 'BATTLE_MATCH_LOSS',
            'amount' => 1,
            'previous_balance' => 14,
            'new_balance' => 15,
            'description' => "Battle Match #{$match2->match_code} (Loss: +1 BP)",
            'idempotency_key' => "seed_award_m2_{$lzj->id}",
        ]);

        // Cancelled Ranked Match with Admin Refund showcase for Demo Player
        $matchCancelled = GameMatch::create([
            'match_code' => 'M-' . date('Ymd', strtotime('-3 days')) . '-099',
            'season_id' => $season->id,
            'creator_id' => $ginting->id,
            'type' => 'RANKED',
            'mode' => 'SINGLES',
            'venue' => 'Istora Senayan, Court 1',
            'scheduled_at' => now()->subDays(3),
            'description' => 'Disputed court moisture hazard cancelled by admin.',
            'status' => 'CANCELLED',
            'cancelled_reason' => 'Admin dispute resolution: Lapangan licin dan bocor, pertandingan dibatalkan dan 3 BP dikembalikan penuh.',
            'battle_deducted' => false,
            'admin_resolution_note' => sprintf('[%s] Arbiter Admin: Pembatalan sengketa kondisi lapangan.', now()->subDays(3)->toDateTimeString()),
        ]);
        MatchPlayer::create(['match_id' => $matchCancelled->id, 'user_id' => $ginting->id, 'team' => 'TEAM_A', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);
        MatchPlayer::create(['match_id' => $matchCancelled->id, 'user_id' => $demoUser->id, 'team' => 'TEAM_B', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);
        PointTransaction::create([
            'transaction_code' => 'TX-BATTLE-' . date('Ymd', strtotime('-3 days')) . '-010',
            'user_id' => $demoUser->id,
            'match_id' => $matchCancelled->id,
            'point_type' => 'BATTLE',
            'category' => 'RANKED_MATCH_ENTRY_DEDUCTION',
            'amount' => -3,
            'previous_balance' => 17,
            'new_balance' => 14,
            'description' => "Ranked Match #{$matchCancelled->match_code} entry deduction (-3 BP)",
            'idempotency_key' => "seed_entry_m99_{$demoUser->id}",
        ]);
        PointTransaction::create([
            'transaction_code' => 'TX-BATTLE-' . date('Ymd', strtotime('-3 days')) . '-011',
            'user_id' => $demoUser->id,
            'match_id' => $matchCancelled->id,
            'point_type' => 'BATTLE',
            'category' => 'RANKED_MATCH_REFUND',
            'amount' => 3,
            'previous_balance' => 14,
            'new_balance' => 17,
            'description' => "Pengembalian Pertandingan Ranked #{$matchCancelled->match_code} dibatalkan oleh Admin (+3 BP)",
            'idempotency_key' => "seed_refund_m99_{$demoUser->id}",
            'actor_id' => $admin->id,
        ]);

        // Match 3: READY Match Upcoming (Demo Player vs Viktor Axelsen)
        $match3 = GameMatch::create([
            'match_code' => 'M-' . date('Ymd') . '-003',
            'season_id' => $season->id,
            'creator_id' => $viktor->id,
            'type' => 'RANKED',
            'mode' => 'SINGLES',
            'venue' => 'GBK Senayan Arena, Court 2',
            'scheduled_at' => now()->addDays(1)->setTime(16, 0),
            'description' => 'Championship contender ranked duel.',
            'status' => 'READY',
            'current_score_version' => 0,
            'battle_deducted' => true,
        ]);
        MatchPlayer::create(['match_id' => $match3->id, 'user_id' => $viktor->id, 'team' => 'TEAM_A', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);
        MatchPlayer::create(['match_id' => $match3->id, 'user_id' => $demoUser->id, 'team' => 'TEAM_B', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);
        PointTransaction::create([
            'transaction_code' => 'TX-BATTLE-' . date('Ymd') . '-007',
            'user_id' => $viktor->id,
            'match_id' => $match3->id,
            'point_type' => 'BATTLE',
            'category' => 'RANKED_MATCH_ENTRY_DEDUCTION',
            'amount' => -3,
            'previous_balance' => 28,
            'new_balance' => 25,
            'description' => "Ranked Match #{$match3->match_code} entry deduction (-3 BP)",
            'idempotency_key' => "seed_entry_m3_{$viktor->id}",
        ]);
        PointTransaction::create([
            'transaction_code' => 'TX-BATTLE-' . date('Ymd') . '-008',
            'user_id' => $demoUser->id,
            'match_id' => $match3->id,
            'point_type' => 'BATTLE',
            'category' => 'RANKED_MATCH_ENTRY_DEDUCTION',
            'amount' => -3,
            'previous_balance' => 17,
            'new_balance' => 14,
            'description' => "Ranked Match #{$match3->match_code} entry deduction (-3 BP)",
            'idempotency_key' => "seed_entry_m3_{$demoUser->id}",
        ]);

        // Match 4: WAITING_APPROVAL match (Score submitted by opponent, awaiting Demo User's approval)
        $match4 = GameMatch::create([
            'match_code' => 'M-' . date('Ymd') . '-004',
            'season_id' => $season->id,
            'creator_id' => $lzj->id,
            'type' => 'BATTLE',
            'mode' => 'SINGLES',
            'venue' => 'Cilandak Sport Center, Court 4',
            'scheduled_at' => now()->subHours(3),
            'description' => 'Fast-paced friendly battle match.',
            'status' => 'WAITING_APPROVAL',
            'winning_team' => 'TEAM_B', // Demo Player won!
            'current_score_version' => 1,
        ]);
        MatchPlayer::create(['match_id' => $match4->id, 'user_id' => $lzj->id, 'team' => 'TEAM_A', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);
        MatchPlayer::create(['match_id' => $match4->id, 'user_id' => $demoUser->id, 'team' => 'TEAM_B', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);
        MatchScore::create(['match_id' => $match4->id, 'version' => 1, 'set_number' => 1, 'team_a_score' => 19, 'team_b_score' => 21]);
        MatchScore::create(['match_id' => $match4->id, 'version' => 1, 'set_number' => 2, 'team_a_score' => 18, 'team_b_score' => 21]);
        MatchScoreVersion::create([
            'match_id' => $match4->id,
            'version' => 1,
            'submitted_by' => $lzj->id,
            'winning_team' => 'TEAM_B',
            'summary' => '19-21, 18-21',
            'sets_data' => [
                ['set_number' => 1, 'team_a_score' => 19, 'team_b_score' => 21],
                ['set_number' => 2, 'team_a_score' => 18, 'team_b_score' => 21],
            ],
        ]);
        // Lee Zii Jia approved as submitter, Demo player is pending
        MatchScoreApproval::create(['match_id' => $match4->id, 'version' => 1, 'user_id' => $lzj->id, 'status' => 'APPROVED']);

        // Match 5: Pending Invitation awaiting Demo Player
        $kevin = $createdPlayers[4];
        $match5 = GameMatch::create([
            'match_code' => 'M-' . date('Ymd') . '-005',
            'season_id' => $season->id,
            'creator_id' => $kevin->id,
            'type' => 'BATTLE',
            'mode' => 'SINGLES',
            'venue' => 'Gelora Bung Karno, Court 5',
            'scheduled_at' => now()->addDays(2)->setTime(18, 30),
            'description' => 'Friendly weekend battle match challenge.',
            'status' => 'PENDING_ACCEPTANCE',
            'current_score_version' => 0,
        ]);
        MatchPlayer::create(['match_id' => $match5->id, 'user_id' => $kevin->id, 'team' => 'TEAM_A', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);
        MatchPlayer::create(['match_id' => $match5->id, 'user_id' => $demoUser->id, 'team' => 'TEAM_B', 'slot' => 1, 'invitation_status' => 'PENDING']);
        MatchInvitation::create([
            'match_id' => $match5->id,
            'invited_user_id' => $demoUser->id,
            'invited_by_user_id' => $kevin->id,
            'team' => 'TEAM_B',
            'status' => 'PENDING',
        ]);

        // Match 6: DISPUTED match for Admin Resolution Testing
        $momota = $createdPlayers[8];
        $match6 = GameMatch::create([
            'match_code' => 'M-' . date('Ymd') . '-006',
            'season_id' => $season->id,
            'creator_id' => $momota->id,
            'type' => 'RANKED',
            'mode' => 'SINGLES',
            'venue' => 'Tokyo National Gymnasium, Court 1',
            'scheduled_at' => now()->subDay()->setTime(15, 0),
            'description' => 'Competitive ranked match with score dispute.',
            'status' => 'DISPUTED',
            'winning_team' => 'TEAM_A',
            'current_score_version' => 1,
            'battle_deducted' => true,
            'dispute_reason' => 'Score recorded as 21-19 in set 2, but actual final rally score was 23-21 in deuce after line call contest.',
            'disputed_by' => $ginting->id,
        ]);
        MatchPlayer::create(['match_id' => $match6->id, 'user_id' => $momota->id, 'team' => 'TEAM_A', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);
        MatchPlayer::create(['match_id' => $match6->id, 'user_id' => $ginting->id, 'team' => 'TEAM_B', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);
        MatchScore::create(['match_id' => $match6->id, 'version' => 1, 'set_number' => 1, 'team_a_score' => 21, 'team_b_score' => 17]);
        MatchScore::create(['match_id' => $match6->id, 'version' => 1, 'set_number' => 2, 'team_a_score' => 21, 'team_b_score' => 19]);
        MatchScoreVersion::create([
            'match_id' => $match6->id,
            'version' => 1,
            'submitted_by' => $momota->id,
            'winning_team' => 'TEAM_A',
            'summary' => '21-17, 21-19',
            'sets_data' => [
                ['set_number' => 1, 'team_a_score' => 21, 'team_b_score' => 17],
                ['set_number' => 2, 'team_a_score' => 21, 'team_b_score' => 19],
            ],
        ]);
        MatchScoreApproval::create(['match_id' => $match6->id, 'version' => 1, 'user_id' => $momota->id, 'status' => 'APPROVED']);
        MatchScoreApproval::create([
            'match_id' => $match6->id,
            'version' => 1,
            'user_id' => $ginting->id,
            'status' => 'DISPUTED',
            'dispute_reason' => 'Score recorded as 21-19 in set 2, but actual final rally score was 23-21 in deuce.',
        ]);

        PointTransaction::create([
            'transaction_code' => 'TX-BATTLE-' . date('Ymd') . '-012',
            'user_id' => $momota->id,
            'match_id' => $match6->id,
            'point_type' => 'BATTLE',
            'category' => 'RANKED_MATCH_ENTRY_DEDUCTION',
            'amount' => -3,
            'previous_balance' => 11,
            'new_balance' => 8,
            'description' => "Ranked Match #{$match6->match_code} entry deduction (-3 BP)",
            'idempotency_key' => "seed_entry_m6_{$momota->id}",
        ]);
        PointTransaction::create([
            'transaction_code' => 'TX-BATTLE-' . date('Ymd') . '-013',
            'user_id' => $ginting->id,
            'match_id' => $match6->id,
            'point_type' => 'BATTLE',
            'category' => 'RANKED_MATCH_ENTRY_DEDUCTION',
            'amount' => -3,
            'previous_balance' => 18,
            'new_balance' => 15,
            'description' => "Ranked Match #{$match6->match_code} entry deduction (-3 BP)",
            'idempotency_key' => "seed_entry_m6_{$ginting->id}",
        ]);

        // 7. Initial Notifications for Demo User
        Notification::create([
            'user_id' => $demoUser->id,
            'type' => 'INVITATION_RECEIVED',
            'title' => 'New Match Invitation',
            'message' => 'Kevin Sanjaya invited you to a Battle Singles match at Gelora Bung Karno.',
            'data' => ['match_id' => $match5->id, 'type' => 'BATTLE'],
            'is_read' => false,
        ]);
        Notification::create([
            'user_id' => $demoUser->id,
            'type' => 'SCORE_WAITING_APPROVAL',
            'title' => 'Match Score Awaiting Approval',
            'message' => 'Lee Zii Jia submitted score (19-21, 18-21) for match #' . $match4->match_code . '. Please approve.',
            'data' => ['match_id' => $match4->id, 'version' => 1],
            'is_read' => false,
        ]);
        Notification::create([
            'user_id' => $demoUser->id,
            'type' => 'MATCH_READY',
            'title' => 'Upcoming Ranked Match Confirmed',
            'message' => 'Match #' . $match3->match_code . ' vs Viktor Axelsen is READY to play tomorrow at GBK Senayan.',
            'data' => ['match_id' => $match3->id],
            'is_read' => true,
            'read_at' => now()->subHours(5),
        ]);

        // 8. Initial Audit Log
        AuditLog::create([
            'user_id' => $admin->id,
            'action' => 'SYSTEM_INITIALIZATION',
            'auditable_type' => Season::class,
            'auditable_id' => $season->id,
            'new_values' => ['season' => $season->name, 'status' => 'initialized'],
            'reason' => 'Badminton Champion League platform launched with initial configuration.',
        ]);

        // 9. Sample Affiliate Referrals for Demo Player
        $viktor = $createdPlayers[1] ?? null;
        if ($viktor) {
            $viktor->referred_by_id = $demoUser->id;
            $viktor->save();

            Referral::create([
                'referrer_id' => $demoUser->id,
                'referred_id' => $viktor->id,
                'status' => Referral::STATUS_COMPLETED,
                'reward_points' => 100,
                'first_match_id' => $match1->id,
                'rewarded_at' => now()->subDays(2),
            ]);

            PointTransaction::create([
                'transaction_code' => 'TX-BATTLE-' . date('Ymd') . '-AFF01',
                'user_id' => $demoUser->id,
                'match_id' => $match1->id,
                'point_type' => PointTransaction::TYPE_BATTLE,
                'category' => PointTransaction::CAT_AFFILIATE_REWARD,
                'amount' => 100,
                'previous_balance' => 14,
                'new_balance' => 114,
                'description' => "Bonus Afiliasi: Teman (@{$viktor->username}) telah menyelesaikan pertandingan pertama (+100 BP)",
                'idempotency_key' => "seed_aff_demo_{$viktor->id}",
            ]);
            $demoBalance->battle_points = 114;
            $demoBalance->save();
        }

        $jonatan = $createdPlayers[3] ?? null;
        if ($jonatan) {
            $jonatan->referred_by_id = $demoUser->id;
            $jonatan->save();

            Referral::create([
                'referrer_id' => $demoUser->id,
                'referred_id' => $jonatan->id,
                'status' => Referral::STATUS_PENDING,
                'reward_points' => 100,
            ]);
        }
    }
}
