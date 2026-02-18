import ReducerRegistry from "../base/redux/ReducerRegistry";

import { SET_SPOKEN_LANGUAGE } from "./actionTypes";
import { SpokenLanguage } from "./constants";

/**
 * The Redux state shape for the translation feature.
 * spokenLanguage is undefined until the user explicitly selects a language.
 */
export interface ITranslationState {
    spokenLanguage: SpokenLanguage | undefined;
}

const DEFAULT_STATE: ITranslationState = {
    spokenLanguage: undefined,
};

/**
 * Reducer for the translation feature state.
 */
ReducerRegistry.register<ITranslationState>(
    "features/translation",
    (state = DEFAULT_STATE, action): ITranslationState => {
        switch (action.type) {
            case SET_SPOKEN_LANGUAGE:
                return {
                    ...state,
                    spokenLanguage: action.language,
                };

            default:
                return state;
        }
    },
);
