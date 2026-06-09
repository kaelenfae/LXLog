import { useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants';

/**
 * Read all settings from localStorage into a plain object.
 * Single source of truth — used both for initial state and on settingsChanged events.
 */
function readSettings() {
    return {
        isCompact: localStorage.getItem(STORAGE_KEYS.COMPACT_MODE) === 'true',
        addressMode: localStorage.getItem(STORAGE_KEYS.ADDRESS_MODE) || 'universe',
        showUniverse1: localStorage.getItem(STORAGE_KEYS.SHOW_UNIVERSE1) === 'true',
        theme: localStorage.getItem(STORAGE_KEYS.THEME) || 'dark',
        disableLanding: localStorage.getItem(STORAGE_KEYS.DISABLE_LANDING) === 'true',
        reportFooter: localStorage.getItem(STORAGE_KEYS.REPORT_FOOTER) || 'Made in LXLog',
        showDateInFooter: localStorage.getItem(STORAGE_KEYS.SHOW_DATE_IN_FOOTER) !== 'false',
        showPageNumbers: localStorage.getItem(STORAGE_KEYS.SHOW_PAGE_NUMBERS) !== 'false',
        channelDisplayMode: localStorage.getItem(STORAGE_KEYS.CHANNEL_DISPLAY_MODE) || 'parts',
        // Accessibility settings
        dyslexicMode: localStorage.getItem(STORAGE_KEYS.DYSLEXIC_MODE) === 'true',
        reducedMotion: localStorage.getItem(STORAGE_KEYS.REDUCED_MOTION) === 'true',
        highContrast: localStorage.getItem(STORAGE_KEYS.HIGH_CONTRAST) === 'true',
        largeText: localStorage.getItem(STORAGE_KEYS.LARGE_TEXT) === 'true',
        // Unit system (ft or m)
        unitSystem: localStorage.getItem(STORAGE_KEYS.UNIT_SYSTEM) || 'ft',
        // Universe separator (: or /)
        universeSeparator: localStorage.getItem(STORAGE_KEYS.UNIVERSE_SEPARATOR) || ':',
        mobileRefresh: localStorage.getItem(STORAGE_KEYS.MOBILE_REFRESH) !== 'false',
        showAllFixtureTypes: localStorage.getItem(STORAGE_KEYS.SHOW_ALL_FIXTURE_TYPES) === 'true',
        showXYZ: localStorage.getItem(STORAGE_KEYS.SHOW_XYZ) === 'true',
        defaultGridHeight: localStorage.getItem(STORAGE_KEYS.DEFAULT_GRID_HEIGHT) || '',
        // Venue configurations
        venueName: localStorage.getItem(STORAGE_KEYS.VENUE_NAME) || '',
        venueAddress: localStorage.getItem(STORAGE_KEYS.VENUE_ADDRESS) || '',
        venueNotes: localStorage.getItem(STORAGE_KEYS.VENUE_NOTES) || '',
        venueContact: localStorage.getItem(STORAGE_KEYS.VENUE_CONTACT) || '',
    };
}

export function useSettings() {
    const [settings, setSettings] = useState(readSettings);

    useEffect(() => {
        const handleSettingsChange = () => setSettings(readSettings());
        window.addEventListener('settingsChanged', handleSettingsChange);
        return () => window.removeEventListener('settingsChanged', handleSettingsChange);
    }, []);

    return settings;
}
