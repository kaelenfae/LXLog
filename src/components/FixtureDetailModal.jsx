import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { parseGdtfFile } from '../utils/gdtfParser';
import { useToast } from './Toast';

export function FixtureDetailModal({ fixture, onClose }) {
    const [activeTab, setActiveTab] = useState('dmx');
    const [targetFixtureId, setTargetFixtureId] = useState('');
    const [loadingGdtf, setLoadingGdtf] = useState(false);
    const fileInputRef = useRef(null);
    const toast = useToast();

    // Create a stable object URL for the thumbnail blob and revoke it on cleanup
    const thumbnailUrl = useMemo(() => {
        if (fixture?.thumbnailBlob) return URL.createObjectURL(fixture.thumbnailBlob);
        return null;
    }, [fixture?.thumbnailBlob]);

    useEffect(() => {
        return () => { if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl); };
    }, [thumbnailUrl]);

    const otherFixtures = useLiveQuery(async () => {
        if (!fixture) return [];
        const all = await db.fixtureLibrary.toArray();
        return all.filter(f => f.id !== fixture.id);
    }, [fixture]) || [];

    const handleMerge = async () => {
        if (!targetFixtureId || !fixture) return;
        const target = otherFixtures.find(f => f.fixtureTypeId === targetFixtureId);
        if (!target) return;
        
        try {
            // Find all instruments using this fixture and update them, then delete this fixture
            await db.transaction('rw', db.instruments, db.fixtureLibrary, async () => {
                const insts = await db.instruments.where('fixtureTypeId').equals(fixture.fixtureTypeId).toArray();
                for (const inst of insts) {
                    await db.instruments.update(inst.id, { 
                        fixtureTypeId: target.fixtureTypeId,
                        type: target.name
                    });
                }
                await db.fixtureLibrary.delete(fixture.id);
            });
            onClose();
        } catch (err) {
            console.error("Failed to merge fixtures:", err);
            toast.error("Failed to merge fixtures.");
        }
    };

    const handleLoadGdtfForFixture = async (file) => {
        setLoadingGdtf(true);
        try {
            const fixtureData = await parseGdtfFile(file);
            
            await db.transaction('rw', db.instruments, db.fixtureLibrary, async () => {
                const existing = await db.fixtureLibrary.where('fixtureTypeId').equals(fixtureData.fixtureTypeId).first();
                
                if (existing && existing.id !== fixture.id) {
                    const insts = await db.instruments.where('fixtureTypeId').equals(fixture.fixtureTypeId).toArray();
                    for (const inst of insts) {
                        await db.instruments.update(inst.id, {
                            fixtureTypeId: existing.fixtureTypeId,
                            type: existing.name
                        });
                    }
                    await db.fixtureLibrary.delete(fixture.id);
                    toast.success(`Merged and linked instruments to existing library profile: ${existing.name}`);
                } else {
                    let cleanedModes = fixtureData.dmxModes || [];
                    if (cleanedModes.length > 1) {
                        cleanedModes = cleanedModes.filter(m => (m.name || '').toLowerCase() !== 'default');
                    }

                    const record = {
                        fixtureTypeId: fixtureData.fixtureTypeId,
                        name: fixtureData.name,
                        shortName: fixtureData.shortName,
                        manufacturer: fixtureData.manufacturer,
                        description: fixtureData.description,
                        wattage: fixtureData.wattage,
                        weight: fixtureData.weight,
                        dmxModes: cleanedModes,
                        wheels: fixtureData.wheels,
                        thumbnailBlob: fixtureData.thumbnailBlob || null,
                        rawXml: fixtureData.rawXml,
                        isGeneric: false,
                        parserVersion: '3.0.0',
                        importedAt: new Date().toISOString()
                    };

                    const insts = await db.instruments.where('fixtureTypeId').equals(fixture.fixtureTypeId).toArray();
                    for (const inst of insts) {
                        await db.instruments.update(inst.id, {
                            fixtureTypeId: fixtureData.fixtureTypeId,
                            type: fixtureData.name
                        });
                    }

                    await db.fixtureLibrary.update(fixture.id, record);
                    toast.success(`Successfully loaded GDTF profile: ${fixtureData.name}`);
                }
            });
            onClose();
        } catch (err) {
            console.error('Failed to load GDTF for fixture:', err);
            toast.error(err.message || 'Failed to load GDTF file');
        } finally {
            setLoadingGdtf(false);
        }
    };

    if (!fixture) return null;

    const tabs = [
        { id: 'dmx', label: 'DMX Modes' },
        { id: 'wheels', label: 'Wheels & Slots' },
        { id: 'physical', label: 'Physical' },
        { id: 'xml', label: 'Raw XML' }
    ];

    return (
        <div 
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] flex items-start gap-6">
                    {fixture.thumbnailBlob ? (
                        <div className="w-24 h-24 rounded-lg bg-black/20 flex items-center justify-center overflow-hidden shrink-0 border border-[var(--border-subtle)]">
                            <img 
                                src={URL.createObjectURL(fixture.thumbnailBlob)} 
                                alt={fixture.name}
                                className="max-w-full max-h-full object-contain"
                            />
                        </div>
                    ) : (
                        <div className="w-24 h-24 rounded-lg bg-[var(--bg-app)] flex items-center justify-center shrink-0 border border-[var(--border-subtle)] text-[var(--text-tertiary)]">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                        <div className="text-[var(--accent-primary)] text-xs font-bold uppercase tracking-widest mb-1">
                            {fixture.manufacturer || 'Generic'}
                        </div>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2 truncate">
                            {fixture.name}
                        </h2>
                        <div className="flex flex-wrap gap-4 text-sm">
                            {fixture.wattage > 0 && (
                                <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                                    <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                                    {fixture.wattage}W
                                </div>
                            )}
                            {fixture.weight > 0 && (
                                <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
                                    {fixture.weight} kg
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 text-[var(--text-tertiary)] font-mono text-xs">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                                {fixture.fixtureTypeId?.slice(0, 18)}...
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-full transition-all"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex px-6 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)]">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                                activeTab === tab.id 
                                ? 'border-[var(--accent-primary)] text-[var(--text-primary)]' 
                                : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-auto bg-[var(--bg-app)]">
                    {activeTab === 'dmx' && (
                        <div className="p-6 space-y-8">
                            {fixture.dmxModes?.map((mode, modeIdx) => (
                                <div key={modeIdx} className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                                    <div className="px-4 py-3 bg-[var(--bg-hover)] flex items-center justify-between border-b border-[var(--border-subtle)]">
                                        <div>
                                            <span className="font-bold text-[var(--text-primary)]">{mode.name}</span>
                                            <span className="ml-3 text-xs text-[var(--text-tertiary)] font-mono uppercase tracking-widest">{(mode.footprint || 1)} CHANNELS</span>
                                        </div>
                                        {mode.description && (
                                            <div className="text-xs text-[var(--text-secondary)] italic">{mode.description}</div>
                                        )}
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm border-collapse">
                                            <thead>
                                                <tr className="text-[var(--text-tertiary)] font-medium text-xs uppercase tracking-wider border-b border-[var(--border-subtle)]">
                                                    <th className="px-4 py-3 w-16">DMX</th>
                                                    <th className="px-4 py-3">Attribute(s)</th>
                                                    <th className="px-4 py-3">Res.</th>
                                                    <th className="px-4 py-3">Functional Details</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {mode.channels?.map((ch, idx) => (
                                                    <tr key={idx} className="border-b border-[var(--border-subtle)] hover:bg-white/5 transition-colors group">
                                                        <td className="px-4 py-3 font-mono text-[var(--accent-primary)] font-bold">
                                                            {ch.index}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[var(--text-primary)] font-bold">{ch.prettyAttribute || ch.attribute}</span>
                                                                </div>
                                                                {ch.splitChannels?.map((split, sIdx) => (
                                                                    <div key={sIdx} className="flex items-center gap-2 text-[var(--text-secondary)]">
                                                                        <span className="text-[10px] opacity-50 font-mono">/</span>
                                                                        <span className="text-[11px] font-medium italic">{split.prettyAttribute || split.attribute}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                                                                ch.resolution === '8bit' 
                                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                            }`}>
                                                                {ch.resolution}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex flex-wrap gap-1">
                                                                {/* Show primary functions */}
                                                                {ch.functions?.slice(0, 3).map((f, fIdx) => (
                                                                    <span key={fIdx} className="text-[9px] bg-[var(--bg-app)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] text-[var(--text-secondary)]" title={`${f.attr}: ${f.from}-${f.to}`}>
                                                                        {f.name || f.prettyAttr || f.attr}
                                                                    </span>
                                                                ))}
                                                                {/* Show split functions if any */}
                                                                {ch.splitChannels?.map(split => 
                                                                    split.functions?.slice(0, 2).map((f, fIdx) => (
                                                                        <span key={`s-${fIdx}`} className="text-[9px] bg-[var(--bg-app)] px-1.5 py-0.5 rounded border border-amber-500/10 text-amber-500/60" title={`${f.attr}: ${f.from}-${f.to}`}>
                                                                           {f.name || f.prettyAttr || f.attr}
                                                                        </span>
                                                                    ))
                                                                )}
                                                                {(ch.functions?.length > 3 || (ch.splitChannels?.length > 0)) && (
                                                                    <span className="text-[9px] text-[var(--text-tertiary)] flex items-center px-1">...</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'wheels' && (
                        <div className="p-6">
                            {fixture.wheels?.length > 0 ? (
                                <div className="grid gap-8">
                                    {fixture.wheels.map((wheel, wheelIdx) => (
                                        <div key={wheelIdx}>
                                            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-[var(--accent-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                {wheel.name}
                                            </h3>
                                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                                                {wheel.slots.map((slot, slotIdx) => (
                                                    <div key={slotIdx} className="group flex flex-col items-center gap-2">
                                                        <div className="relative w-14 h-14 rounded-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden group-hover:border-[var(--accent-primary)] transition-all shadow-lg">
                                                            {slot.imageData ? (
                                                                <img src={slot.imageData} alt={slot.name} className="max-w-full max-h-full object-contain filter drop-shadow-[0_0_2px_rgba(0,0,0,0.5)]" />
                                                            ) : slot.color ? (
                                                                <div className="w-full h-full" style={{ backgroundColor: slot.color }}></div>
                                                            ) : (
                                                                <span className="text-[var(--text-tertiary)] text-[10px]">{slotIdx + 1}</span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-[var(--text-tertiary)] text-center line-clamp-2 w-full font-medium">
                                                            {slot.name || `Slot ${slotIdx + 1}`}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 text-[var(--text-tertiary)] italic">
                                    No wheel information found in this GDTF.
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'physical' && (
                        <div className="p-8 max-w-2xl">
                            <div className="grid grid-cols-2 gap-y-8 gap-x-12">
                                <section>
                                    <h4 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-4 border-l-2 border-[var(--accent-primary)] pl-2">Dimensions</h4>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2">
                                            <span className="text-sm text-[var(--text-secondary)]">Manufacturer</span>
                                            <span className="text-sm font-medium text-[var(--text-primary)]">{fixture.manufacturer}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2">
                                            <span className="text-sm text-[var(--text-secondary)]">Power (Max)</span>
                                            <span className="text-sm font-bold text-[var(--accent-primary)] font-mono">{fixture.wattage || 0}W</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2">
                                            <span className="text-sm text-[var(--text-secondary)]">Weight</span>
                                            <span className="text-sm font-bold text-[var(--text-primary)] font-mono">{fixture.weight || 0} kg</span>
                                        </div>
                                    </div>
                                </section>
                                <section>
                                    <h4 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-4 border-l-2 border-[var(--accent-primary)] pl-2">Metadata</h4>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2">
                                            <span className="text-sm text-[var(--text-secondary)]">Imported</span>
                                            <span className="text-sm font-medium text-[var(--text-primary)]">
                                                {fixture.importedAt ? new Date(fixture.importedAt).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2">
                                            <span className="text-sm text-[var(--text-secondary)]">GDTF Spec</span>
                                            <span className="text-xs font-mono text-[var(--text-primary)] truncate max-w-[120px]" title={fixture.fixtureTypeId}>
                                                {fixture.fixtureTypeId || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </section>
                            </div>
                            
                            {fixture.description && (
                                <div className="mt-12">
                                    <h4 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-4 border-l-2 border-[var(--accent-primary)] pl-2">Description</h4>
                                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-panel)] p-4 rounded-lg border border-[var(--border-subtle)]">
                                        {fixture.description}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'xml' && (
                        <div className="h-full p-4 flex flex-col font-mono text-xs overflow-hidden">
                            <div className="mb-2 text-[var(--text-tertiary)] flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                description.xml (Raw Source)
                            </div>
                            <pre className="flex-1 bg-black/40 p-6 rounded-xl border border-[var(--border-subtle)] overflow-auto text-blue-300 selection:bg-blue-500/30 custom-scrollbar whitespace-pre-wrap">
                                {fixture.rawXml || 'No XML data available.'}
                            </pre>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-panel)] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-[var(--text-secondary)]">Merge into:</span>
                        <select 
                            value={targetFixtureId}
                            onChange={(e) => setTargetFixtureId(e.target.value)}
                            className="bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg text-sm px-3 py-1.5 focus:border-[var(--accent-primary)] outline-none max-w-[200px]"
                        >
                            <option value="">Select Target...</option>
                            {otherFixtures.map(f => (
                                <option key={f.id} value={f.fixtureTypeId}>{f.name} ({f.manufacturer})</option>
                            ))}
                        </select>
                        <button
                            onClick={handleMerge}
                            disabled={!targetFixtureId}
                            className="px-4 py-1.5 bg-[var(--accent-primary)] text-white text-sm font-bold rounded-lg hover:bg-[var(--accent-hover)] transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Merge
                        </button>
                        <div className="h-6 w-px bg-[var(--border-subtle)] mx-2"></div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loadingGdtf}
                            className="flex items-center gap-1.5 px-4 py-1.5 border border-[var(--border-default)] text-[var(--text-primary)] text-sm font-bold rounded-lg hover:bg-[var(--bg-hover)] transition-all shadow-lg active:scale-95 disabled:opacity-50"
                        >
                            {loadingGdtf ? (
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            )}
                            Load GDTF
                        </button>
                        <input 
                            type="file"
                            ref={fileInputRef}
                            accept=".gdtf"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleLoadGdtfForFixture(file);
                            }}
                        />
                    </div>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold rounded-lg hover:bg-[var(--border-subtle)] transition-all shadow-lg active:scale-95"
                    >
                        Close Details
                    </button>
                </div>
            </div>
        </div>
    );
}
