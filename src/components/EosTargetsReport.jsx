import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ReportLayout } from './ReportLayout';
import { EosTargetsPDF } from './EosTargetsPDF';
import { useShowInfo } from '../hooks/useShowInfo';
import { PDFDownloadButton } from './PDFDownloadButton';
import { OrientationSelect } from './OrientationSelect';

export function EosTargetsReport() {
    const [orientation, setOrientation] = React.useState('portrait');
    const [filter, setFilter] = React.useState('all'); // 'all', 'Group', 'Preset', 'Sub'
    const [includeCover, setIncludeCover] = React.useState(true);

    const targets = useLiveQuery(() => db.eosTargets.toArray());
    const { showInfo } = useShowInfo();

    if (!targets) return <div className="p-8 text-gray-500">Loading...</div>;

    if (targets.length === 0) {
        return (
            <div className="flex flex-col h-full bg-[var(--bg-app)] text-[var(--text-primary)]">
                <div className="h-14 border-b border-[var(--border-subtle)] flex items-center px-6 bg-[var(--bg-app)] justify-between shrink-0 sticky top-0">
                    <h1 className="text-xl font-bold tracking-tight">EOS Targets</h1>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-tertiary)] gap-4">
                    <svg className="w-16 h-16 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                    <div className="text-center">
                        <p className="text-lg font-medium">No EOS Targets Found</p>
                        <p className="text-sm mt-1">Import an EOS CSV file with Groups, Presets, or Subs to see them here.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Group targets by type
    const groups = targets.filter(t => t.targetType === 'Group');
    const presets = targets.filter(t => t.targetType === 'Preset');
    const subs = targets.filter(t => t.targetType === 'Sub');

    // Sort by ID (numeric)
    const sortById = (a, b) => parseFloat(a.targetId) - parseFloat(b.targetId);
    groups.sort(sortById);
    presets.sort(sortById);
    subs.sort(sortById);

    // Filter based on selection
    const showGroups = filter === 'all' || filter === 'Group';
    const showPresets = filter === 'all' || filter === 'Preset';
    const showSubs = filter === 'all' || filter === 'Sub';

    const TargetCard = ({ target, color }) => (
        <div
            className="p-3 rounded-lg border-2 flex flex-col items-center justify-center text-center min-w-[5rem] bg-white"
            style={{ borderColor: color }}
        >
            <div className="text-xl font-bold text-gray-800">{target.targetId}</div>
            {target.label && (
                <div className="text-xs text-gray-600 mt-1 truncate max-w-[8rem]" title={target.label}>
                    {target.label}
                </div>
            )}
            {target.channels && (
                <div className="text-[10px] text-gray-400 mt-1 truncate max-w-[8rem]" title={target.channels}>
                    {target.channels}
                </div>
            )}
        </div>
    );

    const TargetSection = ({ title, items, color, bgColor }) => {
        if (items.length === 0) return null;
        return (
            <div className="mb-8 print:break-inside-avoid">
                <div
                    className="px-4 py-2 rounded-t-lg font-bold text-lg uppercase tracking-wide mb-3 flex items-center gap-3"
                    style={{ backgroundColor: bgColor, color: '#fff' }}
                >
                    <span>{title}</span>
                    <span className="text-sm font-normal opacity-75">({items.length})</span>
                </div>
                <div className="flex flex-wrap gap-3">
                    {items.map((target, idx) => (
                        <TargetCard key={`${target.targetType}-${target.targetId}-${idx}`} target={target} color={color} />
                    ))}
                </div>
            </div>
        );
    };

    const controls = (
        <div className="flex gap-4 items-center flex-wrap bg-gray-100 p-2 rounded text-xs text-black border border-gray-300 print:hidden">
            <div className="flex items-center gap-2">
                <span className="font-bold text-gray-600 uppercase tracking-wider text-[10px]">Show:</span>
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="bg-white text-black border border-gray-300 rounded px-2 py-1 cursor-pointer hover:border-indigo-500 focus:outline-none focus:border-indigo-500"
                >
                    <option value="all">All Targets</option>
                    <option value="Group">Groups Only</option>
                    <option value="Preset">Presets Only</option>
                    <option value="Sub">Subs Only</option>
                </select>
            </div>

            <div className="h-4 w-px bg-gray-300"></div>

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
                <EosTargetsPDF
                    showInfo={showInfo}
                    groups={groups}
                    presets={presets}
                    subs={subs}
                    orientation={orientation}
                    includeCover={includeCover}
                />
            }
            fileName={`${(showInfo.name || 'Show').replace(/\s+/g, '_')}_EosTargets.pdf`}
        />
    );

    return (
        <ReportLayout title="EOS Targets" orientation={orientation} controls={controls} pdfButton={pdfBtn}>
            <div className="bg-white text-black min-h-full p-6">
                {showGroups && <TargetSection title="Groups" items={groups} color="#10b981" bgColor="#059669" />}
                {showPresets && <TargetSection title="Presets" items={presets} color="#8b5cf6" bgColor="#7c3aed" />}
                {showSubs && <TargetSection title="Subs" items={subs} color="#f59e0b" bgColor="#d97706" />}
            </div>
        </ReportLayout>
    );
}
