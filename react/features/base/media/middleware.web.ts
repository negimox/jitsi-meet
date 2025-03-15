\middleware.web.ts
import './middleware.any';
import { AnyAction } from 'redux';

import { IStore } from '../../app/types';
import { showNotification } from '../../notifications/actions';
import { NOTIFICATION_TIMEOUT_TYPE } from '../../notifications/constants';
import LocalRecordingManager from '../../recording/components/Recording/LocalRecordingManager.web';
import StopRecordingDialog from '../../recording/components/Recording/web/StopRecordingDialog';
import { clearDeeplinkPermissionRequest } from '../../deep-linking/actions';
import { openDialog, closeDialog } from '../dialog/actions';
import MiddlewareRegistry from '../redux/MiddlewareRegistry';
import PermissionRequestDialog from '../../deep-linking/components/PermissionRequestDialog';
import { APP_WILL_MOUNT } from '../app/actionTypes';

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
        // Check if we need to show the permission dialog after a deeplink rejection
        const state = getState();
        const needsPermissionRequest = state['features/deep-linking']?.needsPermissionRequest;

        if (needsPermissionRequest) {
            // Show our permission request dialog
            setTimeout(() => {
                dispatch(openDialog(PermissionRequestDialog, {
                    onPermissionHandled: () => {
                        dispatch(closeDialog());
                        dispatch(clearDeeplinkPermissionRequest());
                    }
                }));
            }, 500); // Brief delay to ensure the dialog appears after navigation
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
