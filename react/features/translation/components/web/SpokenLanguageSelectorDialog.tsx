import React, { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { makeStyles } from "tss-react/mui";

import { IReduxState } from "../../../app/types";
import { hideDialog } from "../../../base/dialog/actions";
import Dialog from "../../../base/ui/components/web/Dialog";
import { getSpokenLanguage } from "../../functions";

import SpokenLanguageSelector from "./SpokenLanguageSelector";

const useStyles = makeStyles()((theme) => {
    return {
        content: {
            padding: theme.spacing(2),
        },
    };
});

/**
 * Dialog component for selecting the spoken language.
 * This appears when clicking the Spoken Language toolbar button,
 * or automatically after joining a conference without a language selected.
 *
 * When shown as a mandatory prompt (no language selected yet), the dialog
 * is non-dismissable — the user must select a language to proceed.
 *
 * @returns {JSX.Element} The dialog component.
 */
function SpokenLanguageSelectorDialog() {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const { classes } = useStyles();
    const selectedLanguage = useSelector((state: IReduxState) => getSpokenLanguage(state));

    // Capture the language at mount time so we can detect changes made
    // *within* this dialog vs. the language that was already set before opening.
    const initialLanguageRef = useRef(selectedLanguage);

    // If the user already has a language selected (e.g., opening from toolbar),
    // the dialog is dismissable. If no language is selected (mandatory prompt),
    // it cannot be closed.
    const isMandatory = !initialLanguageRef.current;

    // Auto-close the dialog when the language changes from within the dialog.
    // For the mandatory case (no initial language), any selection closes it.
    // For the toolbar case (language already set), only a *different* selection closes it.
    useEffect(() => {
        if (selectedLanguage && selectedLanguage !== initialLanguageRef.current) {
            dispatch(hideDialog("SpokenLanguageSelectorDialog"));
        }
    }, [selectedLanguage, dispatch]);

    const onClose = useCallback(() => {
        if (!isMandatory) {
            dispatch(hideDialog("SpokenLanguageSelectorDialog"));
        }
    }, [dispatch, isMandatory]);

    return (
        <Dialog
            cancel={{ hidden: true }}
            disableBackdropClose={isMandatory}
            disableEscape={isMandatory}
            hideCloseButton={isMandatory}
            ok={{ hidden: true }}
            onCancel={onClose}
            titleKey="translation.spokenLanguageDialogTitle"
        >
            <div className={classes.content}>
                <p>
                    {t(
                        isMandatory
                            ? "translation.spokenLanguageDialogMandatory"
                            : "translation.spokenLanguageDialogDescription",
                    )}
                </p>
                <SpokenLanguageSelector />
            </div>
        </Dialog>
    );
}

export default SpokenLanguageSelectorDialog;
