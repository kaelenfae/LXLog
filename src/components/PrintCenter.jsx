import React, { useState, useCallback } from 'react';
import { Document, pdf } from '@react-pdf/renderer';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useShowInfo } from '../hooks/useShowInfo';
import { useSettings } from '../hooks/useSettings';
import { formatAddress } from '../utils/addressFormatter';
import { OrientationSelect } from './OrientationSelect';
import { PDFCoverPage } from './PDFCoverPage';

// PDF components
import { ChannelHookupPDF } from './ChannelHookupPDF';
import { HangingSchedulePDF } from './HangingSchedulePDF';
import { PatchPDF } from './PatchPDF';
import { EquipmentListPDF } from './EquipmentListPDF';
import { CuttingListPDF } from './CuttingListPDF';
import { PowerReportPDF } from './PowerReportPDF';
import { EosTargetsPDF } from './EosTargetsPDF';

const REPORTS = [
    { id: 'channel-hookup', label: 'Channel Hookup' },
    { id: 'hanging-schedule', label: 'Hanging Schedule' },
    { id: 'patch', label: 'Patch' },
    { id: 'equipment-list', label: 'Equipment List' },
    { id: 'cutting-list', label: 'Cutting List' },
    { id: 'power', label: 'Power Report' },
    { id: 'eos-targets', label: 'EOS Targets' },
];

export function PrintCenter() {
    const [selected, setSelected] = useState(new Set(['channel-hookup', 'hanging-schedule', 'patch']));
    const [orientation, setOrientation] = useState('landscape');
    const [includeCover, setIncludeCover] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [status, setStatus] = useState(''); // '' | 'building' | 'done' | 'error'

    const { showInfo } = useShowInfo();
    const { addressMode, showUniverse1, universeSeparator, channelDisplayMode } = useSettings();

    const instruments = useLiveQuery(() => db.instruments.toArray());
    const eosTargets = useLiveQuery(() => db.eosTargets.toArray());

    const toggleReport = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
        if (status === 'done') setStatus('');
    };

    const selectAll = () => {
        setSelected(new Set(REPORTS.map(r => r.id)));
        if (status === 'done') setStatus('');
    };
    const selectNone = () => {
        setSelected(new Set());
        if (status === 'done') setStatus('');
    };

    // Build a PDF document fragment for a given report ID
    const buildReportFragment = useCallback((reportId) => {
        if (!instruments) return null;

        switch (reportId) {
            case 'channel-hookup': {
                const sortedInstruments = [...instruments].sort((a, b) => {
                    const chanA = parseFloat(a.channel) || 0;
                    const chanB = parseFloat(b.channel) || 0;
                    return chanA - chanB;
                });
                const processedData = sortedInstruments.map(inst => ({
                    ...inst,
                    displayChannel: inst.channel || '-',
                    displayAddress: formatAddress(inst.address, inst.universe, addressMode, showUniverse1, universeSeparator)
                }));
                const defaultCols = ['channel', 'address', 'position', 'unit', 'type', 'watt', 'purpose', 'color', 'notes'];
                return (
                    <ChannelHookupPDF
                        key="channel-hookup"
                        showInfo={showInfo}
                        processedData={processedData}
                        visibleColumnOrder={defaultCols}
                        orientation={orientation}
                        includeCover={false}
                        standalone={false}
                    />
                );
            }
            case 'hanging-schedule': {
                const defaultLabels = {
                    position: 'Position', unit: 'Unit', type: 'Type', watt: 'Watt',
                    purpose: 'Purpose', color: 'Color', channel: 'Channel', address: 'Address',
                    circuit: 'Circuit', dimmer: 'Dimmer', notes: 'Notes'
                };
                const defaultVisible = { position: true, unit: true, type: true, channel: true, address: true, purpose: true, color: true };
                return (
                    <HangingSchedulePDF
                        key="hanging-schedule"
                        showInfo={showInfo}
                        instruments={instruments}
                        visibleColumns={defaultVisible}
                        columnLabels={defaultLabels}
                        includeCover={false}
                        orientation={orientation}
                        channelDisplayMode={channelDisplayMode}
                        addressMode={addressMode}
                        showUniverse1={showUniverse1}
                        universeSeparator={universeSeparator}
                        standalone={false}
                    />
                );
            }
            case 'patch': {
                const sorted = [...instruments].sort((a, b) => {
                    const chanA = parseFloat(a.channel) || 0;
                    const chanB = parseFloat(b.channel) || 0;
                    return chanA - chanB;
                });
                let lastChannel = null;
                const processedData = sorted.map(inst => {
                    const item = { ...inst };
                    const isSecondary = item.channel === lastChannel && item.part;
                    if (isSecondary) {
                        if (channelDisplayMode === 'parts') item.displayChannel = `P${item.part || 1}`;
                        else if (channelDisplayMode === 'dots') item.displayChannel = `.${item.part || 1}`;
                        else if (channelDisplayMode === 'hide') item.displayChannel = '';
                        else item.displayChannel = item.channel;
                    } else {
                        item.displayChannel = item.channel || '-';
                        lastChannel = item.channel;
                    }
                    item.address = formatAddress(inst.address, inst.universe, addressMode, showUniverse1, universeSeparator);
                    return item;
                });
                return (
                    <PatchPDF
                        key="patch"
                        showInfo={showInfo}
                        processedData={processedData}
                        orientation={orientation}
                        colCount={3}
                        includeCover={false}
                        standalone={false}
                    />
                );
            }
            case 'equipment-list': {
                const counts = {};
                instruments.forEach(inst => {
                    const type = inst.type || 'Unknown';
                    counts[type] = (counts[type] || 0) + 1;
                });
                const summary = Object.entries(counts)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([type, count]) => ({ type, count: count || 0 }));
                const total = summary.reduce((a, c) => a + (Number(c.count) || 0), 0);
                return (
                    <EquipmentListPDF
                        key="equipment-list"
                        showInfo={showInfo}
                        summary={summary}
                        total={total}
                        orientation={orientation}
                        includeCover={false}
                        standalone={false}
                    />
                );
            }
            case 'cutting-list': {
                const colorGroups = {};
                instruments.forEach(inst => {
                    if (!inst.color) return;
                    const color = inst.color.trim();
                    if (!color) return;
                    if (!colorGroups[color]) colorGroups[color] = {};
                    const type = inst.type || 'Unknown';
                    const frameSize = inst.gelFrameSize || '';
                    const key = frameSize ? `${type}|${frameSize}` : type;
                    if (!colorGroups[color][key]) colorGroups[color][key] = { type, frameSize, count: 0 };
                    colorGroups[color][key].count++;
                });
                const summary = Object.entries(colorGroups)
                    .map(([color, types]) => {
                        const items = Object.values(types).sort((a, b) => a.type.localeCompare(b.type));
                        return { groupName: color, groupType: 'color', count: items.reduce((s, t) => s + t.count, 0), items };
                    })
                    .sort((a, b) => a.groupName.localeCompare(b.groupName, undefined, { numeric: true }));
                const totalCuts = summary.reduce((a, c) => a + c.count, 0);
                return (
                    <CuttingListPDF
                        key="cutting-list"
                        showInfo={showInfo}
                        summary={summary}
                        sortBy="color"
                        totalGroups={summary.length}
                        totalCuts={totalCuts}
                        orientation={orientation}
                        includeCover={false}
                        standalone={false}
                    />
                );
            }
            case 'power': {
                const positionData = {};
                instruments.forEach(inst => {
                    const position = inst.position || 'Unknown';
                    const watt = parseInt(inst.watt) || 0;
                    if (!positionData[position]) positionData[position] = { count: 0, watts: 0 };
                    positionData[position].count++;
                    positionData[position].watts += watt;
                });
                const summary = Object.entries(positionData)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([position, data]) => ({ position, count: data.count || 0, watts: data.watts || 0 }));
                const totalDevices = summary.reduce((a, c) => a + (Number(c.count) || 0), 0);
                const totalWatts = summary.reduce((a, c) => a + (Number(c.watts) || 0), 0);
                return (
                    <PowerReportPDF
                        key="power"
                        showInfo={showInfo}
                        summary={summary}
                        totalDevices={totalDevices}
                        totalWatts={totalWatts}
                        orientation={orientation}
                        includeCover={false}
                        standalone={false}
                    />
                );
            }
            case 'eos-targets': {
                if (!eosTargets || eosTargets.length === 0) return null;
                const sortById = (a, b) => parseFloat(a.targetId) - parseFloat(b.targetId);
                const groups = eosTargets.filter(t => t.targetType === 'Group').sort(sortById);
                const presets = eosTargets.filter(t => t.targetType === 'Preset').sort(sortById);
                const subs = eosTargets.filter(t => t.targetType === 'Sub').sort(sortById);
                return (
                    <EosTargetsPDF
                        key="eos-targets"
                        showInfo={showInfo}
                        groups={groups}
                        presets={presets}
                        subs={subs}
                        orientation={orientation}
                        includeCover={false}
                        standalone={false}
                    />
                );
            }
            default:
                return null;
        }
    }, [instruments, eosTargets, showInfo, orientation, addressMode, showUniverse1, universeSeparator, channelDisplayMode]);

    const handleGenerate = useCallback(async () => {
        if (generating || selected.size === 0) return;

        setGenerating(true);
        setStatus('building');

        try {
            const reportNames = Array.from(selected).map(id => REPORTS.find(r => r.id === id)?.label).filter(Boolean);
            const fragments = Array.from(selected).map(id => buildReportFragment(id)).filter(Boolean);

            const combinedDoc = (
                <Document>
                    {includeCover && (
                        <PDFCoverPage
                            showInfo={showInfo}
                            reportTitle="Unified Show Reports"
                            includedReports={reportNames}
                        />
                    )}
                    {fragments}
                </Document>
            );

            const blob = await pdf(combinedDoc).toBlob();
            const url = URL.createObjectURL(blob);
            const showName = (showInfo.name || 'Show').replace(/\s+/g, '_');

            const link = window.document.createElement('a');
            link.href = url;
            link.download = `${showName}_FullReport.pdf`;
            window.document.body.appendChild(link);
            link.click();
            window.document.body.removeChild(link);

            setTimeout(() => URL.revokeObjectURL(url), 100);
            setStatus('done');
        } catch (err) {
            console.error(`[PrintCenter] Error generating combined report:`, err);
            setStatus('error');
        }

        setGenerating(false);
    }, [generating, selected, buildReportFragment, includeCover, showInfo]);

    const isLoading = !instruments;

    return (
        <div className="flex flex-col h-full bg-[var(--bg-app)] text-[var(--text-primary)]">
            {/* Header */}
            <div className="h-14 border-b border-[var(--border-subtle)] flex items-center px-6 bg-[var(--bg-app)] justify-between shrink-0 sticky top-0 z-10">
                <h1 className="text-xl font-bold tracking-tight">Print Center</h1>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto">
                    {/* Description */}
                    <p className="text-sm text-[var(--text-secondary)] mb-6">
                        Select reports to bundle into a single combined PDF.
                    </p>

                    {/* Global Options */}
                    <div className="bg-gray-100 p-4 rounded-lg border border-gray-300 mb-6 text-black">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3">Global Options</h2>
                        <div className="flex gap-6 items-center flex-wrap text-xs">
                            <OrientationSelect value={orientation} onChange={setOrientation} />

                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={includeCover}
                                    onChange={(e) => setIncludeCover(e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                />
                                <span className="font-bold text-gray-600 uppercase tracking-wider text-[10px]">
                                    Include Combined Cover Page
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Report Selection */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Select Reports to Include</h2>
                            <div className="flex gap-2 text-xs">
                                <button onClick={selectAll} className="text-indigo-500 hover:text-indigo-400 font-medium cursor-pointer">Select All</button>
                                <span className="text-[var(--text-tertiary)]">|</span>
                                <button onClick={selectNone} className="text-indigo-500 hover:text-indigo-400 font-medium cursor-pointer">Select None</button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            {REPORTS.map(report => {
                                const isSelected = selected.has(report.id);
                                const isUnavailable = report.id === 'eos-targets' && (!eosTargets || eosTargets.length === 0);

                                return (
                                    <label
                                        key={report.id}
                                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isUnavailable
                                            ? 'opacity-40 cursor-not-allowed border-[var(--border-subtle)]'
                                            : isSelected
                                                ? 'border-indigo-500 bg-indigo-500/10 shadow-sm'
                                                : 'border-[var(--border-subtle)] hover:border-[var(--text-tertiary)]'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            disabled={isUnavailable}
                                            onChange={() => toggleReport(report.id)}
                                            className="rounded border-gray-400 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                        />
                                        <span className="font-medium text-sm flex-1">{report.label}</span>
                                        {isUnavailable && (
                                            <span className="text-xs text-[var(--text-tertiary)]">No data</span>
                                        )}
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={generating || selected.size === 0 || isLoading}
                        className={`w-full py-4 rounded-lg text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${generating
                            ? 'bg-indigo-400 text-white cursor-wait'
                            : selected.size === 0 || isLoading
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40'
                            }`}
                    >
                        {generating ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Generating Combined PDF…
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Generate Combined PDF ({selected.size} Report{selected.size !== 1 ? 's' : ''})
                            </>
                        )}
                    </button>

                    {status === 'done' && (
                        <p className="text-center text-xs text-emerald-500 mt-4 font-bold flex items-center justify-center gap-2">
                            Combined PDF generated and downloaded successfully
                        </p>
                    )}
                    {status === 'error' && (
                        <p className="text-center text-xs text-red-500 mt-4 font-bold">
                            Error generating combined PDF. Please try again.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
