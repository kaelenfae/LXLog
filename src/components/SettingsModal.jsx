import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, resetShow, exportShow, removeDuplicates } from '../db';
import classNames from 'classnames';
import { useSettings } from '../hooks/useSettings';
import { version } from '../../package.json';

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

    // Custom Fields state
    const [customFieldDefs, setCustomFieldDefs] = useState([]);

    const [updateStatus, setUpdateStatus] = useState(null);
    const [appVersion, setAppVersion] = useState(version);
    const [cleanupMessage, setCleanupMessage] = useState(null);
    const [originalTheme] = useState(currentSettings.theme); // Store original for cancel

    // Theme class names for applying to HTML (dyslexic is now separate)
    const THEME_CLASSES = ['light', 'midnight', 'forest', 'sunset', 'ocean', 'lavender', 'hotpink', 'snes', 'colorblind'];

    // Live theme preview - apply theme immediately when dropdown changes
    useEffect(() => {
        document.documentElement.classList.remove(...THEME_CLASSES);
        if (theme !== 'dark') {
            document.documentElement.classList.add(theme);
        }
    }, [theme]);

    // Restore original theme if modal is closed without saving
    const handleClose = () => {
        document.documentElement.classList.remove(...THEME_CLASSES);
        if (originalTheme !== 'dark') {
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
                    {['show', 'reports', 'interface', 'accessibility', 'fields', 'danger'].map(tab => (
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
                            {tab === 'danger' ? 'DB' : tab === 'fields' ? 'Fields' : tab === 'accessibility' ? 'A11y' : tab === 'show' ? 'Show' : tab}
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
                                    <div className="flex bg-gray-700 rounded-lg p-0.5">
                                        <button
                                            onClick={() => setAddressMode('universe')}
                                            className={classNames("px-3 py-1 text-xs rounded-md transition-all font-medium", {
                                                "bg-[var(--accent-primary)] text-white shadow": addressMode === 'universe',
                                                "text-gray-400 hover:text-white": addressMode !== 'universe'
                                            })}
                                        >
                                            Univ:Addr
                                        </button>
                                        <button
                                            onClick={() => setAddressMode('absolute')}
                                            className={classNames("px-3 py-1 text-xs rounded-md transition-all font-medium", {
                                                "bg-[var(--accent-primary)] text-white shadow": addressMode === 'absolute',
                                                "text-gray-400 hover:text-white": addressMode !== 'absolute'
                                            })}
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
                                    <div className="flex bg-gray-700 rounded-lg p-0.5">
                                        <button
                                            onClick={() => setChannelDisplayMode('parts')}
                                            className={classNames("px-3 py-1 text-xs rounded-md transition-all font-medium", {
                                                "bg-[var(--accent-primary)] text-white shadow": channelDisplayMode === 'parts',
                                                "text-gray-400 hover:text-white": channelDisplayMode !== 'parts'
                                            })}
                                        >
                                            Parts
                                        </button>
                                        <button
                                            onClick={() => setChannelDisplayMode('duplicates')}
                                            className={classNames("px-3 py-1 text-xs rounded-md transition-all font-medium", {
                                                "bg-[var(--accent-primary)] text-white shadow": channelDisplayMode === 'duplicates',
                                                "text-gray-400 hover:text-white": channelDisplayMode !== 'duplicates'
                                            })}
                                        >
                                            Duplicates
                                        </button>
                                    </div>
                                </div>

                                <div className="h-px bg-[var(--border-subtle)]"></div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-semibold">Formatting</div>
                                        <div className="text-xs text-[var(--text-secondary)]">Always show Universe 1 (e.g. "1:1" vs "1")</div>
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
                                    <div className="flex rounded-md bg-[var(--bg-app)] border border-[var(--border-subtle)] p-1 gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setUnitSystem('ft')}
                                            className={classNames("px-3 py-1 text-xs rounded-md transition-all font-medium", {
                                                "bg-[var(--accent-primary)] text-white shadow": unitSystem === 'ft',
                                                "text-gray-400 hover:text-white": unitSystem !== 'ft'
                                            })}
                                        >
                                            Feet (ft)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setUnitSystem('m')}
                                            className={classNames("px-3 py-1 text-xs rounded-md transition-all font-medium", {
                                                "bg-[var(--accent-primary)] text-white shadow": unitSystem === 'm',
                                                "text-gray-400 hover:text-white": unitSystem !== 'm'
                                            })}
                                        >
                                            Meters (m)
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-[var(--bg-card)] rounded border border-[var(--border-subtle)] flex items-center justify-between">
                                <div>
                                    <div className="font-semibold">Theme</div>
                                    <div className="text-xs text-[var(--text-secondary)]">Choose your color scheme</div>
                                </div>
                                <select
                                    value={theme}
                                    onChange={(e) => setTheme(e.target.value)}
                                    className="bg-[var(--bg-app)] border border-[var(--border-default)] rounded px-3 py-1.5 text-sm min-w-[160px]"
                                >
                                    <optgroup label="Standard">
                                        <option value="dark">Dark</option>
                                        <option value="light">Light</option>
                                        <option value="midnight">Midnight</option>
                                        <option value="forest">Forest</option>
                                        <option value="sunset">Sunset</option>
                                        <option value="ocean">Ocean</option>
                                        <option value="lavender">Lavender</option>
                                        <option value="hotpink">Hot Pink</option>
                                        <option value="snes">SNES</option>
                                    </optgroup>
                                    <optgroup label="Accessibility">
                                        <option value="colorblind">Colorblind</option>
                                    </optgroup>
                                </select>
                            </div>
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
