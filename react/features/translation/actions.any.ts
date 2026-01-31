import { SET_SPOKEN_LANGUAGE } from './actionTypes';
import { SpokenLanguage } from './constants';

/**
 * Sets the spoken language preference for live audio translation.
 *
 * @param {SpokenLanguage} language - The language code to set.
 * @returns {Object}
 */
export function setSpokenLanguage(language: SpokenLanguage) {
    return {
        type: SET_SPOKEN_LANGUAGE,
        language
    };
}
