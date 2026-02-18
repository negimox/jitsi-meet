import { IReduxState } from "../app/types";

import { SUPPORTED_SPOKEN_LANGUAGES, SpokenLanguage } from "./constants";

/**
 * Gets the currently selected spoken language from Redux state.
 * Returns undefined if the user has not yet made an explicit selection.
 *
 * @param {IReduxState} state - The Redux state.
 * @returns {SpokenLanguage | undefined} The current spoken language code, or undefined.
 */
export function getSpokenLanguage(state: IReduxState): SpokenLanguage | undefined {
    return state["features/translation"]?.spokenLanguage;
}

/**
 * Gets the list of supported spoken languages.
 *
 * @returns {ReadonlyArray<SpokenLanguage>} Array of supported language codes.
 */
export function getSupportedSpokenLanguages(): ReadonlyArray<SpokenLanguage> {
    return SUPPORTED_SPOKEN_LANGUAGES;
}
