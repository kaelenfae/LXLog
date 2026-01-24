import React, { useState } from 'react';

export function ImportModeModal({ onClose, onConfirm, fileName }) {
    const [mode, setMode] = useState('replace'); // 'replace' | 'merge'

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg-panel)] w-full max-w-md rounded-lg shadow-2xl border border-[var(--border-subtle)] overflow-hidden flex flex-col">
                <div className="p-6">
                    <h3 className="text-lg font-bold mb-2">Import Options</h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                        How would you like to import <strong>{fileName}</strong>?
                    </p>

                    <div className="space-y-3">
                        <label className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors ${mode === 'replace' ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]' : 'bg-[var(--bg-card)] border-[var(--border-default)] hover:border-[var(--text-secondary)]'}`}>
                            <input
                                type="radio"
                                name="importMode"
                                value="replace"
                                checked={mode === 'replace'}
                                onChange={() => setMode('replace')}
                                className="mt-1"
                            />
                            <div>
                                <div className="font-bold text-sm">Create New Schedule</div>
                                <div className="text-xs text-[var(--text-secondary)]">Replaces all existing instrument data with the new file.</div>
                            </div>
                        </label>

                        <label className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors ${mode === 'merge' ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]' : 'bg-[var(--bg-card)] border-[var(--border-default)] hover:border-[var(--text-secondary)]'}`}>
                            <input
                                type="radio"
                                name="importMode"
                                value="merge"
                                checked={mode === 'merge'}
                                onChange={() => setMode('merge')}
                                className="mt-1"
                            />
                            <div>
                                <div className="font-bold text-sm">Merge with Existing</div>
                                <div className="text-xs text-[var(--text-secondary)]">Updates existing channels and adds new ones. Keeps existing data if not overwritten.</div>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="p-4 border-t border-[var(--border-subtle)] flex justify-end gap-3 bg-[var(--bg-card)]">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(mode === 'merge')}
                        className="px-6 py-2 bg-[var(--accent-primary)] text-white rounded text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
}
