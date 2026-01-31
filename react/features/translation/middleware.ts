import { AnyAction } from 'redux';

import { IStore } from '../app/types';
import { getCurrentConference } from '../base/conference/functions';
import { getRemoteParticipants } from '../base/participants/functions';
import { IParticipant } from '../base/participants/types';
import MiddlewareRegistry from '../base/redux/MiddlewareRegistry';
import {
    showErrorNotification,
    showSuccessNotification,
    showWarningNotification
} from '../notifications/actions';
import { NOTIFICATION_TIMEOUT_TYPE } from '../notifications/constants';

import { SET_SPOKEN_LANGUAGE } from './actionTypes';
import { SpokenLanguage } from './constants';

// Import reducer to ensure it gets registered
import './reducer';

/**
 * The display name prefix for translator participants.
 * Translator agents join with names like 'translator-en', 'translator-hi'.
 */
const TRANSLATOR_DISPLAY_NAME_PREFIX = 'translator-';

/**
 * Middleware that handles subscription toggling when spoken language changes.
 *
 * @param {Store} store - The redux store.
 * @returns {Function}
 */
MiddlewareRegistry.register(store => next => (action: AnyAction) => {
    switch (action.type) {
    case SET_SPOKEN_LANGUAGE:
        _handleSpokenLanguageChange(store, action.language);
        break;
    }

    return next(action);
});

/**
 * Finds a translator participant by the language code.
 *
 * @param {IStore} store - The redux store.
 * @param {SpokenLanguage} language - The language code (e.g., 'en', 'hi').
 * @returns {IParticipant | undefined} - The translator participant or undefined.
 */
function _findTranslatorParticipant(store: IStore, language: SpokenLanguage): IParticipant | undefined {
    const state = store.getState();
    const remoteParticipants = getRemoteParticipants(state);
    const translatorName = `${TRANSLATOR_DISPLAY_NAME_PREFIX}${language}`;

    // Iterate through remote participants to find one with matching display name
    for (const [ , participant ] of remoteParticipants) {
        if (participant.name?.toLowerCase() === translatorName.toLowerCase()) {
            return participant;
        }
    }

    return undefined;
}

/**
 * Handles subscription toggle when spoken language changes.
 *
 * @param {IStore} store - The redux store.
 * @param {SpokenLanguage} language - The new spoken language.
 * @returns {void}
 */
function _handleSpokenLanguageChange(store: IStore, language: SpokenLanguage): void {
    const { dispatch, getState } = store;
    const state = getState();
    const conference = getCurrentConference(state);

    if (!conference) {
        // Not in a conference yet, just store the preference
        return;
    }

    const translatorParticipant = _findTranslatorParticipant(store, language);

    if (translatorParticipant) {
        // Translator found - toggle subscription to include their audio
        _subscribeToTranslator(store, translatorParticipant, language);
    } else {
        // Translator not found - show warning notification
        dispatch(showWarningNotification({
            titleKey: 'translation.translatorNotFound',
            descriptionKey: 'translation.translatorNotFoundDescription',
            descriptionArguments: {
                language: language.toUpperCase()
            }
        }, NOTIFICATION_TIMEOUT_TYPE.MEDIUM));
    }
}

/**
 * Subscribes to a translator participant's audio.
 *
 * @param {IStore} store - The redux store.
 * @param {IParticipant} translatorParticipant - The translator participant.
 * @param {SpokenLanguage} language - The language being subscribed to.
 * @returns {void}
 */
function _subscribeToTranslator(
        store: IStore,
        translatorParticipant: IParticipant,
        language: SpokenLanguage): void {
    const { dispatch, getState } = store;
    const state = getState();
    const conference = getCurrentConference(state);

    if (!conference) {
        dispatch(showErrorNotification({
            titleKey: 'translation.subscriptionFailed',
            descriptionKey: 'translation.notInConference'
        }, NOTIFICATION_TIMEOUT_TYPE.MEDIUM));

        return;
    }

    try {
        // Get the translator participant ID
        const participantId = translatorParticipant.id;

        // Use setReceiverConstraints to include the translator in audio subscription
        // The JVB Audio Switchboard ensures audio from selected endpoints is always received
        if (typeof conference.setReceiverConstraints === 'function') {
            // Set the translator as a selected endpoint to ensure their audio is received
            // The selectedEndpoints array ensures these participants' audio is always included
            conference.setReceiverConstraints({
                selectedEndpoints: [ participantId ]
            });

            dispatch(showSuccessNotification({
                titleKey: 'translation.subscriptionSuccess',
                descriptionKey: 'translation.subscriptionSuccessDescription',
                descriptionArguments: {
                    language: language.toUpperCase()
                }
            }, NOTIFICATION_TIMEOUT_TYPE.SHORT));
        } else {
            // Fallback: just notify that translator is available
            dispatch(showSuccessNotification({
                titleKey: 'translation.translatorFound',
                descriptionKey: 'translation.translatorFoundDescription',
                descriptionArguments: {
                    language: language.toUpperCase()
                }
            }, NOTIFICATION_TIMEOUT_TYPE.SHORT));
        }
    } catch (error) {
        dispatch(showErrorNotification({
            titleKey: 'translation.subscriptionFailed',
            descriptionKey: 'translation.subscriptionFailedDescription'
        }, NOTIFICATION_TIMEOUT_TYPE.MEDIUM));
    }
}
