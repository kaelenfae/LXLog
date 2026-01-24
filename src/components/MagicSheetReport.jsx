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

// --- Sortable Item Component ---
function SortableInstrument({ id, inst, config }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id,
        disabled: config.isLocked // Disable drag if locked
    });

    const instColor = inst.color ? getGelColor(inst.color) : null;

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        borderColor: instColor || '#9ca3af',
        backgroundColor: instColor ? `${instColor}15` : 'white',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`relative flex flex-col items-center p-2 border-2 rounded-lg print:border-black overflow-hidden ${config.isLocked ? '' : 'cursor-grab active:cursor-grabbing'
                } ${config.layoutType === 'flex' ? 'min-w-[3rem]' : ''
                } hover:shadow-md transition-all`}
        >
            <div className="text-xl font-bold pointer-events-none text-black">{inst.channel}</div>
            {inst.color && (
                <div className="text-[8px] text-gray-600 pointer-events-none truncate max-w-[50px]">{inst.color}</div>
            )}
        </div>
    );
}

// Drag Overlay Item (Preview)
function DragOverlayItem({ inst, config }) {
    if (!inst) return null;
    const instColor = inst.color ? getGelColor(inst.color) : null;

    return (
        <div
            className={`relative flex flex-col items-center p-2 border-2 rounded-lg overflow-hidden cursor-grabbing shadow-2xl scale-105 z-50 ${config.layoutType === 'flex' ? 'min-w-[3rem]' : ''}`}
            style={{
                borderColor: instColor || '#6366f1',
                backgroundColor: instColor ? `${instColor}25` : 'white',
            }}
        >
            <div className="text-xl font-bold pointer-events-none text-black">{inst.channel}</div>
            {inst.color && (
                <div className="text-[8px] text-gray-600 pointer-events-none truncate max-w-[50px]">{inst.color}</div>
            )}
        </div>
    );
}

// --- Sortable Group Component ---
function SortableGroup({ id, children, accentColor, isCollapsed, onToggleCollapse }) {
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

    // Handle click vs drag - click toggles collapse, drag initiates reorder
    const handleClick = (e) => {
        // If this was a real drag (not just a click), dnd-kit will have handled it
        // This fires only on a click (no drag distance)
        if (onToggleCollapse) {
            onToggleCollapse();
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="relative"
        >
            {/* Drag Handle / Collapse Toggle */}
            <div
                {...attributes}
                {...listeners}
                onClick={handleClick}
                className="absolute top-2 left-2 p-1.5 rounded cursor-grab active:cursor-grabbing bg-white/80 hover:bg-white shadow-sm z-10 print:hidden transition-all"
                title={isCollapsed ? "Click to expand, drag to reorder" : "Click to collapse, drag to reorder"}
            >
                <svg className={`w-4 h-4 text-gray-500 transition-transform ${isCollapsed ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
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
    const [activeId, setActiveId] = useState(null); // For instrument DragOverlay
    const [activeGroupId, setActiveGroupId] = useState(null); // For group DragOverlay
    const [groupOrder, setGroupOrder] = useState(() => {
        const saved = localStorage.getItem('magicSheet_groupOrder');
        return saved ? JSON.parse(saved) : null; // null = use default alphabetical
    });
    const [groupByField, setGroupByField] = useState(() => {
        return localStorage.getItem('magicSheet_groupBy') || 'purpose';
    });
    const [canvasMode, setCanvasMode] = useState(() => {
        return localStorage.getItem('magicSheet_canvasMode') === 'true';
    });
    const [collapsedGroups, setCollapsedGroups] = useState(() => {
        const saved = localStorage.getItem('magicSheet_collapsedGroups');
        return saved ? JSON.parse(saved) : [];
    });
    const [mergedGroups, setMergedGroups] = useState(() => {
        // Map of source group -> target group (for merging)
        const saved = localStorage.getItem('magicSheet_mergedGroups');
        return saved ? JSON.parse(saved) : {};
    });
    const [showMergeHint, setShowMergeHint] = useState(false);

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
            base.push({ id: `custom:${field}`, label: field });
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
        localStorage.setItem('magicSheet_canvasMode', canvasMode);
    }, [canvasMode]);

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
                return a.localeCompare(b);
            });
        }

        const sorted = orderedKeys.map(key => ({
            purpose: key,
            items: grps[key]
        }));

        // Process merged groups
        const result = [];
        const mergedSources = Object.keys(mergedGroups);

        sorted.forEach(group => {
            if (mergedSources.includes(group.purpose)) return;

            const mergedItems = [];
            const mergedFrom = [];
            Object.entries(mergedGroups).forEach(([source, target]) => {
                if (target === group.purpose) {
                    const sourceGroup = sorted.find(g => g.purpose === source);
                    if (sourceGroup) {
                        mergedItems.push(...sourceGroup.items);
                        mergedFrom.push(source);
                    }
                }
            });

            result.push({
                ...group,
                items: [...group.items, ...mergedItems],
                mergedFrom: mergedFrom.length > 0 ? mergedFrom : null
            });
        });

        return { groups: grps, orderedGroupKeys: orderedKeys, sortedGroups: sorted, processedGroups: result };
    }, [instruments, groupByField, groupOrder, mergedGroups, getFieldValue]);

    // Early return AFTER all hooks
    if (!instruments) return <div>Loading...</div>;

    // Save group order when it changes
    const saveGroupOrder = (newOrder) => {
        setGroupOrder(newOrder);
        localStorage.setItem('magicSheet_groupOrder', JSON.stringify(newOrder));
    };

    // Toggle group collapse
    const toggleCollapse = (groupKey) => {
        const newCollapsed = collapsedGroups.includes(groupKey)
            ? collapsedGroups.filter(k => k !== groupKey)
            : [...collapsedGroups, groupKey];
        setCollapsedGroups(newCollapsed);
        localStorage.setItem('magicSheet_collapsedGroups', JSON.stringify(newCollapsed));
    };

    // Unmerge a group
    const unmergeGroup = (sourceGroup) => {
        const newMerged = { ...mergedGroups };
        delete newMerged[sourceGroup];
        setMergedGroups(newMerged);
        localStorage.setItem('magicSheet_mergedGroups', JSON.stringify(newMerged));
    };

    // Find active instrument for overlay
    const activeInstrument = activeId ? instruments.find(i => i.id === activeId) : null;
    const activeGroupPurpose = activeInstrument ? (activeInstrument.purpose || '(No Purpose)') : null;
    const activeConfig = activeGroupPurpose ? (purposeConfigs[activeGroupPurpose] || { layoutType: 'flex', showSwatches: false }) : {};

    // Find active group for group overlay
    const activeGroup = activeGroupId ? sortedGroups.find(g => g.purpose === activeGroupId) : null;

    const handleDragStart = (event) => {
        const id = event.active.id;
        // Check if this is a group ID (string matching group purpose) or instrument ID (number)
        if (typeof id === 'string' && sortedGroups.some(g => g.purpose === id)) {
            setActiveGroupId(id);
            setActiveId(null);
        } else {
            setActiveId(id);
            setActiveGroupId(null);
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        // Reset both states
        setActiveId(null);
        setActiveGroupId(null);

        if (!over) return;

        // Check if this was a group drag
        if (typeof active.id === 'string' && sortedGroups.some(g => g.purpose === active.id)) {
            // Check if dropping onto another group (merge)
            if (active.id !== over.id && sortedGroups.some(g => g.purpose === over.id)) {
                // Show merge confirmation
                if (window.confirm(`Merge "${active.id}" into "${over.id}"?\n\nThis will visually combine the groups on the Magic Sheet.`)) {
                    // Add merge mapping
                    const newMerged = { ...mergedGroups, [active.id]: over.id };
                    setMergedGroups(newMerged);
                    localStorage.setItem('magicSheet_mergedGroups', JSON.stringify(newMerged));
                } else {
                    // Just reorder
                    const currentOrder = orderedGroupKeys;
                    const oldIndex = currentOrder.indexOf(active.id);
                    const newIndex = currentOrder.indexOf(over.id);

                    if (oldIndex !== -1 && newIndex !== -1) {
                        const newOrder = arrayMove(currentOrder, oldIndex, newIndex);
                        saveGroupOrder(newOrder);
                    }
                }
            }
            return;
        }

        // Otherwise, this is an instrument drag
        const activeInst = instruments.find(i => i.id === active.id);
        if (!activeInst) return;

        const purpose = getFieldValue(activeInst, groupByField);
        const groupItems = groups[purpose];

        // Pick config
        const config = purposeConfigs[purpose] || {};

        // Prevent drag if locked
        if (config.isLocked) return;

        // Reuse sort logic to get current items
        const groupConfig = config;
        let currentDisplayOrder = [...groupItems];
        if (groupConfig.sortOrder === 'numerical') {
            currentDisplayOrder.sort((a, b) => (parseFloat(a.channel) || 0) - (parseFloat(b.channel) || 0));
        } else if (groupConfig.sortOrder === 'reverse') {
            currentDisplayOrder.sort((a, b) => (parseFloat(b.channel) || 0) - (parseFloat(a.channel) || 0));
        } else if (groupConfig.sortOrder === 'custom' && groupConfig.customOrder && groupConfig.customOrder.length > 0) {
            const orderMap = new Map(groupConfig.customOrder.map((id, index) => [id, index]));
            currentDisplayOrder.sort((a, b) => {
                const idxA = orderMap.has(a.id) ? orderMap.get(a.id) : 999999;
                const idxB = orderMap.has(b.id) ? orderMap.get(b.id) : 999999;
                return idxA - idxB;
            });
        } else {
            currentDisplayOrder.sort((a, b) => (parseFloat(a.channel) || 0) - (parseFloat(b.channel) || 0));
        }

        const oldIndex = currentDisplayOrder.findIndex((item) => item.id === active.id);
        const newIndex = currentDisplayOrder.findIndex((item) => item.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            const reorderedItems = arrayMove(currentDisplayOrder, oldIndex, newIndex);
            const newOrderIds = reorderedItems.map(i => i.id);

            saveConfig(purpose, {
                ...config,
                customOrder: newOrderIds,
                sortOrder: 'custom'
            });
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

            <div className="h-4 w-px bg-gray-300"></div>

            <label className="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    checked={canvasMode}
                    onChange={(e) => setCanvasMode(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-bold text-gray-600 uppercase tracking-wider text-[10px]">Canvas Mode</span>
            </label>

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
        </div>
    );

    return (
        <ReportLayout title="Magic Sheet" orientation={orientation} controls={controls}>
            {/* Force Light Mode Container */}
            <div className="bg-white text-black min-h-full p-4">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-3">
                            {processedGroups.map(group => {
                                const isCollapsed = collapsedGroups.includes(group.purpose);
                                const isNoValueGroup = group.purpose.startsWith('(No ');
                                const config = purposeConfigs[group.purpose] || {
                                    sortOrder: 'numerical',
                                    layoutType: 'flex',
                                    gridCols: 8,
                                    showSwatches: false,
                                    customOrder: [],
                                    isLocked: false
                                };

                                // Sort Logic
                                let displayItems = [...group.items];
                                if (config.sortOrder === 'numerical') {
                                    displayItems.sort((a, b) => (parseFloat(a.channel) || 0) - (parseFloat(b.channel) || 0));
                                } else if (config.sortOrder === 'reverse') {
                                    displayItems.sort((a, b) => (parseFloat(b.channel) || 0) - (parseFloat(a.channel) || 0));
                                } else if (config.sortOrder === 'custom' && config.customOrder && config.customOrder.length > 0) {
                                    const orderMap = new Map(config.customOrder.map((id, index) => [id, index]));
                                    displayItems.sort((a, b) => {
                                        const idxA = orderMap.has(a.id) ? orderMap.get(a.id) : 999999;
                                        const idxB = orderMap.has(b.id) ? orderMap.get(b.id) : 999999;
                                        return idxA - idxB;
                                    });
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
                                        accentColor={accentColor}
                                        isCollapsed={isCollapsed}
                                        onToggleCollapse={() => toggleCollapse(group.purpose)}
                                    >
                                        <div className="mb-6 print-break-inside rounded-xl bg-white print:border-black print:bg-transparent shadow-lg overflow-hidden border border-gray-200 pl-10">
                                            {/* Gradient Header */}
                                            <div
                                                className="px-4 py-3 flex items-center justify-between"
                                                style={{
                                                    background: `linear-gradient(135deg, ${accentColor}22 0%, ${accentColor}08 100%)`,
                                                    borderBottom: `3px solid ${accentColor}`
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-3 h-3 rounded-full shadow-sm"
                                                        style={{ backgroundColor: accentColor }}
                                                    />
                                                    <h3 className="font-bold text-lg uppercase tracking-wide text-gray-800">{group.purpose}</h3>
                                                    <span className="text-xs text-gray-500 font-medium">({displayItems.length})</span>
                                                    {/* Merged From Badges */}
                                                    {group.mergedFrom && group.mergedFrom.map(src => (
                                                        <span
                                                            key={src}
                                                            className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full flex items-center gap-1 print:hidden"
                                                        >
                                                            +{src}
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); unmergeGroup(src); }}
                                                                className="hover:text-red-500"
                                                                title={`Unmerge ${src}`}
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    ))}
                                                    {config.isLocked && (
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => setEditingPurpose(isEditing ? null : group.purpose)}
                                                    className={`p-1.5 rounded-lg print:hidden transition-all ${isEditing
                                                        ? 'bg-indigo-500 text-white shadow-md'
                                                        : 'bg-white/50 text-gray-500 hover:text-gray-800 hover:bg-white hover:shadow'
                                                        }`}
                                                    title="Configure layout"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                </button>
                                            </div>

                                            {/* Content Area - hide when collapsed */}
                                            {!isCollapsed && (
                                                <div className="p-4">
                                                    {isEditing && (
                                                        <div className="mb-3 p-3 bg-white border border-gray-300 rounded space-y-3 print:hidden shadow-lg box-border">
                                                            <div className="pb-3 border-b border-gray-200">
                                                                <label className="flex items-center gap-2 cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={!!config.isLocked}
                                                                        onChange={(e) => saveConfig(group.purpose, { ...config, isLocked: e.target.checked })}
                                                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                                                    />
                                                                    <span className="text-xs font-bold text-gray-800">Lock Layout</span>
                                                                </label>
                                                                <p className="text-[10px] text-gray-500 mt-0.5 ml-5">
                                                                    Prevent accidental changes to this group.
                                                                </p>
                                                            </div>

                                                            <div className={config.isLocked ? "opacity-50 pointer-events-none" : ""}>
                                                                <div className="mb-3">
                                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Sort Order</label>
                                                                    <select
                                                                        value={config.sortOrder}
                                                                        onChange={(e) => saveConfig(group.purpose, { ...config, sortOrder: e.target.value })}
                                                                        className="w-full text-sm bg-white text-black border border-gray-300 rounded px-2 py-1"
                                                                    >
                                                                        <option value="numerical">Numerical (1, 2, 3...)</option>
                                                                        <option value="reverse">Reverse (3, 2, 1...)</option>
                                                                        <option value="custom">Custom (Drag & Drop)</option>
                                                                    </select>
                                                                </div>

                                                                <div className="mb-3">
                                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Layout Type</label>
                                                                    <select
                                                                        value={config.layoutType}
                                                                        onChange={(e) => saveConfig(group.purpose, { ...config, layoutType: e.target.value })}
                                                                        className="w-full text-sm bg-white text-black border border-gray-300 rounded px-2 py-1"
                                                                    >
                                                                        <option value="flex">Flexible Wrap</option>
                                                                        <option value="grid">Fixed Grid</option>
                                                                    </select>
                                                                </div>

                                                                {config.layoutType === 'grid' && (
                                                                    <div className="mb-3">
                                                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Columns</label>
                                                                        <input
                                                                            type="number"
                                                                            min="1"
                                                                            max="20"
                                                                            value={config.gridCols}
                                                                            onChange={(e) => saveConfig(group.purpose, { ...config, gridCols: parseInt(e.target.value) || 8 })}
                                                                            className="w-full text-sm bg-white text-black border border-gray-300 rounded px-2 py-1"
                                                                        />
                                                                    </div>
                                                                )}

                                                                <div>
                                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={config.showSwatches}
                                                                            onChange={(e) => saveConfig(group.purpose, { ...config, showSwatches: e.target.checked })}
                                                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                                                        />
                                                                        <span className="text-xs font-semibold text-gray-800">Show Color Swatches</span>
                                                                    </label>
                                                                </div>
                                                                <div className="text-[10px] text-gray-500 italic mt-1">
                                                                    Tip: Drag any channel to automatically switch to Custom sort.
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <SortableContext
                                                        items={displayItems.map(i => i.id)}
                                                        strategy={rectSortingStrategy}
                                                    >
                                                        <div
                                                            className={config.layoutType === 'flex' ? "flex flex-wrap gap-2" : "grid gap-2"}
                                                            style={config.layoutType === 'grid' ? {
                                                                gridTemplateColumns: `repeat(${config.gridCols}, minmax(3rem, 1fr))`,
                                                                gridAutoFlow: 'row'
                                                            } : {}}
                                                        >
                                                            {displayItems.map(inst => (
                                                                <SortableInstrument
                                                                    key={inst.id}
                                                                    id={inst.id}
                                                                    inst={inst}
                                                                    config={config}
                                                                />
                                                            ))}
                                                        </div>
                                                    </SortableContext>
                                                </div>
                                            )}
                                        </div>
                                    </SortableGroup>
                                );
                            })}
                        </div>
                    </SortableContext>
                    <DragOverlay>
                        {activeId ? (
                            <DragOverlayItem inst={activeInstrument} config={activeConfig} />
                        ) : activeGroup ? (
                            <GroupDragOverlay group={activeGroup} accentColor="#6366f1" />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </ReportLayout >
    );
}
