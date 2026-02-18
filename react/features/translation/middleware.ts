import { AnyAction } from "redux";

import { IStore } from "../app/types";
import { CONFERENCE_JOINED, DATA_CHANNEL_OPENED, P2P_STATUS_CHANGED } from "../base/conference/actionTypes";
import { getCurrentConference } from "../base/conference/functions";
import { PARTICIPANT_JOINED, PARTICIPANT_LEFT, PARTICIPANT_UPDATED } from "../base/participants/actionTypes";
import { getRemoteParticipants } from "../base/participants/functions";
import { IParticipant } from "../base/participants/types";
import MiddlewareRegistry from "../base/redux/MiddlewareRegistry";
import { showSuccessNotification, showWarningNotification } from "../notifications/actions";
import { NOTIFICATION_TIMEOUT_TYPE } from "../notifications/constants";

import { SET_SPOKEN_LANGUAGE } from "./actionTypes";
import { SpokenLanguage } from "./constants";
import { getSpokenLanguage } from "./functions";

// Import reducer to ensure it gets registered
import "./reducer";

/**
 * The display name prefix for translator participants.
 * Translator agents join with names like 'translator-en', 'translator-hi'.
 */
const TRANSLATOR_DISPLAY_NAME_PREFIX = "translator-";

/**
 * Tracks whether the user has explicitly selected a language via the UI.
 * When false, all translator audio is excluded (no translation by default).
 * Set to true when SET_SPOKEN_LANGUAGE is dispatched.
 */
let _hasExplicitSelection = false;

/**
 * Logging prefix for translation middleware messages.
 */
const LOG_PREFIX = "[translation-middleware]";

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
MiddlewareRegistry.register((store) => (next) => (action: AnyAction) => {
    // Let the action update Redux state first so getSpokenLanguage,
    // getRemoteParticipants, and getCurrentConference return current values.
    const result = next(action);

    switch (action.type) {
        case CONFERENCE_JOINED:
            // Apply audio subscription based on explicit selection state.
            // May silently fail if bridge channel isn't open yet.
            console.log(`${LOG_PREFIX} Conference joined, applying initial audio subscription`);
            _updateAudioSubscription(store);
            break;

        case DATA_CHANNEL_OPENED:
            // Bridge channel just opened. Force-resend audio subscription
            // in case the CONFERENCE_JOINED call was silently dropped
            // (RTC.sendReceiverAudioSubscriptionMessage drops messages
            // when the channel is not yet open, unlike video constraints
            // which are cached and sent on channel open).
            console.log(`${LOG_PREFIX} Data channel opened, force-resending audio subscription`);
            _forceUpdateAudioSubscription(store);
            break;

        case P2P_STATUS_CHANGED:
            // When P2P session ends (p2p becomes false), we return to JVB mode.
            // The bridge channel subscription state may have been lost during P2P.
            // Force-resend audio subscription to ensure JVB applies our filters.
            if (!action.p2p) {
                console.log(`${LOG_PREFIX} P2P ended, forcing audio subscription update for JVB`);
                _forceUpdateAudioSubscription(store);
            } else {
                console.log(`${LOG_PREFIX} P2P started — audio subscription has no effect in P2P mode`);
            }
            break;

        case SET_SPOKEN_LANGUAGE:
            console.log(`${LOG_PREFIX} Spoken language set to "${action.language}", hasExplicitSelection=true`);
            _hasExplicitSelection = true;
            _updateAudioSubscription(store);
            _notifyLanguageChange(store, action.language);
            break;

        case PARTICIPANT_JOINED:
            // If a translator agent joined, update exclusion list
            if (_isTranslatorName(action.participant?.name)) {
                console.log(
                    `${LOG_PREFIX} Translator joined: name="${action.participant?.name}", id=${action.participant?.id}`,
                );
                _updateAudioSubscription(store);
                _notifyTranslatorArrival(store, action.participant?.name);
            }
            break;

        case PARTICIPANT_UPDATED: {
            // If a participant's display name changed to or from a translator name,
            // re-evaluate audio subscription. This handles the case where display
            // name is set/changed after the initial PARTICIPANT_JOINED event.
            const updatedParticipant = action.participant;

            if (updatedParticipant?.name !== undefined) {
                console.log(
                    `${LOG_PREFIX} Participant updated: id=${updatedParticipant.id}, name="${updatedParticipant.name}"`,
                );
                _updateAudioSubscription(store);
            }
            break;
        }

        case PARTICIPANT_LEFT:
            // Cannot check name (PARTICIPANT_LEFT only carries id).
            // Always re-evaluate; ReceiveAudioController deduplicates
            // identical messages so this is cheap when nothing changes.
            console.log(`${LOG_PREFIX} Participant left: id=${action.participant?.id}`);
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

    for (const [, participant] of remoteParticipants) {
        if (_isTranslatorName(participant.name)) {
            translators.push(participant);
        }
    }

    return translators;
}

/**
 * Forces an audio subscription update, bypassing ReceiveAudioController's
 * deduplication logic.
 *
 * When CONFERENCE_JOINED fires before the bridge data channel is open,
 * ReceiveAudioController updates its internal state but the message is
 * silently dropped by RTC (channel not open). A subsequent call with
 * identical params is then deduped. This function resets the controller
 * to "All" first, which clears the internal state, then calls
 * _updateAudioSubscription to send the correct subscription.
 *
 * Both calls are synchronous, so there is no window where incorrect
 * audio is received.
 *
 * @param {IStore} store - The redux store.
 * @returns {void}
 */
function _forceUpdateAudioSubscription(store: IStore): void {
    const state = store.getState();
    const conference = getCurrentConference(state);

    if (!conference) {
        return;
    }

    if (typeof (conference as any).setAudioSubscriptionMode !== "function") {
        console.log(`${LOG_PREFIX} setAudioSubscriptionMode not available on conference object`);

        return;
    }

    // Reset ReceiveAudioController's internal state to bypass deduplication.
    console.log(`${LOG_PREFIX} Force-resetting to All before reapplying subscription (dedup bypass)`);
    (conference as any).setAudioSubscriptionMode({ mode: "All" });

    // Now send the actual subscription (no longer deduped since state was reset).
    _updateAudioSubscription(store);
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
    if (typeof (conference as any).setAudioSubscriptionMode !== "function") {
        console.log(`${LOG_PREFIX} setAudioSubscriptionMode not available, skipping`);

        return;
    }

    const translators = _getTranslatorParticipants(store);

    if (translators.length === 0) {
        // No translators in the room — reset to default so we don't
        // leave a stale exclusion list from a previous state.
        console.log(`${LOG_PREFIX} No translators present, setting mode=All`);
        (conference as any).setAudioSubscriptionMode({ mode: "All" });

        return;
    }

    // If the user hasn't explicitly selected a language, exclude ALL translators.
    if (!_hasExplicitSelection) {
        const excludeSources = translators.map((t) => `${t.id}-a0`);

        console.log(
            `${LOG_PREFIX} No explicit selection, excluding ${translators.length} translator(s):` +
                ` [${translators.map((t) => `${t.id}(${t.name})`).join(", ")}]` +
                ` sourceNames=[${excludeSources.join(", ")}]`,
        );
        (conference as any).setAudioSubscriptionMode({
            mode: "Exclude",
            list: excludeSources,
        });

        return;
    }

    // User has explicitly selected a language — let through the matching translator.
    const spokenLanguage = getSpokenLanguage(state);
    const selectedName = `${TRANSLATOR_DISPLAY_NAME_PREFIX}${spokenLanguage}`.toLowerCase();

    // Exclude every translator EXCEPT the one that matches the user's language.
    // Use audio source names ({endpointId}-a0) — JVB matches against AudioSourceDesc.sourceName.
    const excludeSources = translators.filter((t) => t.name?.toLowerCase() !== selectedName).map((t) => `${t.id}-a0`);

    if (excludeSources.length === 0) {
        // The only translator(s) present match the selected language.
        // No need to exclude anything.
        console.log(`${LOG_PREFIX} All translators match selected language "${spokenLanguage}", setting mode=All`);
        (conference as any).setAudioSubscriptionMode({ mode: "All" });
    } else {
        console.log(
            `${LOG_PREFIX} Excluding ${excludeSources.length} translator(s), keeping "${selectedName}",` +
                ` mode=Exclude, sourceNames=[${excludeSources.join(", ")}]`,
        );
        (conference as any).setAudioSubscriptionMode({
            mode: "Exclude",
            list: excludeSources,
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
    const found = translators.some((t) => t.name?.toLowerCase() === targetName);

    if (found) {
        dispatch(
            showSuccessNotification(
                {
                    titleKey: "translation.subscriptionSuccess",
                    descriptionKey: "translation.subscriptionSuccessDescription",
                    descriptionArguments: { language: language.toUpperCase() },
                },
                NOTIFICATION_TIMEOUT_TYPE.SHORT,
            ),
        );
    } else {
        dispatch(
            showWarningNotification(
                {
                    titleKey: "translation.translatorNotFound",
                    descriptionKey: "translation.translatorNotFoundDescription",
                    descriptionArguments: { language: language.toUpperCase() },
                },
                NOTIFICATION_TIMEOUT_TYPE.MEDIUM,
            ),
        );
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
        store.dispatch(
            showSuccessNotification(
                {
                    titleKey: "translation.subscriptionSuccess",
                    descriptionKey: "translation.subscriptionSuccessDescription",
                    descriptionArguments: { language: spokenLanguage.toUpperCase() },
                },
                NOTIFICATION_TIMEOUT_TYPE.SHORT,
            ),
        );
    }
}
