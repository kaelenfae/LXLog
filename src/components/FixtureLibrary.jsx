import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { parseGdtfFile, importGdtfToLibrary, deleteFixtureFromLibrary } from '../utils/gdtfParser';
import { FixtureDetailModal } from './FixtureDetailModal';

export function FixtureLibrary() {
    const [searchQuery, setSearchQuery] = useState('');
    const [importing, setImporting] = useState(false);
    const [selectedFixture, setSelectedFixture] = useState(null);
    const [error, setError] = useState(null);
    const [pendingDeleteId, setPendingDeleteId] = useState(null);
    const fileInputRef = useRef(null);

    // Load fixtures from database
    const allFixtures = useLiveQuery(() => db.fixtureLibrary.toArray()) || [];

    // Filter fixtures by search query
    const fixtures = React.useMemo(() => {
        if (!searchQuery.trim()) return allFixtures;
        const query = searchQuery.toLowerCase();
        return allFixtures.filter(f =>
            f.name?.toLowerCase().includes(query) ||
            f.manufacturer?.toLowerCase().includes(query) ||
            f.shortName?.toLowerCase().includes(query)
        );
    }, [allFixtures, searchQuery]);

    // Handle GDTF file import
    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setError(null);

        try {
            const fixtureData = await parseGdtfFile(file);
            await importGdtfToLibrary(db, fixtureData);
            setError(null);
        } catch (err) {
            console.error('Import failed:', err);
            setError(err.message || 'Failed to import GDTF file');
        } finally {
            setImporting(false);
            // Reset file input for future imports
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Handle fixture deletion
    const handleDelete = (fixtureId) => {
        setPendingDeleteId(fixtureId);
    };

    const handleDeleteConfirmed = async () => {
        if (pendingDeleteId == null) return;
        await deleteFixtureFromLibrary(db, pendingDeleteId);
        if (selectedFixture?.id === pendingDeleteId) {
            setSelectedFixture(null);
        }
        setPendingDeleteId(null);
    };

    return (
        <div className="h-full flex flex-col bg-[var(--bg-app)]">
            {/* Inline Delete Confirmation */}
            {pendingDeleteId != null && (
                <div className="bg-red-900/40 border-b border-red-500/40 px-6 py-3 flex items-center justify-between shrink-0">
                    <span className="text-sm text-red-300 font-medium">Remove this fixture from the library? This cannot be undone.</span>
                    <div className="flex gap-2">
                        <button onClick={() => setPendingDeleteId(null)} className="px-3 py-1 text-xs border border-[var(--border-subtle)] rounded text-[var(--text-secondary)] hover:text-white transition-colors">Cancel</button>
                        <button onClick={handleDeleteConfirmed} className="px-3 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded font-semibold transition-colors">Remove</button>
                    </div>
                </div>
            )}
            {/* Header */}
            <div className="flex-none p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)]">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-xl font-semibold text-[var(--text-primary)]">
                        Fixture Library
                    </h1>
                    <div className="flex items-center gap-2">
                        {/* GDTF Import temporarily disabled for maintenance */}
                        <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] bg-[var(--bg-app)] px-2 py-1 rounded border border-[var(--border-subtle)]">
                            GDTF Import Coming Soon
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search by name or manufacturer..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                </div>

                {/* Error message */}
                {error && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                        {error}
                    </div>
                )}
            </div>

            {/* Fixture List */}
            <div className="flex-1 overflow-auto p-4">
                {fixtures.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-[var(--text-tertiary)]">
                        <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <p className="text-lg mb-2">No fixtures in library</p>
                        <p className="text-sm">Built-in fixture profiles will appear here.</p>
                    </div>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {fixtures.map(fixture => (
                            <div
                                key={fixture.id}
                                onClick={() => setSelectedFixture(fixture)}
                                className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedFixture?.id === fixture.id
                                        ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]'
                                        : 'bg-[var(--bg-panel)] border-[var(--border-subtle)] hover:border-[var(--text-tertiary)]'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-[var(--text-primary)] truncate" title={fixture.name}>
                                            {fixture.name}
                                        </h3>
                                        <p className="text-sm text-[var(--text-secondary)] truncate">
                                            {fixture.manufacturer}
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(fixture.id);
                                        }}
                                        className="p-1 text-[var(--text-tertiary)] hover:text-red-400 transition-colors"
                                        title="Delete fixture"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
                                    {fixture.wattage > 0 && (
                                        <span className="flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            {fixture.wattage}W
                                        </span>
                                    )}
                                    {fixture.dmxModes?.length > 0 && (
                                        <span>{fixture.dmxModes.length} DMX mode{fixture.dmxModes.length > 1 ? 's' : ''}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedFixture && (
                <FixtureDetailModal 
                    fixture={selectedFixture} 
                    onClose={() => setSelectedFixture(null)} 
                />
            )}
        </div>
    );
}
