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
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">Select Gel Color</h2>
                    <button onClick={onClose} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-4 border-b border-[var(--border-subtle)] space-y-4">
                    <input
                        type="text"
                        placeholder="Search gel number (e.g. R02, L201)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                        autoFocus
                    />
                    <div className="flex gap-2">
                        {['ALL', 'LEE', 'ROSCO'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1 text-xs rounded-full border transition-colors ${filter === f
                                    ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                                    : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'}`}
                            >
                                {f === 'ALL' ? 'All' : f === 'LEE' ? 'Lee Filters' : 'Rosco'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-4">
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
                </div>

                <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-panel)] text-xs text-[var(--text-tertiary)] flex justify-between">
                    <span>Showing {filteredGels.length} colors</span>
                    <span>Values are approximate</span>
                </div>
            </div>
        </div>
    );
}
