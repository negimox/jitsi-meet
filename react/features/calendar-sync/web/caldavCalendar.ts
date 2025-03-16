import { createDAVClient as createClient } from 'tsdav';
import { getShareInfoText } from '../../invite/functions';
import { IStore } from '../../app/types';
import { SET_CALENDAR_AUTH_STATE } from '../actionTypes';
import { setCalendarAPIAuthState } from '../actions.web';

/**
 * CalDAV auth state constants.
 */
const CALDAV_AUTH_STATE = {
    SERVER_URL: 'serverUrl',
    USERNAME: 'username',
    PASSWORD: 'password', // Consider using more secure storage
    CALENDARS: 'calendars'
};

/**
 * Server response from CalDAV calendar fetch.
 */
interface CalDAVCalendar {
    displayName?: string;
    url: string;
    ctag?: string;
    description?: string;
    color?: string;
}

/**
 * Function to format a CalDAV calendar entry to match Jitsi's expected format.
 *
 * @param {Object} entry - The calendar entry from CalDAV.
 * @returns {Object} Formatted calendar entry.
 */
function formatCalendarEntry(entry: any) {
    return {
        id: entry.uid || entry.id,
        calendarId: entry.calendarUrl,
        title: entry.summary || entry.title,
        description: entry.description,
        startDate: entry.startDate || entry.start,
        endDate: entry.endDate || entry.end,
        location: entry.location,
        url: extractUrlFromDescription(entry.description)
    };
}

/**
 * Extract a Jitsi meeting URL from a calendar event description.
 *
 * @param {string|undefined} description - The event description.
 * @returns {string|undefined} The extracted URL or undefined.
 */
function extractUrlFromDescription(description?: string): string | undefined {
    if (!description) {
        return undefined;
    }

    // This is a simplified approach - in a real implementation,
    // you would use a more robust regex that matches your domain pattern
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = description.match(urlRegex);

    if (matches && matches.length > 0) {
        return matches[0];
    }

    return undefined;
}

/**
 * A stateless collection of action creators that implements the expected
 * interface for interacting with the CalDAV API in order to get calendar data.
 *
 * @type {Object}
 */
export const caldavCalendarApi = {
    /**
     * Sets up any necessary preparations for the CalDAV integration.
     * Since CalDAV doesn't require external libraries to load like Google's API,
     * this function simply resolves with success.
     *
     * @returns {function(): Promise<void>}
     */
    load() {
        return () => Promise.resolve();
    },

    /**
     * Returns the email address for the currently logged in user.
     *
     * @returns {function(Dispatch<*, Function>): Promise<string>}
     */
    getCurrentEmail(): Function {
        return (dispatch: IStore['dispatch'], getState: IStore['getState']) => {
            const { caldavAuthState = {} } = getState()['features/calendar-sync'] || {};
            const email = caldavAuthState.username || '';

            return Promise.resolve(email);
        };
    },

    /**
     * Prompts the user to sign in to the CalDAV service.
     * For CalDAV, we need to collect:
     * - Server URL
     * - Username
     * - Password/Token
     *
     * Note: In a real implementation, you would want to use a secure method
     * to handle credentials, especially passwords.
     *
     * @param {Object} credentials - The credentials to use.
     * @returns {function(Dispatch<any>, Function): Promise<void>}
     */
    signIn(credentials?: { serverUrl: string; username: string; password: string }) {
        return async (dispatch: IStore['dispatch'], getState: IStore['getState']) => {
            // If no credentials provided, assume they come from state
            // (in a real implementation, you'd show a credentials dialog)
            const { caldavAuthState = {} } = getState()['features/calendar-sync'] || {};
            const serverUrl = credentials?.serverUrl || caldavAuthState.serverUrl;
            const username = credentials?.username || caldavAuthState.username;
            const password = credentials?.password || caldavAuthState.password;

            if (!serverUrl || !username || !password) {
                return Promise.reject(new Error('Missing CalDAV credentials'));
            }

            try {
                // Test connection by trying to fetch calendars
                const client = await createClient({
                    serverUrl,
                    credentials: {
                        username,
                        password
                    },
                    defaultAccountType: 'caldav'
                });

                const calendars = await client.fetchCalendars();

                if (!calendars || calendars.length === 0) {
                    return Promise.reject(new Error('No calendars found'));
                }

                // Store auth state
                dispatch(setCalendarAPIAuthState({
                    serverUrl,
                    username,
                    password,
                    calendars
                }));

                return Promise.resolve();
            } catch (error) {
                console.error('CalDAV sign in failed:', error);
                return Promise.reject(error);
            }
        };
    },

    /**
     * Retrieves the current calendar events.
     *
     * @param {number} fetchStartDays - The number of days to go back when fetching.
     * @param {number} fetchEndDays - The number of days to fetch.
     * @returns {function(Dispatch<any>, Function): Promise<CalendarEntries>}
     */
    getCalendarEntries(fetchStartDays?: number, fetchEndDays?: number) {
        return async (dispatch: IStore['dispatch'], getState: IStore['getState']) => {
            const { caldavAuthState = {} } = getState()['features/calendar-sync'] || {};
            const serverUrl = caldavAuthState.serverUrl;
            const username = caldavAuthState.username;
            const password = caldavAuthState.password;
            const savedCalendars = caldavAuthState.calendars || [];

            if (!serverUrl || !username || !password) {
                return Promise.reject(new Error('Not authorized, please sign in!'));
            }

            try {
                const client = await createClient({
                    serverUrl,
                    credentials: {
                        username,
                        password
                    },
                    defaultAccountType: 'caldav'
                });

                // Calculate start and end dates for the query
                const startDate = new Date();
                const endDate = new Date();

                startDate.setDate(startDate.getDate() + (fetchStartDays || -14)); // Default to 14 days in the past
                endDate.setDate(endDate.getDate() + (fetchEndDays || 28));       // Default to 28 days in the future

                // Fetch events from all calendars
                let allEvents: any[] = [];

                for (const calendar of savedCalendars) {
                    try {
                        const calendarObjects = await client.fetchCalendarObjects({
                            calendar,
                            timeRange: {
                                start: startDate.toISOString(),
                                end: endDate.toISOString()
                            }
                        });

                        // Process and format the calendar objects
                        const events = calendarObjects.map(obj => {
                            // Parse the ICS data to extract event details
                            // This is simplified - actual implementation would use a proper ICS parser
                            // like ical.js to extract all event details
                            const event = {
                                ...obj,
                                calendarUrl: calendar.url
                            };

                            return formatCalendarEntry(event);
                        });

                        allEvents = [...allEvents, ...events];
                    } catch (error) {
                        console.error(`Error fetching events for calendar ${calendar.url}:`, error);
                        // Continue with other calendars even if one fails
                    }
                }

                return allEvents;
            } catch (error) {
                console.error('Error fetching CalDAV events:', error);
                return Promise.reject(error);
            }
        };
    },

    /**
     * Updates calendar event by generating new invite URL and editing the event
     * adding some descriptive text and location.
     *
     * @param {string} id - The event id.
     * @param {string} calendarId - The id of the calendar to use.
     * @param {string} location - The location to save to the event.
     * @returns {function(Dispatch<any>): Promise<string|never>}
     */
    updateCalendarEvent(id: string, calendarId: string, location: string) {
        return async (dispatch: IStore['dispatch'], getState: IStore['getState']) => {
            const { caldavAuthState = {} } = getState()['features/calendar-sync'] || {};
            const serverUrl = caldavAuthState.serverUrl;
            const username = caldavAuthState.username;
            const password = caldavAuthState.password;

            if (!serverUrl || !username || !password) {
                return Promise.reject('Not authorized, please sign in!');
            }

            try {
                // Get the share info text
                const shareInfoText = await getShareInfoText(getState(), location, true);

                const client = await createClient({
                    serverUrl,
                    credentials: {
                        username,
                        password
                    },
                    defaultAccountType: 'caldav'
                });

                // Find the calendar that contains this event
                const calendar = caldavAuthState.calendars.find((cal: CalDAVCalendar) => cal.url === calendarId);

                if (!calendar) {
                    return Promise.reject(new Error('Calendar not found'));
                }

                // Find the specific event to update
                const calendarObjects = await client.fetchCalendarObjects({
                    calendar,
                    filters: [
                        {
                            'comp-filter': {
                                _attributes: {
                                    name: 'VCALENDAR'
                                },
                                'comp-filter': {
                                    _attributes: {
                                        name: 'VEVENT'
                                    },
                                    'prop-filter': {
                                        _attributes: {
                                            name: 'UID'
                                        },
                                        'text-match': {
                                            _attributes: {
                                                'collation': 'i;ascii-casemap',
                                                'negate-condition': 'no'
                                            },
                                            _text: id
                                        }
                                    }
                                }
                            }
                        }
                    ]
                });

                if (!calendarObjects || calendarObjects.length === 0) {
                    return Promise.reject(new Error('Event not found'));
                }

                const eventObj = calendarObjects[0];

                // Update event data with new location and description
                // Note: This is a simplified implementation and would need to be
                // expanded to properly parse and update ICS data
                const updatedData = {
                    ...eventObj,
                    location,
                    description: eventObj?.description
                        ? `${eventObj?.description}\n\n${shareInfoText}`
                        : shareInfoText
                };

                // Update the calendar object
                await client.updateCalendarObject({
                    calendarObject: updatedData
                });

                return Promise.resolve(location);
            } catch (error) {
                console.error('Error updating CalDAV event:', error);
                return Promise.reject(error);
            }
        };
    },

    /**
     * Returns whether or not the user is currently signed in.
     *
     * @returns {function(Dispatch<any>, Function): Promise<boolean>}
     */
    _isSignedIn() {
        return async (dispatch: IStore['dispatch'], getState: IStore['getState']) => {
            const { caldavAuthState = {} } = getState()['features/calendar-sync'] || {};
            const serverUrl = caldavAuthState.serverUrl;
            const username = caldavAuthState.username;
            const password = caldavAuthState.password;

            if (!serverUrl || !username || !password) {
                return false;
            }

            try {
                // Test connection by getting calendars
                const client = await createClient({
                    serverUrl,
                    credentials: {
                        username,
                        password
                    },
                    defaultAccountType: 'caldav'
                });

                const calendars = await client.fetchCalendars();
                return calendars && calendars.length > 0;
            } catch (error) {
                console.error('CalDAV authorization check failed:', error);
                return false;
            }
        };
    }
};
