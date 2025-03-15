import ReducerRegistry from '../base/redux/ReducerRegistry';

import { OPEN_WEB_APP } from './actionTypes';

export interface IDeepLinkingState {
    launchInWeb?: boolean;
    needsPermissionRequest?: boolean; // New field to track permission prompt requirement
}

// Action type for clearing the permission request state
export const CLEAR_DEEPLINK_PERMISSION_REQUEST = 'CLEAR_DEEPLINK_PERMISSION_REQUEST';

ReducerRegistry.register<IDeepLinkingState>('features/deep-linking', (state = {}, action): IDeepLinkingState => {
    switch (action.type) {
    case OPEN_WEB_APP: {
        return {
            ...state,
            launchInWeb: true,
            needsPermissionRequest: true // Set flag when user chooses web after desktop
        };
    }
    case CLEAR_DEEPLINK_PERMISSION_REQUEST: {
        return {
            ...state,
            needsPermissionRequest: false
        };
    }
    }

    return state;
});
