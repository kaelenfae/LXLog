import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';

export function DmxUniverseView() {
    const navigate = useNavigate();
    const instruments = useLiveQuery(() => db.instruments.toArray());
    const [selectedUniverse, setSelectedUniverse] = useState(1);
    const [hoveredAddress, setHoveredAddress] = useState(null);

    // Calculate DMX Map
    const universeMap = useMemo(() => {
        if (!instruments) return new Map();

        const map = new Map(); // Key: "Universe:Address", Value: { instrument, type: 'start'|'overlap'|'footprint' }

        instruments.forEach(inst => {
            if (!inst.address || inst.address === '0' || inst.address === '0:0') return;

            // Parse Address
            let universe = 1;
            let address = 1;

            if (String(inst.address).includes(':')) {
                const parts = inst.address.split(':');
                universe = parseInt(parts[0]) || 1;
                address = parseInt(parts[1]) || 1;
            } else if (String(inst.address).includes('/')) {
                const parts = inst.address.split('/');
                universe = parseInt(parts[0]) || 1;
                address = parseInt(parts[1]) || 1;
            } else {
                const linear = parseInt(inst.address);
                if (!isNaN(linear)) {
                    // Assuming linear 1-512 is Univ 1, 513 is Univ 2 if strict, BUT
                    // in many theatrical contexts "1" means "1/1".
                    // Let's assume standard input is Univ 1 unless > 512
                    universe = Math.ceil(linear / 512);
                    address = ((linear - 1) % 512) + 1;
                }
            }

            // Determine Footprint (default 1)
            // TODO: In future, get actual footprint from Library if linked
            // For now, try to guess or default to 1
            // If we have access to linked fixtures we could look up footprint.
            // Since this component reads from raw instruments, we don't have linked fixture data easily 
            // without joining with fixtureLibrary.

            // Let's rely on stored footprint if we ever add it, or default to 1.
            // Actually, we can fetch fixtureLibrary too.
            const footprint = inst.dmxFootprint ? parseInt(inst.dmxFootprint) : 1;

            for (let i = 0; i < footprint; i++) {
                const currentAddr = address + i;
                if (currentAddr > 512) break; // Don't overflow universe view for now

                const mapKey = `${universe}:${currentAddr}`;
                const existing = map.get(mapKey);

                if (existing) {
                    // Mark as Overlap
                    existing.overlap = true;
                    existing.instruments.push(inst);
                } else {
                    map.set(mapKey, {
                        instruments: [inst],
                        type: i === 0 ? 'start' : 'footprint',
                        overlap: false,
                        color: i === 0 ? 'bg-[var(--accent-primary)]' : 'bg-[var(--accent-primary)]/40' // Basic color coding
                    });
                }
            }
        });

        return map;
    }, [instruments]);

    // Grid Generation
    const gridCells = useMemo(() => {
        const cells = [];
        for (let i = 1; i <= 512; i++) {
            const mapKey = `${selectedUniverse}:${i}`;
            const data = universeMap.get(mapKey);
            cells.push({
                address: i,
                data: data
            });
        }
        return cells;
    }, [selectedUniverse, universeMap]);

    const handleCellClick = (data) => {
        if (data && data.instruments && data.instruments.length > 0) {
            navigate(`/app/instrument/${data.instruments[0].id}`);
        }
    };

    if (!instruments) return <div className="p-8 text-center text-[var(--text-secondary)]">Loading DMX Map...</div>;

    return (
        <div className="flex flex-col h-full bg-[var(--bg-app)]">
            {/* Header */}
            <div className="h-14 border-b border-[var(--border-subtle)] flex items-center px-6 bg-[var(--bg-app)] justify-between shrink-0">
                <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">DMX Universe View</h1>
                <div className="flex bg-[var(--bg-panel)] rounded p-1 border border-[var(--border-subtle)]">
                    {[1, 2, 3, 4].map(u => (
                        <button
                            key={u}
                            onClick={() => setSelectedUniverse(u)}
                            className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${selectedUniverse === u
                                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                                }`}
                        >
                            Universe {u}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid Container */}
            <div className="flex-1 overflow-auto p-6">
                <div className="grid gap-1 w-full max-w-7xl mx-auto" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>
                    {/* Header Row for simple 10s columns? No, standard 512 grid is usually 16-20 columns */}
                    {/* Using grid-cols-16 (needs custom tailwind config or arbitrary val) */}
                    {/* Tailwind grid-cols-12 is default max. We need arbitrary or style. */}

                    {gridCells.map((cell) => {
                        const isHovered = hoveredAddress === cell.address;
                        const hasData = !!cell.data;
                        const isOverlap = cell.data?.overlap;
                        const isStart = cell.data?.type === 'start';

                        let bgClass = 'bg-[var(--bg-panel)]';
                        if (hasData) {
                            if (isOverlap) bgClass = 'bg-[var(--error)]';
                            else bgClass = cell.data.color || 'bg-[var(--accent-primary)]';
                        }

                        return (
                            <div
                                key={cell.address}
                                className={`aspect-square sm:aspect-auto sm:h-12 relative border border-[var(--border-subtle)] rounded flex items-center justify-center text-xs cursor-pointer transition-colors group ${bgClass} ${hasData ? 'hover:brightness-110' : 'hover:bg-[var(--bg-hover)]'}`}
                                onClick={() => handleCellClick(cell.data)}
                                onMouseEnter={() => setHoveredAddress(cell.address)}
                                onMouseLeave={() => setHoveredAddress(null)}
                            >
                                <span className={`font-mono ${hasData ? 'text-white font-bold' : 'text-[var(--text-tertiary)]'} z-10`}>
                                    {cell.address}
                                </span>

                                {/* Tooltip */}
                                {(isHovered && hasData) && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-[var(--bg-card)] border border-[var(--border-default)] shadow-xl rounded p-2 z-50 pointer-events-none">
                                        {cell.data.instruments.map(inst => (
                                            <div key={inst.id} className="mb-1 last:mb-0">
                                                <div className="font-bold text-[var(--text-primary)]">
                                                    {inst.position} {inst.unit}
                                                </div>
                                                <div className="text-[10px] text-[var(--text-secondary)]">
                                                    {inst.type} | Ch {inst.channel}
                                                </div>
                                                {isOverlap && <div className="text-[10px] text-[var(--error)] font-bold">OVERLAP!</div>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="mt-8 flex gap-6 justify-center text-sm text-[var(--text-secondary)]">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded"></div>
                        <span>Empty</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-[var(--accent-primary)] rounded"></div>
                        <span>Occupied</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-[var(--accent-primary)]/40 rounded"></div>
                        <span>Footprint</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-[var(--error)] rounded"></div>
                        <span>Overlap</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
