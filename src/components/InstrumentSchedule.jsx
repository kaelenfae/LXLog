import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useLocation } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { db, bulkUpdateInstruments, renumberPosition } from '../db';
import { useSettings } from '../hooks/useSettings';
import { formatAddress } from '../utils/addressFormatter';
import { getGelColor } from '../utils/gelData';
import { FilterModal } from './FilterModal';
import { ContextMenu } from './ContextMenu';
import { BulkEditPanel } from './BulkEditPanel';
import { ColorSwatch } from './ColorSwatch';
import classNames from 'classnames';

// Helper Component
const SortIcon = ({ field, currentSort, direction }) => {
    if (currentSort !== field) return null;
    return (
        <span className="ml-1 flex items-center text-[var(--text-primary)]">
            {direction === 'asc' ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
            ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            )}
        </span>
    );
};

// Indeterminate Checkbox
const IndeterminateCheckbox = ({ indeterminate, className = '', ...rest }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (typeof indeterminate === 'boolean' && ref.current) {
            ref.current.indeterminate = !rest.checked && indeterminate;
        }
    }, [ref, indeterminate, rest.checked]);

    return (
        <input
            type="checkbox"
            ref={ref}
            className={`cursor-pointer rounded border-gray-600 bg-[#2b2b30] checked:bg-[var(--accent-primary)] checked:border-[var(--accent-primary)] focus:ring-[var(--accent-primary)] focus:ring-offset-[#1b1b1f] ${className}`}
            {...rest}
        />
    );
};

// Column Definitions
const COLUMN_DEFS = [
    { id: 'channel', label: 'Ch', width: 60 },
    { id: 'address', label: 'Address', width: 100 },
    { id: 'purpose', label: 'Purpose', width: 200 },
    { id: 'position', label: 'Position', width: 200 },
    { id: 'unit', label: 'Unit', width: 60 },
    { id: 'type', label: 'Type', width: 200 },
    { id: 'color', label: 'Color', width: 100 },
    { id: 'gobo', label: 'Gobo', width: 100 },
    { id: 'accessory', label: 'Acc', width: 150 },
    { id: 'watt', label: 'Wattage', width: 80 }
];

export function InstrumentSchedule({ isMasterView = false, isCollapsed, onToggleDetail }) {
    const navigate = useNavigate();
    const location = useLocation();
    const parentRef = useRef(null);

    // State
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [lastSelectedId, setLastSelectedId] = useState(null);
    const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false); // Gear Menu State
    const [sortField, setSortField] = useState(() => localStorage.getItem('instrumentSchedule_sortField') || 'position');
    const [sortDirection, setSortDirection] = useState(() => localStorage.getItem('instrumentSchedule_sortDirection') || 'asc');

    // Column Configuration State - Persisted
    const [visibleColumns, setVisibleColumns] = useState(() => {
        const saved = localStorage.getItem('instrumentSchedule_visibleColumns');
        return saved ? new Set(JSON.parse(saved)) : new Set(COLUMN_DEFS.map(c => c.id));
    });

    const [columnWidths, setColumnWidths] = useState(() => {
        const saved = localStorage.getItem('instrumentSchedule_columnWidths');
        const defaults = COLUMN_DEFS.reduce((acc, col) => ({ ...acc, [col.id]: col.width }), {});
        return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    });

    // Filtering State
    const [filters, setFilters] = useState({
        type: 'All',
        position: 'All',
        color: 'All',
        gobo: 'All',
        missingAddress: false,
        missingChannel: false,
        duplicates: false,
        searchQuery: ''
    });

    // Context Menu State
    const [contextMenu, setContextMenu] = useState(null); // { x, y, instrument }

    // Interface Settings
    const { isCompact, addressMode, showUniverse1, channelDisplayMode } = useSettings();

    // Persist Visible Columns and Widths
    useEffect(() => {
        localStorage.setItem('instrumentSchedule_visibleColumns', JSON.stringify([...visibleColumns]));
    }, [visibleColumns]);

    useEffect(() => {
        localStorage.setItem('instrumentSchedule_columnWidths', JSON.stringify(columnWidths));
    }, [columnWidths]);

    useEffect(() => {
        localStorage.setItem('instrumentSchedule_sortField', sortField);
        localStorage.setItem('instrumentSchedule_sortDirection', sortDirection);
    }, [sortField, sortDirection]);

    // Column Resize Handler
    const handleResizeStart = (e, columnId) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startWidth = columnWidths[columnId];

        const onMouseMove = (moveEvent) => {
            const delta = moveEvent.clientX - startX;
            const newWidth = Math.max(50, startWidth + delta); // Min width 50px
            setColumnWidths(prev => ({ ...prev, [columnId]: newWidth }));
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const rawInstruments = useLiveQuery(() => db.instruments.toArray());
    const metadata = useLiveQuery(() => db.showMetadata.toArray());

    // Dynamic Column Definitions
    const dynamicColumns = useMemo(() => {
        const base = [...COLUMN_DEFS];
        if (metadata && metadata[0] && metadata[0].customFieldDefinitions) {
            metadata[0].customFieldDefinitions.forEach(field => {
                base.push({ id: field, label: field, width: 150, isCustom: true });
            });
        }
        return base;
    }, [metadata]);

    const { addressCounts, channelCounts, multiPartChannels, types, positions, colors, gobos } = useMemo(() => {
        const addrCounts = {};
        const chanCounts = {};
        const multiParts = new Set();
        const typeSet = new Set(['All']);
        const posSet = new Set();
        const colSet = new Set();
        const goboSet = new Set();

        if (rawInstruments) {
            rawInstruments.forEach(inst => {
                if (inst.address && inst.address !== '0:0' && inst.address !== '0') {
                    addrCounts[inst.address] = (addrCounts[inst.address] || 0) + 1;
                }
                if (inst.channel) {
                    const baseChan = String(inst.channel);
                    chanCounts[baseChan] = (chanCounts[baseChan] || 0) + 1;
                    if (inst.part && inst.part > 1) {
                        multiParts.add(inst.channel);
                    }
                }
                if (inst.type) typeSet.add(inst.type);
                if (inst.position) posSet.add(inst.position);
                if (inst.color) colSet.add(inst.color);
                if (inst.gobo) goboSet.add(inst.gobo);
            });
        }
        return {
            addressCounts: addrCounts,
            channelCounts: chanCounts,
            multiPartChannels: multiParts,
            types: Array.from(typeSet).sort(),
            positions: Array.from(posSet).sort(),
            colors: Array.from(colSet).sort(),
            gobos: Array.from(goboSet).sort()
        };
    }, [rawInstruments]);

    const filteredInstruments = useMemo(() => {
        if (!rawInstruments) return [];

        let result = [...rawInstruments];

        // Apply Filters
        if (filters.type !== 'All') result = result.filter(i => i.type === filters.type);
        if (filters.position !== 'All') result = result.filter(i => i.position === filters.position);
        if (filters.color !== 'All') result = result.filter(i => i.color === filters.color);
        if (filters.gobo !== 'All') result = result.filter(i => i.gobo === filters.gobo);

        if (filters.missingAddress) {
            result = result.filter(i => !i.address || i.address === '0:0' || i.address === '0');
        }

        if (filters.missingChannel) {
            result = result.filter(i => !i.channel);
        }

        if (filters.duplicates) {
            result = result.filter(i => {
                const isAddrDup = i.address && i.address !== '0:0' && i.address !== '0' && addressCounts[i.address] > 1;
                const isChanDup = i.channel && channelCounts[String(i.channel)] > 1;
                return isAddrDup || isChanDup;
            });
        }

        if (filters.searchQuery) {
            const q = filters.searchQuery.toLowerCase();
            result = result.filter(i =>
                (i.channel && String(i.channel).toLowerCase().includes(q)) ||
                (i.purpose && i.purpose.toLowerCase().includes(q)) ||
                (i.type && i.type.toLowerCase().includes(q)) ||
                (i.position && i.position.toLowerCase().includes(q)) ||
                (i.address && i.address.toLowerCase().includes(q)) ||
                (i.unit && String(i.unit).toLowerCase().includes(q))
            );
        }

        // Create a map of channel representatives for grouping
        const reps = {};
        if (rawInstruments) {
            rawInstruments.forEach(inst => {
                if (inst.channel) {
                    const chan = String(inst.channel);
                    if (!reps[chan] || (inst.part || 1) < (reps[chan].part || 1)) {
                        reps[chan] = inst;
                    }
                }
            });
        }

        // Apply Sorting
        return result.sort((a, b) => {
            const getSortVal = (inst, field) => {
                // Check if it's a known custom field or generic access
                const colDef = dynamicColumns.find(c => c.id === field);
                let val;
                if (colDef && colDef.isCustom) {
                    val = inst.customFields ? inst.customFields[field] : '';
                } else {
                    val = inst[field];
                }
                if (val === undefined || val === null) return '';
                return val;
            };

            const compareValues = (v1, v2) => {
                if (sortField === 'address') {
                    const splitA = String(v1).split(':').map(Number);
                    const splitB = String(v2).split(':').map(Number);
                    if (splitA.some(isNaN) || splitB.some(isNaN)) {
                        return String(v1).localeCompare(String(v2), undefined, { numeric: true });
                    }
                    if (splitA[0] !== splitB[0]) return splitA[0] - splitB[0];
                    return (splitA[1] || 0) - (splitB[1] || 0);
                } else if (sortField === 'channel' || sortField === 'watt' || sortField === 'unit' || sortField === 'dimmer') {
                    const numA = parseFloat(v1);
                    const numB = parseFloat(v2);
                    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                    return String(v1).localeCompare(String(v2), undefined, { numeric: true });
                } else {
                    return String(v1).localeCompare(String(v2), undefined, { numeric: true });
                }
            };

            // 1. Check if they belong to different groups
            const chanA = a.channel ? String(a.channel) : null;
            const chanB = b.channel ? String(b.channel) : null;

            if (chanA !== chanB) {
                const valA = chanA && reps[chanA] ? getSortVal(reps[chanA], sortField) : getSortVal(a, sortField);
                const valB = chanB && reps[chanB] ? getSortVal(reps[chanB], sortField) : getSortVal(b, sortField);

                const res = compareValues(valA, valB);
                if (res !== 0) return sortDirection === 'asc' ? res : -res;

                if (sortField === 'position') {
                    const unitA = (chanA && reps[chanA] ? reps[chanA].unit : a.unit) || '';
                    const unitB = (chanB && reps[chanB] ? reps[chanB].unit : b.unit) || '';
                    const unitRes = String(unitA).localeCompare(String(unitB), undefined, { numeric: true });
                    if (unitRes !== 0) return sortDirection === 'asc' ? unitRes : -unitRes;
                }

                if (chanA && chanB) {
                    const cA = parseFloat(chanA) || 0;
                    const cB = parseFloat(chanB) || 0;
                    if (cA !== cB) return cA - cB;
                }
                if (chanA) return -1;
                if (chanB) return 1;
            }

            // 2. Same channel group, sort by part
            const partA = a.part || 1;
            const partB = b.part || 1;
            return partA - partB;
        });
    }, [rawInstruments, filters, sortField, sortDirection, addressCounts, channelCounts]);

    // Flatten data for Virtualizer
    const rowItems = useMemo(() => {
        const items = [];
        filteredInstruments.forEach((inst, index) => {
            const prev = index > 0 ? filteredInstruments[index - 1] : null;
            const isGroupStart = !prev || prev.channel !== inst.channel;
            const isMultiPartGroup = multiPartChannels.has(inst.channel);

            if (isGroupStart && isMultiPartGroup && channelDisplayMode === 'parts') {
                items.push({ type: 'header', value: inst.channel, id: `header-${inst.channel}-${index}` });
            }

            if (sortField === 'position' && (!prev || prev.position !== inst.position) && !isMultiPartGroup) {
                items.push({ type: 'spacer', id: `spacer-${index}` });
            }

            items.push({ type: 'instrument', data: inst, id: inst.id });
        });
        return items;
    }, [filteredInstruments, sortField, multiPartChannels]);

    const rowVirtualizer = useVirtualizer({
        count: rowItems.length,
        getScrollElement: () => parentRef.current,
        estimateSize: (i) => {
            const item = rowItems[i];
            if (item.type === 'header') return 32;
            if (item.type === 'spacer') return isCompact ? 16 : 32;
            return isCompact ? 36 : 48; // Instrument row - Reverted to standard
        },
        overscan: 20,
    });

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allIds = new Set(filteredInstruments.map(i => i.id));
            setSelectedIds(allIds);
        } else {
            setSelectedIds(new Set());
        }
    };

    const toggleSelection = (id, e) => {
        e?.stopPropagation();
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
            setLastSelectedId(id);
        }
        setSelectedIds(newSelected);
    };

    const handleRowClick = (e, inst) => {
        try {
            if (e.target.type === 'checkbox') return;

            if (e.ctrlKey || e.metaKey) {
                toggleSelection(inst.id);
            } else if (e.shiftKey && lastSelectedId) {
                const idx1 = filteredInstruments.findIndex(i => i.id === lastSelectedId);
                const idx2 = filteredInstruments.findIndex(i => i.id === inst.id);
                if (idx1 === -1 || idx2 === -1) return;

                const start = Math.min(idx1, idx2);
                const end = Math.max(idx1, idx2);

                const newSelected = new Set(selectedIds);
                for (let i = start; i <= end; i++) {
                    newSelected.add(filteredInstruments[i].id);
                }
                setSelectedIds(newSelected);
            } else {
                if (selectedIds.size > 0 && !e.shiftKey && !e.ctrlKey) {
                    toggleSelection(inst.id);
                    return;
                }
                navigate(`/app/instrument/${inst.id}`);
            }
        } catch (err) {
            console.error("Row click error:", err);
        }
    };

    const handleCellClick = (e, inst, field) => {
        if (e.ctrlKey || e.shiftKey) return;
        e.stopPropagation();
        navigate(`/app/instrument/${inst.id}`, { state: { focusField: field } });
    };

    const handleBulkSave = async (updates, noteText) => {
        if (selectedIds.size === 0) return;
        try {
            await bulkUpdateInstruments([...selectedIds], updates, noteText);
            setIsBatchEditOpen(false);
            setSelectedIds(new Set());
        } catch (err) {
            console.error("Batch update failed", err);
            alert("Failed to update instruments");
        }
    };

    const handleDuplicate = async () => {
        if (selectedIds.size === 0) return;
        try {
            const selectedInstruments = await db.instruments.where('id').anyOf([...selectedIds]).toArray();
            const newInstruments = selectedInstruments.map(inst => {
                const { id, ...rest } = inst;
                return { ...rest };
            });
            await db.instruments.bulkAdd(newInstruments);
            setSelectedIds(new Set());
        } catch (err) {
            console.error("Duplicate failed", err);
            alert("Failed to duplicate instruments");
        }
    };

    const toggleColumnVisibility = (colId) => {
        const newSet = new Set(visibleColumns);
        if (newSet.has(colId)) {
            newSet.delete(colId);
        } else {
            newSet.add(colId);
        }
        setVisibleColumns(newSet);
    };

    // Context Menu Handlers
    const handleContextMenu = (e, inst) => {
        e.preventDefault();
        e.stopPropagation();

        // If right-clicking on an unselected row, select only that row
        if (!selectedIds.has(inst.id)) {
            setSelectedIds(new Set([inst.id]));
        }

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            instrument: inst
        });
    };

    const handleDeleteSelected = async () => {
        const idsToDelete = selectedIds.size > 0 ? [...selectedIds] : (contextMenu?.instrument ? [contextMenu.instrument.id] : []);
        if (idsToDelete.length === 0) return;

        if (confirm(`Delete ${idsToDelete.length} instrument${idsToDelete.length > 1 ? 's' : ''}?`)) {
            try {
                await db.instruments.bulkDelete(idsToDelete);
                setSelectedIds(new Set());
                setContextMenu(null);
            } catch (err) {
                console.error("Delete failed", err);
                alert("Failed to delete instruments");
            }
        }
    };

    const handleDuplicateSingle = async (inst) => {
        try {
            const { id, ...rest } = inst;
            await db.instruments.add({ ...rest });
        } catch (err) {
            console.error("Duplicate failed", err);
            alert("Failed to duplicate instrument");
        }
    };

    const handleSelectAllSameType = (type) => {
        const matchingIds = filteredInstruments.filter(i => i.type === type).map(i => i.id);
        setSelectedIds(new Set(matchingIds));
    };

    const handleSelectAllSamePosition = (position) => {
        const matchingIds = filteredInstruments.filter(i => i.position === position).map(i => i.id);
        setSelectedIds(new Set(matchingIds));
    };

    const handleRenumberPosition = async (position) => {
        if (!position) return;
        // Get all visible instruments in this position, preserving current sort order
        const positionInstruments = filteredInstruments.filter(i => i.position === position);
        if (positionInstruments.length === 0) return;

        if (confirm(`Renumber ${positionInstruments.length} units in "${position}"? This will assign unit numbers 1-${positionInstruments.length} based on current sort order.`)) {
            try {
                const ids = positionInstruments.map(i => i.id);
                await renumberPosition(position, ids);
            } catch (err) {
                console.error("Renumber failed", err);
                alert("Failed to renumber position");
            }
        }
    };

    if (!rawInstruments) return <div className="p-4 text-[#666]">Loading...</div>;

    const isActive = (id) => location.pathname === `/app/instrument/${id}`;
    const allSelected = filteredInstruments.length > 0 && selectedIds.size === filteredInstruments.length;
    const isIndeterminate = selectedIds.size > 0 && selectedIds.size < filteredInstruments.length;

    const activeFilterCount = Object.keys(filters).reduce((acc, key) => {
        if (key === 'type' || key === 'position' || key === 'color' || key === 'gobo') {
            return acc + (filters[key] !== 'All' ? 1 : 0);
        }
        if (typeof filters[key] === 'boolean') {
            return acc + (filters[key] ? 1 : 0);
        }
        if (key === 'searchQuery') {
            return acc + (filters[key] ? 1 : 0);
        }
        return acc;
    }, 0);

    // Calculate Grid Template based on visible columns (using pixel widths)
    const visibleCols = dynamicColumns.filter(c => visibleColumns.has(c.id));
    const gridTemplateCols = [
        "40px", // Checkbox
        ...visibleCols.map(c => `${columnWidths[c.id]}px`)
    ].join(' ');

    const totalWidth = 40 + visibleCols.reduce((sum, c) => sum + (columnWidths[c.id] || 0), 0);

    return (
        <div className="flex flex-col h-full relative bg-[var(--bg-app)]">
            {/* Toolbar - (Lines 415-499 maintained) */}
            <div className="h-14 border-b border-[var(--border-subtle)] flex items-center px-6 bg-[var(--bg-app)] justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Instrument Schedule</h1>
                </div>
                <div className="flex gap-3 items-center">
                    {/* Gear Menu for Columns */}
                    <div className="relative">
                        <button
                            className={classNames("p-2 rounded-md transition-all border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]", {
                                "bg-[var(--bg-hover)] text-[var(--text-primary)]": isColumnConfigOpen
                            })}
                            onClick={() => setIsColumnConfigOpen(!isColumnConfigOpen)}
                            title="Configure Columns"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                        {isColumnConfigOpen && (
                            <div className="absolute top-10 right-0 w-56 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-md shadow-2xl z-50 p-3">
                                <h3 className="text-xs font-bold uppercase text-[var(--text-secondary)] mb-2 px-1">Visible Columns</h3>
                                <div className="space-y-1">
                                    {dynamicColumns.map(col => (
                                        <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--bg-hover)] cursor-pointer text-sm">
                                            <input
                                                type="checkbox"
                                                checked={visibleColumns.has(col.id)}
                                                onChange={() => toggleColumnVisibility(col.id)}
                                                className="rounded border-[var(--border-default)] bg-[var(--bg-app)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] focus:ring-offset-0"
                                            />
                                            <span className="text-[var(--text-primary)]">{col.label}</span>
                                        </label>
                                    ))}
                                </div>
                                <div className="mt-3 pt-2 border-t border-[var(--border-subtle)]">
                                    <button
                                        className="w-full text-xs text-[var(--accent-primary)] hover:text-[var(--accent-hover)] font-medium"
                                        onClick={() => setVisibleColumns(new Set(dynamicColumns.map(c => c.id)))}
                                    >
                                        Reset to Default
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="h-6 w-px bg-[var(--border-subtle)] mx-1"></div>

                    <button className="primary text-xs shadow-lg shadow-indigo-500/20" onClick={() => navigate('/app/instrument/new')}>Add Instrument</button>

                    {/* Detail Open Button - Only when Collapsed */}
                    {onToggleDetail && isCollapsed && (
                        <button
                            className="p-2 rounded-md transition-all border hidden md:flex ml-2 bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)]"
                            onClick={onToggleDetail}
                            title="Show Details"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                    )}
                </div>
            </div>
            {/* Virtual List */}
            <div ref={parentRef} className="flex-1 overflow-auto relative select-none w-full">
                <table
                    style={{
                        width: `${totalWidth}px`,
                        tableLayout: 'fixed',
                        borderCollapse: 'collapse'
                    }}
                >
                    <thead className="sticky top-0 z-20 bg-[var(--bg-panel)] h-10 shadow-sm">
                        <tr className="h-10 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-left border-b border-[var(--border-subtle)]">
                            {/* Checkbox Header */}
                            <th
                                style={{ width: '40px' }}
                                className="p-0 border-r border-[var(--border-subtle)] bg-[var(--bg-panel)]"
                            >
                                <div className="h-full flex justify-center items-center">
                                    <IndeterminateCheckbox
                                        checked={allSelected}
                                        indeterminate={isIndeterminate}
                                        onChange={handleSelectAll}
                                    />
                                </div>
                            </th>

                            {/* Data Headers */}
                            {visibleCols.map(col => (
                                <th
                                    key={col.id}
                                    style={{ width: `${columnWidths[col.id]}px` }}
                                    className="p-0 border-r border-[var(--border-subtle)] relative group bg-[var(--bg-panel)] font-normal"
                                >
                                    <div
                                        className="flex items-center h-full px-3 cursor-pointer hover:text-[var(--text-primary)] transition-colors overflow-hidden whitespace-nowrap"
                                        onClick={() => handleSort(col.id)}
                                    >
                                        <span className="font-semibold">{col.label}</span>
                                        <SortIcon field={col.id} currentSort={sortField} direction={sortDirection} />
                                    </div>

                                    {/* Resize Handle */}
                                    <div
                                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--accent-primary)] z-30"
                                        onMouseDown={(e) => handleResizeStart(e, col.id)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {/* Top Spacer Row */}
                        {rowVirtualizer.getVirtualItems().length > 0 && rowVirtualizer.getVirtualItems()[0].start > 0 && (
                            <tr style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }}>
                                <td colSpan={visibleCols.length + 1} />
                            </tr>
                        )}

                        {/* Visible Rows */}
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const item = rowItems[virtualRow.index];

                            // Group Header
                            if (item.type === 'header') {
                                return (
                                    <tr
                                        key={virtualRow.key}
                                        data-index={virtualRow.index}
                                        ref={rowVirtualizer.measureElement}
                                        className="bg-[var(--bg-panel)]/50 border-b border-[var(--border-subtle)]"
                                    >
                                        <td className="border-r border-[var(--border-subtle)]"></td>
                                        <td
                                            colSpan={visibleCols.length}
                                            className={classNames("px-3 border-r border-[var(--border-subtle)] font-bold text-[var(--success)] h-8 lg:h-8", { "text-xs": isCompact })}
                                        >
                                            {item.value}
                                        </td>
                                    </tr>
                                );
                            }

                            // Spacer
                            if (item.type === 'spacer') {
                                return (
                                    <tr
                                        key={virtualRow.key}
                                        data-index={virtualRow.index}
                                        ref={rowVirtualizer.measureElement}
                                        className="bg-[var(--bg-app)] border-b border-[var(--border-subtle)]"
                                    >
                                        <td colSpan={visibleCols.length + 1} style={{ height: `${item.size}px` }}></td>
                                    </tr>
                                );
                            }

                            // Instrument Row
                            const inst = item.data;
                            const isAddrDuplicate = inst.address && inst.address !== '0:0' && inst.address !== '0' && addressCounts[inst.address] > 1;
                            const isChanDuplicate = inst.channel && channelCounts[String(inst.channel)] > 1;
                            const active = isActive(inst.id);
                            const selected = selectedIds && selectedIds.has(inst.id);
                            const isMultiPartGroup = multiPartChannels.has(inst.channel);
                            const isEven = virtualRow.index % 2 === 0;

                            return (
                                <tr
                                    key={virtualRow.key}
                                    data-index={virtualRow.index}
                                    ref={rowVirtualizer.measureElement}
                                    onClick={(e) => handleRowClick(e, inst)}
                                    onContextMenu={(e) => handleContextMenu(e, inst)}
                                    className={classNames(
                                        "cursor-pointer border-b border-[var(--border-subtle)] transition-colors group text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
                                        {
                                            "bg-[var(--accent-primary)]/20": selected,
                                            "bg-[var(--accent-primary)]/10": active && !selected,
                                            "bg-white/[0.02]": isEven && !selected && !active, // Zebra Stripe
                                            "h-9": isCompact,
                                            "h-12": !isCompact
                                        }
                                    )}
                                    style={{
                                        borderLeft: active && !selected ? '4px solid var(--accent-primary)' : '4px solid transparent'
                                    }}
                                >
                                    {/* Checkbox */}
                                    <td className="p-0 border-r border-[var(--border-subtle)] text-center relative w-[40px] max-w-[40px]">
                                        {/* Wrapper for absolute positioning or centering if needed, but td text-center works well */}
                                        <div className="flex justify-center items-center h-full w-full" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={!!selected}
                                                onChange={(e) => toggleSelection(inst.id, e)}
                                                className="cursor-pointer rounded border-gray-600 bg-[#2b2b30] checked:bg-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                                            />
                                        </div>
                                    </td>

                                    {/* Columns */}
                                    {visibleCols.map(col => {
                                        const cellClass = classNames("px-3 border-r border-[var(--border-subtle)] overflow-hidden whitespace-nowrap h-full relative", { "text-xs px-2": isCompact });
                                        const commonProps = {
                                            onClick: (e) => handleCellClick(e, inst, col.id)
                                        };

                                        if (col.id === 'channel') {
                                            const showAsPart = isMultiPartGroup && channelDisplayMode === 'parts';
                                            return (
                                                <td key={col.id} className={cellClass} {...commonProps}>
                                                    {showAsPart ? (
                                                        <span className="font-bold text-[var(--accent-primary)] text-xs tracking-wider">.{inst.part || 1}</span>
                                                    ) : (
                                                        <span className={classNames("font-bold font-mono", { "text-[var(--error)]": isChanDuplicate, "text-[var(--success)]": !isChanDuplicate })}>{inst.channel}</span>
                                                    )}
                                                </td>
                                            );
                                        }

                                        if (col.id === 'address') {
                                            return (
                                                <td key={col.id} className={classNames(cellClass, "font-mono", {
                                                    "text-[var(--error)] font-bold bg-red-500/10": isAddrDuplicate,
                                                    "text-yellow-500 font-bold bg-yellow-500/10": !inst.address || inst.address === '0:0' || inst.address === '0',
                                                })} {...commonProps}>
                                                    {formatAddress(inst.address, addressMode, showUniverse1)}
                                                </td>
                                            );
                                        }

                                        if (col.id === 'color') {
                                            return (
                                                <td key={col.id} className={classNames(cellClass, "group-hover:text-[var(--text-primary)]")} {...commonProps}>
                                                    <div className="flex items-center h-full gap-2">
                                                        <ColorSwatch color={inst.color} className="w-3 h-3 flex-none" rounded="rounded-sm" />
                                                        <span className="truncate">{inst.color}</span>
                                                    </div>
                                                </td>
                                            );
                                        }

                                        return (
                                            <td key={col.id} className={classNames(cellClass, "text-ellipsis")} {...commonProps}>
                                                {col.isCustom ? (inst.customFields ? inst.customFields[col.id] : '') : inst[col.id]}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}

                        {/* Bottom Spacer Row */}
                        {rowVirtualizer.getVirtualItems().length > 0 && (
                            <tr style={{ height: `${rowVirtualizer.getTotalSize() - rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end}px` }}>
                                <td colSpan={visibleCols.length + 1} />
                            </tr>
                        )}

                    </tbody>
                </table>
                {filteredInstruments.length === 0 && (
                    <div className="p-8 text-center text-[#666] absolute left-0 right-0 top-10">
                        No instruments found matching current filters.
                    </div>
                )}
            </div>

            {/* Footer info or Bulk Action */}
            {selectedIds && selectedIds.size > 0 ? (
                <div className="h-12 border-t border-[var(--accent-primary)] bg-[var(--bg-panel)] flex items-center px-4 justify-between shrink-0 z-20">
                    <div className="text-sm font-semibold text-[var(--accent-primary)]">
                        {selectedIds.size} selected
                    </div>
                    <div className="flex gap-2">
                        <button
                            className="text-xs px-3 py-1.5 rounded bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] transition-colors"
                            onClick={() => setSelectedIds(new Set())}
                        >
                            Clear
                        </button>
                        <button
                            className="text-xs px-3 py-1.5 rounded bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] transition-colors"
                            onClick={handleDuplicate}
                        >
                            Duplicate
                        </button>
                        <button
                            className="text-xs px-3 py-1.5 rounded bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] font-semibold shadow-lg shadow-indigo-500/20"
                            onClick={() => setIsBatchEditOpen(true)}
                        >
                            Edit ({selectedIds.size})
                        </button>
                    </div>
                </div>
            ) : (
                <div className="h-8 border-t border-[var(--border-subtle)] bg-[var(--bg-panel)] flex items-center px-4 text-xs text-[var(--text-secondary)] shrink-0 z-20">
                    Showing {filteredInstruments.length} of {rawInstruments.length} Instruments
                </div>
            )}

            {/* Modals */}
            {isFilterOpen && (
                <FilterModal
                    onClose={() => setIsFilterOpen(false)}
                    filters={filters}
                    setFilters={setFilters}
                    types={types}
                    positions={positions}
                    colors={colors}
                    gobos={gobos}
                />
            )}

            {isBatchEditOpen && (
                <BulkEditPanel
                    selectedCount={selectedIds.size}
                    onUpdate={handleBulkSave}
                    onClose={() => setIsBatchEditOpen(false)}
                />
            )}

            {/* Context Menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={() => setContextMenu(null)}
                    actions={[
                        {
                            label: 'Edit',
                            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
                            onClick: () => navigate(`/app/instrument/${contextMenu.instrument.id}`),
                            shortcut: 'Enter'
                        },
                        {
                            label: 'Duplicate',
                            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
                            onClick: () => selectedIds.size > 1 ? handleDuplicate() : handleDuplicateSingle(contextMenu.instrument)
                        },
                        { separator: true },
                        {
                            label: `Select All "${contextMenu.instrument.type || 'No Type'}"`,
                            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
                            onClick: () => handleSelectAllSameType(contextMenu.instrument.type),
                            disabled: !contextMenu.instrument.type
                        },
                        {
                            label: `Select All "${contextMenu.instrument.position || 'No Position'}"`,
                            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
                            onClick: () => handleSelectAllSamePosition(contextMenu.instrument.position),
                            disabled: !contextMenu.instrument.position
                        },
                        {
                            label: `Renumber "${contextMenu.instrument.position}"`,
                            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>,
                            onClick: () => handleRenumberPosition(contextMenu.instrument.position),
                            disabled: !contextMenu.instrument.position
                        },
                        { separator: true },
                        {
                            label: selectedIds.size > 1 ? `Delete ${selectedIds.size} Items` : 'Delete',
                            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
                            onClick: handleDeleteSelected,
                            danger: true,
                            shortcut: 'Del'
                        }
                    ]}
                />
            )}
        </div>
    );
}
