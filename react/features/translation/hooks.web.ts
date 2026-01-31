import SpokenLanguageButton from './components/web/SpokenLanguageButton';

// Import reducer to ensure it gets registered with ReducerRegistry
import './reducer';

const spokenLanguage = {
    key: 'spokenlanguage',
    Content: SpokenLanguageButton,
    group: 3
};

/**
 * A hook that returns the spoken language button.
 * Currently always visible, but can be conditionally shown based on config in future.
 *
 * @returns {Object} The spoken language button configuration.
 */
export function useSpokenLanguageButton() {
    return spokenLanguage;
}
