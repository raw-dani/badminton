<?php

namespace Tests\Feature;

use App\Models\GameMatch;
use App\Models\MatchPlayer;
use App\Models\MatchScore;
use App\Models\PlayerPointBalance;
use App\Models\Season;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\TeamSeasonScore;
use App\Models\TeamWar;
use App\Models\User;
use App\Services\MatchResultService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeamWarAndSeasonScoreTest extends TestCase
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

    public function test_team_war_lifecycle_and_point_rules()
    {
        $season = Season::create([
            'name' => 'Season 1 2026',
            'code' => 'S1-2026',
            'start_date' => now()->startOfYear(),
            'end_date' => now()->endOfYear(),
            'is_active' => true,
            'status' => 'active',
        ]);

        // Create Captain & Member for Team 1 (Garuda)
        $captain1 = $this->createUser('Garuda Captain', 'player', 2000, 100);
        $player1 = $this->createUser('Garuda Player', 'player', 500, 100);

        $team1 = Team::create([
            'name' => 'PB Garuda',
            'code' => 'TM-GARUDA',
            'creator_id' => $captain1->id,
            'max_members' => 10,
            'battle_points_spent' => 1000,
            'status' => 'ACTIVE',
        ]);
        TeamMember::create(['team_id' => $team1->id, 'user_id' => $captain1->id, 'role' => 'LEADER', 'status' => 'ACTIVE']);
        TeamMember::create(['team_id' => $team1->id, 'user_id' => $player1->id, 'role' => 'MEMBER', 'status' => 'ACTIVE']);

        // Create Captain & Member for Team 2 (Rajawali)
        $captain2 = $this->createUser('Rajawali Captain', 'player', 2000, 100);
        $player2 = $this->createUser('Rajawali Player', 'player', 500, 100);

        $team2 = Team::create([
            'name' => 'PB Rajawali',
            'code' => 'TM-RAJAWALI',
            'creator_id' => $captain2->id,
            'max_members' => 10,
            'battle_points_spent' => 1000,
            'status' => 'ACTIVE',
        ]);
        TeamMember::create(['team_id' => $team2->id, 'user_id' => $captain2->id, 'role' => 'LEADER', 'status' => 'ACTIVE']);
        TeamMember::create(['team_id' => $team2->id, 'user_id' => $player2->id, 'role' => 'MEMBER', 'status' => 'ACTIVE']);

        // 1. Captain 1 proposes War Challenge to Team 2
        $response = $this->actingAs($captain1)->postJson('/api/v1/teams/wars', [
            'challenged_team_id' => $team2->id,
            'total_matches' => 1,
            'scheduled_at' => now()->addDays(2)->toDateTimeString(),
            'venue' => 'GOR Sudirman',
            'notes' => 'War persahabatan 1 match singles',
        ]);

        $response->assertStatus(201);
        $warId = $response->json('data.id');
        $this->assertDatabaseHas('team_wars', [
            'id' => $warId,
            'challenger_team_id' => $team1->id,
            'challenged_team_id' => $team2->id,
            'status' => 'PENDING',
        ]);

        // Non-admin member cannot accept war
        $this->actingAs($player2)->postJson("/api/v1/teams/wars/{$warId}/accept")->assertStatus(403);

        // 2. Captain 2 accepts the War Challenge
        $acceptRes = $this->actingAs($captain2)->postJson("/api/v1/teams/wars/{$warId}/accept");
        $acceptRes->assertStatus(200);
        $this->assertDatabaseHas('team_wars', ['id' => $warId, 'status' => 'ACCEPTED']);

        // 3. Create War Match: Player 1 (Team 1) vs Player 2 (Team 2)
        $matchRes = $this->actingAs($captain1)->postJson("/api/v1/teams/wars/{$warId}/matches", [
            'type' => 'BATTLE',
            'mode' => 'SINGLES',
            'team_a_player_ids' => [$player1->id],
            'team_b_player_ids' => [$player2->id],
        ]);

        $matchRes->assertStatus(201);
        $matchId = $matchRes->json('data.id');
        $this->assertDatabaseHas('matches', [
            'id' => $matchId,
            'team_war_id' => $warId,
            'team_a_team_id' => $team1->id,
            'team_b_team_id' => $team2->id,
            'status' => 'READY',
        ]);

        // 4. Simulate match completion with Team A (Player 1 / Garuda) winning
        $gameMatch = GameMatch::find($matchId);
        $gameMatch->winning_team = 'TEAM_A';
        $gameMatch->save();

        MatchScore::create([
            'match_id' => $gameMatch->id,
            'set_number' => 1,
            'team_a_score' => 21,
            'team_b_score' => 18,
            'version' => 1,
        ]);
        MatchScore::create([
            'match_id' => $gameMatch->id,
            'set_number' => 2,
            'team_a_score' => 21,
            'team_b_score' => 15,
            'version' => 1,
        ]);

        $matchResultService = app(MatchResultService::class);
        $matchResultService->completeMatchAndAwardPoints($gameMatch);

        // Check Team Scores for War:
        // Winner (Team 1) gets +5 team score
        // Loser (Team 2) gets -1 team score
        $team1Score = TeamSeasonScore::where('team_id', $team1->id)->where('season_id', $season->id)->first();
        $team2Score = TeamSeasonScore::where('team_id', $team2->id)->where('season_id', $season->id)->first();

        $this->assertNotNull($team1Score);
        $this->assertEquals(5, $team1Score->score);
        $this->assertEquals(5, $team1Score->war_points);
        $this->assertEquals(1, $team1Score->war_wins);

        $this->assertNotNull($team2Score);
        $this->assertEquals(-1, $team2Score->score);
        $this->assertEquals(-1, $team2Score->war_points);
        $this->assertEquals(1, $team2Score->war_losses);

        // Check War Status & Score
        $war = TeamWar::find($warId);
        $this->assertEquals(1, $war->challenger_score);
        $this->assertEquals(0, $war->challenged_score);
        $this->assertEquals('COMPLETED', $war->status);
        $this->assertEquals($team1->id, $war->winner_team_id);

        // Check Player Points (Requirement 3):
        // Battle match with team bonus: Player 1 (winner) gets +5 BP; Player 2 (loser) gets +2 BP
        $p1Balance = PlayerPointBalance::where('user_id', $player1->id)->first();
        $p2Balance = PlayerPointBalance::where('user_id', $player2->id)->first();
        $this->assertEquals(505, $p1Balance->battle_points);
        $this->assertEquals(502, $p2Balance->battle_points);

        // 5. Test Regular Match: playing a regular match gives +3 Team Score to any participating team (Requirement 4)
        $regMatch = GameMatch::create([
            'match_code' => 'M-REGULAR-1',
            'season_id' => $season->id,
            'creator_id' => $player1->id,
            'type' => 'BATTLE',
            'mode' => 'SINGLES',
            'venue' => 'Court 1',
            'scheduled_at' => now(),
            'status' => 'READY',
            'winning_team' => 'TEAM_A',
        ]);
        MatchPlayer::create(['match_id' => $regMatch->id, 'user_id' => $player1->id, 'team' => 'TEAM_A', 'invitation_status' => 'ACCEPTED']);
        MatchPlayer::create(['match_id' => $regMatch->id, 'user_id' => $player2->id, 'team' => 'TEAM_B', 'invitation_status' => 'ACCEPTED']);

        MatchScore::create(['match_id' => $regMatch->id, 'set_number' => 1, 'team_a_score' => 21, 'team_b_score' => 19, 'version' => 1]);
        MatchScore::create(['match_id' => $regMatch->id, 'set_number' => 2, 'team_a_score' => 21, 'team_b_score' => 16, 'version' => 1]);

        $matchResultService->completeMatchAndAwardPoints($regMatch);

        // Both teams had a member play in regular match -> both get +3 team score!
        $team1Score->refresh();
        $team2Score->refresh();
        $this->assertEquals(8, $team1Score->score); // 5 + 3 = 8
        $this->assertEquals(2, $team2Score->score); // -1 + 3 = 2

        // 6. Test Team Leaderboard endpoint
        $lbRes = $this->getJson('/api/v1/teams/leaderboard');
        $lbRes->assertStatus(200);
        $items = $lbRes->json('data.leaderboard.data');
        $this->assertCount(2, $items);
        $this->assertEquals($team1->id, $items[0]['team_id']);
        $this->assertEquals(8, $items[0]['score']);
        $this->assertEquals($team2->id, $items[1]['team_id']);
        $this->assertEquals(2, $items[1]['score']);
    }
}
