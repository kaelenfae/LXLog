import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, resetShow, exportShow, removeDuplicates } from '../db';
import classNames from 'classnames';
import { useSettings } from '../hooks/useSettings';
import { version } from '../../package.json';

// Theme presets with display colors for preview cards
const THEME_PRESETS = [
    { id: 'dark', name: 'Dark', bg: '#0f0f12', panel: '#16161a', accent: '#6366f1' },
    { id: 'light', name: 'Light', bg: '#fdf2f0', panel: '#fffafa', accent: '#8b5cf6' },
    { id: 'midnight', name: 'Midnight', bg: '#0a0e1a', panel: '#101728', accent: '#3b82f6' },
    { id: 'forest', name: 'Forest', bg: '#0a120e', panel: '#0f1a14', accent: '#10b981' },
    { id: 'sunset', name: 'Sunset', bg: '#1a1410', panel: '#241c16', accent: '#f97316' },
    { id: 'ocean', name: 'Ocean', bg: '#0a1214', panel: '#0e1a1e', accent: '#06b6d4' },
    { id: 'lavender', name: 'Lavender', bg: '#1a1420', panel: '#221a2a', accent: '#a855f7' },
    { id: 'hotpink', name: 'Hot Pink', bg: '#ff1493', panel: '#ff69b4', accent: '#ff00ff' },
    { id: 'snes', name: 'SNES', bg: '#2a2a34', panel: '#34343e', accent: '#7a72b0' },
    { id: 'colorblind', name: 'Colorblind', bg: '#0f1214', panel: '#161a1e', accent: '#ee7733' },
];

const DEFAULT_CUSTOM_COLORS = {
    '--bg-app': '#1a1a2e',
    '--bg-panel': '#16213e',
    '--bg-card': '#0f3460',
    '--accent-primary': '#e94560',
    '--text-primary': '#f4f4f5',
    '--text-secondary': '#a1a1aa',
};

export function SettingsModal({ onClose }) {
    const [activeTab, setActiveTab] = useState('show');
    const metadata = useLiveQuery(() => db.showMetadata.toArray());
    const [formData, setFormData] = useState({});

    const currentSettings = useSettings();

    // Interface Settings - locally managed for Cancel/Save workflow
    const [isCompact, setIsCompact] = useState(currentSettings.isCompact);
    const [disableLanding, setDisableLanding] = useState(currentSettings.disableLanding);
    const [addressMode, setAddressMode] = useState(currentSettings.addressMode);
    const [theme, setTheme] = useState(currentSettings.theme);
    const [showUniverse1, setShowUniverse1] = useState(currentSettings.showUniverse1);
    const [channelDisplayMode, setChannelDisplayMode] = useState(currentSettings.channelDisplayMode || 'parts');

    // Accessibility Settings
    const [dyslexicMode, setDyslexicMode] = useState(currentSettings.dyslexicMode);
    const [reducedMotion, setReducedMotion] = useState(currentSettings.reducedMotion);
    const [highContrast, setHighContrast] = useState(currentSettings.highContrast);
    const [largeText, setLargeText] = useState(currentSettings.largeText);

    // Unit System
    const [unitSystem, setUnitSystem] = useState(currentSettings.unitSystem || 'ft');

    // Universe Separator
    const [universeSeparator, setUniverseSeparator] = useState(currentSettings.universeSeparator || ':');

    // Show Cells (for multicell fixtures)
    const [showCells, setShowCells] = useState(currentSettings.showCells !== false);

    // Custom Fields state
    const [customFieldDefs, setCustomFieldDefs] = useState([]);

    const [updateStatus, setUpdateStatus] = useState(null);
    const [appVersion, setAppVersion] = useState(version);
    const [cleanupMessage, setCleanupMessage] = useState(null);
    const [originalTheme] = useState(currentSettings.theme); // Store original for cancel
    const [originalCustomColors] = useState(() => {
        try { return JSON.parse(localStorage.getItem('customTheme')) || DEFAULT_CUSTOM_COLORS; }
        catch { return DEFAULT_CUSTOM_COLORS; }
    });

    // Custom Theme Colors
    const [customThemeColors, setCustomThemeColors] = useState(() => {
        try { return JSON.parse(localStorage.getItem('customTheme')) || DEFAULT_CUSTOM_COLORS; }
        catch { return DEFAULT_CUSTOM_COLORS; }
    });

    // Theme class names for applying to HTML (dyslexic is now separate)
    const THEME_CLASSES = ['light', 'midnight', 'forest', 'sunset', 'ocean', 'lavender', 'hotpink', 'snes', 'colorblind'];

    // Live theme preview - apply theme immediately when selection changes
    useEffect(() => {
        document.documentElement.classList.remove(...THEME_CLASSES);
        // Clear any custom CSS variables first
        Object.keys(DEFAULT_CUSTOM_COLORS).forEach(key => {
            document.documentElement.style.removeProperty(key);
        });
        // Also clear derived custom vars
        document.documentElement.style.removeProperty('--accent-hover');
        document.documentElement.style.removeProperty('--accent-text');
        document.documentElement.style.removeProperty('--bg-hover');
        document.documentElement.style.removeProperty('--border-subtle');
        document.documentElement.style.removeProperty('--border-default');

        if (theme === 'custom') {
            // Apply custom CSS variables
            Object.entries(customThemeColors).forEach(([key, value]) => {
                document.documentElement.style.setProperty(key, value);
            });
            // Derive some extra vars from the custom colors
            document.documentElement.style.setProperty('--accent-hover', customThemeColors['--accent-primary']);
            document.documentElement.style.setProperty('--accent-text', '#ffffff');
            document.documentElement.style.setProperty('--bg-hover', customThemeColors['--bg-card']);
            document.documentElement.style.setProperty('--border-subtle', customThemeColors['--bg-card']);
            document.documentElement.style.setProperty('--border-default', customThemeColors['--text-secondary'] + '44');
        } else if (theme !== 'dark') {
            document.documentElement.classList.add(theme);
        }
    }, [theme, customThemeColors]);

    // Restore original theme if modal is closed without saving
    const handleClose = () => {
        document.documentElement.classList.remove(...THEME_CLASSES);
        // Clear any custom CSS variables
        Object.keys(DEFAULT_CUSTOM_COLORS).forEach(key => {
            document.documentElement.style.removeProperty(key);
        });
        document.documentElement.style.removeProperty('--accent-hover');
        document.documentElement.style.removeProperty('--accent-text');
        document.documentElement.style.removeProperty('--bg-hover');
        document.documentElement.style.removeProperty('--border-subtle');
        document.documentElement.style.removeProperty('--border-default');

        if (originalTheme === 'custom') {
            Object.entries(originalCustomColors).forEach(([key, value]) => {
                document.documentElement.style.setProperty(key, value);
            });
            document.documentElement.style.setProperty('--accent-hover', originalCustomColors['--accent-primary']);
            document.documentElement.style.setProperty('--accent-text', '#ffffff');
            document.documentElement.style.setProperty('--bg-hover', originalCustomColors['--bg-card']);
            document.documentElement.style.setProperty('--border-subtle', originalCustomColors['--bg-card']);
            document.documentElement.style.setProperty('--border-default', originalCustomColors['--text-secondary'] + '44');
        } else if (originalTheme !== 'dark') {
            document.documentElement.classList.add(originalTheme);
        }
        onClose();
    };

    useEffect(() => {
        if (metadata && metadata[0]) {
            setFormData(metadata[0]);
            // Load custom field definitions
            if (metadata[0].customFieldDefinitions) {
                setCustomFieldDefs(metadata[0].customFieldDefinitions);
            }
        }
    }, [metadata]);
    useEffect(() => {
        if (window.electron) {
            const electronVer = window.electron.getVersion();
            if (electronVer) setAppVersion(electronVer);


            window.electron.onUpdateAvailable(() => setUpdateStatus('available'));
            window.electron.onUpdateDownloaded(() => setUpdateStatus('downloaded'));
            window.electron.onUpdateError(() => setUpdateStatus('error'));
        }
    }, []);

    useEffect(() => {
        if (metadata && metadata[0]) {
            setFormData(metadata[0]);
        }
    }, [metadata]);

    const handleSave = async () => {
        // Safe Merge: Default to existing metadata if formData is incomplete
        const currentData = (metadata && metadata[0]) || {};
        const dataToSave = { ...currentData, ...formData };

        if (!dataToSave.id && currentData.id) dataToSave.id = currentData.id;

        await db.showMetadata.put(dataToSave);

        // Save custom field definitions
        const metaToUpdate = await db.showMetadata.toArray();
        if (metaToUpdate && metaToUpdate[0]) {
            await db.showMetadata.update(metaToUpdate[0].id, {
                customFieldDefinitions: customFieldDefs
            });
        }

        // Save Interface Settings
        localStorage.setItem('compactMode', isCompact);
        localStorage.setItem('disableLanding', disableLanding);
        localStorage.setItem('addressMode', addressMode);
        localStorage.setItem('theme', theme);
        localStorage.setItem('showUniverse1', showUniverse1);
        localStorage.setItem('channelDisplayMode', channelDisplayMode);

        // Accessibility Settings
        localStorage.setItem('dyslexicMode', dyslexicMode);
        localStorage.setItem('reducedMotion', reducedMotion);
        localStorage.setItem('highContrast', highContrast);
        localStorage.setItem('largeText', largeText);

        // Unit System
        localStorage.setItem('unitSystem', unitSystem);

        // Universe Separator
        localStorage.setItem('universeSeparator', universeSeparator);
        localStorage.setItem('showCells', showCells);

        // Custom Theme
        if (theme === 'custom') {
            localStorage.setItem('customTheme', JSON.stringify(customThemeColors));
        }

        // Report Settings (if modified)
        if (formData.reportFooter !== undefined) localStorage.setItem('reportFooter', formData.reportFooter);
        if (formData.showDateInFooter !== undefined) localStorage.setItem('showDateInFooter', formData.showDateInFooter);
        if (formData.showPageNumbers !== undefined) localStorage.setItem('showPageNumbers', formData.showPageNumbers);

        // Trigger a custom event or let App re-render if it listens to storage
        window.dispatchEvent(new Event('settingsChanged'));

        onClose();
    };

    const handleReset = async () => {
        if (confirm('Are you sure? This will delete all instrument data.')) {
            await resetShow();
            onClose();
            window.location.reload();
        }
    };

    const handleBackup = async () => {
        const json = await exportShow();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!metadata) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg-panel)] w-full max-w-2xl rounded-lg shadow-2xl border border-[var(--border-subtle)] overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex border-b border-[var(--border-subtle)] overflow-x-auto">
                    {['show', 'reports', 'interface', 'theme', 'accessibility', 'fields', 'danger'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={classNames(
                                "px-4 py-4 text-sm font-medium transition-colors uppercase tracking-wider whitespace-nowrap",
                                activeTab === tab
                                    ? "text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)] bg-[var(--bg-card)]"
                                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                            )}
                        >
                            {tab === 'danger' ? 'DB' : tab === 'fields' ? 'Fields' : tab === 'accessibility' ? 'A11y' : tab === 'show' ? 'Show' : tab === 'theme' ? 'Theme' : tab}
                        </button>
                    ))}
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {activeTab === 'show' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold mb-4">Show Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="text-xs text-[var(--text-secondary)]">Show Name</span>
                                    <input
                                        type="text"
                                        value={formData.name || ''}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full mt-1"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-xs text-[var(--text-secondary)]">Venue</span>
                                    <input
                                        type="text"
                                        value={formData.venue || ''}
                                        onChange={e => setFormData({ ...formData, venue: e.target.value })}
                                        className="w-full mt-1"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-xs text-[var(--text-secondary)]">Designer</span>
                                    <input
                                        type="text"
                                        value={formData.designer || ''}
                                        onChange={e => setFormData({ ...formData, designer: e.target.value })}
                                        className="w-full mt-1"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-xs text-[var(--text-secondary)]">Assistant</span>
                                    <input
                                        type="text"
                                        value={formData.assistant || ''}
                                        onChange={e => setFormData({ ...formData, assistant: e.target.value })}
                                        className="w-full mt-1"
                                    />
                                </label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reports' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold mb-4">Report Settings</h3>
                            <label className="block">
                                <span className="text-xs text-[var(--text-secondary)]">Footer Text (Left)</span>
                                <input
                                    type="text"
                                    placeholder="Made in LXLog"
                                    value={formData.reportFooter || ''}
                                    onChange={e => setFormData({ ...formData, reportFooter: e.target.value })}
                                    className="w-full mt-1"
                                />
                            </label>
                            <div className="flex items-center gap-4 mt-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.showDateInFooter !== false} // Default true
                                        onChange={e => setFormData({ ...formData, showDateInFooter: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-[var(--accent-primary)]"
                                    />
                                    <span className="text-sm">Show Date</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.showPageNumbers !== false} // Default true
                                        onChange={e => setFormData({ ...formData, showPageNumbers: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-[var(--accent-primary)]"
                                    />
                                    <span className="text-sm">Show Page Numbers</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'interface' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold mb-4">Interface Customization</h3>

                            <div className="p-4 bg-[var(--bg-card)] rounded border border-[var(--border-subtle)] flex items-center justify-between">
                                <div>
                                    <div className="font-semibold">Compact Mode</div>
                                    <div className="text-xs text-[var(--text-secondary)]">Reduce row height in schedules</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={isCompact} onChange={e => setIsCompact(e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                                </label>
                            </div>

                            <div className="p-4 bg-[var(--bg-card)] rounded border border-[var(--border-subtle)] flex items-center justify-between">
                                <div>
                                    <div className="font-semibold">Disable Landing Page</div>
                                    <div className="text-xs text-[var(--text-secondary)]">Skip the intro page and go straight to the app</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={disableLanding} onChange={e => setDisableLanding(e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                                </label>
                            </div>

                            <div className="p-4 bg-[var(--bg-card)] rounded border border-[var(--border-subtle)] space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-semibold">Address Format</div>
                                        <div className="text-xs text-[var(--text-secondary)]">Universe:Address vs Absolute</div>
                                    </div>
                                    <div className="flex bg-gray-700 rounded-lg p-0.5 relative z-10">
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); setAddressMode('universe'); }}
                                            className="px-3 py-1 text-xs rounded-md transition-all font-medium cursor-pointer relative z-20"
                                            style={{
                                                backgroundColor: addressMode === 'universe' ? '#4f46e5' : 'transparent',
                                                color: addressMode === 'universe' ? 'white' : '#9ca3af',
                                                boxShadow: addressMode === 'universe' ? '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' : 'none'
                                            }}
                                        >
                                            Univ:Addr
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); setAddressMode('absolute'); }}
                                            className="px-3 py-1 text-xs rounded-md transition-all font-medium cursor-pointer relative z-20"
                                            style={{
                                                backgroundColor: addressMode === 'absolute' ? '#4f46e5' : 'transparent',
                                                color: addressMode === 'absolute' ? 'white' : '#9ca3af',
                                                boxShadow: addressMode === 'absolute' ? '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' : 'none'
                                            }}
                                        >
                                            Absolute
                                        </button>
                                    </div>
                                </div>

                                <div className="h-px bg-[var(--border-subtle)]"></div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-semibold">Channel Defaults</div>
                                        <div className="text-xs text-[var(--text-secondary)]">Multi-part or Duplicate</div>
                                    </div>
                                    <div className="flex bg-gray-700 rounded-lg p-0.5 relative z-10">
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); setChannelDisplayMode('parts'); }}
                                            className="px-3 py-1 text-xs rounded-md transition-all font-medium cursor-pointer relative z-20"
                                            style={{
                                                backgroundColor: channelDisplayMode === 'parts' ? '#4f46e5' : 'transparent',
                                                color: channelDisplayMode === 'parts' ? 'white' : '#9ca3af',
                                                boxShadow: channelDisplayMode === 'parts' ? '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' : 'none'
                                            }}
                                        >
                                            Parts
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); setChannelDisplayMode('duplicates'); }}
                                            className="px-3 py-1 text-xs rounded-md transition-all font-medium cursor-pointer relative z-20"
                                            style={{
                                                backgroundColor: channelDisplayMode === 'duplicates' ? '#4f46e5' : 'transparent',
                                                color: channelDisplayMode === 'duplicates' ? 'white' : '#9ca3af',
                                                boxShadow: channelDisplayMode === 'duplicates' ? '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' : 'none'
                                            }}
                                        >
                                            Duplicates
                                        </button>
                                    </div>
                                </div>

                                <div className="h-px bg-[var(--border-subtle)]"></div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-semibold">Always Show Universe 1</div>
                                        <div className="text-xs text-[var(--text-secondary)]">Display "1:1" instead of just "1"</div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={showUniverse1} onChange={e => setShowUniverse1(e.target.checked)} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                                    </label>
                                </div>

                                <div className="h-px bg-[var(--border-subtle)]"></div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-semibold">Unit System</div>
                                        <div className="text-xs text-[var(--text-secondary)]">Choose feet or meters for distances</div>
                                    </div>
                                    <div className="flex rounded-md bg-[var(--bg-app)] border border-[var(--border-subtle)] p-1 gap-1 relative z-10">
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); setUnitSystem('ft'); }}
                                            className="px-3 py-1 text-xs rounded-md transition-all font-medium cursor-pointer relative z-20"
                                            style={{
                                                backgroundColor: unitSystem === 'ft' ? '#4f46e5' : 'transparent',
                                                color: unitSystem === 'ft' ? 'white' : '#9ca3af',
                                                boxShadow: unitSystem === 'ft' ? '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' : 'none'
                                            }}
                                        >
                                            Feet (ft)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); setUnitSystem('m'); }}
                                            className="px-3 py-1 text-xs rounded-md transition-all font-medium cursor-pointer relative z-20"
                                            style={{
                                                backgroundColor: unitSystem === 'm' ? '#4f46e5' : 'transparent',
                                                color: unitSystem === 'm' ? 'white' : '#9ca3af',
                                                boxShadow: unitSystem === 'm' ? '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' : 'none'
                                            }}
                                        >
                                            Meters (m)
                                        </button>
                                    </div>
                                </div>

                                <div className="h-px bg-[var(--border-subtle)]"></div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-semibold">Universe Separator</div>
                                        <div className="text-xs text-[var(--text-secondary)]">Choose colon or slash (e.g. "2:1" vs "2/1")</div>
                                    </div>
                                    <div className="flex rounded-md bg-[var(--bg-app)] border border-[var(--border-subtle)] p-1 gap-1 relative z-10">
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); setUniverseSeparator(':'); }}
                                            className="px-3 py-1 text-xs rounded-md transition-all font-medium cursor-pointer relative z-20"
                                            style={{
                                                backgroundColor: universeSeparator === ':' ? '#4f46e5' : 'transparent',
                                                color: universeSeparator === ':' ? 'white' : '#9ca3af',
                                                boxShadow: universeSeparator === ':' ? '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' : 'none'
                                            }}
                                        >
                                            MA (:)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); setUniverseSeparator('/'); }}
                                            className="px-3 py-1 text-xs rounded-md transition-all font-medium cursor-pointer relative z-20"
                                            style={{
                                                backgroundColor: universeSeparator === '/' ? '#4f46e5' : 'transparent',
                                                color: universeSeparator === '/' ? 'white' : '#9ca3af',
                                                boxShadow: universeSeparator === '/' ? '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' : 'none'
                                            }}
                                        >
                                            ETC (/)
                                        </button>
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}

                    {activeTab === 'theme' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold mb-4">Theme</h3>

                            {/* Preset Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {THEME_PRESETS.map(preset => (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        onClick={() => setTheme(preset.id)}
                                        className={classNames(
                                            "relative rounded-lg p-3 text-left transition-all cursor-pointer border-2",
                                            theme === preset.id
                                                ? "border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/30"
                                                : "border-[var(--border-subtle)] hover:border-[var(--border-default)]"
                                        )}
                                        style={{ backgroundColor: preset.panel }}
                                    >
                                        {/* Color swatch bar */}
                                        <div className="flex gap-1 mb-2">
                                            <div className="h-3 w-full rounded-sm" style={{ backgroundColor: preset.bg }} />
                                            <div className="h-3 w-full rounded-sm" style={{ backgroundColor: preset.accent }} />
                                            <div className="h-3 w-full rounded-sm" style={{ backgroundColor: preset.panel }} />
                                        </div>
                                        <div className="text-xs font-semibold" style={{ color: preset.accent }}>
                                            {preset.name}
                                        </div>
                                        {theme === preset.id && (
                                            <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: preset.accent }} />
                                        )}
                                    </button>
                                ))}

                                {/* Custom Theme Card */}
                                <button
                                    type="button"
                                    onClick={() => setTheme('custom')}
                                    className={classNames(
                                        "relative rounded-lg p-3 text-left transition-all cursor-pointer border-2",
                                        theme === 'custom'
                                            ? "border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/30"
                                            : "border-[var(--border-subtle)] hover:border-[var(--border-default)]"
                                    )}
                                    style={{ backgroundColor: customThemeColors['--bg-panel'] }}
                                >
                                    <div className="flex gap-1 mb-2">
                                        <div className="h-3 w-full rounded-sm" style={{ backgroundColor: customThemeColors['--bg-app'] }} />
                                        <div className="h-3 w-full rounded-sm" style={{ backgroundColor: customThemeColors['--accent-primary'] }} />
                                        <div className="h-3 w-full rounded-sm" style={{ backgroundColor: customThemeColors['--bg-card'] }} />
                                    </div>
                                    <div className="text-xs font-semibold" style={{ color: customThemeColors['--accent-primary'] }}>
                                        ✦ Custom
                                    </div>
                                    {theme === 'custom' && (
                                        <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: customThemeColors['--accent-primary'] }} />
                                    )}
                                </button>
                            </div>

                            {/* Custom Theme Builder */}
                            {theme === 'custom' && (
                                <div className="p-4 bg-[var(--bg-card)] rounded-lg border border-[var(--border-subtle)] space-y-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold text-sm">Custom Theme Editor</h4>
                                        <button
                                            type="button"
                                            onClick={() => setCustomThemeColors(DEFAULT_CUSTOM_COLORS)}
                                            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                    {[
                                        { key: '--bg-app', label: 'Background' },
                                        { key: '--bg-panel', label: 'Panel' },
                                        { key: '--bg-card', label: 'Card' },
                                        { key: '--accent-primary', label: 'Accent' },
                                        { key: '--text-primary', label: 'Text' },
                                        { key: '--text-secondary', label: 'Secondary Text' },
                                    ].map(({ key, label }) => (
                                        <div key={key} className="flex items-center justify-between">
                                            <span className="text-xs text-[var(--text-secondary)]">{label}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{customThemeColors[key]}</span>
                                                <input
                                                    type="color"
                                                    value={customThemeColors[key]}
                                                    onChange={(e) => setCustomThemeColors(prev => ({ ...prev, [key]: e.target.value }))}
                                                    className="w-8 h-6 rounded border border-[var(--border-subtle)] cursor-pointer bg-transparent p-0"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'accessibility' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold mb-4">Accessibility Settings</h3>
                            <p className="text-sm text-[var(--text-secondary)] mb-4">
                                Configure accessibility features to improve your experience.
                            </p>

                            <div className="p-4 bg-[var(--bg-card)] rounded border border-[var(--border-subtle)] flex items-center justify-between">
                                <div>
                                    <div className="font-semibold">📖 Dyslexic Mode</div>
                                    <div className="text-xs text-[var(--text-secondary)]">Use OpenDyslexic font for improved readability</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={dyslexicMode} onChange={e => setDyslexicMode(e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                                </label>
                            </div>

                            <div className="p-4 bg-[var(--bg-card)] rounded border border-[var(--border-subtle)] flex items-center justify-between">
                                <div>
                                    <div className="font-semibold">🚫 Reduced Motion</div>
                                    <div className="text-xs text-[var(--text-secondary)]">Disable animations and transitions</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={reducedMotion} onChange={e => setReducedMotion(e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                                </label>
                            </div>

                            <div className="p-4 bg-[var(--bg-card)] rounded border border-[var(--border-subtle)] flex items-center justify-between">
                                <div>
                                    <div className="font-semibold">🔲 High Contrast</div>
                                    <div className="text-xs text-[var(--text-secondary)]">Increase contrast for better visibility</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={highContrast} onChange={e => setHighContrast(e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                                </label>
                            </div>

                            <div className="p-4 bg-[var(--bg-card)] rounded border border-[var(--border-subtle)] flex items-center justify-between">
                                <div>
                                    <div className="font-semibold">🔤 Large Text</div>
                                    <div className="text-xs text-[var(--text-secondary)]">Increase base font size throughout the app</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={largeText} onChange={e => setLargeText(e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                                </label>
                            </div>

                            <div className="mt-6 p-3 bg-blue-500/10 border border-blue-500/30 rounded text-sm text-blue-400">
                                💡 Tip: These settings can be combined with any theme. Your accessibility preferences will be saved separately from your visual theme choice.
                            </div>
                        </div>
                    )}

                    {activeTab === 'danger' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-red-500 mb-4">Database Management</h3>

                            <div className="p-4 border border-[var(--border-subtle)] rounded bg-[var(--bg-card)] mb-4">
                                <h4 className="font-bold mb-2">Cleanup</h4>
                                <p className="text-sm text-[var(--text-secondary)] mb-1">Remove instruments that are identical duplicates (same channel, address, type, etc).</p>
                                <p className="text-xs text-red-400 mb-4">This action cannot be undone.</p>
                                <button onClick={async () => {
                                    if (confirm('Find and remove strict duplicates?')) {
                                        const count = await removeDuplicates();
                                        setCleanupMessage(`Removed ${count} duplicate instruments.`);
                                        // Clear message after 3 seconds
                                        setTimeout(() => setCleanupMessage(null), 3000);
                                    }
                                }} className="bg-[var(--bg-hover)] border border-[var(--border-default)] px-4 py-2 rounded text-sm hover:text-white transition-colors">
                                    Remove Duplicates
                                </button>
                                {cleanupMessage && (
                                    <div className="mt-2 text-sm text-[var(--success)] font-bold animate-pulse">
                                        {cleanupMessage}
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border border-red-900/30 bg-red-900/10 rounded">
                                <h4 className="font-bold text-red-400 mb-2">Reset Show</h4>
                                <p className="text-sm text-red-300/70 mb-1 text-balance">
                                    This will delete ALL instruments and show data.
                                </p>
                                <p className="text-xs text-red-400 mb-4">This action cannot be undone.</p>
                                <button onClick={handleReset} className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20">
                                    Reset Show (Clear Data)
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'fields' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold mb-4">Global Custom Fields</h3>
                            <p className="text-sm text-[var(--text-secondary)] mb-4">
                                Define custom fields that will appear on every instrument.
                                <br />
                                <span className="text-xs italic opacity-75">Note: Deleting a field here only hides it from the instrument view. Data is preserved.</span>
                            </p>

                            <div className="space-y-3">
                                {customFieldDefs.map((field, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={field}
                                            onChange={(e) => {
                                                const newDefs = [...customFieldDefs];
                                                newDefs[idx] = e.target.value;
                                                setCustomFieldDefs(newDefs);
                                            }}
                                            className="flex-1 bg-[var(--bg-app)] border border-[var(--border-default)] rounded px-3 py-2 text-sm focus:border-[var(--accent-primary)] focus:outline-none transition-colors"
                                            placeholder="Field Name"
                                        />
                                        <button
                                            onClick={() => {
                                                const newDefs = customFieldDefs.filter((_, i) => i !== idx);
                                                setCustomFieldDefs(newDefs);
                                            }}
                                            className="px-3 text-[var(--text-tertiary)] hover:text-[var(--error)] hover:bg-red-500/10 rounded transition-colors"
                                            title="Delete Field"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => setCustomFieldDefs([...customFieldDefs, `Field ${customFieldDefs.length + 1}`])}
                                className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Add Custom Field
                            </button>
                        </div>
                    )}


                </div>

                <div className="p-4 border-t border-[var(--border-subtle)] flex justify-end gap-3 bg-[var(--bg-card)]">
                    <button onClick={handleClose} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-[var(--accent-primary)] text-white rounded text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors shadow-lg shadow-indigo-500/20">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
