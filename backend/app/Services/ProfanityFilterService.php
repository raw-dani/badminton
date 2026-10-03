<?php

namespace App\Services;

class ProfanityFilterService
{
    /**
     * List of prohibited words (profanity, vulgarities, and racial/ethnic/religious slurs).
     */
    protected array $blacklistedWords = [
        // Indonesian vulgarity / profanity
        'anjing', 'anying', 'anjir', 'anjrit', 'asu', 'babi', 'bangsat', 'bajingan',
        'kontol', 'memek', 'jembut', 'pepek', 'pantek', 'itil', 'peler', 'titit', 'tetek',
        'ngentot', 'entot', 'ewek', 'colmek', 'coli', 'sange', 'bokep',
        'kampret', 'bego', 'goblok', 'tolol', 'idiot', 'puki', 'pukimak',
        'lonte', 'perek', 'pelacur', 'jablay', 'bencong', 'banci', 'homo', 'lesbi',
        'tai', 'tahi', 'modar', 'mampus', 'brengsek', 'keparat', 'kunyuk',

        // Racist / ethnic / discrimination slurs
        'nigger', 'nigga', 'negro',
        'chindo', 'cinaan', 'cinak',
        'kafir', 'kuffar',

        // English profanity & slurs
        'fuck', 'fucking', 'fucker', 'shit', 'bullshit',
        'bitch', 'asshole', 'bastard', 'cunt', 'dick', 'pussy',
        'retard', 'retarded', 'slut', 'whore', 'motherfucker',
    ];

    /**
     * Check if the given text contains any prohibited or racist words.
     */
    public function containsProfanity(string $text): bool
    {
        return !empty($this->getDetectedProfanities($text));
    }

    /**
     * Get list of detected prohibited words in text.
     */
    public function getDetectedProfanities(string $text): array
    {
        $normalized = $this->normalizeText($text);
        $detected = [];

        foreach ($this->blacklistedWords as $word) {
            // Match word boundaries or isolated token
            $pattern = '/\b' . preg_quote($word, '/') . '\b/i';
            if (preg_match($pattern, $normalized)) {
                $detected[] = $word;
            }
        }

        return array_unique($detected);
    }

    /**
     * Normalize leetspeak and special characters for accurate detection.
     */
    protected function normalizeText(string $text): string
    {
        $clean = mb_strtolower($text, 'UTF-8');

        // Common leetspeak substitutions
        $substitutions = [
            '@' => 'a',
            '4' => 'a',
            '3' => 'e',
            '1' => 'i',
            '!' => 'i',
            '0' => 'o',
            '5' => 's',
            '$' => 's',
            '7' => 't',
            '+' => 't',
        ];
        $clean = strtr($clean, $substitutions);

        // Remove punctuation and extra whitespace, keeping letters and spaces
        $clean = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $clean);
        $clean = preg_replace('/\s+/', ' ', $clean);

        return trim($clean);
    }
}
