import { IReduxState } from '../app/types';

import { SUPPORTED_SPOKEN_LANGUAGES, SpokenLanguage } from './constants';

/**
 * Gets the currently selected spoken language from Redux state.
 *
 * @param {IReduxState} state - The Redux state.
 * @returns {SpokenLanguage} The current spoken language code.
 */
export function getSpokenLanguage(state: IReduxState): SpokenLanguage {
    return state['features/translation']?.spokenLanguage ?? 'en';
}

/**
 * Gets the list of supported spoken languages.
 *
 * @returns {ReadonlyArray<SpokenLanguage>} Array of supported language codes.
 */
export function getSupportedSpokenLanguages(): ReadonlyArray<SpokenLanguage> {
    return SUPPORTED_SPOKEN_LANGUAGES;
}
