import React, { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ensureGenericFixture } from '../db';
import { parseGdtfFile, importGdtfToLibrary, deleteFixtureFromLibrary } from '../utils/gdtfParser';
import { FixtureDetailModal } from './FixtureDetailModal';
import { useToast } from './Toast';

export function FixtureLibrary() {
    const toast = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [importing, setImporting] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [selectedFixture, setSelectedFixture] = useState(null);
    const [error, setError] = useState(null);
    const [pendingDeleteId, setPendingDeleteId] = useState(null);
    const fileInputRef = useRef(null);

    const handleLoadAllTypes = async () => {
        setGenerating(true);
        setError(null);
        try {
            const insts = await db.instruments.toArray();
            const uniqueTypes = [...new Set(insts.map(inst => inst.type?.trim()).filter(Boolean))];
            
            if (uniqueTypes.length === 0) {
                toast.info('No instrument types found in the active schedule.');
                return;
            }

            let loadedCount = 0;
            let updatedCount = 0;

            await db.transaction('rw', db.instruments, db.fixtureLibrary, async () => {
                for (const type of uniqueTypes) {
                    const existing = await db.fixtureLibrary.filter(f => 
                        (f.name || '').toLowerCase() === type.toLowerCase() ||
                        (f.shortName || '').toLowerCase() === type.toLowerCase()
                    ).first();

                    let fixtureTypeId;
                    if (existing) {
                        fixtureTypeId = existing.fixtureTypeId;
                    } else {
                        fixtureTypeId = await ensureGenericFixture(type);
                        loadedCount++;
                    }

                    if (fixtureTypeId) {
                        const matchingInsts = insts.filter(inst => (inst.type || '').trim().toLowerCase() === type.toLowerCase());
                        for (const inst of matchingInsts) {
                            if (inst.fixtureTypeId !== fixtureTypeId) {
                                await db.instruments.update(inst.id, { fixtureTypeId });
                                updatedCount++;
                            }
                        }
                    }
                }
            });

            if (loadedCount > 0) {
                toast.success(`Generated ${loadedCount} new fixture profile(s) from schedule.`);
            } else {
                toast.info('All schedule fixture types already exist in the library.');
            }
        } catch (err) {
            console.error('Failed to load types from schedule:', err);
            toast.error('Failed to generate fixture profiles.');
        } finally {
            setGenerating(false);
        }
    };

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

    const deleteConfirmTimer = useRef(null);

    // Handle fixture deletion
    const handleDelete = (fixtureId) => {
        if (pendingDeleteId === fixtureId) {
            handleDeleteConfirmed();
        } else {
            setPendingDeleteId(fixtureId);
            if (deleteConfirmTimer.current) clearTimeout(deleteConfirmTimer.current);
            deleteConfirmTimer.current = setTimeout(() => setPendingDeleteId(null), 4000);
        }
    };

    const handleDeleteConfirmed = async () => {
        if (pendingDeleteId == null) return;
        await deleteFixtureFromLibrary(db, pendingDeleteId);
        if (selectedFixture?.id === pendingDeleteId) {
            setSelectedFixture(null);
        }
        setPendingDeleteId(null);
        if (deleteConfirmTimer.current) clearTimeout(deleteConfirmTimer.current);
    };

    // Cancel deletion if clicking elsewhere
    useEffect(() => {
        if (pendingDeleteId == null) return;

        const handleGlobalClick = () => {
            setPendingDeleteId(null);
        };

        // Add small delay to prevent immediate trigger
        const timer = setTimeout(() => {
            window.addEventListener('click', handleGlobalClick);
        }, 50);

        return () => {
            window.removeEventListener('click', handleGlobalClick);
            clearTimeout(timer);
        };
    }, [pendingDeleteId]);

    return (
        <div className="h-full flex flex-col bg-[var(--bg-app)]">
            {/* Header */}
            <div className="flex-none p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)]">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-xl font-semibold text-[var(--text-primary)]">
                        Fixture Library
                    </h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                if (window.confirm('Are you sure you want to clear the entire fixture library? This will remove all GDTF profiles you have imported.')) {
                                    db.fixtureLibrary.clear();
                                }
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 border border-red-500/50 text-red-400 text-xs font-bold uppercase tracking-wider rounded-md hover:bg-red-500/10 transition-all shadow-lg active:scale-95"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Clear All
                        </button>
                        <button
                            onClick={handleLoadAllTypes}
                            disabled={generating || importing}
                            className="flex items-center gap-2 px-3 py-1.5 border border-[var(--border-default)] text-[var(--text-primary)] text-xs font-bold uppercase tracking-wider rounded-md hover:bg-[var(--bg-hover)] transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {generating ? (
                                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            )}
                            Load Schedule Types
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={importing}
                            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent-primary)] text-white text-xs font-bold uppercase tracking-wider rounded-md hover:bg-[var(--accent-hover)] transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {importing ? (
                                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            )}
                            Import GDTF
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".gdtf"
                            onChange={handleFileSelect}
                        />
                    </div>
                </div>

                {/* Search */}
                <div className="relative flex items-center">
                    <div className="absolute left-3 flex items-center justify-center pointer-events-none text-[var(--text-tertiary)]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search by name or manufacturer..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: '32px' }}
                        className="w-full pr-4 py-2 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)]"
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
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm text-[var(--text-secondary)] truncate">
                                                {fixture.manufacturer}
                                            </p>
                                            {fixture.isGeneric && (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                    Generic
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(fixture.id);
                                        }}
                                        className={`p-1.5 rounded-md transition-all ${pendingDeleteId === fixture.id ? 'animate-pulse' : 'text-[var(--text-tertiary)] hover:text-[var(--error)] hover:bg-[var(--error)]/10'}`}
                                        style={pendingDeleteId === fixture.id ? { backgroundColor: 'var(--error)', color: 'var(--accent-text)', borderColor: 'var(--error)' } : {}}
                                        title={pendingDeleteId === fixture.id ? "Click again to confirm delete" : "Delete fixture"}
                                    >
                                        {pendingDeleteId === fixture.id ? (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        )}
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
