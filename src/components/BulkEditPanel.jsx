import React, { useState } from 'react';
import { getGelColor } from '../utils/gelData';
import { ColorSwatch } from './ColorSwatch';

export function BulkEditPanel({ selectedCount, onUpdate, onClose, existingValues = {} }) {
    // State for form fields - undefined means "don't change", empty string means "clear value"
    const [updates, setUpdates] = useState({});
    const [note, setNote] = useState('');

    const fields = [
        { key: 'purpose', label: 'Purpose', type: 'text' },
        { key: 'position', label: 'Position', type: 'text' },
        { key: 'unit', label: 'Unit', type: 'text' },
        { key: 'type', label: 'Type', type: 'text' },
        { key: 'mode', label: 'Mode', type: 'text' }, // Added Mode
        { key: 'watt', label: 'Wattage', type: 'text' },
        { key: 'color', label: 'Color', type: 'color-text' },
        { key: 'gobo', label: 'Gobo', type: 'text' },
        { key: 'accessory', label: 'Accessory', type: 'text' },
        { key: 'dimmer', label: 'Dimmer', type: 'text' },
    ];

    const handleChange = (key, value) => {
        setUpdates(prev => {
            if (value === undefined) {
                const copy = { ...prev };
                delete copy[key];
                return copy;
            }
            return { ...prev, [key]: value };
        });
    };

    const handleSave = () => {
        onUpdate(updates, note);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">
                        Edit {selectedCount} Instruments
                    </h2>
                    <button onClick={onClose} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                    <div className="text-sm text-[var(--text-secondary)] bg-[var(--bg-panel)] p-3 rounded border border-[var(--border-subtle)]">
                        <p>Enter values to update. Leave fields blank to keep existing values.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {fields.map(field => (
                            <div key={field.key} className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex justify-between">
                                    {field.label}
                                    {updates[field.key] !== undefined && (
                                        <button
                                            onClick={() => handleChange(field.key, undefined)}
                                            className="text-[var(--accent-primary)] hover:underline text-[10px] normal-case"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={updates[field.key] || ''}
                                        onChange={(e) => handleChange(field.key, e.target.value)}
                                        placeholder={updates[field.key] === undefined ? "(Keep Existing)" : ""}
                                        className={`w-full p-2 text-sm rounded bg-[var(--bg-panel)] border transition-colors ${updates[field.key] !== undefined
                                            ? 'border-[var(--accent-primary)] bg-[var(--bg-app)]'
                                            : 'border-[var(--border-subtle)] placeholder:text-[var(--text-disabled)]'
                                            } ${field.type === 'color-text' ? 'pl-8' : ''}`}
                                        autoComplete="off"
                                    />
                                    {field.type === 'color-text' && (
                                        <div className="absolute left-2 top-1/2 -translate-y-1/2">
                                            <ColorSwatch color={updates[field.key] || ''} className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bulk Note Input */}
                    <div className="pt-4 border-t border-[var(--border-subtle)]">
                        <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">
                            Add Note (Optional)
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Add a reason for this bulk update (e.g. 'Changed for Act 2')"
                            className="w-full p-2 text-sm rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[60px] resize-y"
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-panel)] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={Object.keys(updates).length === 0}
                        className="px-4 py-2 text-sm bg-[var(--accent-primary)] text-white rounded font-bold hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                    >
                        Update Instruments
                    </button>
                </div>
            </div>
        </div>
    );
}
