<?php

namespace Tests\Feature;

use App\Models\GameMatch;
use App\Models\MatchComment;
use App\Models\MatchPlayer;
use App\Models\PlayerPointBalance;
use App\Models\Season;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MatchPhotoAndCommentsTest extends TestCase
{
    use RefreshDatabase;

    protected function createUser(string $name): User
    {
        $id = uniqid();
        $user = User::create([
            'name' => $name,
            'username' => strtolower(str_replace(' ', '_', $name)) . '_' . $id,
            'email' => "user_{$id}@test.com",
            'password' => bcrypt('password123'),
            'role' => 'player',
            'status' => 'active',
        ]);

        PlayerPointBalance::create([
            'user_id' => $user->id,
            'battle_points' => 500,
            'rank_points' => 100,
        ]);

        return $user;
    }

    public function test_submit_score_requires_match_photo()
    {
        Storage::fake('public');

        $season = Season::create([
            'name' => 'Season 2026',
            'code' => 'S-2026',
            'start_date' => now()->startOfYear(),
            'end_date' => now()->endOfYear(),
            'is_active' => true,
            'status' => 'active',
        ]);

        $player1 = $this->createUser('Player One');
        $player2 = $this->createUser('Player Two');

        $match = GameMatch::create([
            'match_code' => 'M-TEST-100',
            'season_id' => $season->id,
            'creator_id' => $player1->id,
            'type' => 'BATTLE',
            'mode' => 'SINGLES',
            'venue' => 'GOR Bulutangkis',
            'scheduled_at' => now(),
            'status' => 'READY',
        ]);

        MatchPlayer::create(['match_id' => $match->id, 'user_id' => $player1->id, 'team' => 'TEAM_A', 'invitation_status' => 'ACCEPTED']);
        MatchPlayer::create(['match_id' => $match->id, 'user_id' => $player2->id, 'team' => 'TEAM_B', 'invitation_status' => 'ACCEPTED']);

        // 1. Submit score WITHOUT photo -> must fail with 422
        $responseNoPhoto = $this->actingAs($player1)->postJson("/api/v1/matches/{$match->id}/score", [
            'sets' => [
                ['set_number' => 1, 'team_a_score' => 21, 'team_b_score' => 18],
                ['set_number' => 2, 'team_a_score' => 21, 'team_b_score' => 15],
            ],
        ]);

        $responseNoPhoto->assertStatus(422);
        $responseNoPhoto->assertJsonFragment([
            'message' => 'Wajib mengunggah 1 foto bersama untuk para pemain setelah pertandingan.',
        ]);

        // 2. Submit score WITH uploaded photo file -> must succeed
        $photo = UploadedFile::fake()->image('group_photo.jpg', 800, 600);

        $responseWithPhoto = $this->actingAs($player1)->postJson("/api/v1/matches/{$match->id}/score", [
            'sets' => [
                ['set_number' => 1, 'team_a_score' => 21, 'team_b_score' => 18],
                ['set_number' => 2, 'team_a_score' => 21, 'team_b_score' => 15],
            ],
            'match_photo' => $photo,
        ]);

        $responseWithPhoto->assertStatus(200);
        $match->refresh();
        $this->assertNotNull($match->match_photo_url);
        $this->assertEquals('WAITING_APPROVAL', $match->status);
    }

    public function test_match_comments_on_completed_matches_and_profanity_filter()
    {
        $season = Season::create([
            'name' => 'Season 2026',
            'code' => 'S-2026-B',
            'start_date' => now()->startOfYear(),
            'end_date' => now()->endOfYear(),
            'is_active' => true,
            'status' => 'active',
        ]);

        $player1 = $this->createUser('Player Alpha');
        $player2 = $this->createUser('Player Beta');
        $spectator = $this->createUser('Spectator User');

        $match = GameMatch::create([
            'match_code' => 'M-TEST-200',
            'season_id' => $season->id,
            'creator_id' => $player1->id,
            'type' => 'BATTLE',
            'mode' => 'SINGLES',
            'venue' => 'GOR Sudirman',
            'scheduled_at' => now(),
            'status' => 'READY',
        ]);

        // 1. Comment on non-completed match -> must fail with 422
        $resNotCompleted = $this->actingAs($spectator)->postJson("/api/v1/matches/{$match->id}/comments", [
            'comment' => 'Pertandingan seru sekali!',
        ]);
        $resNotCompleted->assertStatus(422);

        // Mark match completed
        $match->status = 'COMPLETED';
        $match->save();

        // 2. Comment with profanity / racist word -> must fail with 422
        $resProfane = $this->actingAs($spectator)->postJson("/api/v1/matches/{$match->id}/comments", [
            'comment' => 'Mainnya goblok banget asu!',
        ]);
        $resProfane->assertStatus(422);
        $resProfane->assertJsonFragment([
            'message' => 'Komentar Anda terdeteksi mengandung kata-kata yang tidak sopan, kasar, atau berbau SARA/rasisme. Harap gunakan bahasa yang santun dan sportif!',
        ]);

        // 3. Comment with polite text -> must succeed
        $resPolite = $this->actingAs($spectator)->postJson("/api/v1/matches/{$match->id}/comments", [
            'comment' => 'Permainan luar biasa dari kedua pemain, smash dan rally sangat intens!',
        ]);
        $resPolite->assertStatus(201);
        $this->assertDatabaseHas('match_comments', [
            'match_id' => $match->id,
            'user_id' => $spectator->id,
            'comment' => 'Permainan luar biasa dari kedua pemain, smash dan rally sangat intens!',
        ]);

        // 4. GET /matches/{id}/comments returns the comments
        $resGet = $this->getJson("/api/v1/matches/{$match->id}/comments");
        $resGet->assertStatus(200);
        $this->assertCount(1, $resGet->json('data'));
    }

    public function test_my_matches_filter_only_shows_logged_in_user_matches()
    {
        $season = Season::create([
            'name' => 'Season 2026',
            'code' => 'S-2026-C',
            'start_date' => now()->startOfYear(),
            'end_date' => now()->endOfYear(),
            'is_active' => true,
            'status' => 'active',
        ]);

        $userA = $this->createUser('User A');
        $userB = $this->createUser('User B');
        $otherUser1 = $this->createUser('Other 1');
        $otherUser2 = $this->createUser('Other 2');

        // Match 1: User A is a player
        $matchA = GameMatch::create([
            'match_code' => 'M-MATCH-A',
            'season_id' => $season->id,
            'creator_id' => $userA->id,
            'type' => 'BATTLE',
            'mode' => 'SINGLES',
            'venue' => 'Court A',
            'scheduled_at' => now(),
            'status' => 'READY',
        ]);
        MatchPlayer::create(['match_id' => $matchA->id, 'user_id' => $userA->id, 'team' => 'TEAM_A', 'invitation_status' => 'ACCEPTED']);
        MatchPlayer::create(['match_id' => $matchA->id, 'user_id' => $userB->id, 'team' => 'TEAM_B', 'invitation_status' => 'ACCEPTED']);

        // Match 2: Other users only (User A is NOT in this match)
        $matchOther = GameMatch::create([
            'match_code' => 'M-MATCH-OTHER',
            'season_id' => $season->id,
            'creator_id' => $otherUser1->id,
            'type' => 'BATTLE',
            'mode' => 'SINGLES',
            'venue' => 'Court B',
            'scheduled_at' => now(),
            'status' => 'READY',
        ]);
        MatchPlayer::create(['match_id' => $matchOther->id, 'user_id' => $otherUser1->id, 'team' => 'TEAM_A', 'invitation_status' => 'ACCEPTED']);
        MatchPlayer::create(['match_id' => $matchOther->id, 'user_id' => $otherUser2->id, 'team' => 'TEAM_B', 'invitation_status' => 'ACCEPTED']);

        // Request with my_matches=true as User A
        $response = $this->actingAs($userA)->getJson('/api/v1/matches?my_matches=true');
        $response->assertStatus(200);

        $items = $response->json('data.data');
        $this->assertCount(1, $items);
        $this->assertEquals($matchA->id, $items[0]['id']);
    }
}
