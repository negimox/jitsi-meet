import './middleware.any';
import { AnyAction } from 'redux';

import { IStore } from '../../app/types';
import { APP_WILL_MOUNT } from '../../base/app/actionTypes'; // ← Add this import
import { showNotification } from '../../notifications/actions';
import { NOTIFICATION_TIMEOUT_TYPE } from '../../notifications/constants';
import LocalRecordingManager from '../../recording/components/Recording/LocalRecordingManager.web';
import StopRecordingDialog from '../../recording/components/Recording/web/StopRecordingDialog';
import { openDialog } from '../dialog/actions';
import MiddlewareRegistry from '../redux/MiddlewareRegistry';

import { SET_VIDEO_MUTED } from './actionTypes';

import './subscriber';

/**
 * Implements the entry point of the middleware of the feature base/media.
 *
 * @param {IStore} store - The redux store.
 * @returns {Function}
 */
MiddlewareRegistry.register((store: IStore) => (next: Function) => (action: AnyAction) => {
    const { dispatch, getState } = store;

    switch (action.type) {
        case APP_WILL_MOUNT: {
            // Check if desktop deeplinking is enabled in config
            const state = getState();
            const deeplinkingEnabled = state['features/base/config']?.deeplinking?.desktop?.enabled;

            // Basic Chrome detection (detect Chrome but not Firefox)
            const isChromeBrowser =
                navigator.userAgent.includes('Chrome') &&
                !navigator.userAgent.includes('Firefox');

            // If deeplinking is enabled and we're in Chrome, show a user-gesture-based permission request
            if (deeplinkingEnabled && isChromeBrowser) {
                dispatch(showNotification({
                    titleKey: 'dialog.permissionsTitle',
                    descriptionKey: 'dialog.permissionsBlockedMessage',
                    customActionNameKey: [ 'dialog.requestPermissions' ],
                    customActionHandler: [ () => {
                        navigator.mediaDevices.getUserMedia({ audio: true, video: true })
                            .then(stream => {
                                // Stop tracks immediately after successful permission
                                stream.getTracks().forEach(track => track.stop());
                            })
                            .catch(err => {
                                // You can log or handle the error here
                                console.error('Error requesting permissions with user gesture', err);
                            });
                    } ]
                }, NOTIFICATION_TIMEOUT_TYPE.STICKY));
            }

            break;
        }
    case SET_VIDEO_MUTED: {
        if (LocalRecordingManager.isRecordingLocally() && LocalRecordingManager.selfRecording.on) {
            if (action.muted && LocalRecordingManager.selfRecording.withVideo) {
                dispatch(openDialog(StopRecordingDialog, { localRecordingVideoStop: true }));

                return;
            } else if (!action.muted && !LocalRecordingManager.selfRecording.withVideo) {
                dispatch(showNotification({
                    titleKey: 'recording.localRecordingNoVideo',
                    descriptionKey: 'recording.localRecordingVideoWarning',
                    uid: 'recording.localRecordingNoVideo'
                }, NOTIFICATION_TIMEOUT_TYPE.MEDIUM));
            }
        }
    }
    }

    return next(action);
});
