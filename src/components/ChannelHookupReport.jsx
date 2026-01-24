import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ReportLayout } from './ReportLayout';
import { ConfigureColumnsButton, ConfigureColumnsHeader, DraggableColumnItem } from './ConfigureColumns';
import { useSettings } from '../hooks/useSettings';
import { formatAddress } from '../utils/addressFormatter';
import { getGelColor } from '../utils/gelData';

const AVAILABLE_COLUMNS = [
    { id: 'channel', label: 'Channel', width: 'w-16 text-right pr-4', locked: true },
    { id: 'address', label: 'Address', width: 'w-24' },
    { id: 'type', label: 'Type', width: 'flex-1' },
    { id: 'watt', label: 'Watt', width: 'w-12 text-right' },
    { id: 'purpose', label: 'Purpose', width: 'w-1/4 px-2' },
    { id: 'position', label: 'Position', width: 'w-1/6 px-2' },
    { id: 'color', label: 'Color', width: 'w-20' }
];

const DEFAULT_COLUMN_ORDER = AVAILABLE_COLUMNS.map(c => c.id);
const DEFAULT_VISIBLE_COLUMNS = AVAILABLE_COLUMNS.map(c => c.id);

export function ChannelHookupReport() {
    const [orientation, setOrientation] = useState('portrait');
    const [showColumnConfig, setShowColumnConfig] = useState(false);
    const [showSwatches, setShowSwatches] = useState(true);
    const { addressMode, showUniverse1 } = useSettings();

    // Column configuration state
    const [columnOrder, setColumnOrder] = useState(() => {
        const saved = localStorage.getItem('channelHookup_columnOrder');
        return saved ? JSON.parse(saved) : DEFAULT_COLUMN_ORDER;
    });

    const [visibleColumns, setVisibleColumns] = useState(() => {
        const saved = localStorage.getItem('channelHookup_visibleColumns');
        return saved ? new Set(JSON.parse(saved)) : new Set(DEFAULT_VISIBLE_COLUMNS);
    });

    const [draggedColumn, setDraggedColumn] = useState(null);

    // Persist to localStorage
    useEffect(() => {
        localStorage.setItem('channelHookup_columnOrder', JSON.stringify(columnOrder));
    }, [columnOrder]);

    useEffect(() => {
        localStorage.setItem('channelHookup_visibleColumns', JSON.stringify([...visibleColumns]));
    }, [visibleColumns]);

    const instruments = useLiveQuery(async () => {
        const all = await db.instruments.toArray();
        return all.sort((a, b) => {
            const chanA = parseFloat(a.channel) || 0;
            const chanB = parseFloat(b.channel) || 0;
            if (chanA !== chanB) return chanA - chanB;
            return (a.part || 1) - (b.part || 1);
        });
    });

    const processedData = useMemo(() => {
        if (!instruments) return [];

        let lastChannel = null;
        return instruments.map(inst => {
            const item = { ...inst };
            if (item.channel === lastChannel) {
                item.displayChannel = `.${item.part || 1}`;
                item.isSecondaryPart = true;
            } else {
                item.displayChannel = item.channel || '-';
                item.isSecondaryPart = false;
                lastChannel = item.channel;
            }
            return item;
        });
    }, [instruments]);

    const handleDragStart = (e, columnId) => {
        if (columnId === 'channel') return; // Channel is locked
        setDraggedColumn(columnId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, columnId) => {
        e.preventDefault();
        if (columnId === 'channel' || draggedColumn === columnId) return;
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetColumnId) => {
        e.preventDefault();
        if (!draggedColumn || targetColumnId === 'channel' || draggedColumn === targetColumnId) return;

        const newOrder = [...columnOrder];
        const draggedIndex = newOrder.indexOf(draggedColumn);
        const targetIndex = newOrder.indexOf(targetColumnId);

        // Don't allow moving before channel
        if (targetIndex === 0) return;

        newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedColumn);

        setColumnOrder(newOrder);
        setDraggedColumn(null);
    };

    const toggleColumnVisibility = (columnId) => {
        if (columnId === 'channel') return; // Channel cannot be hidden
        const newVisible = new Set(visibleColumns);
        if (newVisible.has(columnId)) {
            newVisible.delete(columnId);
        } else {
            newVisible.add(columnId);
        }
        setVisibleColumns(newVisible);
    };

    const resetColumns = () => {
        setColumnOrder(DEFAULT_COLUMN_ORDER);
        setVisibleColumns(new Set(DEFAULT_VISIBLE_COLUMNS));
    };

    const renderCellContent = (inst, columnId) => {
        const isNewChannel = !inst.isSecondaryPart;

        switch (columnId) {
            case 'channel':
                return (
                    <td className={`py-1 text-right pr-4 font-bold ${isNewChannel ? 'text-lg font-black' : 'text-sm text-gray-500'}`}>
                        {inst.displayChannel}
                    </td>
                );
            case 'address':
                return (
                    <td className="py-1 font-mono font-bold text-gray-800">
                        {formatAddress(inst.address, addressMode, showUniverse1)}
                    </td>
                );
            case 'type':
                return <td className="py-1 text-gray-700">{inst.type}</td>;
            case 'watt':
                return <td className="py-1 text-right font-mono text-[10px]">{inst.watt}</td>;
            case 'purpose':
                return <td className="py-1 px-2 italic text-gray-600">{inst.purpose}</td>;
            case 'position':
                return <td className="py-1 px-2 font-semibold">{inst.position}</td>;
            case 'color':
                return (
                    <td className="py-1 flex items-center gap-1.5">
                        {showSwatches && inst.color && (
                            <span className="w-2.5 h-2.5 rounded-full border border-gray-300 shrink-0" style={{ backgroundColor: getGelColor(inst.color) || 'transparent' }}></span>
                        )}
                        <span className="truncate">{inst.color}</span>
                    </td>
                );
            default:
                // Check for dynamic custom field
                const colDef = AVAILABLE_COLUMNS.find(c => c.id === columnId);
                if (colDef && colDef.isCustom) {
                    return <td className="py-1 px-2 text-gray-700 max-w-[150px] truncate">{inst.customFields ? inst.customFields[columnId] : ''}</td>;
                }
                // Fallback for generic property access if it matches an object key
                return <td className="py-1 px-2 text-gray-400">{inst[columnId] || ''}</td>;
        }
    };

    const visibleColumnOrder = columnOrder.filter(id => visibleColumns.has(id));

    const controls = (
        <div className="flex gap-4 items-center bg-gray-100 p-2 rounded text-xs text-black border border-gray-300">
            <div className="flex items-center gap-2 pr-4">
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

            <ConfigureColumnsButton
                isOpen={showColumnConfig}
                onToggle={() => setShowColumnConfig(!showColumnConfig)}
            >
                <ConfigureColumnsHeader onReset={resetColumns} />

                {/* Show Swatches Toggle */}
                <div className="mb-3 pb-3 border-b border-gray-200">
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                            type="checkbox"
                            checked={showSwatches}
                            onChange={(e) => setShowSwatches(e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-semibold text-gray-700">Show Color Swatches</span>
                    </label>
                </div>

                <p className="text-[10px] text-gray-500 mb-3">Drag to reorder • Uncheck to hide</p>
                <div className="space-y-1">
                    {columnOrder.map(columnId => {
                        const column = AVAILABLE_COLUMNS.find(c => c.id === columnId);
                        if (!column) return null;
                        return (
                            <DraggableColumnItem
                                key={columnId}
                                columnId={columnId}
                                label={column.label}
                                isVisible={visibleColumns.has(columnId)}
                                isDragging={draggedColumn === columnId}
                                isLocked={column.locked}
                                onToggle={() => toggleColumnVisibility(columnId)}
                                onDragStart={handleDragStart}
                                onDragOver={(e) => handleDragOver(e, columnId)}
                                onDrop={handleDrop}
                            />
                        );
                    })}
                </div>
            </ConfigureColumnsButton>
        </div>
    );

    if (!instruments) return <div className="p-8 text-gray-500">Loading Hookup Data...</div>;

    return (
        <ReportLayout title="Channel Hookup" controls={controls} orientation={orientation}>
            <div className="w-full overflow-visible">
                <table className="w-full text-left border-collapse border-b-2 border-black">
                    <thead>
                        <tr className="border-b-2 border-black text-[10px] uppercase font-bold tracking-wider">
                            {visibleColumnOrder.map(columnId => {
                                const column = AVAILABLE_COLUMNS.find(c => c.id === columnId);
                                if (!column) return null;
                                return (
                                    <th key={columnId} className={`py-2 ${column.width}`}>
                                        {column.label}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="text-xs">
                        {processedData.map((inst, idx) => {
                            const isNewChannel = !inst.isSecondaryPart;
                            const prev = idx > 0 ? processedData[idx - 1] : null;
                            const showSpacing = isNewChannel && prev;

                            return (
                                <React.Fragment key={inst.id}>
                                    {showSpacing && <tr className="h-2" aria-hidden="true" />}
                                    <tr className={`border-b border-gray-200 break-inside-avoid print:break-inside-avoid ${isNewChannel ? 'border-t border-gray-300 mt-2' : ''}`}>
                                        {visibleColumnOrder.map(columnId => (
                                            <React.Fragment key={columnId}>
                                                {renderCellContent(inst, columnId)}
                                            </React.Fragment>
                                        ))}
                                    </tr>
                                </React.Fragment>
                            );
                        })}
                        {processedData.length === 0 && (
                            <tr>
                                <td colSpan={visibleColumnOrder.length} className="py-12 text-center text-gray-400 italic">
                                    No instruments patched.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </ReportLayout>
    );
}
