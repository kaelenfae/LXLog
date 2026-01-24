import React from 'react';
import classNames from 'classnames';

export function FilterModal({
    onClose,
    filters,
    setFilters,
    types,
    positions,
    colors,
    gobos
}) {
    const handleReset = () => {
        setFilters({
            type: 'All',
            position: 'All',
            color: 'All',
            gobo: 'All',
            missingAddress: false,
            missingChannel: false,
            duplicates: false,
            searchQuery: ''
        });
    };

    const updateFilter = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-[var(--bg-panel)] w-full max-w-lg rounded-lg shadow-2xl border border-[var(--border-subtle)] overflow-hidden flex flex-col max-h-[90vh]">
                <div className="h-14 border-b border-[var(--border-subtle)] flex items-center px-6 justify-between bg-[var(--bg-panel)]">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-[var(--accent-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">Filter Instruments</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Search */}
                    <div>
                        <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">Search Text</label>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input
                                type="text"
                                value={filters.searchQuery}
                                onChange={(e) => updateFilter('searchQuery', e.target.value)}
                                className="w-full pl-10 bg-[var(--bg-card)] border-[var(--border-subtle)] text-sm"
                                placeholder="Filter by Purpose, Position, etc..."
                            />
                        </div>
                    </div>

                    {/* Dropdowns */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">Type</label>
                            <select
                                value={filters.type}
                                onChange={(e) => updateFilter('type', e.target.value)}
                                className="w-full bg-[var(--bg-card)] border-[var(--border-subtle)] text-sm"
                            >
                                <option value="All">All Types</option>
                                {types.filter(t => t !== 'All').map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">Position</label>
                            <select
                                value={filters.position}
                                onChange={(e) => updateFilter('position', e.target.value)}
                                className="w-full bg-[var(--bg-card)] border-[var(--border-subtle)] text-sm"
                            >
                                <option value="All">All Positions</option>
                                {positions.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">Color</label>
                            <select
                                value={filters.color}
                                onChange={(e) => updateFilter('color', e.target.value)}
                                className="w-full bg-[var(--bg-card)] border-[var(--border-subtle)] text-sm"
                            >
                                <option value="All">All Colors</option>
                                {colors.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">Gobo</label>
                            <select
                                value={filters.gobo}
                                onChange={(e) => updateFilter('gobo', e.target.value)}
                                className="w-full bg-[var(--bg-card)] border-[var(--border-subtle)] text-sm"
                            >
                                <option value="All">All Gobos</option>
                                {gobos.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Toggles */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider border-b border-[var(--border-subtle)] pb-1">Validation Filters</h4>

                        <div className="flex items-center justify-between p-3 bg-[var(--bg-card)] rounded border border-[var(--border-subtle)]">
                            <div>
                                <div className="text-sm font-medium">Missing Address</div>
                                <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-tight">Highlight data entry errors</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={filters.missingAddress} onChange={e => updateFilter('missingAddress', e.target.checked)} className="sr-only peer" />
                                <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-[var(--bg-card)] rounded border border-[var(--border-subtle)]">
                            <div>
                                <div className="text-sm font-medium">Missing Channel</div>
                                <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-tight">Show unpatched instruments</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={filters.missingChannel} onChange={e => updateFilter('missingChannel', e.target.checked)} className="sr-only peer" />
                                <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-[var(--bg-card)] rounded border border-[var(--border-subtle)]">
                            <div>
                                <div className="text-sm font-medium">Potential Duplicates</div>
                                <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-tight font-bold text-[var(--error)]">Duplicate Addresses or Channels</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={filters.duplicates} onChange={e => updateFilter('duplicates', e.target.checked)} className="sr-only peer" />
                                <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--error)]"></div>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-[var(--border-subtle)] flex justify-between gap-3 bg-[var(--bg-card)]">
                    <button onClick={handleReset} className="px-4 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Reset All</button>
                    <button onClick={onClose} className="px-8 py-2 bg-[var(--accent-primary)] text-white rounded text-sm font-bold hover:bg-[var(--accent-hover)] transition-colors shadow-lg">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
