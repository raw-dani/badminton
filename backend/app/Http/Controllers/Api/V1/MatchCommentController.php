<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\GameMatch;
use App\Models\MatchComment;
use App\Services\ProfanityFilterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MatchCommentController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected ProfanityFilterService $profanityFilter
    ) {}

    /**
     * Get all comments for a match.
     */
    public function index(int $matchId): JsonResponse
    {
        $match = GameMatch::findOrFail($matchId);

        $comments = MatchComment::with(['user.profile'])
            ->where('match_id', $match->id)
            ->orderBy('created_at', 'asc')
            ->get();

        return $this->success($comments, 'Match comments retrieved');
    }

    /**
     * Post a comment on a completed match.
     * Only authenticated registered users can comment.
     * Enforces polite language without profanities or racist terms.
     */
    public function store(Request $request, int $matchId): JsonResponse
    {
        $user = Auth::user();
        $match = GameMatch::findOrFail($matchId);

        // Requirement 2: Hanya untuk pertandingan yang statusnya COMPLETED
        if ($match->status !== 'COMPLETED') {
            return $this->error('Komentar hanya dapat diberikan pada pertandingan yang telah selesai (COMPLETED).', 422);
        }

        $validated = $request->validate([
            'comment' => ['required', 'string', 'min:2', 'max:1000'],
        ]);

        $commentText = trim($validated['comment']);

        // Requirement 2: Filter kata-kata kasar / rasisme
        if ($this->profanityFilter->containsProfanity($commentText)) {
            $detected = $this->profanityFilter->getDetectedProfanities($commentText);
            return $this->error(
                'Komentar Anda terdeteksi mengandung kata-kata yang tidak sopan, kasar, atau berbau SARA/rasisme. Harap gunakan bahasa yang santun dan sportif!',
                422,
                ['detected' => $detected]
            );
        }

        $comment = MatchComment::create([
            'match_id' => $match->id,
            'user_id' => $user->id,
            'comment' => $commentText,
        ]);

        return $this->success(
            $comment->load(['user.profile']),
            'Komentar berhasil diposting.',
            201
        );
    }

    /**
     * Delete a comment (Author or Admin only).
     */
    public function destroy(int $matchId, int $commentId): JsonResponse
    {
        $user = Auth::user();
        $comment = MatchComment::where('match_id', $matchId)->findOrFail($commentId);

        if ($comment->user_id !== $user->id && $user->role !== 'admin') {
            return $this->error('Anda tidak memiliki wewenang untuk menghapus komentar ini.', 403);
        }

        $comment->delete();

        return $this->success(null, 'Komentar berhasil dihapus.');
    }
}
