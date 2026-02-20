import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ReportLayout } from './ReportLayout';
import { EquipmentListPDF } from './EquipmentListPDF';
import { useShowInfo } from '../hooks/useShowInfo';
import { PDFDownloadButton } from './PDFDownloadButton';
import { OrientationSelect } from './OrientationSelect';

export function EquipmentListReport() {
    const [orientation, setOrientation] = React.useState('portrait');
    const [includeCover, setIncludeCover] = React.useState(true);
    const instruments = useLiveQuery(() => db.instruments.toArray());
    const { showInfo } = useShowInfo();

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

    if (!instruments) return <div className="p-8 text-gray-500">Loading...</div>;

    const total = summary.reduce((acc, curr) => acc + curr.count, 0);

    const controls = (
        <div className="flex gap-4 items-center bg-gray-100 p-2 rounded text-xs text-black border border-gray-300">
            <OrientationSelect value={orientation} onChange={setOrientation} />
            <label className="flex items-center gap-2 cursor-pointer select-none border-l border-gray-300 pl-4">
                <input
                    type="checkbox"
                    checked={includeCover}
                    onChange={(e) => setIncludeCover(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="font-bold text-gray-600 uppercase tracking-wider text-[10px]">Cover Page</span>
            </label>
        </div>
    );

    const pdfBtn = (
        <PDFDownloadButton
            document={
                <EquipmentListPDF
                    showInfo={showInfo}
                    summary={summary}
                    total={total}
                    orientation={orientation}
                    includeCover={includeCover}
                />
            }
            fileName={`${(showInfo.name || 'Show').replace(/\s+/g, '_')}_EquipmentList.pdf`}
        />
    );

    return (
        <ReportLayout title="Equipment List" orientation={orientation} controls={controls} pdfButton={pdfBtn}>
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
