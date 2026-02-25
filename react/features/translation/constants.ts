/**
 * Supported spoken languages for live audio translation.
 * Currently limited to English and Hindi for Phase 1.
 */
export const SUPPORTED_SPOKEN_LANGUAGES = ["en", "hi"] as const;

/**
 * Type for supported spoken language codes.
 */
export type SpokenLanguage = (typeof SUPPORTED_SPOKEN_LANGUAGES)[number];

/**
 * Volume level for other-language speakers when translation is active.
 * Reduces original audio to 15% so the TTS translation dominates.
 */
export const DUCKING_VOLUME = 0.15;

/**
 * Normal (full) volume level for participants.
 */
export const NORMAL_VOLUME = 1.0;
