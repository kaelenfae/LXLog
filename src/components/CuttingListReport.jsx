import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ReportLayout } from './ReportLayout';
import { getGelColor } from '../utils/gelData';

export function CuttingListReport() {
    const [orientation, setOrientation] = useState('portrait');
    const [showSwatches, setShowSwatches] = useState(true);
    // Determine sort mode: 'color' or 'type'
    const [sortBy, setSortBy] = useState('color');

    const instruments = useLiveQuery(() => db.instruments.toArray());

    const summary = React.useMemo(() => {
        if (!instruments) return [];

        if (sortBy === 'color') {
            // Group by color first, then by type within each color
            const colorGroups = {};
            instruments.forEach(inst => {
                if (!inst.color) return;
                const color = inst.color.trim();
                if (!color) return;

                if (!colorGroups[color]) {
                    colorGroups[color] = {};
                }

                const type = inst.type || 'Unknown';
                if (!colorGroups[color][type]) {
                    colorGroups[color][type] = 0;
                }
                colorGroups[color][type]++;
            });

            // Convert to array format
            return Object.entries(colorGroups)
                .map(([color, types]) => {
                    const typeTotals = Object.entries(types)
                        .map(([type, count]) => ({ type, count }))
                        .sort((a, b) => a.type.localeCompare(b.type));

                    const totalCount = typeTotals.reduce((sum, t) => sum + t.count, 0);

                    return {
                        groupName: color,
                        groupType: 'color',
                        count: totalCount,
                        items: typeTotals
                    };
                })
                .sort((a, b) => a.groupName.localeCompare(b.groupName, undefined, { numeric: true }));
        } else {
            // Group by type first, then by color within each type
            const typeGroups = {};
            instruments.forEach(inst => {
                if (!inst.color) return;
                const color = inst.color.trim();
                if (!color) return;

                const type = inst.type || 'Unknown';
                if (!typeGroups[type]) {
                    typeGroups[type] = {};
                }

                if (!typeGroups[type][color]) {
                    typeGroups[type][color] = 0;
                }
                typeGroups[type][color]++;
            });

            // Convert to array format
            return Object.entries(typeGroups)
                .map(([type, colors]) => {
                    const colorTotals = Object.entries(colors)
                        .map(([color, count]) => ({ color, count }))
                        .sort((a, b) => a.color.localeCompare(b.color, undefined, { numeric: true }));

                    const totalCount = colorTotals.reduce((sum, c) => sum + c.count, 0);

                    return {
                        groupName: type,
                        groupType: 'type',
                        count: totalCount,
                        items: colorTotals
                    };
                })
                .sort((a, b) => a.groupName.localeCompare(b.groupName));
        }
    }, [instruments, sortBy]);

    if (!instruments) return <div>Loading...</div>;

    const totalCuts = summary.reduce((acc, curr) => acc + curr.count, 0);
    const totalGroups = summary.length;

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
            <div className="flex items-center gap-2">
                <span className="font-bold text-gray-600 uppercase tracking-wider text-[10px]">Group By:</span>
                <div className="flex bg-white rounded border border-gray-300 overflow-hidden">
                    <button
                        onClick={() => setSortBy('color')}
                        className={`px-3 py-1 ${sortBy === 'color' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100'}`}
                    >
                        Color
                    </button>
                    <div className="w-px bg-gray-300"></div>
                    <button
                        onClick={() => setSortBy('type')}
                        className={`px-3 py-1 ${sortBy === 'type' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100'}`}
                    >
                        Type
                    </button>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 cursor-pointer hover:text-indigo-600 select-none">
                    <input
                        type="checkbox"
                        checked={showSwatches}
                        onChange={(e) => setShowSwatches(e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3"
                    />
                    <span className="font-bold text-gray-600 uppercase tracking-wider text-[10px]">Show Swatches</span>
                </label>
            </div>
        </div>
    );

    return (
        <ReportLayout title="Cutting List" orientation={orientation} controls={controls}>
            <div className="max-w-4xl mx-auto">
                {/* Header with Totals */}
                <div className="mb-6 pb-3 border-b border-gray-300 flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                        <span className="font-semibold">Total {sortBy === 'color' ? 'Colors' : 'Types'}:</span> {totalGroups}
                        <span className="mx-3">•</span>
                        <span className="font-semibold">Total Cuts:</span> {totalCuts}
                    </div>
                </div>

                {summary.map((group) => (
                    <div key={group.groupName} className="mb-8 print-break-inside">
                        {/* Group Header */}
                        <div className="flex items-center gap-4 mb-3 pb-2 border-b-2 border-black">
                            {group.groupType === 'color' && showSwatches && (
                                <div
                                    className="w-12 h-12 rounded border-2 border-gray-400 shrink-0"
                                    style={{ backgroundColor: getGelColor(group.groupName) }}
                                ></div>
                            )}
                            <div className="flex-1">
                                <h3 className="font-mono font-bold text-2xl">{group.groupName}</h3>
                                <p className="text-sm text-gray-600">
                                    {group.count} cut{group.count !== 1 ? 's' : ''} required
                                </p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <table className="w-full text-left text-sm border-collapse mb-4">
                            <thead>
                                <tr className="border-b border-gray-300">
                                    <th className="py-1 text-left text-xs text-gray-600">
                                        {group.groupType === 'color' ? 'Instrument Type' : 'Color'}
                                    </th>
                                    <th className="py-1 text-right text-xs text-gray-600">Quantity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {group.items.map((item) => (
                                    <tr key={item.type || item.color} className="border-b border-gray-100">
                                        <td className="py-1 flex items-center gap-2">
                                            {item.color && group.groupType === 'type' && showSwatches && (
                                                <span
                                                    className="inline-block w-4 h-4 rounded border border-gray-400 shrink-0"
                                                    style={{ backgroundColor: getGelColor(item.color) }}
                                                />
                                            )}
                                            {item.type || item.color}
                                        </td>
                                        <td className="py-1 text-right font-mono font-bold">{item.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>
        </ReportLayout>
    );
}
