<?php

namespace Tests\Feature;

use App\Models\GameMatch;
use App\Models\MatchPlayer;
use App\Models\PlayerPointBalance;
use App\Models\PointTransaction;
use App\Models\Season;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\TeamMessage;
use App\Models\User;
use App\Services\MatchResultService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeamManagementAndPointRulesTest extends TestCase
{
    use RefreshDatabase;

    protected function createUser(string $name, string $role = 'player', int $bp = 0, int $rp = 0): User
    {
        $id = uniqid();
        $user = User::create([
            'name' => $name,
            'username' => strtolower(str_replace(' ', '_', $name)) . '_' . $id,
            'email' => "user_{$id}@test.com",
            'password' => bcrypt('password123'),
            'role' => $role,
            'status' => 'active',
        ]);

        PlayerPointBalance::create([
            'user_id' => $user->id,
            'battle_points' => $bp,
            'rank_points' => $rp,
        ]);

        return $user;
    }

    /**
     * Test 1: Admin can create a new admin and change user role.
     */
    public function test_admin_user_management(): void
    {
        $admin = $this->createUser('Admin Leader', 'admin');
        $player = $this->createUser('Regular Player', 'player');

        // 1. Promote player to admin
        $response = $this->actingAs($admin)->postJson("/api/v1/admin/users/{$player->id}/change-role", [
            'role' => 'admin',
        ]);
        $response->assertStatus(200);
        $this->assertEquals('admin', $player->fresh()->role);

        // 2. Demote back to player
        $response = $this->actingAs($admin)->postJson("/api/v1/admin/users/{$player->id}/change-role", [
            'role' => 'player',
        ]);
        $response->assertStatus(200);
        $this->assertEquals('player', $player->fresh()->role);

        // 3. Admin cannot demote themselves
        $response = $this->actingAs($admin)->postJson("/api/v1/admin/users/{$admin->id}/change-role", [
            'role' => 'player',
        ]);
        $response->assertStatus(400);

        // 4. Create new admin directly
        $newAdminUsername = 'new_admin_' . uniqid();
        $newAdminData = [
            'name' => 'New System Admin',
            'username' => $newAdminUsername,
            'email' => $newAdminUsername . '@test.com',
            'password' => 'SecurePass123!',
            'role' => 'admin',
            'city' => 'Jakarta',
        ];
        $response = $this->actingAs($admin)->postJson('/api/v1/admin/users', $newAdminData);
        $response->assertStatus(201);
        $this->assertDatabaseHas('users', [
            'username' => $newAdminUsername,
            'role' => 'admin',
        ]);
    }

    /**
     * Test 2: Team creation costs 1000 BP for 10 members, and quota upgrade costs 1000 BP per +10 members.
     */
    public function test_team_creation_and_quota_upgrade(): void
    {
        $user = $this->createUser('Team Creator', 'player', 500, 0);

        // Try creating team with only 500 BP -> should fail
        $response = $this->actingAs($user)->postJson('/api/v1/teams', [
            'name' => 'Garuda Smash Team ' . uniqid(),
        ]);
        $response->assertStatus(422);

        // Give user 2500 BP
        $user->pointBalance->update(['battle_points' => 2500]);

        // Create team -> should deduct 1000 BP and set max_members to 10
        $teamName = 'Eagle Smash ' . uniqid();
        $response = $this->actingAs($user)->postJson('/api/v1/teams', [
            'name' => $teamName,
            'city' => 'Bandung',
            'description' => 'Elite Badminton Team',
        ]);
        $response->assertStatus(201);

        $team = Team::where('name', $teamName)->first();
        $this->assertNotNull($team);
        $this->assertEquals(10, $team->max_members);
        $this->assertEquals(1500, $user->fresh()->pointBalance->battle_points); // 2500 - 1000 = 1500

        // Verify PointTransaction logged
        $this->assertDatabaseHas('point_transactions', [
            'user_id' => $user->id,
            'category' => PointTransaction::CAT_TEAM_CREATION,
            'amount' => -1000,
        ]);

        // Verify creator is LEADER
        $this->assertDatabaseHas('team_members', [
            'team_id' => $team->id,
            'user_id' => $user->id,
            'role' => 'LEADER',
            'status' => 'ACTIVE',
        ]);

        // Upgrade quota +10 members (multiplier = 1 -> costs 1000 BP)
        $response = $this->actingAs($user)->postJson("/api/v1/teams/{$team->id}/upgrade-quota", [
            'multiplier' => 1,
        ]);
        $response->assertStatus(200);

        $team->refresh();
        $this->assertEquals(20, $team->max_members); // 10 + 10 = 20
        $this->assertEquals(500, $user->fresh()->pointBalance->battle_points); // 1500 - 1000 = 500

        // Verify PointTransaction logged for upgrade
        $this->assertDatabaseHas('point_transactions', [
            'user_id' => $user->id,
            'category' => PointTransaction::CAT_TEAM_UPGRADE,
            'amount' => -1000,
        ]);
    }

    /**
     * Test 3: Team Point Rules:
     * Battle Win: +5 BP, Battle Loss: +2 BP
     * Ranked Entry: -5 BP, Ranked Win: +5 RP, Ranked Loss: -2 RP
     */
    public function test_team_point_rules(): void
    {
        $matchResultService = app(MatchResultService::class);

        $season = Season::create([
            'name' => 'Test Season',
            'code' => 'TS-' . uniqid(),
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonths(6)->toDateString(),
            'is_active' => true,
            'status' => 'active',
        ]);

        // Player A in a Team (100 BP)
        $playerA = $this->createUser('Player A Team', 'player', 100, 0);
        $team = Team::create([
            'name' => 'Team Alpha ' . uniqid(),
            'code' => 'TM-A' . uniqid(),
            'creator_id' => $playerA->id,
            'max_members' => 10,
        ]);
        TeamMember::create([
            'team_id' => $team->id,
            'user_id' => $playerA->id,
            'role' => 'LEADER',
            'status' => 'ACTIVE',
        ]);

        // Player B Solo (No Team) (100 BP)
        $playerB = $this->createUser('Player B Solo', 'player', 100, 0);

        // 1. Battle Match: Team Player A wins (+5 BP), Solo Player B loses (+1 BP)
        $battleMatch = GameMatch::create([
            'match_code' => 'M-BAT-' . uniqid(),
            'season_id' => $season->id,
            'creator_id' => $playerA->id,
            'type' => 'BATTLE',
            'mode' => 'SINGLES',
            'venue' => 'Court 1',
            'scheduled_at' => now(),
            'status' => 'READY',
            'winning_team' => 'TEAM_A',
            'current_score_version' => 1,
        ]);
        MatchPlayer::create(['match_id' => $battleMatch->id, 'user_id' => $playerA->id, 'team' => 'TEAM_A', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);
        MatchPlayer::create(['match_id' => $battleMatch->id, 'user_id' => $playerB->id, 'team' => 'TEAM_B', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);

        $matchResultService->completeMatchAndAwardPoints($battleMatch);

        // Player A (Team member win) -> +5 BP (100 + 5 = 105)
        $this->assertEquals(105, $playerA->fresh()->pointBalance->battle_points);
        // Player B (Solo loss) -> +1 BP (100 + 1 = 101)
        $this->assertEquals(101, $playerB->fresh()->pointBalance->battle_points);

        // 2. Ranked Match Entry: Team Player A gets -5 BP, Solo Player B gets -3 BP
        $rankedMatch = GameMatch::create([
            'match_code' => 'M-RNK-' . uniqid(),
            'season_id' => $season->id,
            'creator_id' => $playerA->id,
            'type' => 'RANKED',
            'mode' => 'SINGLES',
            'venue' => 'Court 2',
            'scheduled_at' => now(),
            'status' => 'PENDING_ACCEPTANCE',
            'current_score_version' => 0,
        ]);
        MatchPlayer::create(['match_id' => $rankedMatch->id, 'user_id' => $playerA->id, 'team' => 'TEAM_A', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);
        MatchPlayer::create(['match_id' => $rankedMatch->id, 'user_id' => $playerB->id, 'team' => 'TEAM_B', 'slot' => 1, 'invitation_status' => 'ACCEPTED']);

        $matchResultService->validateAndSetReady($rankedMatch);

        // Player A was deducted 5 BP: 105 - 5 = 100
        $this->assertEquals(100, $playerA->fresh()->pointBalance->battle_points);
        // Player B was deducted 3 BP: 101 - 3 = 98
        $this->assertEquals(98, $playerB->fresh()->pointBalance->battle_points);

        // 3. Ranked Match Award: Team Player A wins (+5 RP), Solo Player B loses (-1 RP)
        $rankedMatch->winning_team = 'TEAM_A';
        $rankedMatch->status = 'WAITING_APPROVAL';
        $rankedMatch->save();

        $matchResultService->completeMatchAndAwardPoints($rankedMatch);

        // Player A (Team member win) -> +5 RP
        $this->assertEquals(5, $playerA->fresh()->pointBalance->rank_points);
        // Player B (Solo loss) -> -1 RP
        $this->assertEquals(-1, $playerB->fresh()->pointBalance->rank_points);
    }

    /**
     * Test 4: Team Group Chat: Non-team member blocked (403), team member can send and receive.
     */
    public function test_team_chat_access_control(): void
    {
        $nonTeamUser = $this->createUser('Solo Player Non Team');

        // Non team member tries to read messages -> 403 Forbidden
        $response = $this->actingAs($nonTeamUser)->getJson('/api/v1/teams/my-team/messages');
        $response->assertStatus(403);

        // Non team member tries to send message -> 403 Forbidden
        $response = $this->actingAs($nonTeamUser)->postJson('/api/v1/teams/my-team/messages', [
            'message' => 'Hello team!',
        ]);
        $response->assertStatus(403);

        // Team member
        $teamLeader = $this->createUser('Team Leader Player');
        $team = Team::create([
            'name' => 'Chat Team ' . uniqid(),
            'code' => 'TM-C' . uniqid(),
            'creator_id' => $teamLeader->id,
            'max_members' => 10,
        ]);
        TeamMember::create([
            'team_id' => $team->id,
            'user_id' => $teamLeader->id,
            'role' => 'LEADER',
            'status' => 'ACTIVE',
        ]);

        // Send message
        $response = $this->actingAs($teamLeader)->postJson('/api/v1/teams/my-team/messages', [
            'message' => 'Latihan bersama besok jam 7 malam ya!',
        ]);
        $response->assertStatus(201);
        $this->assertDatabaseHas('team_messages', [
            'team_id' => $team->id,
            'user_id' => $teamLeader->id,
            'message' => 'Latihan bersama besok jam 7 malam ya!',
        ]);

        // Retrieve messages
        $response = $this->actingAs($teamLeader)->getJson('/api/v1/teams/my-team/messages');
        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }
}
