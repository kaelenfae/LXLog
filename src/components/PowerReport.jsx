import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ReportLayout } from './ReportLayout';
import { PowerReportPDF } from './PowerReportPDF';
import { useShowInfo } from '../hooks/useShowInfo';
import { PDFDownloadButton } from './PDFDownloadButton';
import { OrientationSelect } from './OrientationSelect';

export function PowerReport() {
    const [orientation, setOrientation] = React.useState('portrait');
    const [includeCover, setIncludeCover] = React.useState(true);
    const instruments = useLiveQuery(() => db.instruments.toArray());
    const { showInfo } = useShowInfo();

    const summary = React.useMemo(() => {
        if (!instruments) return [];
        const positionData = {};

        instruments.forEach(inst => {
            const position = inst.position || 'Unknown';
            const watt = parseInt(inst.watt) || 0;

            if (!positionData[position]) {
                positionData[position] = { count: 0, watts: 0 };
            }
            positionData[position].count++;
            positionData[position].watts += watt;
        });

        return Object.entries(positionData)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([position, data]) => ({
                position,
                count: data.count,
                watts: data.watts
            }));
    }, [instruments]);

    if (!instruments) return <div className="p-8 text-gray-500">Loading...</div>;

    const totalDevices = summary.reduce((acc, curr) => acc + curr.count, 0);
    const totalWatts = summary.reduce((acc, curr) => acc + curr.watts, 0);

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
                <PowerReportPDF
                    showInfo={showInfo}
                    summary={summary}
                    totalDevices={totalDevices}
                    totalWatts={totalWatts}
                    orientation={orientation}
                    includeCover={includeCover}
                />
            }
            fileName={`${(showInfo.name || 'Show').replace(/\s+/g, '_')}_PowerReport.pdf`}
        />
    );

    return (
        <ReportLayout title="Power Report" orientation={orientation} controls={controls} pdfButton={pdfBtn}>
            <div className="max-w-3xl mx-auto">
                <table className="w-full text-left text-sm border-collapse">
                    <thead>
                        <tr className="border-b-2 border-black">
                            <th className="py-2 text-left">Position</th>
                            <th className="py-2 text-right w-32">Devices</th>
                            <th className="py-2 text-right w-40">Total Watts</th>
                        </tr>
                    </thead>
                    <tbody>
                        {summary.map((row) => (
                            <tr key={row.position} className="border-b border-gray-200">
                                <td className="py-2">{row.position}</td>
                                <td className="py-2 text-right font-mono">{row.count}</td>
                                <td className="py-2 text-right font-mono font-bold">
                                    {row.watts.toLocaleString()} W
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-black">
                            <td className="py-2 font-bold uppercase">Grand Total</td>
                            <td className="py-2 text-right font-bold">{totalDevices}</td>
                            <td className="py-2 text-right font-bold text-lg">
                                {totalWatts.toLocaleString()} W
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </ReportLayout>
    );
}
