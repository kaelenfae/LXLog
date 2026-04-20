import React, { useState, useMemo } from 'react';
import { GEL_DATA, getContrastColor } from '../utils/gelData';

export function ColorPicker({ onClose, onSelect }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('ALL'); // ALL, LEE, ROSCO, GAM

    const filteredGels = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return Object.entries(GEL_DATA).filter(([code, color]) => {
            // Filter by Manufacturer
            if (filter === 'LEE' && !code.startsWith('L')) return false;
            if (filter === 'ROSCO' && !code.startsWith('R')) return false;
            // GAM usually uses G or R codes in some databases, assuming standard R/L separation here for now

            // Filter by Search Term
            return code.toLowerCase().includes(term);
        }).sort((a, b) => {
            // Sort alphanumeric (e.g. L002 before L201)
            return a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' });
        });
    }, [searchTerm, filter]);

    return (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">Select Gel Color</h2>
                    <button onClick={onClose} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-4 border-b border-[var(--border-subtle)] space-y-4">
                    <div className="flex gap-2">
                        {['ALL', 'LEE', 'ROSCO', 'CUSTOM'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1 text-xs rounded-full border transition-colors ${filter === f
                                    ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                                    : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'}`}
                            >
                                {f === 'ALL' ? 'All' : f === 'LEE' ? 'Lee Filters' : f === 'ROSCO' ? 'Rosco' : 'Custom Color'}
                            </button>
                        ))}
                    </div>

                    {filter !== 'CUSTOM' ? (
                        <input
                            type="text"
                            placeholder="Search gel number (e.g. R02, L201)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-2 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                            autoFocus
                        />
                    ) : (
                        <div className="flex items-center gap-4 bg-[var(--bg-panel)] p-4 rounded-lg border border-[var(--border-subtle)] animate-in fade-in slide-in-from-top-1">
                            <div className="relative w-12 h-12 rounded-lg border border-[var(--border-subtle)] overflow-hidden shadow-inner">
                                <input
                                    type="color"
                                    value={searchTerm.startsWith('#') ? searchTerm : '#ffffff'}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-1">Hex Code</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="#FFFFFF"
                                        className="flex-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-sm font-mono text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                                    />
                                    <button 
                                        onClick={() => onSelect(searchTerm)}
                                        disabled={!/^#[0-9A-Fa-f]{3,6}$/.test(searchTerm)}
                                        className="px-4 py-1.5 bg-[var(--accent-primary)] text-white rounded text-sm font-bold hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-auto p-4">
                    {filter === 'CUSTOM' ? (
                        <div className="h-full flex flex-col items-center justify-center text-[var(--text-tertiary)] opacity-50 p-8 text-center">
                            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                            <p className="text-sm">Use the picker above to select a custom color.</p>
                            <p className="text-xs mt-1">This will save the Hex code directly to the color field.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                            {/* Clear/Transparent Option */}
                            <button
                                onClick={() => onSelect('')}
                                className="aspect-square rounded border border-[var(--border-subtle)] overflow-hidden flex flex-col hover:ring-2 hover:ring-[var(--accent-primary)] transition-all relative group"
                                title="Clear / No Color"
                            >
                                <div className="flex-1 bg-[var(--bg-app)] relative">
                                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_48%,var(--border-subtle)_49%,var(--border-subtle)_51%,transparent_52%)]"></div>
                                </div>
                                <div className="h-6 bg-[var(--bg-panel)] flex items-center justify-center text-[10px] font-mono text-[var(--text-secondary)] border-t border-[var(--border-subtle)]">
                                    CLEAR
                                </div>
                            </button>

                            {filteredGels.map(([code, hex]) => (
                                <button
                                    key={code}
                                    onClick={() => onSelect(code)}
                                    className="aspect-square rounded border border-[var(--border-subtle)] overflow-hidden flex flex-col hover:ring-2 hover:ring-[var(--accent-primary)] transition-all"
                                    title={code}
                                >
                                    <div
                                        className="flex-1 w-full"
                                        style={{ backgroundColor: hex }}
                                    ></div>
                                    <div className="h-6 bg-[var(--bg-panel)] flex items-center justify-center text-[10px] font-mono text-[var(--text-primary)] border-t border-[var(--border-subtle)] w-full">
                                        {code}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-panel)] text-xs text-[var(--text-tertiary)] flex justify-between">
                    <span>{filter === 'CUSTOM' ? 'Custom Hex Selector' : `Showing ${filteredGels.length} colors`}</span>
                    <span>Values are approximate</span>
                </div>
            </div>
        </div>
    );
}
