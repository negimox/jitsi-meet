import ReducerRegistry from '../base/redux/ReducerRegistry';

import { SET_SPOKEN_LANGUAGE } from './actionTypes';
import { DEFAULT_SPOKEN_LANGUAGE, SpokenLanguage } from './constants';

/**
 * The Redux state shape for the translation feature.
 */
export interface ITranslationState {
    spokenLanguage: SpokenLanguage;
}

const DEFAULT_STATE: ITranslationState = {
    spokenLanguage: DEFAULT_SPOKEN_LANGUAGE
};

/**
 * Reducer for the translation feature state.
 */
ReducerRegistry.register<ITranslationState>(
    'features/translation',
    (state = DEFAULT_STATE, action): ITranslationState => {
        switch (action.type) {
        case SET_SPOKEN_LANGUAGE:
            return {
                ...state,
                spokenLanguage: action.language
            };

        default:
            return state;
        }
    }
);
