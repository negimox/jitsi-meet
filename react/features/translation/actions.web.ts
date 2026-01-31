import { IStore } from '../app/types';
import { toggleDialog } from '../base/dialog/actions';

import SpokenLanguageSelectorDialog from './components/web/SpokenLanguageSelectorDialog';

export * from './actions.any';

/**
 * Signals that the local user has toggled the SpokenLanguageSelector button.
 *
 * @returns {Function}
 */
export function toggleSpokenLanguageSelectorDialog() {
    return function(dispatch: IStore['dispatch']) {
        dispatch(toggleDialog('SpokenLanguageSelectorDialog', SpokenLanguageSelectorDialog));
    };
}
