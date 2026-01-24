import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { getGelColor } from '../utils/gelData';

export function InstrumentDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isNew = id === 'new';

    const [formData, setFormData] = useState({
        channel: '',
        address: '',
        type: '',
        watt: '',
        purpose: '',
        position: '',
        unit: '',
        gobo: '',
        accessory: '',
        color: '',
        customFields: {}
    });

    // Global Custom Field Definitions
    const [globalFieldDefs, setGlobalFieldDefs] = useState([]);

    // Load data if editing
    const instrument = useLiveQuery(
        () => (isNew ? undefined : db.instruments.get(Number(id))),
        [id, isNew]
    );

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

    useEffect(() => {
        if (instrument) {
            setFormData(instrument);
            // Used for local state if needed, but we now drive mainly from globalFieldDefs
        } else if (isNew) {
            setFormData({
                channel: '',
                address: '',
                type: '',
                watt: '',
                purpose: '',
                position: '',
                unit: '',
                gobo: '',
                accessory: '',
                color: '',
                customFields: {}
            });
        }
    }, [instrument, isNew]);

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
    };

    const [showDupConfirm, setShowDupConfirm] = useState(false);
    const [pendingSaveData, setPendingSaveData] = useState(null);

    const handleSave = async (forceSave = false) => {
        // Parse channel for parts (e.g., "103.1")
        const dataToSave = { ...formData };

        // Auto-calculate Universe for addresses > 512
        if (dataToSave.address) {
            if (/^\d+$/.test(dataToSave.address)) {
                const addrVal = parseInt(dataToSave.address, 10);
                const universe = Math.floor((addrVal - 1) / 512) + 1;
                const address = (addrVal - 1) % 512 + 1;
                dataToSave.address = `${universe}:${address}`;
            } else {
                dataToSave.address = dataToSave.address.replace('/', ':');
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
            await db.instruments.add(dataToSave);
        } else {
            await db.instruments.update(Number(id), dataToSave);
        }
        navigate('..');
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
                    <div className="w-8 h-8 rounded bg-[var(--bg-hover)] flex items-center justify-center text-[var(--accent-primary)]">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">{isNew ? 'New Instrument' : 'Edit Details'}</h2>
                </div>
                <div className="flex gap-2">
                    {!isNew && (
                        <button onClick={handleDelete} className="p-2 text-[var(--error)] hover:bg-red-500/10 rounded transition-colors" title="Delete">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    )}
                    <button onClick={() => navigate('..')} className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors" title="Close">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-auto p-6">
                <form className="grid grid-cols-1 gap-5 max-w-lg mx-auto" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Channel</label>
                            <input name="channel" value={formData.channel || ''} onChange={handleChange} autoFocus={!location.state?.focusField} className="font-mono text-lg font-bold text-[var(--accent-primary)] panel-input" placeholder="#" autoComplete="off" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Address</label>
                            <input name="address" value={formData.address || ''} onChange={handleChange} placeholder="Univ:Addr" className="font-mono panel-input" autoComplete="off" />
                        </div>
                    </div>

                    <div className="h-px bg-[var(--border-subtle)] my-2"></div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Position</label>
                            <input name="position" value={formData.position || ''} onChange={handleChange} className="panel-input" autoComplete="off" list="list-position" />
                            <datalist id="list-position">
                                {suggestions?.position.map(val => <option key={val} value={val} />)}
                            </datalist>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Unit #</label>
                            <input name="unit" value={formData.unit || ''} onChange={handleChange} className="panel-input" autoComplete="off" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Purpose</label>
                        <input name="purpose" value={formData.purpose || ''} onChange={handleChange} className="panel-input" autoComplete="off" list="list-purpose" />
                        <datalist id="list-purpose">
                            {suggestions?.purpose.map(val => <option key={val} value={val} />)}
                        </datalist>
                    </div>

                    <div className="h-px bg-[var(--border-subtle)] my-2"></div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Type</label>
                            <input name="type" value={formData.type || ''} onChange={handleChange} className="panel-input" autoComplete="off" list="list-type" />
                            <datalist id="list-type">
                                {suggestions?.type.map(val => <option key={val} value={val} />)}
                            </datalist>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Wattage</label>
                            <input name="watt" value={formData.watt || ''} onChange={handleChange} className="panel-input" autoComplete="off" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Color</label>
                            <div className="relative w-full">
                                <input name="color" value={formData.color || ''} onChange={handleChange} className="panel-input pl-8 w-full" autoComplete="off" />
                                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-[var(--border-subtle)]" style={{ backgroundColor: getGelColor(formData.color) }}></div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Gobo</label>
                            <input name="gobo" value={formData.gobo || ''} onChange={handleChange} className="panel-input w-full" autoComplete="off" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Accessory</label>
                        <input name="accessory" value={formData.accessory || ''} onChange={handleChange} className="panel-input" autoComplete="off" />
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
            </div>

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
        </div >
    );
}
