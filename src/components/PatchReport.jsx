import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ReportLayout } from './ReportLayout';
import { useSettings } from '../hooks/useSettings';
import { formatAddress } from '../utils/addressFormatter';

export function PatchReport() {
    const [orientation, setOrientation] = useState('portrait');
    const [colCount, setColCount] = useState('auto');
    const [groupByType, setGroupByType] = useState(false);

    // Interface Settings
    const { addressMode, showUniverse1 } = useSettings();

    const instruments = useLiveQuery(async () => {
        const all = await db.instruments.toArray();
        return all.sort((a, b) => {
            const chanA = parseFloat(a.channel) || 0;
            const chanB = parseFloat(b.channel) || 0;
            if (chanA !== chanB) return chanA - chanB;

            // Secondary: Sort by Address
            const getAbs = (addr) => {
                if (!addr) return 0;
                const s = String(addr);
                if (s.includes(':')) {
                    const [u, c] = s.split(':').map(Number);
                    return (u || 1) * 512 + (c || 0);
                }
                return parseFloat(s) || 0;
            };
            return getAbs(a.address) - getAbs(b.address);
        });
    });

    // Process data for display (Grouping + Channel Parts)
    const processedData = React.useMemo(() => {
        if (!instruments) return [];
        let data = instruments;

        if (groupByType) {
            // Group by Type
            const groups = {};
            instruments.forEach(inst => {
                const type = inst.type || 'Unknown';
                if (!groups[type]) groups[type] = [];
                groups[type].push(inst);
            });

            // Sort Types & Flatten
            const sortedTypes = Object.keys(groups).sort();
            const flatList = [];
            sortedTypes.forEach(type => {
                flatList.push({ isHeader: true, title: type, id: `header-${type}` });
                flatList.push(...groups[type]);
            });
            data = flatList;
        }

        // Decorate with Display Channel (Part Handling)
        let lastChannel = null;
        return data.map(item => {
            if (item.isHeader) {
                lastChannel = null;
                return item;
            }
            // Create a safe copy for rendering to avoid mutating Dexie objects if they are frozen
            const inst = { ...item };

            if (inst.channel === lastChannel && inst.part) {
                inst.displayChannel = `.${inst.part}`;
            } else {
                inst.displayChannel = inst.channel;
                lastChannel = inst.channel;
            }
            return inst;
        });

    }, [instruments, groupByType]);


    const controls = (
        <div className="flex gap-4 items-center bg-gray-100 p-2 rounded text-xs text-black border border-gray-300">
            <div className="flex items-center gap-2 border-r border-gray-300 pr-4">
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

            <div className="flex items-center gap-2 border-r border-gray-300 pr-4">
                <span className="font-bold text-gray-600 uppercase tracking-wider text-[10px]">Columns:</span>
                <select
                    value={colCount}
                    onChange={(e) => setColCount(e.target.value)}
                    className="bg-white text-black border border-gray-300 rounded px-2 py-1 cursor-pointer hover:border-indigo-500 focus:outline-none focus:border-indigo-500"
                >
                    <option value="auto">Auto (Fill)</option>
                    <option value="1">1 Column</option>
                    <option value="2">2 Columns</option>
                    <option value="3">3 Columns</option>
                    <option value="4">4 Columns</option>
                </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                    type="checkbox"
                    checked={groupByType}
                    onChange={(e) => setGroupByType(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="font-bold text-gray-600 uppercase tracking-wider text-[10px]">Group by Type</span>
            </label>
        </div>
    );

    const ITEMS_PER_COLUMN = 38; // Approx rows per column to fill a page
    const effectiveColCount = colCount === 'auto' ? 3 : parseInt(colCount);
    const itemsPerPage = ITEMS_PER_COLUMN * effectiveColCount;

    // chunk data
    const chunks = [];
    if (processedData.length > 0) {
        for (let i = 0; i < processedData.length; i += itemsPerPage) {
            chunks.push(processedData.slice(i, i + itemsPerPage));
        }
    }

    if (!instruments) return <div>Loading...</div>;

    return (
        <ReportLayout title="Patch" controls={controls} orientation={orientation}>
            {chunks.map((chunk, pageIndex) => (
                <div key={pageIndex} className="print:break-after-page mb-8 break-after-page">
                    {/* Header Row - Repeated for each page/chunk */}
                    <div className="flex border-b-2 border-black mb-2 pb-1 font-bold text-sm">
                        <div className="w-20 text-right pr-2">Channel</div>
                        <div className="w-24 pl-2">Address</div>
                        <div className="flex-1">Type</div>
                    </div>

                    <div
                        className="w-full"
                        style={{
                            columnCount: effectiveColCount,
                            columnWidth: colCount === 'auto' ? '18rem' : 'auto',
                            columnGap: '2rem',
                            columnRule: '1px solid #d1d5db' // gray-300
                        }}
                    >
                        {chunk.map(item => {
                            if (item.isHeader) {
                                return (
                                    <div key={item.id} className="font-black text-xs uppercase tracking-wider mt-4 mb-1 border-b-2 border-gray-400 break-inside-avoid text-gray-700">
                                        {item.title}
                                    </div>
                                );
                            }
                            const inst = item;
                            return (
                                <div
                                    key={inst.id}
                                    className="flex items-baseline border-b border-gray-200 pb-1 mb-1 break-inside-avoid print:break-inside-avoid"
                                >
                                    {/* Channel - Right Aligned, Bold */}
                                    <div className={`w-20 text-right pr-2 ${String(inst.displayChannel).startsWith('.') ? 'font-bold text-base text-gray-500' : 'font-black text-lg'}`}>
                                        {inst.displayChannel || inst.channel || '-'}
                                    </div>

                                    {/* Address - Prominent */}
                                    <div className="w-24 font-bold font-mono text-base text-gray-800 pl-2">
                                        {formatAddress(inst.address, addressMode, showUniverse1) || '-'}
                                    </div>

                                    {/* Type - Secondary */}
                                    <div className="flex-1 text-xs text-gray-600 truncate">{inst.type}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </ReportLayout>
    );
}
