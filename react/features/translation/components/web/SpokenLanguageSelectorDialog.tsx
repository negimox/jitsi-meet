import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import Dialog from '../../../base/ui/components/web/Dialog';

import SpokenLanguageSelector from './SpokenLanguageSelector';

const useStyles = makeStyles()(theme => {
    return {
        content: {
            padding: theme.spacing(2)
        }
    };
});

/**
 * Dialog component for selecting the spoken language.
 * This appears when clicking the Spoken Language toolbar button.
 *
 * @returns {JSX.Element} The dialog component.
 */
function SpokenLanguageSelectorDialog() {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const { classes } = useStyles();

    const onClose = useCallback(() => {
        // Dialog handles its own closing via the Dialog component
    }, [ dispatch ]);

    return (
        <Dialog
            cancel = {{ hidden: true }}
            ok = {{ hidden: true }}
            onCancel = { onClose }
            titleKey = 'translation.spokenLanguageDialogTitle'>
            <div className = { classes.content }>
                <p>{t('translation.spokenLanguageDialogDescription')}</p>
                <SpokenLanguageSelector />
            </div>
        </Dialog>
    );
}

export default SpokenLanguageSelectorDialog;
