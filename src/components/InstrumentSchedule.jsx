import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useLocation } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { db, renumberPosition, ensureGenericFixture, deleteInstruments } from '../db';
import { useSettings } from '../hooks/useSettings';
import { formatAddress } from '../utils/addressFormatter';
import { FilterModal } from './FilterModal';
import { ContextMenu } from './ContextMenu';
import { CreateInstrumentModal } from './CreateInstrumentModal';
import { ColorSwatch } from './ColorSwatch';
import { useToast } from './Toast';
import { InstrumentCardList } from './InstrumentCardList';
import { FloatingActionButton } from './FloatingActionButton';
import classNames from 'classnames';
import { STORAGE_KEYS } from '../constants';

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
    { id: 'part', label: 'Part', width: 60 },
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

export function InstrumentSchedule({ isCollapsed, onToggleDetail }) {
    const navigate = useNavigate();
    const location = useLocation();
    const parentRef = useRef(null);
    const toast = useToast();

    // State
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [lastSelectedId, setLastSelectedId] = useState(null);
    const [isDeleteConfirmed, setIsDeleteConfirmed] = useState(false);
    const [deleteTimer, setDeleteTimer] = useState(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false); // Gear Menu State
    const [sortField, setSortField] = useState(() => localStorage.getItem(STORAGE_KEYS.INSTRUMENT_SCHEDULE_SORT_FIELD) || 'position');
    const [sortDirection, setSortDirection] = useState(() => localStorage.getItem(STORAGE_KEYS.INSTRUMENT_SCHEDULE_SORT_DIRECTION) || 'asc');
    const [pendingDelete, setPendingDelete] = useState(null); // null | { ids: number[] }
    const [pendingRenumber, setPendingRenumber] = useState(null); // null | { position, ids }
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Column Configuration State - Persisted
    const [visibleColumns, setVisibleColumns] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.INSTRUMENT_SCHEDULE_VISIBLE_COLUMNS);
        try {
            return saved ? new Set(JSON.parse(saved)) : new Set(COLUMN_DEFS.map(c => c.id));
        } catch (e) {
            console.warn('Failed to parse instrumentSchedule_visibleColumns', e);
            return new Set(COLUMN_DEFS.map(c => c.id));
        }
    });

    const [columnWidths, setColumnWidths] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.INSTRUMENT_SCHEDULE_COLUMN_WIDTHS);
        const defaults = COLUMN_DEFS.reduce((acc, col) => ({ ...acc, [col.id]: col.width }), {});
        try {
            return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
        } catch (e) {
            console.warn('Failed to parse instrumentSchedule_columnWidths', e);
            return defaults;
        }
    });

    const [filters, setFilters] = useState({
        type: 'All',
        position: 'All',
        color: 'All',
        gobo: 'All',
        missingAddress: false,
        missingChannel: false,
        duplicates: false,
        incompleteOnly: false,
        searchQuery: ''
    });

    const [editingCell, setEditingCell] = useState(null); // { id, field, value }
    const [activeCell, setActiveCell] = useState(null); // { id, field }
    const [shiftAnchorId, setShiftAnchorId] = useState(null); // Anchor for keyboard shift-range selection
    const clickTimeoutRef = useRef(null);
    const dragBaseSelectionRef = useRef(new Set());
    const [isDraggingSelection, setIsDraggingSelection] = useState(false);
    const [dragStartIndex, setDragStartIndex] = useState(null);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState(null); // { x, y, instrument }

    // Interface Settings
    const { isCompact, addressMode, showUniverse1, channelDisplayMode, universeSeparator, mobileRefresh } = useSettings();

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Global ESC key handler
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if (e.key === 'Escape') {
                // Do not intercept if user is typing in an input/textarea
                if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

                if (location.pathname.includes('/instrument')) {
                    // Close detail panel
                    navigate('/app', { replace: true });
                } else if (selectedIds.size > 0) {
                    // Deselect all
                    setSelectedIds(new Set());
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [location.pathname, selectedIds.size, navigate]);

    const isMobileRefresh = isMobile && mobileRefresh;

    // Persist Visible Columns and Widths
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.INSTRUMENT_SCHEDULE_VISIBLE_COLUMNS, JSON.stringify([...visibleColumns]));
    }, [visibleColumns]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.INSTRUMENT_SCHEDULE_COLUMN_WIDTHS, JSON.stringify(columnWidths));
    }, [columnWidths]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.INSTRUMENT_SCHEDULE_SORT_FIELD, sortField);
        localStorage.setItem(STORAGE_KEYS.INSTRUMENT_SCHEDULE_SORT_DIRECTION, sortDirection);
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

        if (filters.incompleteOnly) {
            result = result.filter(i => {
                const isAddressEmpty = !i.address || i.address === '0:0' || i.address === '0';
                return !i.channel || isAddressEmpty || !i.type || !i.position || !i.purpose;
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
                (i.unit && String(i.unit).toLowerCase().includes(q)) ||
                (i.color && i.color.toLowerCase().includes(q)) ||
                (i.gobo && i.gobo.toLowerCase().includes(q))
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

                // Ensure blank values are always at the bottom, regardless of sort direction
                const isEmptyA = valA === undefined || valA === null || valA === '';
                const isEmptyB = valB === undefined || valB === null || valB === '';

                if (isEmptyA && !isEmptyB) return 1;
                if (!isEmptyA && isEmptyB) return -1;
                if (isEmptyA && isEmptyB) return 0;

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
    }, [rawInstruments, filters, sortField, sortDirection, addressCounts, channelCounts, dynamicColumns]);

    // Flatten data for Virtualizer
    const rowItems = useMemo(() => {
        const items = [];
        let groupMaster = null;

        filteredInstruments.forEach((inst, index) => {
            // Identify Group Master
            if (!groupMaster || groupMaster.channel !== inst.channel) {
                groupMaster = inst;
            }

            const prev = index > 0 ? filteredInstruments[index - 1] : null;

            // Determine if this is the first item in the group
            const isGroupStart = !prev || prev.channel !== inst.channel;

            const isMultiPartGroup = multiPartChannels.has(inst.channel);
            const isPart = inst.part > 1;

            // EOS-style: Header Row for Standard Parts (Duplicates)
            if (isGroupStart && isMultiPartGroup && (channelDisplayMode === 'parts' || channelDisplayMode === 'dots')) {
                items.push({ type: 'header', value: inst.channel, id: `header-${inst.channel}-${index}` });
            }

            if (sortField === 'position' && (!prev || prev.position !== inst.position) && !isMultiPartGroup) {
                items.push({ type: 'spacer', id: `spacer-${index}` });
            }

            // OPTIMIZATION: Pre-calculate address display values
            let formattedAddress = '';
            let addressRange = null;

            if (inst.address) {
                // Ensure we handle invalid/empty addresses gracefully
                if (inst.address !== '0:0' && inst.address !== '0') {
                    formattedAddress = formatAddress(inst.address, addressMode, showUniverse1, universeSeparator);

                    const footprint = parseInt(inst.dmxFootprint) || 1;
                    if (footprint > 1) {
                        const rawAddr = String(inst.address);
                        const isUniv = /[:/]/.test(rawAddr);

                        if (isUniv) {
                            const parts = rawAddr.split(/[:/]/);
                            const univ = parts[0];
                            const start = parseInt(parts[1]);
                            const end = start + footprint - 1;
                            addressRange = `${univ}${universeSeparator}${start} – ${univ}${universeSeparator}${end}`;
                        } else {
                            const start = parseInt(rawAddr);
                            if (!isNaN(start)) {
                                addressRange = `${start} – ${start + footprint - 1}`;
                            }
                        }
                    }
                } else {
                    // Start rendering 0:0/0 just like before (yellow warning style handling remains in render)
                    formattedAddress = inst.address;
                }
            }

            items.push({
                type: 'instrument',
                data: inst,
                id: inst.id,
                isPart,
                isMultiPartGroup,
                isGroupStart,
                formattedAddress,
                addressRange
            });
        });
        return items;
    }, [filteredInstruments, sortField, multiPartChannels, channelDisplayMode, addressMode, showUniverse1, universeSeparator]);

    const rowVirtualizer = useVirtualizer({
        count: rowItems.length,
        getScrollElement: () => parentRef.current,
        scrollPaddingStart: 40, // Offset for the h-10 (40px) sticky thead
        scrollPaddingEnd: 40, // Offset to prevent the horizontal scrollbar from obscuring the active row
        estimateSize: (i) => {
            const item = rowItems[i];
            // Estimate size
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

    const handleSelectAll = () => {
        if (selectedIds.size > 0) {
            setSelectedIds(new Set());
        } else {
            const allIds = new Set(filteredInstruments.map(i => i.id));
            setSelectedIds(allIds);
        }
    };

    useEffect(() => {
        const handleMouseUp = () => {
            setIsDraggingSelection(false);
            setDragStartIndex(null);
        };
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, []);

    // Auto-navigate to bulk edit when multiple items are selected
    useEffect(() => {
        if (location.pathname.startsWith('/app/instrument/new')) return;

        if (selectedIds.size > 1) {
            // Check if we are already in bulk edit with the exact same ids to prevent loops
            const currentIds = location.state?.ids || [];
            const isSameIds = currentIds.length === selectedIds.size && currentIds.every(id => selectedIds.has(id));
            
            if (!location.pathname.includes('/app/instrument/bulk') || !isSameIds) {
                navigate('/app/instrument/bulk', { state: { ids: [...selectedIds], preventFocus: true }, replace: true });
            }
        } else if (selectedIds.size === 1) {
            const [id] = Array.from(selectedIds);
            if (!location.pathname.includes(`/app/instrument/${id}`)) {
                navigate(`/app/instrument/${id}`, { state: { preventFocus: true }, replace: true });
            }
        } else if (selectedIds.size === 0) {
            // If they deselect everything, clear the details pane by going to /app
            if (location.pathname.includes('/app/instrument/')) {
                navigate('/app', { replace: true });
            }
        }
    }, [selectedIds, location.pathname, location.state?.ids, navigate]);

    const toggleSelection = (id, e) => {
        e?.stopPropagation();

        const clickedIndex = filteredInstruments.findIndex(i => i.id === id);

        // Handle Shift+Click (Range)
        if (e?.shiftKey && clickedIndex !== -1) {
            let anchorIndex = -1;

            // 1. Try lastSelectedId
            if (lastSelectedId) {
                anchorIndex = filteredInstruments.findIndex(i => i.id === lastSelectedId);
            }

            // 2. Fallback: Find closest selected item (Smart Anchor)
            if (anchorIndex === -1 && selectedIds.size > 0) {
                let firstIdx = -1;
                let lastIdx = -1;

                // Scan current list for extremities of selection
                filteredInstruments.forEach((inst, idx) => {
                    if (selectedIds.has(inst.id)) {
                        if (firstIdx === -1) firstIdx = idx;
                        lastIdx = idx;
                    }
                });

                if (firstIdx !== -1) {
                    if (clickedIndex < firstIdx) anchorIndex = firstIdx; // Expand Up
                    else if (clickedIndex > lastIdx) anchorIndex = lastIdx; // Expand Down
                    else anchorIndex = firstIdx; // Default if inside
                }
            }

            if (anchorIndex !== -1) {
                const start = Math.min(anchorIndex, clickedIndex);
                const end = Math.max(anchorIndex, clickedIndex);

                const newSelected = new Set(selectedIds);
                for (let i = start; i <= end; i++) {
                    newSelected.add(filteredInstruments[i].id);
                }
                setSelectedIds(newSelected);
                return;
            }
        }

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

            if (e.ctrlKey || e.metaKey || e.shiftKey) {
                toggleSelection(inst.id, e);
                return;
            }

            setSelectedIds(new Set()); // Clear selection on single edit
            navigate(`/app/instrument/${inst.id}`);
        } catch (err) {
            console.error("Row click error:", err);
        }
    };

    const handleCellClick = (e, inst, field) => {
        // Set active cell and focus the table
        setActiveCell({ id: inst.id, field });
        if (parentRef.current && document.activeElement !== parentRef.current) {
            parentRef.current.focus();
        }

        // Clear any existing timeout to prevent single-click navigation on double-click
        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
            return;
        }

        // 1. Modifiers -> Selection (Immediate - handled on onMouseDown already)
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
            e.stopPropagation();
            return;
        }

        e.stopPropagation();

        // Delay navigation to allow double-click to cancel it
        clickTimeoutRef.current = setTimeout(() => {
            clickTimeoutRef.current = null;

            // 2. Bulk Edit Mode
            if (selectedIds.size > 1 && selectedIds.has(inst.id)) {
                navigate('/app/instrument/bulk', {
                    state: {
                        ids: [...selectedIds],
                        focusField: field,
                        preventFocus: false
                    },
                    replace: true
                });
                return;
            }

            // 3. Single Edit Mode
            // Clear selection and select only this cell
            setSelectedIds(new Set([inst.id])); 
            setLastSelectedId(inst.id);
            navigate(`/app/instrument/${inst.id}`, { state: { focusField: field, preventFocus: false }, replace: true });
            
        }, 200); // 200ms is usually enough to detect a double click
    };

    const handleTableKeyDown = (e) => {
        if (editingCell) return;

        let currentInstId = activeCell?.id;
        let currentColId = activeCell?.field;

        // If no active cell, try to start from the last selected item or the very first item
        if (!currentInstId) {
            if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
            
            currentInstId = lastSelectedId || (filteredInstruments.length > 0 ? filteredInstruments[0].id : null);
            currentColId = visibleCols[0]?.id;
            
            if (!currentInstId || !currentColId) return;
            
            e.preventDefault();
            setActiveCell({ id: currentInstId, field: currentColId });
            
            if (!e.shiftKey) {
                setSelectedIds(new Set([currentInstId]));
                setLastSelectedId(currentInstId);
                navigate(`/app/instrument/${currentInstId}`, { state: { preventFocus: true } });
            }
            return;
        }

        // Prevent default scrolling for arrows
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
        } else if (e.key === 'Tab') {
            e.preventDefault();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const inst = filteredInstruments.find(i => i.id === currentInstId);
            const col = visibleCols.find(c => c.id === currentColId);
            if (inst && col) {
                const val = col.isCustom ? (inst.customFields ? inst.customFields[col.id] : '') : inst[col.id];
                setEditingCell({ id: inst.id, field: col.id, isCustom: !!col.isCustom, value: val || '' });
            }
            return;
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            if (selectedIds.size > 0) {
                handleDeleteSelected();
            }
            return;
        } else {
            return;
        }

        // Find current instrument index in filtered data
        const currentIndex = filteredInstruments.findIndex(i => i.id === currentInstId);
        if (currentIndex === -1) return;
        
        // Find current column index
        const colIndex = visibleCols.findIndex(c => c.id === currentColId);
        if (colIndex === -1) return;

        let nextInst = filteredInstruments[currentIndex];
        let nextCol = visibleCols[colIndex];
        let changed = false;

        if ((e.key === 'ArrowUp') && currentIndex > 0) {
            nextInst = filteredInstruments[currentIndex - 1];
            changed = true;
        } else if ((e.key === 'ArrowDown') && currentIndex < filteredInstruments.length - 1) {
            nextInst = filteredInstruments[currentIndex + 1];
            changed = true;
        } else if ((e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) && colIndex > 0) {
            nextCol = visibleCols[colIndex - 1];
            // Reset shift anchor on column moves — row shift-select starts fresh
            setShiftAnchorId(null);
            changed = true;
        } else if ((e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) && colIndex < visibleCols.length - 1) {
            nextCol = visibleCols[colIndex + 1];
            // Reset shift anchor on column moves
            setShiftAnchorId(null);
            changed = true;
        }

        if (changed) {
            setActiveCell({ id: nextInst.id, field: nextCol.id });
            
            // Scroll into view - use requestAnimationFrame to defer until after React state batching & router navigation
            const rowItemIndex = rowItems.findIndex(r => r.type === 'instrument' && r.data.id === nextInst.id);
            if (rowItemIndex !== -1) {
                requestAnimationFrame(() => {
                    rowVirtualizer.scrollToIndex(rowItemIndex, { align: 'auto' });
                });
            }
            
            // Update selection and navigate
            if (!e.shiftKey) {
                // Clear shift anchor on non-shift moves
                setShiftAnchorId(null);
                setSelectedIds(new Set([nextInst.id]));
                setLastSelectedId(nextInst.id);
                navigate(`/app/instrument/${nextInst.id}`, { state: { preventFocus: true } });
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                // Anchor-based range: establish anchor on first shift-move
                const anchor = shiftAnchorId || currentInstId;
                if (!shiftAnchorId) setShiftAnchorId(currentInstId);

                const anchorIndex = filteredInstruments.findIndex(i => i.id === anchor);
                const nextIndex = filteredInstruments.findIndex(i => i.id === nextInst.id);

                if (anchorIndex !== -1 && nextIndex !== -1) {
                    const rangeStart = Math.min(anchorIndex, nextIndex);
                    const rangeEnd = Math.max(anchorIndex, nextIndex);

                    // Select exactly the range from anchor to next, deselecting anything outside
                    const newSelected = new Set();
                    for (let i = rangeStart; i <= rangeEnd; i++) {
                        newSelected.add(filteredInstruments[i].id);
                    }
                    setSelectedIds(newSelected);
                    setLastSelectedId(nextInst.id);
                }
            }
        }
    };

    const handleDuplicate = async () => {
        if (selectedIds.size === 0) return;
        try {
            const selectedInstruments = await db.instruments.where('id').anyOf([...selectedIds]).toArray();
            const newInstruments = selectedInstruments.map(inst => {
                const { id: _id, ...rest } = inst;
                return { ...rest };
            });
            await db.instruments.bulkAdd(newInstruments);
            setSelectedIds(new Set());
        } catch (err) {
            console.error('Duplicate failed', err);
            toast.error('Failed to duplicate instruments');
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
        
        // If coming from context menu or shortcut, we still need a safe way to confirm.
        // But for the footer button, we use the local confirmed state.
        if (isDeleteConfirmed) {
            handleDeleteConfirmed();
        } else {
            setIsDeleteConfirmed(true);
            if (deleteTimer) clearTimeout(deleteTimer);
            const timer = setTimeout(() => setIsDeleteConfirmed(false), 4000);
            setDeleteTimer(timer);
        }
        setContextMenu(null);
    };

    const handleDeleteConfirmed = async () => {
        const ids = selectedIds.size > 0 ? [...selectedIds] : (pendingDelete?.ids || []);
        if (deleteTimer) clearTimeout(deleteTimer);
        setPendingDelete(null);
        setIsDeleteConfirmed(false);
        if (ids.length === 0) return;
        try {
            await deleteInstruments(ids);
            setSelectedIds(new Set());
        } catch (err) {
            console.error('Delete failed', err);
            toast.error('Failed to delete instruments');
        }
    };

    const handleDuplicateSingle = async (inst) => {
        try {
            const { id: _id, ...rest } = inst;
            await db.instruments.add({ ...rest });
        } catch (err) {
            console.error('Duplicate failed', err);
            toast.error('Failed to duplicate instrument');
        }
    };

    const handleCombineIntoParts = async () => {
        let ids = selectedIds.size > 0 ? [...selectedIds] : [];
        if (ids.length <= 1 && contextMenu?.instrument) {
            const channel = contextMenu.instrument.channel;
            if (channel) {
                const sameChannelInsts = await db.instruments.where('channel').equals(String(channel)).toArray();
                ids = sameChannelInsts.map(i => i.id);
            }
        }

        if (ids.length <= 1) {
            toast.error("Please select 2 or more instruments to combine them into parts.");
            return;
        }

        const selectedInsts = await db.instruments.where('id').anyOf(ids).toArray();
        
        // Find most common channel or first channel as default
        const channels = selectedInsts.map(i => i.channel).filter(Boolean);
        const defaultChannel = channels[0] || '';

        const targetChannel = prompt("Enter the channel number to combine these instruments under:", defaultChannel);
        if (targetChannel === null) return; // Cancelled
        
        const chanNum = targetChannel.trim();
        if (!chanNum) {
            toast.error("Channel number cannot be empty.");
            return;
        }

        // Sort instruments by position and unit to have a logical order for parts
        selectedInsts.sort((a, b) => {
            const posA = a.position || '';
            const posB = b.position || '';
            const cmpPos = posA.localeCompare(posB, undefined, { numeric: true });
            if (cmpPos !== 0) return cmpPos;
            const unitA = a.unit || '';
            const unitB = b.unit || '';
            return unitA.localeCompare(unitB, undefined, { numeric: true });
        });

        try {
            await db.transaction('rw', db.instruments, async () => {
                for (let i = 0; i < selectedInsts.length; i++) {
                    const inst = selectedInsts[i];
                    await db.instruments.update(inst.id, {
                        channel: chanNum,
                        part: i + 1
                    });
                }
            });
            toast.success(`Combined ${selectedInsts.length} instruments under Channel ${chanNum} with parts.`);
        } catch (err) {
            console.error('Combine failed', err);
            toast.error('Failed to combine instruments');
        }

        setContextMenu(null);
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
        const positionInstruments = filteredInstruments.filter(i => i.position === position);
        if (positionInstruments.length === 0) return;
        // Store for inline confirm
        setPendingRenumber({ position, ids: positionInstruments.map(i => i.id) });
    };

    const handleRenumberConfirmed = async () => {
        if (!pendingRenumber) return;
        const { position, ids } = pendingRenumber;
        setPendingRenumber(null);
        try {
            await renumberPosition(position, ids);
        } catch (err) {
            console.error('Renumber failed', err);
            toast.error('Failed to renumber position');
        }
    };

    const handleInlineSave = async (id, isCustom, field, value) => {
        try {
            if (isCustom) {
                const inst = await db.instruments.get(id);
                const updates = { 
                    customFields: { 
                        ...(inst.customFields || {}), 
                        [field]: value 
                    } 
                };
                await db.instruments.update(id, updates);
            } else {
                let parsedValue = value;
                if (field === 'part') {
                    parsedValue = value ? (parseInt(value, 10) || '') : '';
                }
                const updates = { [field]: parsedValue };
                if (field === 'type' && value) {
                    const fixtureTypeId = await ensureGenericFixture(value);
                    if (fixtureTypeId) updates.fixtureTypeId = fixtureTypeId;
                }
                await db.instruments.update(id, updates);
            }
            setEditingCell(prev => {
                if (prev && prev.id === id && prev.field === field) return null;
                return prev;
            });
        } catch (err) {
            console.error('Inline save failed', err);
            toast.error('Failed to save change');
        }
    };

    const handleInlineKeyDown = (e, id, isCustom, field, value) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            e.stopPropagation();
            
            // Start the save process for the current cell
            handleInlineSave(id, isCustom, field, value);

            const currentRowIndex = filteredInstruments.findIndex(i => i.id === id);
            const currentColIndex = visibleCols.findIndex(c => c.id === field);
            
            if (currentRowIndex === -1 || currentColIndex === -1) return;

            let nextRowIndex = currentRowIndex;
            let nextColIndex = currentColIndex;

            if (e.key === 'Enter') {
                if (e.shiftKey) {
                    nextRowIndex = Math.max(0, currentRowIndex - 1);
                } else {
                    nextRowIndex = Math.min(filteredInstruments.length - 1, currentRowIndex + 1);
                }
            } else if (e.key === 'Tab') {
                if (e.shiftKey) {
                    nextColIndex = Math.max(0, currentColIndex - 1);
                } else {
                    nextColIndex = Math.min(visibleCols.length - 1, currentColIndex + 1);
                }
            }

            // If we actually moved
            if (nextRowIndex !== currentRowIndex || nextColIndex !== currentColIndex) {
                const nextInst = filteredInstruments[nextRowIndex];
                const nextCol = visibleCols[nextColIndex];
                
                setActiveCell({ id: nextInst.id, field: nextCol.id });
                
                // Only change row selection if we moved rows
                if (nextRowIndex !== currentRowIndex) {
                    setSelectedIds(new Set([nextInst.id]));
                    setLastSelectedId(nextInst.id);
                    setShiftAnchorId(null);
                    // Update URL to match selection
                    navigate(`/app/instrument/${nextInst.id}`, { state: { preventFocus: true }, replace: true });
                }
                
                // Immediately enter edit mode for the target cell
                const val = nextCol.isCustom ? (nextInst.customFields ? nextInst.customFields[nextCol.id] : '') : nextInst[nextCol.id];
                setEditingCell({ id: nextInst.id, field: nextCol.id, isCustom: !!nextCol.isCustom, value: val || '' });

                // Scroll the new row into view if we moved rows
                if (nextRowIndex !== currentRowIndex) {
                    const rowItemIndex = rowItems.findIndex(r => r.type === 'instrument' && r.data.id === nextInst.id);
                    if (rowItemIndex !== -1) {
                        requestAnimationFrame(() => {
                            rowVirtualizer.scrollToIndex(rowItemIndex, { align: 'auto' });
                        });
                    }
                }
            } else {
                // Return focus to table container if we can't move any further in that direction
                setTimeout(() => {
                    if (parentRef.current) parentRef.current.focus();
                }, 0);
            }
        } else if (e.key === 'Escape') {
            setEditingCell(null);
            // Return focus to the table so arrow navigation resumes immediately
            setTimeout(() => {
                if (parentRef.current) parentRef.current.focus();
            }, 0);
        }
    };

    if (!rawInstruments) return <div className="p-4 text-[#666]">Loading...</div>;

    const isActive = (id) => location.pathname === `/app/instrument/${id}`;
    const allSelected = filteredInstruments.length > 0 && selectedIds.size === filteredInstruments.length;
    const isIndeterminate = selectedIds.size > 0 && selectedIds.size < filteredInstruments.length;

    const visibleCols = dynamicColumns.filter(c => visibleColumns.has(c.id));
    const totalWidth = 40 + visibleCols.reduce((sum, c) => sum + (columnWidths[c.id] || 0), 0);

    return (
        <div className="flex flex-col h-full relative bg-[var(--bg-app)] min-h-0">
            {/* Inline Renumber Confirmation */}
            {pendingRenumber && (
                <div className="bg-amber-900/30 border-b border-amber-500/40 px-6 py-3 flex items-center justify-between shrink-0 z-10">
                    <span className="text-sm text-amber-300 font-medium">
                        Renumber {pendingRenumber.ids.length} units in &ldquo;{pendingRenumber.position}&rdquo; 1–{pendingRenumber.ids.length} based on current sort?
                    </span>
                    <div className="flex gap-2">
                        <button onClick={() => setPendingRenumber(null)} className="px-3 py-1 text-xs border border-[var(--border-subtle)] rounded text-[var(--text-secondary)] hover:text-white transition-colors">Cancel</button>
                        <button onClick={handleRenumberConfirmed} className="px-3 py-1 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded font-semibold transition-colors">Renumber</button>
                    </div>
                </div>
            )}
            {/* FAB - Only on Mobile Refresh - Move to top for best z-index coverage */}
            {isMobileRefresh && <FloatingActionButton />}
            
            {/* Toolbar */}
            <div className="h-14 border-b border-[var(--border-subtle)] flex items-center px-6 bg-[var(--bg-app)] justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Instrument Schedule</h1>
                </div>
                <div className="flex gap-3 items-center">
                    {/* Search Bar - Desktop */}
                    {!isMobileRefresh && (
                        <div className="relative mr-2 flex items-center">
                            <div className="absolute left-3 flex items-center justify-center pointer-events-none text-[var(--text-tertiary)]">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Search criteria..."
                                value={filters.searchQuery}
                                onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                                style={{ paddingLeft: '32px' }}
                                className="w-48 pr-3 py-1.5 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] outline-none transition-all placeholder-[var(--text-tertiary)]"
                            />
                        </div>
                    )}
                    {/* Gear Menu for Columns - Hide on mobile refresh */}
                    {!isMobileRefresh && (
                        <div className="relative">
                            <button
                                className={classNames("p-2 rounded-md transition-all border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]", {
                                    "bg-[var(--bg-hover)] text-[var(--text-primary)]": isColumnConfigOpen
                                })}
                                onClick={() => setIsColumnConfigOpen(!isColumnConfigOpen)}
                                title="Configure Columns"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4v16m6-16v16" />
                                    <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth={2} />
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
                    )}
                    <div className={classNames("h-6 w-px bg-[var(--border-subtle)] mx-1", { "hidden": isMobileRefresh })}></div>

                    <button className={classNames("primary text-xs shadow-lg shadow-indigo-500/20", { "hidden": isMobileRefresh })} onClick={() => setShowCreateModal(true)}>Add Instrument</button>

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
            
            {/* Conditional Sub-header for Mobile Search/Filter */}
            {isMobileRefresh && (
                <div className="px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-app)] flex items-center gap-2">
                    <div className="relative flex-1 flex items-center">
                        <div className="absolute left-3 flex items-center justify-center pointer-events-none text-[var(--text-tertiary)]">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search instruments..."
                            value={filters.searchQuery}
                            onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                            style={{ paddingLeft: '32px' }}
                            className="w-full pr-4 py-2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl text-sm focus:border-[var(--accent-primary)] outline-none"
                        />
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div 
                id="instrument-schedule-container"
                ref={parentRef} 
                className="flex-1 overflow-auto relative select-none w-full outline-none"
                tabIndex={0}
                onKeyDown={handleTableKeyDown}
                onMouseDown={(e) => {
                    // Clear selection if clicking exactly the container or the table (but not rows/cells)
                    if (e.target === parentRef.current || e.target.tagName === 'TABLE' || e.target.tagName === 'TBODY') {
                        setSelectedIds(new Set());
                        setActiveCell(null);
                    }
                }}
            >
                {isMobileRefresh ? (
                    <InstrumentCardList
                        parentRef={parentRef}
                        instruments={filteredInstruments}
                        selectedIds={selectedIds}
                        onToggleSelection={toggleSelection}
                        onRowClick={handleRowClick}
                        onContextMenu={handleContextMenu}
                        addressMode={addressMode}
                        showUniverse1={showUniverse1}
                        universeSeparator={universeSeparator}
                        addressCounts={addressCounts}
                        channelCounts={channelCounts}
                    />
                ) : (
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
                            // Extract flags from item metadata
                            const isMultiPartGroup = item.isMultiPartGroup;
                            const isGroupStart = item.isGroupStart;

                            const isAddrDuplicate = inst.address && inst.address !== '0:0' && inst.address !== '0' && addressCounts[inst.address] > 1;
                            const isChanDuplicate = inst.channel && channelCounts[String(inst.channel)] > 1;
                            const active = isActive(inst.id);
                            const selected = selectedIds && selectedIds.has(inst.id);
                            const isEven = virtualRow.index % 2 === 0;

                            return (
                                <tr
                                    key={virtualRow.key}
                                    data-index={virtualRow.index}
                                    ref={rowVirtualizer.measureElement}
                                    onMouseDown={(e) => {
                                        if (e.button !== 0) return;
                                        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('.no-drag')) return;
                                        
                                        setIsDraggingSelection(true);
                                        setDragStartIndex(virtualRow.index);
                                        
                                        const hasModifiers = e.ctrlKey || e.metaKey || e.shiftKey;
                                        let initialSelection = new Set();
                                        if (!hasModifiers) {
                                            initialSelection = new Set([inst.id]);
                                            setSelectedIds(initialSelection);
                                            setLastSelectedId(inst.id);
                                        } else {
                                            if (e.shiftKey) {
                                                const clickedIndex = filteredInstruments.findIndex(i => i.id === inst.id);
                                                let anchorIndex = -1;
                                                if (lastSelectedId) {
                                                    anchorIndex = filteredInstruments.findIndex(i => i.id === lastSelectedId);
                                                }
                                                if (anchorIndex === -1 && selectedIds.size > 0) {
                                                    let firstIdx = -1;
                                                    let lastIdx = -1;
                                                    filteredInstruments.forEach((i, idx) => {
                                                        if (selectedIds.has(i.id)) {
                                                            if (firstIdx === -1) firstIdx = idx;
                                                            lastIdx = idx;
                                                        }
                                                    });
                                                    if (firstIdx !== -1) {
                                                        if (clickedIndex < firstIdx) anchorIndex = firstIdx;
                                                        else if (clickedIndex > lastIdx) anchorIndex = lastIdx;
                                                        else anchorIndex = firstIdx;
                                                    }
                                                }
                                                initialSelection = new Set(selectedIds);
                                                if (anchorIndex !== -1) {
                                                    const startRange = Math.min(anchorIndex, clickedIndex);
                                                    const endRange = Math.max(anchorIndex, clickedIndex);
                                                    for (let i = startRange; i <= endRange; i++) {
                                                        initialSelection.add(filteredInstruments[i].id);
                                                    }
                                                } else {
                                                    initialSelection.add(inst.id);
                                                    setLastSelectedId(inst.id);
                                                }
                                                setSelectedIds(initialSelection);
                                            } else {
                                                initialSelection = new Set(selectedIds);
                                                if (initialSelection.has(inst.id)) {
                                                    initialSelection.delete(inst.id);
                                                } else {
                                                    initialSelection.add(inst.id);
                                                    setLastSelectedId(inst.id);
                                                }
                                                setSelectedIds(initialSelection);
                                            }
                                        }
                                        dragBaseSelectionRef.current = initialSelection;
                                    }}
                                    onMouseEnter={() => {
                                        if (isDraggingSelection && dragStartIndex !== null) {
                                            const start = Math.min(dragStartIndex, virtualRow.index);
                                            const end = Math.max(dragStartIndex, virtualRow.index);
                                            const newSelection = new Set(dragBaseSelectionRef.current);
                                            
                                            for (let i = start; i <= end; i++) {
                                                const rowItem = rowItems[i];
                                                if (rowItem && rowItem.type === 'instrument') {
                                                    newSelection.add(rowItem.data.id);
                                                }
                                            }
                                            setSelectedIds(newSelection);
                                        }
                                    }}
                                    onMouseMove={() => {
                                        if (isDraggingSelection && clickTimeoutRef.current) {
                                            clearTimeout(clickTimeoutRef.current);
                                            clickTimeoutRef.current = null;
                                        }
                                    }}
                                    onContextMenu={(e) => handleContextMenu(e, inst)}
                                    className={classNames(
                                        "cursor-pointer border-b border-[var(--border-subtle)] transition-colors group text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
                                        {
                                            "bg-[var(--accent-primary)]/20": selected,
                                            "bg-[var(--accent-primary)]/10": active && !selected,
                                            "bg-white/[0.02]": isEven && !selected && !active,
                                            "h-9": isCompact,
                                            "h-12": !isCompact,
                                            "select-none": isDraggingSelection
                                        }
                                    )}
                                    style={{
                                        borderLeft: active && !selected ? '4px solid var(--accent-primary)' : '4px solid transparent'
                                    }}
                                >
                                    {/* Checkbox */}
                                    <td className="p-0 border-r border-[var(--border-subtle)] text-center relative w-[40px] max-w-[40px] no-drag">
                                        <div 
                                            className="flex justify-center items-center h-full w-full cursor-pointer no-drag"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSelection(inst.id, e);
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={!!selected}
                                                onChange={() => { }}
                                                className="pointer-events-none rounded border-gray-600 bg-[#2b2b30] checked:bg-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                                            />
                                        </div>
                                    </td>

                                    {/* Columns */}
                                    {visibleCols.map(col => {
                                        const isActive = activeCell && activeCell.id === inst.id && activeCell.field === col.id;
                                        const cellClass = classNames(
                                            "px-3 border-r border-[var(--border-subtle)] overflow-hidden whitespace-nowrap h-full relative outline-none",
                                            { 
                                                "text-xs px-2": isCompact,
                                                "ring-2 ring-inset ring-[var(--accent-primary)] bg-[var(--accent-primary)]/10 z-10": isActive
                                            }
                                        );
                                        const commonProps = {
                                            onClick: (e) => handleCellClick(e, inst, col.id),
                                            onDoubleClick: (e) => {
                                                e.stopPropagation();
                                                const val = col.isCustom ? (inst.customFields ? inst.customFields[col.id] : '') : inst[col.id];
                                                setEditingCell({ id: inst.id, field: col.id, isCustom: !!col.isCustom, value: val || '' });
                                            }
                                        };

                                        const renderCellContent = (originalContent) => {
                                            if (editingCell && editingCell.id === inst.id && editingCell.field === col.id) {
                                                return (
                                                    <input
                                                        autoFocus
                                                        className="absolute inset-0 w-full h-full px-2 bg-[var(--bg-card)] border-2 border-[var(--accent-primary)] outline-none text-[var(--text-primary)] z-30"
                                                        value={editingCell.value}
                                                        onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                                        onBlur={() => handleInlineSave(inst.id, editingCell.isCustom, col.id, editingCell.value)}
                                                        onKeyDown={(e) => handleInlineKeyDown(e, inst.id, editingCell.isCustom, col.id, editingCell.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                );
                                            }
                                            return originalContent;
                                        };

                                        if (col.id === 'channel') {
                                            // Show as part if it's in a standard duplicate group
                                            const isPartMode = channelDisplayMode === 'parts' || channelDisplayMode === 'dots';
                                            const showAsPart = isMultiPartGroup && isPartMode;

                                            // Hide duplicate channel if mode is 'hide' and it's not the first in group
                                            const shouldHide = channelDisplayMode === 'hide' && !isGroupStart && isMultiPartGroup;

                                            // Indentation styles for parts
                                            const partStyles = showAsPart ? {
                                                paddingLeft: '24px',
                                                position: 'relative'
                                            } : {};

                                            if (shouldHide) {
                                                return <td key={col.id} className={cellClass} {...commonProps}></td>;
                                            }

                                            return (
                                                <td key={col.id} className={cellClass} {...commonProps} style={partStyles}>
                                                    {renderCellContent(
                                                        <>
                                                            {showAsPart && (
                                                                <div className="absolute left-0 top-0 bottom-0 w-[12px] border-b-2 border-l-2 border-[var(--border-subtle)] rounded-bl-sm mb-[50%] ml-3 opacity-30 pointer-events-none"></div>
                                                            )}
                                                            <div className="flex items-center gap-1">
                                                                {showAsPart ? (
                                                                    <span className="font-bold text-[var(--accent-primary)] text-xs tracking-wider">
                                                                        {channelDisplayMode === 'dots' ? `.${inst.part}` : `P${inst.part || 1}`}
                                                                    </span>
                                                                ) : (
                                                                    <span className={classNames("font-bold font-mono", { "text-[var(--error)]": isChanDuplicate, "text-[var(--success)]": !isChanDuplicate })}>{inst.channel}</span>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </td>
                                            );
                                        }

                                        if (col.id === 'address') {
                                            const displayAddr = item.formattedAddress || '';
                                            const rangeStr = item.addressRange;

                                            return (
                                                <td key={col.id} className={classNames(cellClass, "font-mono", {
                                                    "text-[var(--error)] font-bold bg-red-500/10": isAddrDuplicate,
                                                    "text-yellow-500 font-bold bg-yellow-500/10": !inst.address || inst.address === '0:0' || inst.address === '0',
                                                })} {...commonProps}>
                                                    {renderCellContent(
                                                        <div className="flex flex-col justify-center h-full">
                                                            <div className="leading-tight">{displayAddr}</div>
                                                            {rangeStr && (
                                                                <div className="text-[9px] opacity-70 font-bold text-[var(--accent-primary)] leading-none mt-0.5">
                                                                    {rangeStr}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        }

                                        if (col.id === 'color') {
                                            return (
                                                <td key={col.id} className={classNames(cellClass, "group-hover:text-[var(--text-primary)]")} {...commonProps}>
                                                    {renderCellContent(
                                                        <div className="flex items-center h-full gap-2">
                                                            <ColorSwatch color={inst.color} className="w-3 h-3 flex-none" rounded="rounded-sm" />
                                                            <span className="truncate">{inst.color}</span>
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        }

                                        return (
                                            <td 
                                                key={col.id} 
                                                className={classNames(cellClass, "text-ellipsis")} 
                                                {...commonProps}
                                            >
                                                {renderCellContent(
                                                    col.isCustom ? (inst.customFields ? inst.customFields[col.id] : '') : inst[col.id]
                                                )}
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
                )}
                {!isMobileRefresh && filteredInstruments.length === 0 && (
                    <div className="p-8 text-center text-[#666] absolute left-0 right-0 top-10">
                        No instruments found matching current filters.
                    </div>
                )}
            </div>

            {/* Footer info or Bulk Action */}
            {selectedIds && selectedIds.size > 0 ? (
                <div className="h-12 border-t border-[var(--accent-primary)] bg-[var(--bg-panel)] flex items-center px-4 justify-between shrink-0 z-20">
                    <div className="flex items-center gap-3">
                        <div className="text-sm font-semibold text-[var(--accent-primary)]">
                            {selectedIds.size} selected
                        </div>
                        <button
                            className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                            onClick={() => setSelectedIds(new Set())}
                        >
                            Clear
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            className={`text-xs px-3 py-1.5 rounded transition-all duration-300 flex items-center gap-2 font-bold ${
                                !isDeleteConfirmed ? 'bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--error)] hover:border-[var(--error)] hover:bg-[var(--error)]/5' : ''
                            }`}
                            style={isDeleteConfirmed ? { backgroundColor: 'var(--error)', color: 'var(--accent-text)', boxShadow: '0 0 0 4px rgba(239, 68, 68, 0.2)' } : {}}
                            onClick={handleDeleteSelected}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isDeleteConfirmed ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                )}
                            </svg>
                            {isDeleteConfirmed ? `Delete ${selectedIds.size}` : 'Delete'}
                        </button>
                        <button
                            className="text-xs px-3 py-1.5 rounded bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2"
                            onClick={handleDuplicate}
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            Duplicate
                        </button>
                        {selectedIds.size > 1 && (
                            <button
                                className="text-xs px-3 py-1.5 rounded bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2 font-semibold"
                                onClick={handleCombineIntoParts}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                Combine into Parts
                            </button>
                        )}
                        <button
                            className="text-xs px-4 py-1.5 rounded bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] transition-colors shadow-lg shadow-indigo-500/20 font-bold flex items-center gap-2"
                            onClick={() => {
                                navigate('/app/instrument/bulk', { state: { ids: [...selectedIds] } });
                            }}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            Bulk Edit
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
                        {
                            label: 'Combine into Parts',
                            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
                            onClick: handleCombineIntoParts,
                            disabled: selectedIds.size <= 1 && (!contextMenu.instrument.channel || channelCounts[String(contextMenu.instrument.channel)] <= 1)
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

            {showCreateModal && (
                <CreateInstrumentModal 
                    onClose={() => setShowCreateModal(false)}
                    onCreated={(newIds) => {
                        setShowCreateModal(false);
                        if (newIds.length === 1) {
                            navigate(`/app/instrument/${newIds[0]}`);
                        } else if (newIds.length > 1) {
                            setSelectedIds(new Set(newIds));
                            setLastSelectedId(newIds[newIds.length - 1]);
                            navigate(`/app/instrument/${newIds[newIds.length - 1]}`, { state: { preventFocus: true } });
                        }
                    }}
                />
            )}
        </div>
    );
}
