import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { makeStyles } from "tss-react/mui";

import { IReduxState } from "../../../app/types";
import Select from "../../../base/ui/components/web/Select";
import { setSpokenLanguage } from "../../actions.any";
import { SUPPORTED_SPOKEN_LANGUAGES, SpokenLanguage } from "../../constants";
import { getSpokenLanguage } from "../../functions";

// Import reducer to ensure it gets registered with ReducerRegistry
import "../../reducer";

/**
 * Styles for the SpokenLanguageSelector component.
 */
const useStyles = makeStyles()((theme) => {
    return {
        container: {
            display: "flex",
            alignItems: "center",
            padding: theme.spacing(2),
            gap: theme.spacing(2),
        },
        select: {
            flex: 1,
            minWidth: 150,
        },
        label: {
            ...theme.typography.bodyShortRegular,
            color: theme.palette.text01,
            whiteSpace: "nowrap",
        },
    };
});

interface IProps {
    /**
     * Optional className for additional styling.
     */
    className?: string;
}

/**
 * Component that renders a dropdown for selecting the user's spoken language.
 * This is used for live audio translation to identify the language the user speaks.
 *
 * @returns {JSX.Element} The rendered component.
 */
function SpokenLanguageSelector({ className }: IProps) {
    const { t } = useTranslation();
    const { classes, cx } = useStyles();
    const dispatch = useDispatch();
    const selectedLanguage = useSelector((state: IReduxState) => getSpokenLanguage(state));

    /**
     * Maps supported languages to Select component options format.
     * Includes a prompt placeholder only when no language is selected yet.
     * Once a language is chosen, only real language options are shown
     * (prevents deselection).
     */
    const languageOptions = [
        ...(!selectedLanguage
            ? [
                  {
                      value: "",
                      label: t("translation.selectLanguagePlaceholder"),
                  },
              ]
            : []),
        ...SUPPORTED_SPOKEN_LANGUAGES.map((lang) => ({
            value: lang,
            label: t(`translation.languages.${lang}`),
        })),
    ];

    /**
     * Handles language selection changes.
     * Ignores selection of the placeholder (empty value).
     */
    const onLanguageChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            const value = e.target.value;

            if (value) {
                dispatch(setSpokenLanguage(value as SpokenLanguage));
            }
        },
        [dispatch],
    );

    return (
        <div className={cx(classes.container, className)}>
            <span className={classes.label}>{t("translation.spokenLanguageLabel")}</span>
            <Select
                className={classes.select}
                id="spoken-language-select"
                onChange={onLanguageChange}
                options={languageOptions}
                value={selectedLanguage ?? ""}
            />
        </div>
    );
}

export default SpokenLanguageSelector;
