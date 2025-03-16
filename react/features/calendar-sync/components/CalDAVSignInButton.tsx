import React, { ReactNode } from 'react';
import Button from '../../base/ui/components/web/Button';
interface IProps {
    /**
     * The callback to invoke when the button is clicked.
     */
    onClick: () => void;

    /**
     * The text to display in the button.
     */
    text: string;
}

/**
 * A React Component for the CalDAV sign in button.
 *
 * @param {IProps} props - The props.
 * @returns {ReactNode}
 */
function CalDAVSignInButton({ onClick, text }: IProps) {
    return (
        <Button
            appearance='primary'
            labelKey={text}
            onClick={onClick}
            type='button' />
    );
}

export default CalDAVSignInButton;
