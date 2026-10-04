<?php

namespace Tests\Feature;

use App\Models\GameMatch;
use App\Models\MatchInvitation;
use App\Models\MatchPlayer;
use App\Models\PlayerPointBalance;
use App\Models\PlayerProfile;
use App\Models\PointTransaction;
use App\Models\Season;
use App\Models\User;
use App\Services\BattlePointService;
use App\Services\LeaderboardService;
use App\Services\MatchResultService;
use App\Services\RankPointService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\TestCase;

class BadmintonLeagueBusinessRulesTest extends TestCase
{
    use RefreshDatabase;

    protected Season $season;
    protected User $playerA;
    protected User $playerB;
    protected User $playerC;
    protected User $playerD;
    protected User $admin;

    protected BattlePointService $battlePointService;
    protected RankPointService $rankPointService;
    protected MatchResultService $matchResultService;
    protected LeaderboardService $leaderboardService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->battlePointService = app(BattlePointService::class);
        $this->rankPointService = app(RankPointService::class);
        $this->matchResultService = app(MatchResultService::class);
        $this->leaderboardService = app(LeaderboardService::class);

        $this->season = Season::create([
            'name' => 'Test Season 2026',
            'code' => 'TEST-2026',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonths(3)->toDateString(),
            'is_active' => true,
            'status' => 'active',
        ]);

        $this->playerA = $this->createPlayer('Player A', 'playera', 10, 0);
        $this->playerB = $this->createPlayer('Player B', 'playerb', 10, 0);
        $this->playerC = $this->createPlayer('Player C', 'playerc', 10, 0);
        $this->playerD = $this->createPlayer('Player D', 'playerd', 10, 0);

        $this->admin = User::create([
            'name' => 'Admin User',
            'username' => 'adminuser',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
        ]);
    }

    protected function createPlayer(string $name, string $username, int $bp = 0, int $rp = 0): User
    {
        $user = User::create([
            'name' => $name,
            'username' => $username,
            'email' => "{$username}@test.com",
            'password' => bcrypt('password'),
            'role' => 'player',
            'status' => 'active',
        ]);

        PlayerProfile::create([
            'user_id' => $user->id,
            'player_code' => 'BCL-' . str_pad((string) $user->id, 4, '0', STR_PAD_LEFT),
            'city' => 'Jakarta',
            'visibility' => 'public',
        ]);

        PlayerPointBalance::create([
            'user_id' => $user->id,
            'battle_points' => $bp,
            'rank_points' => $rp,
        ]);

        return $user;
    }

    /**
     * Rule 19.1: Battle Points must NEVER become negative.
     */
    public function test_battle_points_cannot_become_negative(): void
    {
        $poorPlayer = $this->createPlayer('Poor Player', 'poorplayer', 2, 0);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Battle Points cannot become negative');

        // Trying to deduct 3 BP when only 2 BP available
        $this->battlePointService->adjustPoints(
            userId: $poorPlayer->id,
            changeAmount: -3,
            category: PointTransaction::CAT_RANKED_MATCH_ENTRY_DEDUCTION,
            description: 'Test deduction'
        );
    }

    /**
     * Rule 19.2: Rank Points ARE ALLOWED to become negative.
     */
    public function test_rank_points_are_allowed_to_become_negative(): void
    {
        $player = $this->createPlayer('Zero Player', 'zeroplayer', 5, 0);

        // Deduct 2 RP
        $balance = $this->rankPointService->adjustPoints(
            userId: $player->id,
            changeAmount: -2,
            category: PointTransaction::CAT_RANKED_MATCH_LOSS,
            description: 'Ranked loss test'
        );

        $this->assertEquals(-2, $balance->rank_points);

        // Verify permanent ledger transaction was recorded
        $tx = PointTransaction::where('user_id', $player->id)->where('point_type', 'RANK')->latest()->first();
        $this->assertNotNull($tx);
        $this->assertEquals(-2, $tx->amount);
        $this->assertEquals(-2, $tx->new_balance);
    }

    /**
     * Rule 19.3: Ranked Match entry requires at least 3 Battle Points.
     */
    public function test_ranked_match_requires_minimum_3_battle_points(): void
    {
        $insufficientPlayer = $this->createPlayer('Low BP', 'lowbp', 2, 0);

        $match = GameMatch::create([
            'match_code' => 'M-TEST-001',
            'season_id' => $this->season->id,
            'creator_id' => $this->playerA->id,
            'type' => 'RANKED',
            'mode' => 'SINGLES',
            'venue' => 'Arena',
            'scheduled_at' => now()->addDay(),
            'status' => 'PENDING_ACCEPTANCE',
        ]);

        MatchPlayer::create(['match_id' => $match->id, 'user_id' => $this->playerA->id, 'team' => 'TEAM_A', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);
        MatchPlayer::create(['match_id' => $match->id, 'user_id' => $insufficientPlayer->id, 'team' => 'TEAM_B', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('insufficient Battle Points');

        // Cannot become READY
        $this->matchResultService->validateAndSetReady($match);
    }

    /**
     * Rule 19.3: Ranked Battle Points deduction occurs ONLY when all accept and match becomes READY.
     */
    public function test_ranked_deduction_occurs_only_when_match_becomes_ready(): void
    {
        $match = GameMatch::create([
            'match_code' => 'M-TEST-002',
            'season_id' => $this->season->id,
            'creator_id' => $this->playerA->id,
            'type' => 'RANKED',
            'mode' => 'SINGLES',
            'venue' => 'Arena',
            'scheduled_at' => now()->addDay(),
            'status' => 'PENDING_ACCEPTANCE',
        ]);

        $mp1 = MatchPlayer::create(['match_id' => $match->id, 'user_id' => $this->playerA->id, 'team' => 'TEAM_A', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);
        $mp2 = MatchPlayer::create(['match_id' => $match->id, 'user_id' => $this->playerB->id, 'team' => 'TEAM_B', 'slot' => 1, 'invitation_status' => 'PENDING']);

        // While Player B is PENDING, balances must remain untouched (10 BP each)
        $this->assertEquals(10, $this->playerA->pointBalance->fresh()->battle_points);
        $this->assertEquals(10, $this->playerB->pointBalance->fresh()->battle_points);

        // Player B accepts
        $mp2->invitation_status = 'ACCEPTED';
        $mp2->save();

        $this->matchResultService->validateAndSetReady($match);

        // After READY transition, exactly 3 BP deducted from each player
        $this->assertEquals('READY', $match->fresh()->status);
        $this->assertEquals(7, $this->playerA->pointBalance->fresh()->battle_points);
        $this->assertEquals(7, $this->playerB->pointBalance->fresh()->battle_points);
        $this->assertTrue($match->fresh()->battle_deducted);
    }

    /**
     * Rule 19.4: Singles score approval requires 100% (2 of 2) participants.
     */
    public function test_singles_score_approval_requires_both_participants(): void
    {
        $match = GameMatch::create([
            'match_code' => 'M-TEST-003',
            'season_id' => $this->season->id,
            'creator_id' => $this->playerA->id,
            'type' => 'BATTLE',
            'mode' => 'SINGLES',
            'venue' => 'Arena',
            'scheduled_at' => now(),
            'status' => 'READY',
            'current_score_version' => 0,
        ]);
        MatchPlayer::create(['match_id' => $match->id, 'user_id' => $this->playerA->id, 'team' => 'TEAM_A', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);
        MatchPlayer::create(['match_id' => $match->id, 'user_id' => $this->playerB->id, 'team' => 'TEAM_B', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);

        // Player A submits score
        $this->matchResultService->submitScore($match, $this->playerA->id, [
            ['set_number' => 1, 'team_a_score' => 21, 'team_b_score' => 17],
            ['set_number' => 2, 'team_a_score' => 21, 'team_b_score' => 15],
        ]);

        $match->refresh();
        // Status must be WAITING_APPROVAL (Player B hasn't approved yet)
        $this->assertEquals('WAITING_APPROVAL', $match->status);
        $this->assertFalse($match->points_awarded);

        // Player B approves
        $this->matchResultService->approveScore($match, $this->playerB->id, $match->current_score_version);

        $match->refresh();
        // Now match is COMPLETED and points awarded
        $this->assertEquals('COMPLETED', $match->status);
        $this->assertTrue($match->points_awarded);

        // Player A (Winner) +3 BP, Player B (Loser) +1 BP
        $this->assertEquals(13, $this->playerA->pointBalance->fresh()->battle_points);
        $this->assertEquals(11, $this->playerB->pointBalance->fresh()->battle_points);
    }

    /**
     * Rule 19.4: Doubles score approval requires all 4 participants.
     */
    public function test_doubles_score_approval_requires_all_four_participants(): void
    {
        $match = GameMatch::create([
            'match_code' => 'M-TEST-004',
            'season_id' => $this->season->id,
            'creator_id' => $this->playerA->id,
            'type' => 'BATTLE',
            'mode' => 'DOUBLES',
            'venue' => 'Arena',
            'scheduled_at' => now(),
            'status' => 'READY',
            'current_score_version' => 0,
        ]);
        MatchPlayer::create(['match_id' => $match->id, 'user_id' => $this->playerA->id, 'team' => 'TEAM_A', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);
        MatchPlayer::create(['match_id' => $match->id, 'user_id' => $this->playerB->id, 'team' => 'TEAM_A', 'slot' => 2, 'invitation_status' => 'ACCEPTED']);
        MatchPlayer::create(['match_id' => $match->id, 'user_id' => $this->playerC->id, 'team' => 'TEAM_B', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);
        MatchPlayer::create(['match_id' => $match->id, 'user_id' => $this->playerD->id, 'team' => 'TEAM_B', 'slot' => 2, 'invitation_status' => 'ACCEPTED']);

        // Player A submits score
        $this->matchResultService->submitScore($match, $this->playerA->id, [
            ['set_number' => 1, 'team_a_score' => 21, 'team_b_score' => 19],
            ['set_number' => 2, 'team_a_score' => 21, 'team_b_score' => 14],
        ]);

        $match->refresh();
        $this->assertEquals('WAITING_APPROVAL', $match->status);

        // Player B approves
        $this->matchResultService->approveScore($match, $this->playerB->id, $match->current_score_version);
        $this->assertEquals('WAITING_APPROVAL', $match->fresh()->status);

        // Player C approves
        $this->matchResultService->approveScore($match, $this->playerC->id, $match->current_score_version);
        $this->assertEquals('WAITING_APPROVAL', $match->fresh()->status);

        // Player D approves (4th of 4)
        $this->matchResultService->approveScore($match, $this->playerD->id, $match->current_score_version);

        // Now COMPLETED!
        $this->assertEquals('COMPLETED', $match->fresh()->status);
        $this->assertTrue($match->fresh()->points_awarded);

        // Team A (Player A & B) each get +3 BP
        $this->assertEquals(13, $this->playerA->pointBalance->fresh()->battle_points);
        $this->assertEquals(13, $this->playerB->pointBalance->fresh()->battle_points);

        // Team B (Player C & D) each get +1 BP
        $this->assertEquals(11, $this->playerC->pointBalance->fresh()->battle_points);
        $this->assertEquals(11, $this->playerD->pointBalance->fresh()->battle_points);
    }

    /**
     * Rule 19.5: Score update creates new version and resets all previous approvals.
     */
    public function test_score_update_resets_previous_approvals(): void
    {
        $match = GameMatch::create([
            'match_code' => 'M-TEST-005',
            'season_id' => $this->season->id,
            'creator_id' => $this->playerA->id,
            'type' => 'BATTLE',
            'mode' => 'SINGLES',
            'venue' => 'Arena',
            'scheduled_at' => now(),
            'status' => 'READY',
            'current_score_version' => 0,
        ]);
        MatchPlayer::create(['match_id' => $match->id, 'user_id' => $this->playerA->id, 'team' => 'TEAM_A', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);
        MatchPlayer::create(['match_id' => $match->id, 'user_id' => $this->playerB->id, 'team' => 'TEAM_B', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);

        // Version 1 submitted by Player A
        $this->matchResultService->submitScore($match, $this->playerA->id, [
            ['set_number' => 1, 'team_a_score' => 21, 'team_b_score' => 10],
            ['set_number' => 2, 'team_a_score' => 21, 'team_b_score' => 12],
        ]);

        $this->assertEquals(1, $match->fresh()->current_score_version);

        // Player B updates score to Version 2
        $this->matchResultService->submitScore($match, $this->playerB->id, [
            ['set_number' => 1, 'team_a_score' => 18, 'team_b_score' => 21],
            ['set_number' => 2, 'team_a_score' => 17, 'team_b_score' => 21],
        ]);

        $match->refresh();
        $this->assertEquals(2, $match->current_score_version);

        // Try to approve stale version 1 -> Must be rejected!
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('latest score version');

        $this->matchResultService->approveScore($match, $this->playerA->id, 1);
    }

    /**
     * Rule 19.9: Match dispute prevents point awards until resolved.
     */
    public function test_match_dispute_prevents_point_awards(): void
    {
        $match = GameMatch::create([
            'match_code' => 'M-TEST-006',
            'season_id' => $this->season->id,
            'creator_id' => $this->playerA->id,
            'type' => 'RANKED',
            'mode' => 'SINGLES',
            'venue' => 'Arena',
            'scheduled_at' => now(),
            'status' => 'READY',
            'current_score_version' => 0,
            'battle_deducted' => true,
        ]);
        MatchPlayer::create(['match_id' => $match->id, 'user_id' => $this->playerA->id, 'team' => 'TEAM_A', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);
        MatchPlayer::create(['match_id' => $match->id, 'user_id' => $this->playerB->id, 'team' => 'TEAM_B', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);

        // Score submitted
        $this->matchResultService->submitScore($match, $this->playerA->id, [
            ['set_number' => 1, 'team_a_score' => 21, 'team_b_score' => 15],
            ['set_number' => 2, 'team_a_score' => 21, 'team_b_score' => 18],
        ]);

        // Player B disputes
        $this->matchResultService->disputeScore($match, $this->playerB->id, 'Disputed line call at match point.');

        $match->refresh();
        $this->assertEquals('DISPUTED', $match->status);
        $this->assertFalse($match->points_awarded);

        // Balances remain unchanged
        $this->assertEquals(0, $this->playerA->pointBalance->fresh()->rank_points);
        $this->assertEquals(0, $this->playerB->pointBalance->fresh()->rank_points);
    }

    /**
     * Rule 19.10: Ranked match cancellation refunds deducted Battle Points.
     */
    public function test_ranked_match_cancellation_refunds_battle_points(): void
    {
        $match = GameMatch::create([
            'match_code' => 'M-TEST-007',
            'season_id' => $this->season->id,
            'creator_id' => $this->playerA->id,
            'type' => 'RANKED',
            'mode' => 'SINGLES',
            'venue' => 'Arena',
            'scheduled_at' => now()->addDay(),
            'status' => 'PENDING_ACCEPTANCE',
        ]);
        MatchPlayer::create(['match_id' => $match->id, 'user_id' => $this->playerA->id, 'team' => 'TEAM_A', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);
        MatchPlayer::create(['match_id' => $match->id, 'user_id' => $this->playerB->id, 'team' => 'TEAM_B', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);

        // Ready transitions and deducts 3 BP
        $this->matchResultService->validateAndSetReady($match);
        $this->assertEquals(7, $this->playerA->pointBalance->fresh()->battle_points);
        $this->assertEquals(7, $this->playerB->pointBalance->fresh()->battle_points);

        // Cancel match
        $this->matchResultService->cancelMatchAndRefund($match, 'Rain delay venue closed', $this->playerA->id);

        $this->assertEquals('CANCELLED', $match->fresh()->status);
        // Both players refunded +3 BP
        $this->assertEquals(10, $this->playerA->pointBalance->fresh()->battle_points);
        $this->assertEquals(10, $this->playerB->pointBalance->fresh()->battle_points);

        // Ledger must have refund transactions
        $refundTx = PointTransaction::where('match_id', $match->id)
            ->where('category', PointTransaction::CAT_RANKED_MATCH_REFUND)
            ->get();
        $this->assertCount(2, $refundTx);
    }

    /**
     * Rule 19.6 & 19.7: Leaderboards properly sort players deterministically.
     */
    public function test_leaderboards_sort_deterministically(): void
    {
        $this->playerA->pointBalance->update(['battle_points' => 30, 'rank_points' => 15, 'total_wins' => 10, 'total_matches' => 10]);
        $this->playerB->pointBalance->update(['battle_points' => 20, 'rank_points' => 25, 'total_wins' => 8, 'total_matches' => 9]);
        $this->playerC->pointBalance->update(['battle_points' => 15, 'rank_points' => -3, 'total_wins' => 2, 'total_matches' => 8]);

        // Battle Leaderboard
        $battleBoard = $this->leaderboardService->getBattleLeaderboard();
        $this->assertEquals($this->playerA->id, $battleBoard['data'][0]['user_id']);
        $this->assertEquals($this->playerB->id, $battleBoard['data'][1]['user_id']);

        // Rank Leaderboard (Negative RP supported)
        $rankBoard = $this->leaderboardService->getRankLeaderboard();
        $this->assertEquals($this->playerB->id, $rankBoard['data'][0]['user_id']); // 25 RP
        $this->assertEquals($this->playerA->id, $rankBoard['data'][1]['user_id']); // 15 RP
        $lastPlayer = $rankBoard['data']->last();
        $this->assertEquals(-3, $lastPlayer['rank_points']);
    }

    /**
     * Rule 18: Security - unauthorized profile modification is blocked.
     */
    public function test_user_cannot_edit_another_players_profile(): void
    {
        $this->actingAs($this->playerA);

        $response = $this->putJson('/api/v1/players/profile', [
            'name' => 'Hacked Name',
            'city' => 'Singapore',
            'visibility' => 'public',
        ]);

        $response->assertStatus(200);
        $this->assertEquals('Hacked Name', $this->playerA->fresh()->name);
        $this->assertEquals('Player B', $this->playerB->fresh()->name); // Player B untouched
    }

    public function test_show_match_returns_current_approvals(): void
    {
        $match = GameMatch::create([
            'match_code' => 'M-TEST-APP1',
            'season_id' => $this->season->id,
            'creator_id' => $this->playerA->id,
            'type' => 'BATTLE',
            'mode' => 'SINGLES',
            'venue' => 'Arena',
            'scheduled_at' => now(),
            'status' => 'READY',
            'current_score_version' => 0,
        ]);
        MatchPlayer::create(['match_id' => $match->id, 'user_id' => $this->playerA->id, 'team' => 'TEAM_A', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);
        MatchPlayer::create(['match_id' => $match->id, 'user_id' => $this->playerB->id, 'team' => 'TEAM_B', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);

        // Player A submits score
        $this->matchResultService->submitScore($match, $this->playerA->id, [
            ['set_number' => 1, 'team_a_score' => 21, 'team_b_score' => 15],
            ['set_number' => 2, 'team_a_score' => 21, 'team_b_score' => 17],
        ]);

        $response = $this->actingAs($this->playerB)->getJson("/api/v1/matches/{$match->id}");
        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertNotEmpty($data['current_approvals']);
        $this->assertEquals('APPROVED', $data['current_approvals'][0]['status']);
        $this->assertEquals('WAITING_APPROVAL', $data['status']);

        // Player B calls approve API endpoint
        $approveResponse = $this->actingAs($this->playerB)->postJson("/api/v1/matches/{$match->id}/approve", [
            'version' => 1,
        ]);
        $approveResponse->assertStatus(200);
        $approveData = $approveResponse->json('data');

        $this->assertEquals('COMPLETED', $approveData['status']);
        $this->assertCount(2, $approveData['current_approvals']);
        $this->assertEquals('APPROVED', $approveData['current_approvals'][0]['status']);
        $this->assertEquals('APPROVED', $approveData['current_approvals'][1]['status']);
    }
}

