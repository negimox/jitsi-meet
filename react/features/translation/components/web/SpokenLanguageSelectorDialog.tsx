import React, { useCallback, useEffect } from "react";
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

    // If the user already has a language selected (e.g., opening from toolbar),
    // the dialog is dismissable. If no language is selected (mandatory prompt),
    // it cannot be closed.
    const isMandatory = !selectedLanguage;

    // Auto-close the dialog when a language is selected.
    // This handles the mandatory prompt case: user picks a language → dialog closes.
    useEffect(() => {
        if (selectedLanguage) {
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
