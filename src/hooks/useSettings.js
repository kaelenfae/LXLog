import { useState, useEffect } from 'react';

/**
 * Read all settings from localStorage into a plain object.
 * Single source of truth — used both for initial state and on settingsChanged events.
 */
function readSettings() {
    return {
        isCompact: localStorage.getItem('compactMode') === 'true',
        addressMode: localStorage.getItem('addressMode') || 'universe',
        showUniverse1: localStorage.getItem('showUniverse1') === 'true',
        theme: localStorage.getItem('theme') || 'dark',
        disableLanding: localStorage.getItem('disableLanding') === 'true',
        reportFooter: localStorage.getItem('reportFooter') || 'Made in LXLog',
        showDateInFooter: localStorage.getItem('showDateInFooter') !== 'false',
        showPageNumbers: localStorage.getItem('showPageNumbers') !== 'false',
        channelDisplayMode: localStorage.getItem('channelDisplayMode') || 'parts',
        // Accessibility settings
        dyslexicMode: localStorage.getItem('dyslexicMode') === 'true',
        reducedMotion: localStorage.getItem('reducedMotion') === 'true',
        highContrast: localStorage.getItem('highContrast') === 'true',
        largeText: localStorage.getItem('largeText') === 'true',
        // Unit system (ft or m)
        unitSystem: localStorage.getItem('unitSystem') || 'ft',
        // Universe separator (: or /)
        universeSeparator: localStorage.getItem('universeSeparator') || ':',
        mobileRefresh: localStorage.getItem('mobileRefresh') !== 'false',
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
