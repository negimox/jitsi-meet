import { connect } from 'react-redux';

import { IReduxState } from '../../../app/types';
import { translate } from '../../../base/i18n/functions';
import { IconSubtitles } from '../../../base/icons/svg';
import AbstractButton, { IProps as AbstractButtonProps } from '../../../base/toolbox/components/AbstractButton';
import { setOverflowMenuVisible } from '../../../toolbox/actions.web';
import { toggleSpokenLanguageSelectorDialog } from '../../actions.web';
import { getSpokenLanguage } from '../../functions';

/**
 * The type of the React {@code Component} props of {@link SpokenLanguageButton}.
 */
interface IProps extends AbstractButtonProps {

    /**
     * The current spoken language.
     */
    _spokenLanguage: string;
}

/**
 * Implementation of a button for toggling spoken language popup.
 */
class SpokenLanguageButton extends AbstractButton<IProps> {
    override accessibilityLabel = 'translation.spokenLanguageTooltip';
    override icon = IconSubtitles;
    override label = 'translation.spokenLanguage';
    override tooltip = 'translation.spokenLanguageTooltip';

    /**
     * Handles clicking/pressing the button.
     *
     * @returns {void}
     */
    override _handleClick() {
        const { dispatch } = this.props;

        dispatch(setOverflowMenuVisible(false));
        dispatch(toggleSpokenLanguageSelectorDialog());
    }

    /**
     * Returns the current spoken language as part of the label.
     *
     * @returns {string}
     */
    override _getLabel() {
        return 'translation.spokenLanguage';
    }
}

/**
 * Maps (parts of) the redux state to the associated props for the
 * {@code SpokenLanguageButton} component.
 *
 * @param {Object} state - The Redux state.
 * @returns {IProps}
 */
function mapStateToProps(state: IReduxState) {
    return {
        _spokenLanguage: getSpokenLanguage(state),
        visible: true
    };
}

export default translate(connect(mapStateToProps)(SpokenLanguageButton));
