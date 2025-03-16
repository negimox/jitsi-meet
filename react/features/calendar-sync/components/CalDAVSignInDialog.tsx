import React, { useState } from 'react';
import { WithTranslation } from 'react-i18next';
import { connect } from 'react-redux';

import { IStore } from '../../app/types';
import { translate } from '../../base/i18n/functions';
import { closeDialog } from '../../base/dialog/actions';
import Dialog from '../../base/dialog/components/web/Dialog';
import { signIn } from '../actions.web';
import { CALENDAR_TYPE } from '../constants';

interface IProps extends WithTranslation {
    /**
     * The Redux dispatch function.
     */
    dispatch: IStore['dispatch'];
}

/**
 * Component to render a CalDAV sign-in dialog.
 *
 * @param {IProps} props - The props.
 * @returns {JSX.Element}
 */
function CalDAVSignInDialog({ dispatch, t }: IProps) {
    const [serverUrl, setServerUrl] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    /**
     * Handles the sign-in button click.
     *
     * @returns {void}
     */
    async function handleSubmit() {
        if (!serverUrl || !username || !password) {
            setError(t('calendarSync.caldav.missingFields'));
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await dispatch(signIn(CALENDAR_TYPE.CALDAV, {
                serverUrl,
                username,
                password
            }));
            dispatch(closeDialog());
        } catch (e) {
            setError(t('calendarSync.caldav.signInError'));
            console.error('CalDAV sign in error:', e);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog
            okDisabled={isSubmitting || !serverUrl || !username || !password}
            okKey={t('calendarSync.caldav.signIn')}
            onSubmit={handleSubmit}
            titleKey={t('calendarSync.caldav.title')}
            width='small'>
            <div className='caldav-signin-form'>
                {error && (
                    <div className='caldav-signin-error'>
                        {error}
                    </div>
                )}
                <div className='caldav-signin-field'>
                    <label htmlFor='caldav-server-url'>
                        {t('calendarSync.caldav.serverUrl')}:
                    </label>
                    <input
                        disabled={isSubmitting}
                        id='caldav-server-url'
                        onChange={e => setServerUrl(e.target.value)}
                        placeholder={t('calendarSync.caldav.serverUrlPlaceholder')}
                        type='text'
                        value={serverUrl} />
                </div>
                <div className='caldav-signin-field'>
                    <label htmlFor='caldav-username'>
                        {t('calendarSync.caldav.username')}:
                    </label>
                    <input
                        disabled={isSubmitting}
                        id='caldav-username'
                        onChange={e => setUsername(e.target.value)}
                        type='text'
                        value={username} />
                </div>
                <div className='caldav-signin-field'>
                    <label htmlFor='caldav-password'>
                        {t('calendarSync.caldav.password')}:
                    </label>
                    <input
                        disabled={isSubmitting}
                        id='caldav-password'
                        onChange={e => setPassword(e.target.value)}
                        type='password'
                        value={password} />
                </div>
                <div className='caldav-signin-info'>
                    {t('calendarSync.caldav.info')}
                </div>
            </div>
        </Dialog>
    );
}

export default translate(connect()(CalDAVSignInDialog));
