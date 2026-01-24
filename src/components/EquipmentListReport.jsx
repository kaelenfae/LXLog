import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ReportLayout } from './ReportLayout';

export function EquipmentListReport() {
    const [orientation, setOrientation] = React.useState('portrait');
    const instruments = useLiveQuery(() => db.instruments.toArray());

    const summary = React.useMemo(() => {
        if (!instruments) return [];
        const counts = {};
        instruments.forEach(inst => {
            const type = inst.type || 'Unknown';
            counts[type] = (counts[type] || 0) + 1;
        });

        return Object.entries(counts)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([type, count]) => ({ type, count }));
    }, [instruments]);

    if (!instruments) return <div>Loading...</div>;

    const total = summary.reduce((acc, curr) => acc + curr.count, 0);

    const controls = (
        <div className="flex gap-4 items-center bg-gray-100 p-2 rounded text-xs text-black border border-gray-300">
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
    );

    return (
        <ReportLayout title="Equipment List" orientation={orientation} controls={controls}>
            <div className="max-w-2xl mx-auto">
                <table className="w-full text-left text-sm border-collapse">
                    <thead>
                        <tr className="border-b-2 border-black">
                            <th className="py-2 text-left">Instrument Type</th>
                            <th className="py-2 text-right w-32">Quantity</th>
                        </tr>
                    </thead>
                    <tbody>
                        {summary.map((row, i) => (
                            <tr key={row.type} className="border-b border-gray-200">
                                <td className="py-2">{row.type}</td>
                                <td className="py-2 text-right font-mono font-bold">{row.count}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-black">
                            <td className="py-2 font-bold uppercase">Total Instruments</td>
                            <td className="py-2 text-right font-bold text-lg">{total}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </ReportLayout>
    );
}
