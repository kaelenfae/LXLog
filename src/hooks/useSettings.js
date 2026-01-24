import { useState, useEffect } from 'react';

export function useSettings() {
    const [settings, setSettings] = useState({
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
    });

    useEffect(() => {
        const handleSettingsChange = () => {
            setSettings({
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
            });
        };
        window.addEventListener('settingsChanged', handleSettingsChange);
        return () => window.removeEventListener('settingsChanged', handleSettingsChange);
    }, []);

    return settings;
}
