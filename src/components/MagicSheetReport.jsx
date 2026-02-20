import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ReportLayout } from './ReportLayout';
import { getGelColor } from '../utils/gelData';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Instrument Cell (non-draggable) ---
function InstrumentCell({ inst, config }) {
    const instColor = inst.color ? getGelColor(inst.color) : null;

    return (
        <div
            className="relative flex flex-col items-center p-2 print:p-1 border-2 rounded-lg print:border-black overflow-hidden hover:shadow-md transition-all"
            style={{
                borderColor: instColor || '#9ca3af',
                backgroundColor: instColor ? `${instColor}15` : 'white',
            }}
        >
            <div className="text-xl print:text-base font-bold pointer-events-none text-black">{inst.channel}</div>
            {inst.color && (
                <div className="text-[8px] text-gray-600 pointer-events-none truncate max-w-[50px] print:max-w-[40px]">{inst.color}</div>
            )}
        </div>
    );
}


// --- Sortable Group Component ---
function SortableGroup({ id, children, accentColor, isMenuOpen, onMenuClick, className: extraClassName }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    // Handle click vs drag - click opens menu, drag initiates reorder
    const handleClick = (e) => {
        if (onMenuClick) {
            onMenuClick();
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative ${extraClassName || ''}`}
        >
            {/* Drag Handle / Menu Toggle */}
            <div
                {...attributes}
                {...listeners}
                onClick={handleClick}
                className={`absolute top-2 left-2 p-1.5 rounded cursor-grab active:cursor-grabbing shadow-sm z-10 print:hidden transition-all ${isMenuOpen ? 'bg-indigo-500 text-white' : 'bg-white/80 hover:bg-white text-gray-500'
                    }`}
                title="Click for options, drag to reorder"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </div>
            {children}
        </div>
    );
}

// Group Drag Overlay
function GroupDragOverlay({ group, accentColor }) {
    if (!group) return null;
    return (
        <div
            className="rounded-xl bg-white shadow-2xl border-2 border-indigo-500 p-4 min-w-[200px] opacity-90"
            style={{ borderColor: accentColor }}
        >
            <div className="font-bold text-lg uppercase tracking-wide text-gray-800">{group.purpose}</div>
            <div className="text-xs text-gray-500">{group.items ? group.items.length : 0} instruments</div>
        </div>
    );
}

export function MagicSheetReport() {
    const [orientation, setOrientation] = React.useState('portrait');
    const [purposeConfigs, setPurposeConfigs] = React.useState({});
    const [editingPurpose, setEditingPurpose] = React.useState(null);

    const [activeGroupId, setActiveGroupId] = useState(null); // For group DragOverlay
    const [groupOrder, setGroupOrder] = useState(() => {
        const saved = localStorage.getItem('magicSheet_groupOrder');
        return saved ? JSON.parse(saved) : null; // null = use default alphabetical
    });
    const [groupByField, setGroupByField] = useState(() => {
        return localStorage.getItem('magicSheet_groupBy') || 'purpose';
    });

    const [hideDuplicates, setHideDuplicates] = useState(() => {
        return localStorage.getItem('magicSheet_hideDuplicates') === 'true';
    });

    // --- Responsive Masonry Columns Logic ---
    const [numCols, setNumCols] = React.useState(3);

    React.useEffect(() => {
        const updateCols = () => {
            const isPrint = window.matchMedia('print').matches;
            if (isPrint) {
                setNumCols(orientation === 'landscape' ? 4 : 3);
            } else if (window.innerWidth >= 1024) {
                setNumCols(orientation === 'landscape' ? 4 : 3);
            } else if (window.innerWidth >= 768) {
                setNumCols(2);
            } else {
                setNumCols(1);
            }
        };

        updateCols();
        window.addEventListener('resize', updateCols);

        const printQuery = window.matchMedia('print');
        if (printQuery.addEventListener) {
            printQuery.addEventListener('change', updateCols);
        } else {
            printQuery.addListener(updateCols);
        }

        return () => {
            window.removeEventListener('resize', updateCols);
            if (printQuery.removeEventListener) {
                printQuery.removeEventListener('change', updateCols);
            } else {
                printQuery.removeListener(updateCols);
            }
        };
    }, [orientation]);
    // ----------------------------------------

    // Fetch metadata for custom field options
    const metadata = useLiveQuery(() => db.showMetadata.toArray());
    const customFieldDefs = React.useMemo(() => {
        if (metadata && metadata[0] && metadata[0].customFieldDefinitions) {
            return metadata[0].customFieldDefinitions;
        }
        return [];
    }, [metadata]);

    // Available grouping options
    const groupByOptions = React.useMemo(() => {
        const base = [
            { id: 'purpose', label: 'Purpose' },
            { id: 'position', label: 'Position' },
            { id: 'color', label: 'Color' },
            { id: 'type', label: 'Type' }
        ];
        // Add custom fields
        customFieldDefs.forEach(field => {
            base.push({ id: `custom:${field} `, label: field });
        });
        return base;
    }, [customFieldDefs]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    React.useEffect(() => {
        const saved = localStorage.getItem('magicSheetConfigs');
        if (saved) {
            setPurposeConfigs(JSON.parse(saved));
        }
    }, []);

    React.useEffect(() => {
        localStorage.setItem('magicSheet_groupBy', groupByField);
    }, [groupByField]);

    React.useEffect(() => {
        localStorage.setItem('magicSheet_hideDuplicates', hideDuplicates);
    }, [hideDuplicates]);



    const saveConfig = (purpose, config) => {
        const updated = { ...purposeConfigs, [purpose]: config };
        setPurposeConfigs(updated);
        localStorage.setItem('magicSheetConfigs', JSON.stringify(updated));
    };

    const instruments = useLiveQuery(() => db.instruments.toArray());

    // Helper to get field value
    const getFieldValue = React.useCallback((inst, fieldId) => {
        if (fieldId.startsWith('custom:')) {
            const customKey = fieldId.replace('custom:', '');
            return inst.customFields?.[customKey] || '(No Value)';
        }
        return inst[fieldId] || `(No ${fieldId.charAt(0).toUpperCase() + fieldId.slice(1)})`;
    }, []);

    // Process data into groups - this MUST be a useMemo to maintain hook order
    const { groups, orderedGroupKeys, sortedGroups, processedGroups } = React.useMemo(() => {
        if (!instruments) {
            return { groups: {}, orderedGroupKeys: [], sortedGroups: [], processedGroups: [] };
        }

        // Process Data with dynamic grouping
        const grps = {};
        instruments.forEach(inst => {
            const groupKey = getFieldValue(inst, groupByField);
            if (!grps[groupKey]) grps[groupKey] = [];
            grps[groupKey].push(inst);
        });

        // Sort groups: use custom order if available, else alphabetical
        // Always put "(No ..." groups at the end
        const allGroupKeys = Object.keys(grps);
        const isNoValueGroup = (key) => key.startsWith('(No ');

        let orderedKeys;
        if (groupOrder && groupOrder.length > 0) {
            const orderMap = new Map(groupOrder.map((key, idx) => [key, idx]));
            orderedKeys = [...allGroupKeys].sort((a, b) => {
                if (isNoValueGroup(a) && !isNoValueGroup(b)) return 1;
                if (!isNoValueGroup(a) && isNoValueGroup(b)) return -1;
                const idxA = orderMap.has(a) ? orderMap.get(a) : 999999;
                const idxB = orderMap.has(b) ? orderMap.get(b) : 999999;
                if (idxA === idxB) return a.localeCompare(b);
                return idxA - idxB;
            });
        } else {
            orderedKeys = allGroupKeys.sort((a, b) => {
                if (isNoValueGroup(a) && !isNoValueGroup(b)) return 1;
                if (!isNoValueGroup(a) && isNoValueGroup(b)) return -1;

                const getMinChannel = (groupItems) => {
                    let min = Infinity;
                    for (const item of groupItems) {
                        const val = parseFloat(item.channel);
                        if (!isNaN(val) && val < min) min = val;
                    }
                    return min;
                };

                const minA = getMinChannel(grps[a]);
                const minB = getMinChannel(grps[b]);

                if (minA !== Infinity && minB !== Infinity && minA !== minB) {
                    return minA - minB;
                } else if (minA !== Infinity && minB === Infinity) {
                    return -1;
                } else if (minB !== Infinity && minA === Infinity) {
                    return 1;
                }

                return a.localeCompare(b);
            });
        }

        const sorted = orderedKeys.map(key => ({
            purpose: key,
            items: grps[key]
        }));

        const result = sorted.map(group => {
            return {
                ...group,
                items: (() => {
                    let items = [...group.items];
                    if (hideDuplicates) {
                        const seen = new Set();
                        items = items.filter(inst => {
                            if (!inst.channel) return true;
                            if (seen.has(inst.channel)) return false;
                            seen.add(inst.channel);
                            return true;
                        });
                    }
                    return items;
                })()
            };
        });

        return { groups: grps, orderedGroupKeys: orderedKeys, sortedGroups: sorted, processedGroups: result };
    }, [instruments, groupByField, groupOrder, getFieldValue, hideDuplicates]);

    // Early return AFTER all hooks
    if (!instruments) return <div>Loading...</div>;

    // Save group order when it changes
    const saveGroupOrder = (newOrder) => {
        setGroupOrder(newOrder);
        localStorage.setItem('magicSheet_groupOrder', JSON.stringify(newOrder));
    };    // Find active group for group overlay
    const activeGroup = activeGroupId ? sortedGroups.find(g => g.purpose === activeGroupId) : null;

    const handleDragStart = (event) => {
        const id = event.active.id;
        if (typeof id === 'string' && sortedGroups.some(g => g.purpose === id)) {
            setActiveGroupId(id);
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveGroupId(null);

        if (!over) return;

        // Group drag
        if (typeof active.id === 'string' && sortedGroups.some(g => g.purpose === active.id)) {
            if (active.id !== over.id && sortedGroups.some(g => g.purpose === over.id)) {
                const currentOrder = orderedGroupKeys;
                const oldIndex = currentOrder.indexOf(active.id);
                const newIndex = currentOrder.indexOf(over.id);
                if (oldIndex !== -1 && newIndex !== -1) {
                    const newOrder = arrayMove(currentOrder, oldIndex, newIndex);
                    saveGroupOrder(newOrder);
                }
            }
        }
    };

    const controls = (
        <div className="flex gap-4 items-center flex-wrap bg-gray-100 p-2 rounded text-xs text-black border border-gray-300 print:hidden">
            <div className="flex items-center gap-2">
                <span className="font-bold text-gray-600 uppercase tracking-wider text-[10px]">Group By:</span>
                <select
                    value={groupByField}
                    onChange={(e) => setGroupByField(e.target.value)}
                    className="bg-white text-black border border-gray-300 rounded px-2 py-1 cursor-pointer hover:border-indigo-500 focus:outline-none focus:border-indigo-500"
                >
                    {groupByOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                </select>
            </div>



            {groupOrder && (
                <button
                    onClick={() => {
                        setGroupOrder(null);
                        localStorage.removeItem('magicSheet_groupOrder');
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                    Reset Order
                </button>
            )}

            <div className="h-4 w-px bg-gray-300"></div>

            <div className="flex items-center gap-2">
                <span className="font-bold text-gray-600 uppercase tracking-wider text-[10px]">Orientation:</span>
                <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value)}
                    className="bg-white text-black border border-gray-300 rounded px-2 py-1 cursor-pointer hover:border-indigo-500 focus:outline-none focus:border-indigo-500"
                >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                </select>
            </div>

            <div className="h-4 w-px bg-gray-300"></div>

            <button
                onClick={() => setHideDuplicates(!hideDuplicates)}
                className={`px-3 py-1 rounded font-bold uppercase transition-all border ${hideDuplicates
                    ? 'bg-indigo-600 text-white border-indigo-700'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-500'
                    }`}
                style={{ fontSize: '10px' }}
            >
                {hideDuplicates ? 'Duplicates Hidden' : 'Hide Duplicates'}
            </button>
        </div>
    );

    return (
        <ReportLayout title="Magic Sheet" orientation={orientation} controls={controls}>
            {/* Force Light Mode Container */}
            <div className="bg-white text-black min-h-full p-4 print:p-0">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={processedGroups.map(g => g.purpose)}
                        strategy={rectSortingStrategy}
                    >
                        {(() => {
                            const sortedGroupElements = [...processedGroups].sort((a, b) => {
                                const aHidden = (purposeConfigs[a.purpose] || {}).isHidden ? 1 : 0;
                                const bHidden = (purposeConfigs[b.purpose] || {}).isHidden ? 1 : 0;
                                return aHidden - bHidden;
                            }).map(group => {
                                const isNoValueGroup = group.purpose.startsWith('(No ');
                                const config = purposeConfigs[group.purpose] || {
                                    sortOrder: 'numerical',
                                    fillDirection: 'bottom',
                                    gridCols: 5,
                                    isLocked: false,
                                    isHidden: false
                                };

                                // Sort Logic
                                let displayItems = [...group.items];
                                if ((config.sortOrder || 'numerical') === 'reverse') {
                                    displayItems.sort((a, b) => (parseFloat(b.channel) || 0) - (parseFloat(a.channel) || 0));
                                } else {
                                    displayItems.sort((a, b) => (parseFloat(a.channel) || 0) - (parseFloat(b.channel) || 0));
                                }

                                const isEditing = editingPurpose === group.purpose;

                                // Compute dominant color for gradient
                                const colorCounts = {};
                                displayItems.forEach(inst => {
                                    if (inst.color) {
                                        colorCounts[inst.color] = (colorCounts[inst.color] || 0) + 1;
                                    }
                                });
                                const dominantColor = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
                                const accentColor = dominantColor ? getGelColor(dominantColor) : '#6366f1';

                                return (
                                    <SortableGroup
                                        key={group.purpose}
                                        id={group.purpose}
                                        accentColor={config.isHidden ? '#9ca3af' : accentColor}
                                        className={config.cardWidth === '2/3' ? 'md:col-span-2' : config.cardWidth === 'full' ? 'md:col-span-2 lg:col-span-3' : ''}
                                        isMenuOpen={isEditing}
                                        onMenuClick={() => setEditingPurpose(isEditing ? null : group.purpose)}
                                    >
                                        <div className={`mb-6 print:mb-2 inline-block w-full break-inside-avoid rounded-xl bg-white print:border-black print:bg-transparent shadow-lg print:shadow-none overflow-hidden border border-gray-200 pl-10 print:pl-0 ${config.isHidden ? 'opacity-40 print:hidden' : ''}`}>
                                            {/* Gradient Header */}
                                            <div
                                                className="px-4 py-3 print:py-1.5 flex items-center justify-between"
                                                style={{
                                                    background: `linear - gradient(135deg, ${accentColor}22 0 %, ${accentColor}08 100 %)`,
                                                    borderBottom: `3px solid ${accentColor} `
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-3 h-3 rounded-full shadow-sm"
                                                        style={{ backgroundColor: accentColor }}
                                                    />
                                                    <h3 className="font-bold text-lg uppercase tracking-wide text-gray-800">{group.purpose}</h3>
                                                    <span className="text-xs text-gray-500 font-medium">({displayItems.length})</span>
                                                    {config.isLocked && (
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Content Area */}
                                            <div className="p-4 print:p-2">
                                                {isEditing && (
                                                    <div className="mb-3 p-3 bg-white border border-gray-300 rounded space-y-3 print:hidden shadow-lg box-border">
                                                        <div className="pb-3 border-b border-gray-200 flex gap-4">
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!!config.isLocked}
                                                                    onChange={(e) => saveConfig(group.purpose, { ...config, isLocked: e.target.checked })}
                                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                                                />
                                                                <span className="text-xs font-bold text-gray-800">Lock Layout</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={config.isHidden || false}
                                                                    onChange={(e) => saveConfig(group.purpose, { ...config, isHidden: e.target.checked })}
                                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                                                />
                                                                <span className="text-xs font-bold text-gray-800">Hide Card</span>
                                                            </label>
                                                        </div>

                                                        <div className={config.isLocked ? "opacity-50 pointer-events-none" : ""}>
                                                            <div className="mb-3 flex gap-3">
                                                                <div className="flex-1">
                                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Sort Order</label>
                                                                    <select
                                                                        value={config.sortOrder || 'numerical'}
                                                                        onChange={(e) => saveConfig(group.purpose, { ...config, sortOrder: e.target.value })}
                                                                        className="w-full text-sm bg-white text-black border border-gray-300 rounded px-2 py-1"
                                                                    >
                                                                        <option value="numerical">Numerical (Low→High)</option>
                                                                        <option value="reverse">Reverse (High→Low)</option>
                                                                    </select>
                                                                </div>
                                                                <div className="flex-1">
                                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Fill Direction</label>
                                                                    <select
                                                                        value={config.fillDirection || 'bottom'}
                                                                        onChange={(e) => saveConfig(group.purpose, { ...config, fillDirection: e.target.value })}
                                                                        className="w-full text-sm bg-white text-black border border-gray-300 rounded px-2 py-1"
                                                                    >
                                                                        <option value="bottom">Bottom Up</option>
                                                                        <option value="top">Top Down</option>
                                                                    </select>
                                                                </div>
                                                            </div>

                                                            <div className="mb-3 flex gap-3">
                                                                <div className="flex-1">
                                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Columns</label>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        max="20"
                                                                        value={config.gridCols || 5}
                                                                        onChange={(e) => saveConfig(group.purpose, { ...config, gridCols: parseInt(e.target.value) || 5 })}
                                                                        className="w-full text-sm bg-white text-black border border-gray-300 rounded px-2 py-1"
                                                                    />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Card Width</label>
                                                                    <select
                                                                        value={config.cardWidth || '1/3'}
                                                                        onChange={(e) => saveConfig(group.purpose, { ...config, cardWidth: e.target.value })}
                                                                        className="w-full text-sm bg-white text-black border border-gray-300 rounded px-2 py-1"
                                                                    >
                                                                        <option value="1/3">1/3</option>
                                                                        <option value="2/3">2/3</option>
                                                                        <option value="full">Full</option>
                                                                    </select>
                                                                </div>
                                                            </div>


                                                        </div>
                                                    </div>
                                                )}

                                                {(() => {
                                                    const cols = config.gridCols || 5;
                                                    const totalItems = displayItems.length;
                                                    const totalRows = Math.ceil(totalItems / cols);
                                                    const itemsInLastRow = totalItems % cols || cols;

                                                    return (
                                                        <div
                                                            className="grid gap-2 print:gap-1"
                                                            style={{
                                                                gridTemplateColumns: `repeat(${cols}, minmax(2.5rem, 1fr))`,
                                                                gridTemplateRows: `repeat(${totalRows}, auto)`
                                                            }}
                                                        >
                                                            {displayItems.map((inst, index) => {
                                                                const rowFromTop = Math.floor(index / cols);
                                                                const colInRow = index % cols;
                                                                const fillBottom = (config.fillDirection || 'bottom') === 'bottom';
                                                                const gridRow = fillBottom ? totalRows - rowFromTop : rowFromTop + 1;
                                                                let gridCol = colInRow + 1;

                                                                // Distribute partial row evenly (top row for bottom-up, bottom row for top-down)
                                                                const isPartialRow = rowFromTop === totalRows - 1 && itemsInLastRow < cols;
                                                                if (isPartialRow) {
                                                                    gridCol = Math.floor((colInRow + 0.5) * cols / itemsInLastRow) + 1;
                                                                }

                                                                return (
                                                                    <div key={inst.id} style={{ gridRow, gridColumn: gridCol }}>
                                                                        <InstrumentCell inst={inst} config={config} />
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </SortableGroup>
                                );
                            });

                            // Distribute into columns Left-to-Right
                            const layoutCols = Array.from({ length: numCols }, () => []);
                            sortedGroupElements.forEach((el, index) => {
                                layoutCols[index % numCols].push(el);
                            });

                            return (
                                <div className="flex gap-6 print:gap-2 w-full items-start">
                                    {layoutCols.map((col, i) => (
                                        <div key={`col-${i}`} className="flex-1 flex flex-col gap-6 print:gap-2 min-w-0">
                                            {col}
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </SortableContext>
                    <DragOverlay>
                        {activeGroup ? (
                            <GroupDragOverlay group={activeGroup} accentColor="#6366f1" />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </ReportLayout >
    );
}
