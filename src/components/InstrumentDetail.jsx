import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addNote, getInstrumentNotes } from '../db';
import { useSettings } from '../hooks/useSettings';
import { getGelColor } from '../utils/gelData';
import { ColorPicker } from './ColorPicker';
import { ColorSwatch } from './ColorSwatch';

export function InstrumentDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isNew = id === 'new';
    const isBulk = location.pathname.includes('/bulk');
    const bulkIds = location.state?.ids || [];
    const { universeSeparator } = useSettings();
    const { onToggleDetail } = useOutletContext() || {};

    const [touchedFields, setTouchedFields] = useState(new Set());
    const MIXED_VALUE = '(Mixed)';

    const [formData, setFormData] = useState({
        channel: '',
        part: '',
        address: '',
        dmxFootprint: '',
        type: '',
        watt: '',
        weight: '',
        purpose: '',
        position: '',
        unit: '',
        gobo: '',
        accessory: '',
        color: '',
        gelFrameSize: '',
        fixtureTypeId: '',
        customFields: {}
    });

    const multiPartCount = useLiveQuery(
        () => formData.channel ? db.instruments.where('channel').equals(String(formData.channel)).count() : 0,
        [formData.channel]
    );
    const isMultiPart = formData.part > 1 || multiPartCount > 1;

    // GDTF Fixture Library
    const fixtureLibrary = useLiveQuery(() => db.fixtureLibrary.toArray()) || [];
    const [showFixturePopulate, setShowFixturePopulate] = useState(false);
    const [showDmxMap, setShowDmxMap] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);

    // Get linked fixture for DMX map
    const linkedFixture = React.useMemo(() => {
        if (!formData.fixtureTypeId) return null;
        return fixtureLibrary.find(f => f.fixtureTypeId === formData.fixtureTypeId) || null;
    }, [formData.fixtureTypeId, fixtureLibrary]);

    // Global Custom Field Definitions
    const [globalFieldDefs, setGlobalFieldDefs] = useState([]);

    // Notes & History
    const [activeTab, setActiveTab] = useState('general');
    const notes = useLiveQuery(() => (isNew || isBulk) ? [] : getInstrumentNotes(id), [id, isNew, isBulk]);
    const [newNote, setNewNote] = useState('');

    // Load data if editing
    const singleInstrument = useLiveQuery(
        () => (isNew || isBulk ? undefined : db.instruments.get(Number(id))),
        [id, isNew, isBulk]
    );

    const bulkInstruments = useLiveQuery(
        () => (isBulk && bulkIds.length > 0 ? db.instruments.where('id').anyOf(bulkIds).toArray() : []),
        [isBulk, bulkIds]
    );

    const instrument = isBulk ? null : singleInstrument;

    // Stabilize dependencies to prevent useEffect loops
    // useLiveQuery returns a new object reference on every render even if data hasn't changed
    const stableInstrument = useMemo(() => instrument, [JSON.stringify(instrument)]);
    const stableBulkInstruments = useMemo(() => bulkInstruments, [JSON.stringify(bulkInstruments)]);

    // Load Global Definitions
    const metadata = useLiveQuery(() => db.showMetadata.toArray());

    useEffect(() => {
        if (metadata && metadata[0] && metadata[0].customFieldDefinitions) {
            setGlobalFieldDefs(metadata[0].customFieldDefinitions);
        }
    }, [metadata]);

    // Fetch unique values for autocomplete
    const suggestions = useLiveQuery(async () => {
        const instruments = await db.instruments.toArray();
        const positions = new Set();
        const purposes = new Set();
        const types = new Set();

        instruments.forEach(inst => {
            if (inst.position) positions.add(inst.position);
            if (inst.purpose) purposes.add(inst.purpose);
            if (inst.type) types.add(inst.type);
        });

        return {
            position: Array.from(positions).sort(),
            purpose: Array.from(purposes).sort(),
            type: Array.from(types).sort()
        };
    }, []);

    // All instruments for overlap detection
    const allInstruments = useLiveQuery(() => db.instruments.toArray()) || [];

    // Calculate address overlaps
    const addressOverlaps = React.useMemo(() => {
        if (!formData.address) return [];

        const addrMatch = formData.address.match(/^(\d+):(\d+)$/);
        if (!addrMatch) return [];

        const myUniv = parseInt(addrMatch[1]);
        const myStart = parseInt(addrMatch[2]);
        const myFootprint = parseInt(formData.dmxFootprint) || 1;
        const myEnd = myStart + myFootprint - 1;
        const myId = isNew ? null : Number(id);

        return allInstruments.filter(inst => {
            if (inst.id === myId) return false; // Skip self
            if (!inst.address) return false;

            const instMatch = inst.address.match(/^(\d+)[:/](\d+)$/);
            if (!instMatch) return false;

            const instUniv = parseInt(instMatch[1]);
            if (instUniv !== myUniv) return false; // Different universe

            const instStart = parseInt(instMatch[2]);
            const instFootprint = parseInt(inst.dmxFootprint) || 1;
            const instEnd = instStart + instFootprint - 1;

            // Check for overlap
            return (myStart <= instEnd && myEnd >= instStart);
        });
    }, [formData.address, formData.dmxFootprint, allInstruments, id, isNew]);

    useEffect(() => {
        if (isBulk && bulkInstruments && bulkInstruments.length > 0) {
            // Calculate common values
            const commonData = {
                channel: '', part: '', address: '', dmxFootprint: '', type: '', watt: '', weight: '',
                purpose: '', position: '', unit: '', gobo: '', accessory: '', color: '',
                gelFrameSize: '', fixtureTypeId: '', customFields: {}
            };

            const first = bulkInstruments[0];
            const keys = Object.keys(commonData);

            keys.forEach(key => {
                if (key === 'customFields') return; // Skip complex obj for now or handle deep compare
                const allSame = bulkInstruments.every(inst => inst[key] === first[key]);
                commonData[key] = allSame ? first[key] : (key === 'channel' || key === 'address' || key === 'unit' ? MIXED_VALUE : MIXED_VALUE);
            });

            // Handle custom fields separately if needed, for now ignore
            setFormData(commonData);
        } else if (stableInstrument) {
            setFormData(stableInstrument);
        } else if (isNew) {
            setFormData({
                channel: '',
                part: '',
                address: '',
                dmxFootprint: '',
                type: '',
                watt: '',
                weight: '',
                purpose: '',
                position: '',
                unit: '',
                gobo: '',
                accessory: '',
                color: '',
                gelFrameSize: '',
                fixtureTypeId: '',
                customFields: {}
            });
        }
    }, [stableInstrument, isNew, isBulk, stableBulkInstruments]);


    // Sync address separator when setting changes or data loads
    useEffect(() => {
        if (formData.address) {
            const otherSeparator = universeSeparator === ':' ? '/' : ':';
            if (formData.address.includes(otherSeparator)) {
                setFormData(prev => ({
                    ...prev,
                    address: prev.address.replace(otherSeparator, universeSeparator)
                }));
            }
        }
    }, [universeSeparator, formData.address]);

    // Handle field focus from navigation state
    useEffect(() => {
        if (location.state?.focusField) {
            const fieldName = location.state.focusField;
            // Slight timeout to ensure rendering is complete (safe in React 18 usually, but just in case for refs)
            setTimeout(() => {
                const element = document.getElementsByName(fieldName)[0];
                if (element) {
                    element.focus();
                    if (element.type === 'text') {
                        element.select(); // Optional: select text for easy editing
                    }
                }
            }, 50);
        }
    }, [location.state]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (isBulk) {
            setTouchedFields(prev => new Set(prev).add(name));
        }
    };

    const [showDupConfirm, setShowDupConfirm] = useState(false);
    const [pendingSaveData, setPendingSaveData] = useState(null);

    const handleSave = async (forceSave = false) => {
        if (isBulk) {
            // Bulk Save Logic
            if (touchedFields.size === 0) {
                navigate('..');
                return;
            }

            const updates = {};
            touchedFields.forEach(field => {
                updates[field] = formData[field];
            });

            // If updating address/channel, we might need special logic (e.g. auto-increment) logic but for "bulk edit" usually users set same value (e.g. all Position = FOH).
            // Users are responsible for collisions if they bulk-set ID fields.

            await db.instruments.where('id').anyOf(bulkIds).modify(updates);

            // Log changes? Ideally yes but might spam. System note on first or all? 
            // Let's skip detailed logs for bulk for now or log "Bulk Update" to system log.

            navigate('..');
            return;
        }

        // Parse channel for parts (e.g., "103.1")
        const dataToSave = { ...formData };

        // Ensure part is a number if it exists
        if (dataToSave.part) {
            dataToSave.part = parseInt(dataToSave.part, 10) || 1;
        }

        // Auto-calculate Universe for addresses > 512
        if (dataToSave.address) {
            if (/^\d+$/.test(dataToSave.address)) {
                const addrVal = parseInt(dataToSave.address, 10);
                const universe = Math.floor((addrVal - 1) / 512) + 1;
                const address = (addrVal - 1) % 512 + 1;
                dataToSave.address = `${universe}${universeSeparator}${address}`;
            } else {
                // Ensure the separator matches the setting
                const otherSeparator = universeSeparator === ':' ? '/' : ':';
                dataToSave.address = dataToSave.address.replace(otherSeparator, universeSeparator);
            }
        }

        // Check for duplicate channel (ignore if editing the same instrument)
        if (!forceSave && dataToSave.channel) {
            const existing = await db.instruments
                .where('channel')
                .equals(String(dataToSave.channel))
                .toArray();

            const otherInstruments = existing.filter(inst => inst.id !== Number(id));

            if (otherInstruments.length > 0) {
                setPendingSaveData(dataToSave);
                setShowDupConfirm(true);
                return;
            }
        }

        if (isNew) {
            const newId = await db.instruments.add(dataToSave);
            // Log Creation
            await addNote(newId, 'Created Instrument', 'system');
        } else {
            // Calculate changes for audit log
            const existing = await db.instruments.get(Number(id));
            if (existing) {
                const changes = [];
                const keys = ['channel', 'address', 'position', 'unit', 'type', 'purpose', 'color', 'gobo', 'watt'];

                keys.forEach(key => {
                    const oldVal = existing[key] || '';
                    const newVal = dataToSave[key] || '';
                    if (oldVal !== newVal) {
                        changes.push(`${key}: ${oldVal} -> ${newVal}`);
                    }
                });

                if (changes.length > 0) {
                    await addNote(Number(id), `Updated: ${changes.join(', ')}`, 'system');
                }
            }

            await db.instruments.update(Number(id), dataToSave);
        }
        navigate('..');
    };

    const handleAddNote = async () => {
        if (!newNote.trim() || isNew) return;
        await addNote(Number(id), newNote.trim(), 'user');
        setNewNote('');
    };

    const handleReplace = async () => {
        if (!pendingSaveData) return;
        // Delete all instruments with this channel
        const existing = await db.instruments
            .where('channel')
            .equals(String(pendingSaveData.channel))
            .toArray();

        const idsToDelete = existing.filter(inst => inst.id !== Number(id)).map(inst => inst.id);
        if (idsToDelete.length > 0) {
            await db.instruments.bulkDelete(idsToDelete);
        }

        // Save the new one
        await handleSave(true);
    };

    const handleAddPart = async () => {
        if (!pendingSaveData) return;
        // Find existing parts
        const existing = await db.instruments
            .where('channel')
            .equals(String(pendingSaveData.channel))
            .toArray();

        const maxPart = Math.max(0, ...existing.map(inst => inst.part || 1));
        const updatedData = { ...pendingSaveData, part: maxPart + 1 };

        setFormData(updatedData); // Update form so user sees it
        setPendingSaveData(updatedData);

        // Save with new part
        if (isNew) {
            await db.instruments.add(updatedData);
        } else {
            await db.instruments.update(Number(id), updatedData);
        }
        navigate('..');
    };

    const handleDelete = async () => {
        if (isBulk) {
            if (window.confirm(`Are you sure you want to delete ${bulkIds.length} instruments?`)) {
                await db.instruments.bulkDelete(bulkIds);
                navigate('..');
            }
            return;
        }
        if (!isNew && window.confirm("Are you sure you want to delete this instrument?")) {
            await db.instruments.delete(Number(id));
            navigate('..');
        }
    };

    const handleAddCustomField = async () => {
        const name = window.prompt("Enter new field name:");
        if (!name || !name.trim()) return;

        const trimmedName = name.trim();

        // Update DB
        const currentMeta = metadata && metadata[0] ? metadata[0] : {};
        const currentDefs = currentMeta.customFieldDefinitions || [];

        if (!currentDefs.includes(trimmedName)) {
            const newDefs = [...currentDefs, trimmedName];
            await db.showMetadata.put({
                ...currentMeta,
                // Ensure we have a valid key if it's new. Use 1 as singleton ID if undefined.
                // If currentMeta exists, it has id. If not, dexie will auto-inc if we don't specify, 
                // but we prefer singleton logic. Let's just put it.
                // If it's empty, we might want to ensure we don't create duplicates.
                // Simple approach: ID 1.
                id: currentMeta.id || 1,
                customFieldDefinitions: newDefs
            });
        }
    };

    return (
        <div className="h-full flex flex-col bg-[var(--bg-card)] border-l border-[var(--border-subtle)]">
            {/* Panel Header */}
            <div className="h-14 border-b border-[var(--border-subtle)] flex items-center px-6 justify-between bg-[var(--bg-card)] shrink-0">
                <div className="flex items-center gap-3">
                    {onToggleDetail && (
                        <button
                            onClick={onToggleDetail}
                            className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors mr-1"
                            title="Collapse Details"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    )}
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                        {isBulk ? `Bulk Edit (${bulkIds.length} Instruments)` : (isNew ? 'New Instrument' : 'Edit Details')}
                    </h2>
                </div>
                <div className="flex gap-2">
                    {!isNew && (
                        <button onClick={handleDelete} className="p-2 text-[var(--error)] hover:bg-red-500/10 rounded transition-colors" title="Delete">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] px-6 gap-6">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-[var(--accent-primary)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}`}
                >
                    General
                </button>
                {!isNew && !isBulk && (
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-[var(--accent-primary)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}`}
                    >
                        History & Notes
                    </button>
                )}
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-auto p-6">
                {activeTab === 'general' ? (
                    <form className="grid grid-cols-1 gap-5 max-w-lg mx-auto" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                        {isBulk && (
                            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-md p-3 mb-4">
                                <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Bulk Edit Mode
                                </div>
                                <p className="text-xs text-[var(--text-secondary)] mt-1 ml-7">
                                    Fields marked <strong>{MIXED_VALUE}</strong> have different values.
                                    Changing a field updates <strong>all {bulkIds.length} instruments</strong>.
                                </p>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex gap-2">
                                <div className="w-24 flex flex-col gap-1.5 shrink-0">
                                    <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Channel</label>
                                    <input name="channel" value={formData.channel || ''} onChange={handleChange} autoFocus={!location.state?.focusField} className="font-mono text-lg font-bold text-[var(--accent-primary)] panel-input text-center" placeholder="#" autoComplete="off" />
                                </div>
                                {isMultiPart && (
                                    <div className="w-20 flex flex-col gap-1.5 shrink-0">
                                        <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Part</label>
                                        <input name="part" type="number" min="1" value={formData.part || 1} onChange={handleChange} className="font-mono text-lg font-bold text-[var(--accent-primary)] panel-input text-center p-0" autoComplete="off" />
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-1.5 relative">
                                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Address</label>
                                <input name="address" value={formData.address || ''} onChange={handleChange} placeholder={`Univ${universeSeparator}Addr`} className="font-mono panel-input" autoComplete="off" />
                                {/* Address Range Display */}
                                {formData.address && formData.dmxFootprint && parseInt(formData.dmxFootprint) > 1 && (
                                    <div className="absolute top-0 right-0 text-[10px] font-mono text-[var(--accent-primary)] font-bold">
                                        {(() => {
                                            const footprint = parseInt(formData.dmxFootprint) || 1;
                                            // Escape the separator for regex in case it's special char like /
                                            const sepRegex = universeSeparator === '/' ? '/' : ':';
                                            const regex = new RegExp(`^(\\d+)[${sepRegex}](\\d+)$`);
                                            const addrMatch = formData.address.match(regex);

                                            if (addrMatch) {
                                                const univ = parseInt(addrMatch[1]);
                                                const startAddr = parseInt(addrMatch[2]);
                                                const endAddr = startAddr + footprint - 1;
                                                return <span>{univ}{universeSeparator}{startAddr} – {univ}{universeSeparator}{endAddr}</span>;
                                            }
                                            return null;
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Address Overlap Warning */}
                        {addressOverlaps.length > 0 && (
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-2 -mt-2">
                                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-medium">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    Address Overlap Detected!
                                </div>
                                <div className="text-xs text-[var(--text-secondary)] mt-1">
                                    Conflicts with: {addressOverlaps.map(inst =>
                                        `Ch ${inst.channel} (${inst.address}${inst.dmxFootprint > 1 ? ` +${inst.dmxFootprint - 1}` : ''})`
                                    ).join(', ')}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-1.5 mb-2">
                            <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Purpose</label>
                            <input name="purpose" value={formData.purpose || ''} onChange={handleChange} className="panel-input" autoComplete="off" list="list-purpose" />
                            <datalist id="list-purpose">
                                {suggestions?.purpose.map(val => <option key={val} value={val} />)}
                            </datalist>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1 flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Position</label>
                                <input name="position" value={formData.position || ''} onChange={handleChange} className="panel-input" autoComplete="off" list="list-position" />
                                <datalist id="list-position">
                                    {suggestions?.position.map(val => <option key={val} value={val} />)}
                                </datalist>
                            </div>
                            <div className="w-20 flex flex-col gap-1.5 shrink-0">
                                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Unit #</label>
                                <input name="unit" value={formData.unit || ''} onChange={handleChange} className="panel-input text-center" autoComplete="off" />
                            </div>
                        </div>

                        <div className="h-px bg-[var(--border-subtle)] my-2"></div>

                        <div className="grid grid-cols-4 gap-4 mb-4">
                            <div className="col-span-2 flex flex-col gap-1.5 relative">
                                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Type</label>
                                {fixtureLibrary.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowFixturePopulate(true)}
                                        className="absolute top-0 right-0 px-1 py-0 text-[7px] leading-none bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-sm hover:border-[var(--accent-primary)] text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] transition-colors uppercase tracking-tight font-bold"
                                        title="Populate from GDTF fixture library"
                                    >
                                        GDTF
                                    </button>
                                )}
                                <input name="type" value={formData.type || ''} onChange={handleChange} className="panel-input w-full" autoComplete="off" list="list-type" />
                                <datalist id="list-type">
                                    {suggestions?.type.map(val => <option key={val} value={val} />)}
                                </datalist>
                            </div>

                            <div className="col-span-2 flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Color</label>
                                <div className="flex-1 flex items-center gap-2">
                                    <div className="flex-1">
                                        <input name="color" value={formData.color || ''} onChange={handleChange} className="panel-input w-full" autoComplete="off" />
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <ColorSwatch color={formData.color} className="w-6 h-6 border-[var(--border-subtle)]" rounded="rounded-md" />
                                        <button
                                            type="button"
                                            onClick={() => setShowColorPicker(true)}
                                            className="p-1.5 rounded-md bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors"
                                            title="Open Color Picker"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-1">
                                    <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Gobo</label>
                                    {linkedFixture && linkedFixture.wheels?.some(w => w.name.toLowerCase().includes('gobo')) && (
                                        <div className="relative group">
                                            <button
                                                type="button"
                                                className="w-4 h-4 text-[10px] font-bold rounded-full bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] transition-colors flex items-center justify-center leading-none cursor-help"
                                            >
                                                ?
                                            </button>
                                            <div className="absolute right-0 top-full mt-1 z-50 hidden group-hover:block">
                                                <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg shadow-xl p-3 w-72 max-h-80 overflow-auto">
                                                    <div className="text-xs font-medium text-[var(--text-primary)] mb-2">
                                                        Available Gobos
                                                    </div>
                                                    {linkedFixture.wheels.filter(w => w.name.toLowerCase().includes('gobo')).map((wheel, wheelIdx) => (
                                                        <div key={wheelIdx} className="mb-3">
                                                            <div className="text-[10px] text-[var(--accent-primary)] mb-2">{wheel.name}</div>
                                                            <div className="grid grid-cols-4 gap-1.5">
                                                                {wheel.slots.filter(s => s.name).map((slot, slotIdx) => (
                                                                    <button
                                                                        key={slotIdx}
                                                                        type="button"
                                                                        onClick={() => setFormData(prev => ({ ...prev, gobo: slot.name }))}
                                                                        className={`aspect-square rounded border overflow-hidden flex items-center justify-center transition-colors ${formData.gobo === slot.name
                                                                            ? 'border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]'
                                                                            : 'border-[var(--border-subtle)] hover:border-[var(--text-tertiary)]'}`}
                                                                        title={slot.name}
                                                                    >
                                                                        {slot.imageData ? (
                                                                            <img src={slot.imageData} alt={slot.name} className="w-full h-full object-contain" />
                                                                        ) : (
                                                                            <span className="text-[8px] text-[var(--text-tertiary)] text-center px-0.5 break-words">{slot.name}</span>
                                                                        )}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <input name="gobo" value={formData.gobo || ''} onChange={handleChange} className="panel-input w-full" autoComplete="off" />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Accessory</label>
                                <input name="accessory" value={formData.accessory || ''} onChange={handleChange} className="panel-input" autoComplete="off" />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Wattage</label>
                                <input name="watt" value={formData.watt || ''} onChange={handleChange} className="panel-input" autoComplete="off" />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Frame Size</label>
                                <input name="gelFrameSize" value={formData.gelFrameSize || ''} onChange={handleChange} placeholder="e.g. 7.5" className="panel-input w-full" autoComplete="off" />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-1">
                                    <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">DMX Footprint</label>
                                    {linkedFixture && linkedFixture.dmxModes?.length > 0 && (
                                        <div className="relative group">
                                            <button
                                                type="button"
                                                onClick={() => setShowDmxMap(true)}
                                                className="w-4 h-4 text-[10px] font-bold rounded-full bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] transition-colors flex items-center justify-center leading-none cursor-help"
                                            >
                                                ?
                                            </button>
                                            {/* Hover Tooltip */}
                                            <div className="absolute bottom-full left-0 mb-1 z-50 hidden group-hover:block">
                                                <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg shadow-xl p-3 w-64 max-h-64 overflow-auto">
                                                    <div className="text-xs font-medium text-[var(--text-primary)] mb-2">
                                                        {linkedFixture.name} - DMX Map
                                                    </div>
                                                    {linkedFixture.dmxModes.slice(0, 1).map((mode, modeIdx) => (
                                                        <div key={modeIdx}>
                                                            <div className="text-[10px] text-[var(--accent-primary)] mb-1">{mode.name} ({mode.footprint}ch)</div>
                                                            {mode.channels && mode.channels.length > 0 ? (
                                                                <div className="space-y-0.5">
                                                                    {mode.channels.map((ch, idx) => (
                                                                        <div key={idx} className="flex text-[10px] font-mono">
                                                                            <span className="w-6 text-[var(--accent-primary)]">{ch.dmxAddress}</span>
                                                                            <span className="text-[var(--text-secondary)] flex-1">{ch.attribute}</span>
                                                                            {ch.resolution && <span className="text-[var(--text-tertiary)]">{ch.resolution}</span>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-[10px] text-[var(--text-tertiary)] italic">No channel data</div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <input name="dmxFootprint" value={formData.dmxFootprint || ''} onChange={handleChange} placeholder="Ch" className="font-mono panel-input" autoComplete="off" />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Weight</label>
                                <input name="weight" value={formData.weight || ''} onChange={handleChange} placeholder="kg" className="panel-input" autoComplete="off" />
                            </div>
                        </div>

                        {/* Custom Fields Section */}
                        {globalFieldDefs.length > 0 && (
                            <>
                                <div className="h-px bg-[var(--border-subtle)] my-4"></div>
                                <div className="grid grid-cols-2 gap-4">
                                    {globalFieldDefs.map((fieldName, idx) => (
                                        <div key={idx} className="flex flex-col gap-1.5">
                                            <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{fieldName}</label>
                                            <input
                                                type="text"
                                                value={formData.customFields?.[fieldName] || ''}
                                                onChange={(e) => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        customFields: {
                                                            ...(prev.customFields || {}),
                                                            [fieldName]: e.target.value
                                                        }
                                                    }));
                                                }}
                                                className="panel-input"
                                                autoComplete="off"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Add Custom Field Button */}
                        <div className="flex justify-start pt-2">
                            <button
                                type="button"
                                onClick={handleAddCustomField}
                                className="text-xs text-[var(--accent-primary)] hover:text-[var(--accent-hover)] font-medium flex items-center gap-1"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Add Custom Field
                            </button>
                        </div>

                        <div className="pt-4 mt-2">
                            <button type="submit" className="w-full primary py-2.5 shadow-lg shadow-indigo-500/20 text-sm">
                                {isNew ? 'Create Instrument' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="max-w-2xl mx-auto w-full">
                        {/* Add Note */}
                        <div className="mb-8">
                            <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider block mb-2">Add Note</label>
                            <div className="flex gap-2">
                                <textarea
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Enter a note about this instrument..."
                                    className="flex-1 p-3 rounded bg-[var(--bg-app)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:outline-none min-h-[80px] resize-y"
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote(); } }}
                                />
                                <button
                                    onClick={handleAddNote}
                                    disabled={!newNote.trim()}
                                    className="px-4 py-2 self-end bg-[var(--accent-primary)] text-white rounded font-bold hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Post
                                </button>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="space-y-6 relative before:absolute before:left-[19px] before:top-0 before:bottom-0 before:w-px before:bg-[var(--border-subtle)]">
                            {notes && notes.length > 0 ? notes.map(note => (
                                <div key={note.id} className="relative pl-12 group">
                                    {/* Dot */}
                                    <div className={`absolute left-0 top-1.5 w-10 h-10 rounded-full border-4 border-[var(--bg-card)] flex items-center justify-center z-10 ${note.type === 'system' ? 'bg-[var(--bg-panel)] text-[var(--text-tertiary)]' : 'bg-[var(--accent-primary)] text-white'}`}>
                                        {note.type === 'system' ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                                        )}
                                    </div>

                                    <div className="mb-1 flex items-center gap-2">
                                        <span className="text-xs font-mono text-[var(--text-tertiary)]">
                                            {new Date(note.timestamp).toLocaleString()}
                                        </span>
                                        {note.type === 'system' && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] bg-[var(--bg-panel)] px-1.5 py-0.5 rounded">System</span>
                                        )}
                                    </div>
                                    <div className={`text-sm ${note.type === 'system' ? 'text-[var(--text-secondary)] font-mono text-xs' : 'text-[var(--text-primary)]'}`}>
                                        {note.text}
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center text-[var(--text-tertiary)] py-8 pl-12 italic">
                                    No history recorded yet.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div >

            {/* Duplicate Channel Confirmation Modal */}
            {
                showDupConfirm && (
                    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg shadow-2xl p-6 w-full max-w-sm">
                            <div className="flex items-center gap-3 mb-4 text-amber-500">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <h2 className="text-lg font-bold text-[var(--text-primary)]">Duplicate Channel</h2>
                            </div>

                            <p className="text-sm text-[var(--text-secondary)] mb-6">
                                Channel <span className="font-bold text-[var(--accent-primary)]">{pendingSaveData?.channel}</span> is already in use.
                                Would you like to replace the existing entry or add this as a new part?
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={handleAddPart}
                                    className="w-full py-2.5 bg-[var(--accent-primary)] text-white rounded font-bold hover:bg-[var(--accent-hover)] transition-colors shadow-lg shadow-indigo-500/10"
                                >
                                    Add as Part (.{(pendingSaveData?.part || 1) + 1})
                                </button>
                                <button
                                    onClick={handleReplace}
                                    className="w-full py-2.5 bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded font-semibold hover:bg-[var(--bg-hover)] transition-colors"
                                >
                                    Replace Existing
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDupConfirm(false);
                                        setPendingSaveData(null);
                                    }}
                                    className="w-full py-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* GDTF Fixture Selection Modal */}
            {
                showFixturePopulate && (
                    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg shadow-2xl p-6 w-full max-w-md max-h-[70vh] flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-[var(--text-primary)]">Select GDTF Fixture</h2>
                                <button
                                    onClick={() => setShowFixturePopulate(false)}
                                    className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <p className="text-sm text-[var(--text-secondary)] mb-4">
                                Select a fixture to populate Type, Wattage, Weight, and DMX Footprint from GDTF data.
                            </p>
                            <div className="flex-1 overflow-auto space-y-2">
                                {fixtureLibrary.map(fixture => {
                                    const defaultMode = fixture.dmxModes?.[0];
                                    const footprint = defaultMode?.footprint || defaultMode?.channelCount || '';
                                    return (
                                        <button
                                            key={fixture.id}
                                            type="button"
                                            onClick={() => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    fixtureTypeId: fixture.fixtureTypeId,
                                                    type: fixture.name || prev.type,
                                                    watt: fixture.wattage || prev.watt,
                                                    weight: fixture.weight || prev.weight,
                                                    dmxFootprint: footprint || prev.dmxFootprint,
                                                }));
                                                setShowFixturePopulate(false);
                                            }}
                                            className={`w-full p-3 text-left rounded-lg border transition-colors ${formData.fixtureTypeId === fixture.fixtureTypeId
                                                ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]'
                                                : 'bg-[var(--bg-panel)] border-[var(--border-subtle)] hover:border-[var(--text-tertiary)]'
                                                }`}
                                        >
                                            <div className="font-medium text-[var(--text-primary)]">{fixture.name}</div>
                                            <div className="text-xs text-[var(--text-secondary)]">{fixture.manufacturer}</div>
                                            <div className="flex gap-4 mt-1 text-xs font-mono">
                                                {fixture.wattage > 0 && (
                                                    <span className="text-[var(--accent-primary)]">{fixture.wattage}W</span>
                                                )}
                                                {footprint > 0 && (
                                                    <span className="text-[var(--text-tertiary)]">{footprint}ch DMX</span>
                                                )}
                                            </div>
                                        </button>
                                    )
                                })}
                                {fixtureLibrary.length === 0 && (
                                    <div className="text-center py-8 text-[var(--text-tertiary)]">
                                        <p>No fixtures in library.</p>
                                        <p className="text-xs mt-2">Import GDTF files from the Fixture Library page.</p>
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                                <button
                                    type="button"
                                    onClick={() => setShowFixturePopulate(false)}
                                    className="w-full py-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* DMX Map Modal */}
            {
                showDmxMap && linkedFixture && (
                    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg shadow-2xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-[var(--text-primary)]">DMX Channel Map</h2>
                                <button
                                    onClick={() => setShowDmxMap(false)}
                                    className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="text-sm text-[var(--text-secondary)] mb-4">
                                <span className="font-medium text-[var(--text-primary)]">{linkedFixture.name}</span>
                                <span className="text-[var(--text-tertiary)]"> by {linkedFixture.manufacturer}</span>
                            </div>
                            {linkedFixture.dmxModes?.length > 0 && (
                                <div className="flex-1 overflow-auto">
                                    {linkedFixture.dmxModes.map((mode, modeIdx) => (
                                        <div key={modeIdx} className="mb-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-medium text-[var(--accent-primary)]">{mode.name}</span>
                                                <span className="text-xs text-[var(--text-tertiary)]">({mode.footprint} channels)</span>
                                            </div>
                                            {mode.channels && mode.channels.length > 0 ? (
                                                <div className="border border-[var(--border-subtle)] rounded overflow-hidden">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="bg-[var(--bg-panel)]">
                                                                <th className="px-2 py-1 text-left font-medium text-[var(--text-secondary)]">DMX</th>
                                                                <th className="px-2 py-1 text-left font-medium text-[var(--text-secondary)]">Attribute</th>
                                                                <th className="px-2 py-1 text-left font-medium text-[var(--text-secondary)]">Resolution</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {mode.channels.map((ch, idx) => (
                                                                <tr key={idx} className="border-t border-[var(--border-subtle)]">
                                                                    <td className="px-2 py-1 font-mono text-[var(--accent-primary)]">{ch.dmxAddress}</td>
                                                                    <td className="px-2 py-1 text-[var(--text-primary)]">{ch.attribute}</td>
                                                                    <td className="px-2 py-1 text-[var(--text-tertiary)]">{ch.resolution}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-[var(--text-tertiary)] italic">
                                                    No detailed channel data available
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                                <button
                                    type="button"
                                    onClick={() => setShowDmxMap(false)}
                                    className="w-full py-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Color Picker Modal */}
            {
                showColorPicker && (
                    <ColorPicker
                        onClose={() => setShowColorPicker(false)}
                        onSelect={(colorCode) => {
                            setFormData(prev => ({ ...prev, color: colorCode }));
                            setShowColorPicker(false);
                        }}
                    />
                )
            }
        </div >
    );
}
