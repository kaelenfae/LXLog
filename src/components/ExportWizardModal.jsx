import React, { useState } from 'react';
import { exportToEosCsv, exportToLightwright, exportToGenericCsv } from '../utils/dataExporters';
import { db } from '../db';

const EXPORT_FORMATS = [
    { id: 'eos', name: 'ETC Eos CSV' },
    { id: 'lw', name: 'Lightwright (TSV)' },
    { id: 'csv', name: 'Generic CSV' }
];

export function ExportWizardModal({ onClose }) {
    const [selectedFormat, setSelectedFormat] = useState('eos');
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            const instruments = await db.instruments.toArray();
            
            switch (selectedFormat) {
                case 'eos':
                    exportToEosCsv(instruments);
                    break;
                case 'lw':
                    exportToLightwright(instruments);
                    break;
                case 'csv':
                    exportToGenericCsv(instruments);
                    break;
                default:
                    break;
            }
            onClose();
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[250] p-4">
            <div className="bg-[var(--bg-panel)] w-full max-w-lg rounded-lg shadow-2xl border border-[var(--border-subtle)] overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="p-4 border-b border-[var(--border-subtle)]">
                    <h3 className="text-lg font-bold">Export Instruments</h3>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                        Select the file format you want to export:
                    </p>
                    <div className="space-y-2 mb-6">
                        {EXPORT_FORMATS.map(fmt => (
                            <label
                                key={fmt.id}
                                className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors ${selectedFormat === fmt.id
                                    ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]'
                                    : 'bg-[var(--bg-card)] border-[var(--border-default)] hover:border-[var(--text-secondary)]'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="exportFormat"
                                    value={fmt.id}
                                    checked={selectedFormat === fmt.id}
                                    onChange={() => setSelectedFormat(fmt.id)}
                                />
                                <div className="font-semibold text-sm">{fmt.name}</div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[var(--border-subtle)] flex justify-between bg-[var(--bg-card)]">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="px-6 py-2 bg-[var(--accent-primary)] text-white rounded text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                    >
                        {exporting ? 'Exporting...' : 'Export'}
                    </button>
                </div>
            </div>
        </div>
    );
}
