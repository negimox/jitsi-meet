import { AnyAction } from 'redux';

import { IStore } from '../app/types';
import { CONFERENCE_JOINED } from '../base/conference/actionTypes';
import { getCurrentConference } from '../base/conference/functions';
import {
    PARTICIPANT_JOINED,
    PARTICIPANT_LEFT
} from '../base/participants/actionTypes';
import { getRemoteParticipants } from '../base/participants/functions';
import { IParticipant } from '../base/participants/types';
import MiddlewareRegistry from '../base/redux/MiddlewareRegistry';
import {
    showSuccessNotification,
    showWarningNotification
} from '../notifications/actions';
import { NOTIFICATION_TIMEOUT_TYPE } from '../notifications/constants';

import { SET_SPOKEN_LANGUAGE } from './actionTypes';
import { SpokenLanguage } from './constants';
import { getSpokenLanguage } from './functions';

// Import reducer to ensure it gets registered
import './reducer';

/**
 * The display name prefix for translator participants.
 * Translator agents join with names like 'translator-en', 'translator-hi'.
 */
const TRANSLATOR_DISPLAY_NAME_PREFIX = 'translator-';

/**
 * Tracks whether the user has explicitly selected a language via the UI.
 * When false, all translator audio is excluded (no translation by default).
 * Set to true when SET_SPOKEN_LANGUAGE is dispatched.
 */
let _hasExplicitSelection = false;

/**
 * Middleware that manages audio subscriptions for live translation.
 *
 * Uses the Receiver Audio Subscriptions API (conference.setAudioSubscriptionMode)
 * to selectively control which translator audio each client receives from JVB.
 *
 * Strategy: Use "Exclude" mode to exclude all translator participants by default.
 * When the user explicitly selects a language, exclude all translators except
 * the one matching the selected language.
 *
 * @param {Store} store - The redux store.
 * @returns {Function}
 */
MiddlewareRegistry.register(store => next => (action: AnyAction) => {
    // Let the action update Redux state first so getSpokenLanguage,
    // getRemoteParticipants, and getCurrentConference return current values.
    const result = next(action);

    switch (action.type) {
    case CONFERENCE_JOINED:
        // Apply audio subscription based on explicit selection state
        _updateAudioSubscription(store);
        break;

    case SET_SPOKEN_LANGUAGE:
        _hasExplicitSelection = true;
        _updateAudioSubscription(store);
        _notifyLanguageChange(store, action.language);
        break;

    case PARTICIPANT_JOINED:
        // If a translator agent joined, update exclusion list
        if (_isTranslatorName(action.participant?.name)) {
            _updateAudioSubscription(store);
            _notifyTranslatorArrival(store, action.participant?.name);
        }
        break;

    case PARTICIPANT_LEFT:
        // Cannot check name (PARTICIPANT_LEFT only carries id).
        // Always re-evaluate; ReceiveAudioController deduplicates
        // identical messages so this is cheap when nothing changes.
        _updateAudioSubscription(store);
        break;
    }

    return result;
});

/**
 * Checks whether a display name belongs to a translator participant.
 *
 * @param {string | undefined} name - The display name.
 * @returns {boolean}
 */
function _isTranslatorName(name?: string): boolean {
    return Boolean(name) && name!.toLowerCase().startsWith(TRANSLATOR_DISPLAY_NAME_PREFIX);
}

/**
 * Returns all remote participants that are translator agents.
 *
 * @param {IStore} store - The redux store.
 * @returns {IParticipant[]}
 */
function _getTranslatorParticipants(store: IStore): IParticipant[] {
    const state = store.getState();
    const remoteParticipants = getRemoteParticipants(state);
    const translators: IParticipant[] = [];

    for (const [ , participant ] of remoteParticipants) {
        if (_isTranslatorName(participant.name)) {
            translators.push(participant);
        }
    }

    return translators;
}

/**
 * Computes and sends the correct audio subscription to JVB.
 *
 * - No translators present: resets to "All" mode (default).
 * - No explicit selection: excludes ALL translator IDs (no translation audio).
 * - Explicit selection: excludes all translator IDs except the one matching
 *   the user's selected language.
 *
 * The ReceiveAudioController in lib-jitsi-meet deduplicates identical messages
 * (same mode + same list), so calling this function redundantly is safe.
 *
 * @param {IStore} store - The redux store.
 * @returns {void}
 */
function _updateAudioSubscription(store: IStore): void {
    const state = store.getState();
    const conference = getCurrentConference(state);

    if (!conference) {
        return;
    }

    // Guard: setAudioSubscriptionMode may not exist on older JVB/lib-jitsi-meet
    if (typeof (conference as any).setAudioSubscriptionMode !== 'function') {
        return;
    }

    const translators = _getTranslatorParticipants(store);

    if (translators.length === 0) {
        // No translators in the room — reset to default so we don't
        // leave a stale exclusion list from a previous state.
        (conference as any).setAudioSubscriptionMode({ mode: 'All' });

        return;
    }

    // If the user hasn't explicitly selected a language, exclude ALL translators.
    if (!_hasExplicitSelection) {
        (conference as any).setAudioSubscriptionMode({
            mode: 'Exclude',
            list: translators.map(t => t.id)
        });

        return;
    }

    // User has explicitly selected a language — let through the matching translator.
    const spokenLanguage = getSpokenLanguage(state);
    const selectedName = `${TRANSLATOR_DISPLAY_NAME_PREFIX}${spokenLanguage}`.toLowerCase();

    // Exclude every translator EXCEPT the one that matches the user's language.
    const excludeIds = translators
        .filter(t => t.name?.toLowerCase() !== selectedName)
        .map(t => t.id);

    if (excludeIds.length === 0) {
        // The only translator(s) present match the selected language.
        // No need to exclude anything.
        (conference as any).setAudioSubscriptionMode({ mode: 'All' });
    } else {
        (conference as any).setAudioSubscriptionMode({
            mode: 'Exclude',
            list: excludeIds
        });
    }
}

/**
 * Shows a notification after the user changes their spoken language.
 *
 * @param {IStore} store - The redux store.
 * @param {SpokenLanguage} language - The newly selected language.
 * @returns {void}
 */
function _notifyLanguageChange(store: IStore, language: SpokenLanguage): void {
    const { dispatch } = store;
    const translators = _getTranslatorParticipants(store);
    const targetName = `${TRANSLATOR_DISPLAY_NAME_PREFIX}${language}`.toLowerCase();
    const found = translators.some(t => t.name?.toLowerCase() === targetName);

    if (found) {
        dispatch(showSuccessNotification({
            titleKey: 'translation.subscriptionSuccess',
            descriptionKey: 'translation.subscriptionSuccessDescription',
            descriptionArguments: { language: language.toUpperCase() }
        }, NOTIFICATION_TIMEOUT_TYPE.SHORT));
    } else {
        dispatch(showWarningNotification({
            titleKey: 'translation.translatorNotFound',
            descriptionKey: 'translation.translatorNotFoundDescription',
            descriptionArguments: { language: language.toUpperCase() }
        }, NOTIFICATION_TIMEOUT_TYPE.MEDIUM));
    }
}

/**
 * Shows a notification when a translator agent joins the conference,
 * but only if the user has explicitly selected a language and the
 * arriving translator matches that selection.
 *
 * @param {IStore} store - The redux store.
 * @param {string | undefined} translatorName - The translator's display name.
 * @returns {void}
 */
function _notifyTranslatorArrival(store: IStore, translatorName?: string): void {
    if (!translatorName || !_hasExplicitSelection) {
        return;
    }

    const state = store.getState();
    const spokenLanguage = getSpokenLanguage(state);
    const expectedName = `${TRANSLATOR_DISPLAY_NAME_PREFIX}${spokenLanguage}`.toLowerCase();

    if (translatorName.toLowerCase() === expectedName) {
        store.dispatch(showSuccessNotification({
            titleKey: 'translation.subscriptionSuccess',
            descriptionKey: 'translation.subscriptionSuccessDescription',
            descriptionArguments: { language: spokenLanguage.toUpperCase() }
        }, NOTIFICATION_TIMEOUT_TYPE.SHORT));
    }
}
