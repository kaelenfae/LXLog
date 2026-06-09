import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ensureGenericFixture } from '../db';

export function CreateInstrumentModal({ onClose, onCreated }) {
    const [quantity, setQuantity] = useState(1);
    const [startChannel, setStartChannel] = useState('');
    const [type, setType] = useState('');
    const [position, setPosition] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch available types for autocomplete/dropdown
    const typesInUse = useLiveQuery(async () => {
        const instruments = await db.instruments.toArray();
        const types = new Set(instruments.map(i => i.type).filter(Boolean));
        return Array.from(types).sort();
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const count = Math.max(1, parseInt(quantity) || 1);
        const newIds = [];
        
        let currentChan = parseInt(startChannel, 10);
        const hasChan = !isNaN(currentChan);

        let fixtureTypeId = '';
        let libWatt = '';
        let libWeight = '';
        let libFootprint = '';
        let libFrameSize = '';
        let libDmxMode = '';

        if (type.trim()) {
            fixtureTypeId = await ensureGenericFixture(type.trim());
            if (fixtureTypeId) {
                const libFixture = await db.fixtureLibrary.where('fixtureTypeId').equals(fixtureTypeId).first();
                if (libFixture) {
                    libWatt = libFixture.wattage || '';
                    libWeight = libFixture.weight || '';
                    if (libFixture.dmxModes && libFixture.dmxModes.length > 0) {
                        libFootprint = libFixture.dmxModes[0].footprint || '';
                        libDmxMode = libFixture.dmxModes[0].name || '';
                    }
                    libFrameSize = libFixture.gelFrameSize || '';
                }
            }
        }

        for (let i = 0; i < count; i++) {
            const inst = {
                channel: hasChan ? String(currentChan + i) : '',
                part: '',
                address: '',
                dmxFootprint: libFootprint || '',
                type: type.trim(),
                watt: libWatt || '',
                weight: libWeight || '',
                purpose: '',
                position: position.trim(),
                unit: '',
                gobo: '',
                accessory: '',
                color: '',
                gelFrameSize: libFrameSize || '',
                fixtureTypeId: fixtureTypeId || '',
                dmxMode: libDmxMode || '',
                customFields: {}
            };
            const id = await db.instruments.add(inst);
            
            // Add system note
            await db.instrumentNotes.add({
                instrumentId: id,
                text: 'Created via Bulk Add',
                timestamp: new Date().toISOString(),
                author: 'system'
            });
            
            newIds.push(id);
        }

        setIsSubmitting(false);
        onCreated(newIds);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
            <div 
                className="bg-[var(--bg-panel)] w-full max-w-md rounded-xl shadow-2xl border border-[var(--border-subtle)] flex flex-col overflow-hidden animate-scale-up"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-card)] flex justify-between items-center">
                    <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <svg className="w-5 h-5 text-[var(--accent-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        Add Instruments
                    </h2>
                    <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-1">
                            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Quantity</label>
                            <input 
                                type="number" 
                                min="1"
                                max="500"
                                required
                                value={quantity} 
                                onChange={e => setQuantity(e.target.value)}
                                className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all font-mono"
                                autoFocus
                            />
                        </div>
                        <div className="flex-1 space-y-1">
                            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Start Channel</label>
                            <input 
                                type="number" 
                                value={startChannel} 
                                onChange={e => setStartChannel(e.target.value)}
                                placeholder="Auto-increment"
                                className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all font-mono"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Fixture Type</label>
                        <input 
                            type="text" 
                            list="types-list"
                            value={type} 
                            onChange={e => setType(e.target.value)}
                            placeholder="e.g. Source Four 26°"
                            className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                        />
                        <datalist id="types-list">
                            {typesInUse?.map(t => <option key={t} value={t} />)}
                        </datalist>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Position</label>
                        <input 
                            type="text" 
                            value={position} 
                            onChange={e => setPosition(e.target.value)}
                            placeholder="e.g. 1st Electric"
                            className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-[var(--border-subtle)] mt-2">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="px-6 py-2 rounded-lg text-sm font-medium bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Creating...' : `Create ${quantity > 1 ? quantity + ' ' : ''}Instrument${quantity > 1 ? 's' : ''}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
