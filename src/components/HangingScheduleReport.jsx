import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ReportLayout } from './ReportLayout';
import { ConfigureColumnsButton, ConfigureColumnsHeader, DraggableColumnItem } from './ConfigureColumns';
import { getGelColor } from '../utils/gelData';
import { formatAddress } from '../utils/addressFormatter';
import { useSettings } from '../hooks/useSettings';

export function HangingScheduleReport() {
    const [orientation, setOrientation] = React.useState('portrait');
    const [showSwatches, setShowSwatches] = React.useState(false);
    const { addressMode, showUniverse1 } = useSettings();

    // Dynamic Columns Support
    const metadata = useLiveQuery(() => db.showMetadata.toArray());
    const dynamicColumns = React.useMemo(() => {
        const base = [
            { id: 'position', label: 'Position' },
            { id: 'unit', label: 'Unit' },
            { id: 'type', label: 'Type' },
            { id: 'watt', label: 'Wattage' },
            { id: 'purpose', label: 'Purpose' },
            { id: 'color', label: 'Color' },
            { id: 'gobo', label: 'Gobo' },
            { id: 'channel', label: 'Channel' },
            { id: 'address', label: 'Address' }
        ];
        if (metadata && metadata[0] && metadata[0].customFieldDefinitions) {
            metadata[0].customFieldDefinitions.forEach(field => {
                if (!base.find(c => c.id === field)) {
                    base.push({ id: field, label: field, isCustom: true });
                }
            });
        }
        return base;
    }, [metadata]);

    const [visibleColumns, setVisibleColumns] = React.useState({
        position: true,
        unit: true,
        type: true,
        watt: true,
        purpose: true,
        color: true,
        gobo: true,
        channel: true,
        address: true
    });
    const [columnOrder, setColumnOrder] = React.useState([
        'position', 'unit', 'type', 'watt', 'purpose', 'color', 'gobo', 'channel', 'address'
    ]);
    const [draggedColumn, setDraggedColumn] = React.useState(null);
    const [hasSetDefaults, setHasSetDefaults] = React.useState(false);

    // Sync columnOrder with dynamic columns
    React.useEffect(() => {
        setColumnOrder(prevOrder => {
            const newOrder = [...prevOrder];
            dynamicColumns.forEach(col => {
                if (!newOrder.includes(col.id)) {
                    newOrder.push(col.id);
                }
            });
            return newOrder;
        });
    }, [dynamicColumns]);

    // Load saved column order and visibility from localStorage
    React.useEffect(() => {
        const savedOrder = localStorage.getItem('hangingSchedule_columnOrder');
        const savedVisibility = localStorage.getItem('hangingSchedule_visibleColumns');
        if (savedOrder) setColumnOrder(JSON.parse(savedOrder));
        if (savedVisibility) {
            const parsed = JSON.parse(savedVisibility);
            // Ensure new dynamic fields are merged into visibility map (default false if not present)
            setVisibleColumns(prev => ({ ...prev, ...parsed }));
        }
    }, []);

    const instruments = useLiveQuery(async () => {
        const all = await db.instruments.toArray();
        return all.sort((a, b) => {
            const posA = a.position || '';
            const posB = b.position || '';

            // Empty positions go to the end
            if (!posA && posB) return 1;
            if (posA && !posB) return -1;

            const cmpPos = posA.localeCompare(posB, undefined, { numeric: true });
            if (cmpPos !== 0) return cmpPos;

            const unitA = a.unit || '';
            const unitB = b.unit || '';
            return unitA.localeCompare(unitB, undefined, { numeric: true });
        });
    });

    React.useEffect(() => {
        if (instruments && !hasSetDefaults) {
            // Keep existing logic but be aware dynamic fields will just stay false by default
            // unless we want to auto-enable them if data exists?
            // For now, let's just respect the manual loop which only checks base fields.
            // If the user wants to see custom fields, they can toggle them.
            // But wait, the previous code explicitly calculated defaults based on data presence.

            const defaults = { ...visibleColumns };

            // Only update defaults for base fields that were previously hardcoded
            const baseIds = ['position', 'unit', 'type', 'watt', 'purpose', 'color', 'gobo', 'channel', 'address'];

            // Check data presence for base fields
            instruments.forEach(inst => {
                if (inst.position) defaults.position = true;
                if (inst.unit) defaults.unit = true;
                if (inst.type) defaults.type = true;
                if (inst.watt) defaults.watt = true;
                if (inst.purpose) defaults.purpose = true;
                if (inst.color) defaults.color = true;
                if (inst.gobo) defaults.gobo = true;
                if (inst.channel) defaults.channel = true;
                if (inst.address) defaults.address = true;
            });

            // Should we check custom fields? 
            // If they are new, they might be hidden. 
            // Let's check them too.
            dynamicColumns.forEach(col => {
                if (col.isCustom) {
                    // Check if ANY instrument has a value for this field
                    const hasData = instruments.some(inst => inst.customFields && inst.customFields[col.id]);
                    if (hasData) defaults[col.id] = true;
                }
            });

            setVisibleColumns(defaults);
            setHasSetDefaults(true);
        }
    }, [instruments, hasSetDefaults, dynamicColumns]);

    const toggleColumn = (key) => {
        const updated = { ...visibleColumns, [key]: !visibleColumns[key] };
        setVisibleColumns(updated);
        localStorage.setItem('hangingSchedule_visibleColumns', JSON.stringify(updated));
    };

    const handleDragStart = (e, columnId) => {
        setDraggedColumn(columnId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetColumnId) => {
        e.preventDefault();
        if (!draggedColumn || draggedColumn === targetColumnId) return;

        const newOrder = [...columnOrder];
        const draggedIndex = newOrder.indexOf(draggedColumn);
        const targetIndex = newOrder.indexOf(targetColumnId);

        newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedColumn);

        setColumnOrder(newOrder);
        localStorage.setItem('hangingSchedule_columnOrder', JSON.stringify(newOrder));
        setDraggedColumn(null);
    };

    const resetColumns = () => {
        const defaultOrder = ['position', 'unit', 'type', 'watt', 'purpose', 'color', 'gobo', 'channel', 'address', ...dynamicColumns.filter(c => c.isCustom).map(c => c.id)];
        setColumnOrder(defaultOrder);
        localStorage.removeItem('hangingSchedule_columnOrder');
        localStorage.removeItem('hangingSchedule_visibleColumns');

        // Reset visibility to defaults based on data
        if (instruments) {
            const defaults = {
                position: false, unit: false, type: false, watt: false,
                purpose: false, color: false, gobo: false, channel: false, address: false
            };
            instruments.forEach(inst => {
                if (inst.position) defaults.position = true;
                if (inst.unit) defaults.unit = true;
                if (inst.type) defaults.type = true;
                if (inst.watt) defaults.watt = true;
                if (inst.purpose) defaults.purpose = true;
                if (inst.color) defaults.color = true;
                if (inst.gobo) defaults.gobo = true;
                if (inst.channel) defaults.channel = true;
                if (inst.address) defaults.address = true;
            });
            dynamicColumns.forEach(col => {
                if (col.isCustom) {
                    const hasData = instruments.some(inst => inst.customFields && inst.customFields[col.id]);
                    if (hasData) defaults[col.id] = true;
                }
            });
            setVisibleColumns(defaults);
        }
    };

    const [showColumnConfig, setShowColumnConfig] = React.useState(false);

    const controls = (
        <div className="flex gap-4 items-center bg-gray-100 p-2 rounded text-xs text-black border border-gray-300">
            <div className="flex items-center gap-2 pr-4">
                <span className="font-bold text-gray-600 uppercase tracking-wider text-[10px]">Orientation:</span>
                <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value)}
                    className="bg-white text-black border border-gray-300 rounded px-2 py-1 cursor-pointer hover:border-indigo-500 focus:outline-none focus:border-indigo-500"
                >
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
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
                        const colDef = dynamicColumns.find(c => c.id === columnId);
                        if (!colDef) return null;

                        return (
                            <DraggableColumnItem
                                key={columnId}
                                columnId={columnId}
                                label={colDef.label}
                                isVisible={visibleColumns[columnId]}
                                isDragging={draggedColumn === columnId}
                                onToggle={() => toggleColumn(columnId)}
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                            />
                        );
                    })}
                </div>
            </ConfigureColumnsButton>
        </div>
    );

    // Group instruments by position (must be before early return to maintain hook order)
    const groupedByPosition = React.useMemo(() => {
        if (!instruments) return {};
        const groups = {};
        instruments.forEach(inst => {
            const pos = inst.position || 'Unassigned';
            if (!groups[pos]) groups[pos] = [];
            groups[pos].push(inst);
        });
        return groups;
    }, [instruments]);

    const positions = React.useMemo(() => {
        return Object.keys(groupedByPosition).sort((a, b) => {
            // Keep "Unassigned" at the end
            if (a === 'Unassigned') return 1;
            if (b === 'Unassigned') return -1;
            return a.localeCompare(b, undefined, { numeric: true });
        });
    }, [groupedByPosition]);

    // Get visible columns for table headers
    const visibleColumnIds = React.useMemo(() => {
        return columnOrder.filter(id => visibleColumns[id]);
    }, [columnOrder, visibleColumns]);

    if (!instruments || !hasSetDefaults) return <div>Loading...</div>;

    const columnLabels = {
        position: 'Position',
        unit: 'Unit',
        type: 'Type',
        watt: 'Wattage',
        purpose: 'Purpose',
        color: 'Color',
        gobo: 'Gobo',
        channel: 'Ch',
        address: 'Addr'
    };

    const renderCell = (inst, columnId) => {
        switch (columnId) {
            case 'position': return inst.position;
            case 'unit': return inst.unit;
            case 'type': return inst.type;
            case 'watt': return inst.watt;
            case 'purpose': return <span className="italic text-gray-600">{inst.purpose}</span>;
            case 'color':
                return (
                    <span className="flex items-center gap-1">
                        {showSwatches && inst.color && (
                            <span
                                className="inline-block w-3 h-3 border border-gray-400 rounded-sm"
                                style={{ backgroundColor: getGelColor(inst.color) }}
                            />
                        )}
                        {inst.color}
                    </span>
                );
            case 'gobo': return inst.gobo;
            case 'channel': return inst.channel;
            case 'address':
                if (!inst.address || inst.address.trim() === '') {
                    return (
                        <div className="inline-block w-16 h-5 border border-gray-400 bg-yellow-50 print:bg-white print:border-black" title="Address missing - fill in manually"></div>
                    );
                }
                return formatAddress(inst.address, addressMode, showUniverse1);
            default:
                // Handle Focus Status as checkbox
                if (columnId.toLowerCase().includes('focus') && columnId.toLowerCase().includes('status')) {
                    const value = inst.customFields ? inst.customFields[columnId] : '';
                    const isChecked = value && (value === true || value === 'true' || value === 'yes' || value === 'Yes' || value === '1');
                    return (
                        <div className="flex justify-center">
                            <input
                                type="checkbox"
                                checked={isChecked}
                                disabled
                                className="w-4 h-4 accent-green-600 print:accent-black pointer-events-none cursor-default"
                                onClick={(e) => e.preventDefault()}
                                onChange={() => { }}
                            />
                        </div>
                    );
                }
                const colDef = dynamicColumns.find(c => c.id === columnId);
                if (colDef && colDef.isCustom) {
                    return <span className="text-gray-700">{inst.customFields ? inst.customFields[columnId] : ''}</span>;
                }
                return '';
        }
    };

    return (
        <ReportLayout title="Hanging Schedule" controls={controls} orientation={orientation}>
            {positions.map(position => (
                <div
                    key={position}
                    className="mb-6 break-inside-avoid print:break-inside-avoid"
                    style={{ pageBreakInside: 'avoid' }}
                >
                    {/* Position Header */}
                    <h2 className="text-lg font-bold text-gray-800 border-b-2 border-gray-800 pb-1 mb-2 print:text-black print:border-black">
                        {position}
                        <span className="ml-2 font-normal text-gray-500 text-sm">
                            ({groupedByPosition[position].length} unit{groupedByPosition[position].length !== 1 ? 's' : ''})
                        </span>
                    </h2>

                    {/* Position Table */}
                    <table className="w-full text-left text-xs border-collapse border border-gray-300">
                        <thead>
                            <tr className="border-b-2 border-black bg-gray-100">
                                {visibleColumnIds.map(columnId => {
                                    const colDef = dynamicColumns.find(c => c.id === columnId);
                                    if (!colDef) return null;
                                    // Skip position column since we're grouping by it
                                    if (columnId === 'position') return null;

                                    return (
                                        <th key={columnId} className="p-1 font-bold text-[10px] uppercase">
                                            {colDef.label}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {groupedByPosition[position].map((inst, idx) => (
                                <tr
                                    key={inst.id}
                                    className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} break-inside-avoid print:break-inside-avoid`}
                                >
                                    {visibleColumnIds.map(columnId => {
                                        // Skip position column since we're grouping by it
                                        if (columnId === 'position') return null;
                                        return (
                                            <td key={columnId} className="p-1">
                                                {renderCell(inst, columnId)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </ReportLayout>
    );
}
