import React, { useState, useEffect } from 'react';

// Field mapping for Lightwright text files
const LW_FIELD_MAP = {
    'Channel': { key: 'channel', label: 'Channel' },
    'Dimmer': { key: 'address', label: 'Address' },
    'Address': { key: 'address', label: 'Address' },
    'Instrument Type': { key: 'type', label: 'Type' },
    'Device Type': { key: 'type', label: 'Type' },
    'Wattage': { key: 'watt', label: 'Wattage' },
    'Load': { key: 'watt', label: 'Wattage' },
    'Purpose': { key: 'purpose', label: 'Purpose' },
    'Use': { key: 'purpose', label: 'Purpose' },
    'Position': { key: 'position', label: 'Position' },
    'Unit#': { key: 'unit', label: 'Unit Number' },
    'Color': { key: 'color', label: 'Color' },
    'Gobo': { key: 'gobo', label: 'Gobo' },
    'Template': { key: 'gobo', label: 'Gobo' },
    'Accessories': { key: 'accessory', label: 'Accessory' },
    'Accessory': { key: 'accessory', label: 'Accessory' },
    'Focus Note': { key: 'notes', label: 'Notes' },
    'Focus Notes': { key: 'notes', label: 'Notes' },
    'Circuit Name': { key: 'text3', label: 'Circuit Name' },
    'Circuit#': { key: 'text4', label: 'Circuit Number' }
};

const IMPORT_FORMATS = [
    { id: 'txt', name: 'Lightwright Text (.txt)', ext: '.txt' },
    { id: 'csv', name: 'EOS CSV (.csv)', ext: '.csv' },
    { id: 'ma2', name: 'MA2 XML (.xml)', ext: '.xml' }
];

export function ImportWizardModal({ onClose, onConfirm }) {
    const [step, setStep] = useState(1); // 1: Format, 2: Fields, 3: Mode, 4: Show Info (only for replace mode)
    const [format, setFormat] = useState(null);
    const [file, setFile] = useState(null);
    const [fileContent, setFileContent] = useState(null);
    const [detectedFields, setDetectedFields] = useState([]);
    const [selectedFields, setSelectedFields] = useState({});
    const [importMode, setImportMode] = useState('replace');
    const [error, setError] = useState(null);
    const [showMetadata, setShowMetadata] = useState({
        name: '',
        designer: '',
        venue: '',
        assistant: ''
    });

    // Parse file when content is loaded
    useEffect(() => {
        if (!fileContent || !format) return;

        try {
            if (format === 'txt') {
                // Parse Lightwright text file headers
                const lines = fileContent.split(/\r?\n/);
                if (lines.length < 1) throw new Error("File is empty");

                const headers = lines[0].split('\t').map(h => h.trim());
                const headerIndices = headers.map((h, i) => ({ header: h, index: i })).filter(x => x.header);

                // Check which columns have data by scanning all rows
                const columnDataPresent = {};
                headerIndices.forEach(({ header }) => { columnDataPresent[header] = false; });

                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i];
                    if (!line.trim()) continue;
                    const values = line.split('\t');

                    headerIndices.forEach(({ header, index }) => {
                        const val = values[index]?.trim();
                        if (val) columnDataPresent[header] = true;
                    });
                }

                const fields = headerIndices.map(({ header }) => {
                    const mapped = LW_FIELD_MAP[header];
                    return {
                        originalName: header,
                        mappedKey: mapped ? mapped.key : null,
                        mappedLabel: mapped ? mapped.label : null,
                        isCustom: !mapped,
                        isRequired: header === 'Channel', // Channel is always required
                        hasData: columnDataPresent[header]
                    };
                });

                setDetectedFields(fields);
                // Default: all fields with data selected, empty fields deselected
                const defaultSelected = {};
                fields.forEach(f => { defaultSelected[f.originalName] = f.hasData || f.isRequired; });
                setSelectedFields(defaultSelected);
                setStep(2);
            } else if (format === 'csv') {
                // Parse EOS CSV - look for START_CHANNELS section for instrument field selection
                const lines = fileContent.split(/\r?\n/);
                const startIndex = lines.findIndex(line => line.includes('START_CHANNELS'));
                const endIndex = lines.findIndex(line => line.includes('END_CHANNELS'));

                if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
                    // Found CHANNELS section - parse headers for field selection
                    const headerLine = lines[startIndex + 1];
                    const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                    const headerIndices = headers.map((h, i) => ({ header: h, index: i })).filter(x => x.header);

                    // Check which columns have data by scanning a sample of rows
                    const columnDataPresent = {};
                    headerIndices.forEach(({ header }) => { columnDataPresent[header] = false; });

                    const sampleEnd = Math.min(startIndex + 102, endIndex); // Sample first 100 data rows
                    for (let i = startIndex + 2; i < sampleEnd; i++) {
                        const line = lines[i];
                        if (!line.trim()) continue;
                        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));

                        headerIndices.forEach(({ header, index }) => {
                            const val = values[index]?.trim();
                            if (val) columnDataPresent[header] = true;
                        });
                    }

                    const fields = headerIndices.map(({ header }) => ({
                        originalName: header,
                        mappedKey: header,
                        mappedLabel: header,
                        isCustom: false,
                        isRequired: header === 'CHANNEL',
                        hasData: columnDataPresent[header]
                    }));

                    setDetectedFields(fields);
                    const defaultSelected = {};
                    fields.forEach(f => { defaultSelected[f.originalName] = f.hasData || f.isRequired; });
                    setSelectedFields(defaultSelected);
                    setStep(2);
                } else {
                    // No CHANNELS section found - this is a TARGETS-only import (Groups/Presets/Subs)
                    // Skip to mode selection
                    setStep(3);
                }
            } else {
                // For XML formats, skip field selection and go to mode
                setStep(3);
            }
        } catch (err) {
            setError(`Failed to parse file: ${err.message}`);
        }
    }, [fileContent, format]);

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setError(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            setFileContent(event.target.result);
        };
        reader.onerror = () => {
            setError("Failed to read file");
        };
        reader.readAsText(selectedFile);
    };

    const toggleField = (fieldName) => {
        const field = detectedFields.find(f => f.originalName === fieldName);
        if (field?.isRequired) return; // Can't deselect required fields

        setSelectedFields(prev => ({
            ...prev,
            [fieldName]: !prev[fieldName]
        }));
    };

    const selectAll = () => {
        const all = {};
        detectedFields.forEach(f => { all[f.originalName] = true; });
        setSelectedFields(all);
    };

    const deselectAll = () => {
        const none = {};
        detectedFields.forEach(f => {
            none[f.originalName] = f.isRequired; // Keep required fields
        });
        setSelectedFields(none);
    };

    const handleConfirm = () => {
        const selectedFieldNames = Object.entries(selectedFields)
            .filter(([_, selected]) => selected)
            .map(([name]) => name);

        onConfirm({
            format,
            file,
            fileContent,
            selectedFields: selectedFieldNames,
            merge: importMode === 'merge',
            showMetadata: importMode === 'replace' ? showMetadata : null
        });
    };

    const getAcceptedExtensions = () => {
        if (!format) return '';
        const formatInfo = IMPORT_FORMATS.find(f => f.id === format);
        return formatInfo ? formatInfo.ext : '';
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg-panel)] w-full max-w-xl rounded-lg shadow-2xl border border-[var(--border-subtle)] overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                    <h3 className="text-lg font-bold">Import Instruments</h3>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <span className={step >= 1 ? 'text-[var(--accent-primary)]' : ''}>Format</span>
                        <span>→</span>
                        <span className={step >= 2 ? 'text-[var(--accent-primary)]' : ''}>Fields</span>
                        <span>→</span>
                        <span className={step >= 3 ? 'text-[var(--accent-primary)]' : ''}>Mode</span>
                        {importMode === 'replace' && (
                            <>
                                <span>→</span>
                                <span className={step >= 4 ? 'text-[var(--accent-primary)]' : ''}>Show Info</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Step 1: Format Selection */}
                    {step === 1 && (
                        <div>
                            <p className="text-sm text-[var(--text-secondary)] mb-4">
                                Select the file format you want to import:
                            </p>
                            <div className="space-y-2 mb-6">
                                {IMPORT_FORMATS.map(fmt => (
                                    <label
                                        key={fmt.id}
                                        className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors ${format === fmt.id
                                            ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]'
                                            : 'bg-[var(--bg-card)] border-[var(--border-default)] hover:border-[var(--text-secondary)]'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="format"
                                            value={fmt.id}
                                            checked={format === fmt.id}
                                            onChange={() => setFormat(fmt.id)}
                                        />
                                        <div>
                                            <div className="font-semibold text-sm">{fmt.name}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>

                            {format && (
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Select File</label>
                                    <input
                                        type="file"
                                        accept={getAcceptedExtensions()}
                                        onChange={handleFileSelect}
                                        className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-[var(--accent-primary)] file:text-white file:cursor-pointer hover:file:bg-[var(--accent-hover)]"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Field Selection */}
                    {step === 2 && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm text-[var(--text-secondary)]">
                                    Select which fields to import from <strong>{file?.name}</strong>:
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={selectAll}
                                        className="text-xs text-[var(--accent-primary)] hover:underline"
                                    >
                                        Select All
                                    </button>
                                    <span className="text-[var(--text-secondary)]">|</span>
                                    <button
                                        onClick={deselectAll}
                                        className="text-xs text-[var(--accent-primary)] hover:underline"
                                    >
                                        Deselect All
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1 max-h-64 overflow-y-auto border border-[var(--border-default)] rounded p-2 bg-[var(--bg-card)]">
                                {detectedFields.map(field => (
                                    <label
                                        key={field.originalName}
                                        className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors hover:bg-[var(--bg-panel)] ${field.isRequired ? 'opacity-70' : ''
                                            } ${!field.hasData && !field.isRequired ? 'opacity-50' : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedFields[field.originalName] || false}
                                            onChange={() => toggleField(field.originalName)}
                                            disabled={field.isRequired}
                                            className="rounded border-gray-300 text-[var(--accent-primary)]"
                                        />
                                        <div className="flex-1 flex items-center justify-between">
                                            <span className={`text-sm font-medium ${!field.hasData ? 'text-[var(--text-secondary)]' : ''}`}>
                                                {field.originalName}
                                                {!field.hasData && (
                                                    <span className="ml-2 text-xs text-gray-500 italic">(no data)</span>
                                                )}
                                            </span>
                                            <span className="text-xs text-[var(--text-secondary)]">
                                                {field.isRequired ? (
                                                    <span className="text-amber-500">(required)</span>
                                                ) : field.isCustom ? (
                                                    <span className="text-indigo-400">→ Custom Field</span>
                                                ) : (
                                                    <span>→ {field.mappedLabel}</span>
                                                )}
                                            </span>
                                        </div>
                                    </label>
                                ))}
                            </div>

                            <p className="text-xs text-[var(--text-secondary)] mt-3">
                                {Object.values(selectedFields).filter(Boolean).length} of {detectedFields.length} fields selected
                            </p>
                        </div>
                    )}

                    {/* Step 3: Import Mode */}
                    {step === 3 && (
                        <div>
                            <p className="text-sm text-[var(--text-secondary)] mb-4">
                                How would you like to import <strong>{file?.name}</strong>?
                            </p>
                            <div className="space-y-3">
                                <label className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors ${importMode === 'replace'
                                    ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]'
                                    : 'bg-[var(--bg-card)] border-[var(--border-default)] hover:border-[var(--text-secondary)]'
                                    }`}>
                                    <input
                                        type="radio"
                                        name="importMode"
                                        value="replace"
                                        checked={importMode === 'replace'}
                                        onChange={() => setImportMode('replace')}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="font-bold text-sm">Create New Schedule</div>
                                        <div className="text-xs text-[var(--text-secondary)]">Replaces all existing instrument data with the new file.</div>
                                    </div>
                                </label>

                                <label className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors ${importMode === 'merge'
                                    ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]'
                                    : 'bg-[var(--bg-card)] border-[var(--border-default)] hover:border-[var(--text-secondary)]'
                                    }`}>
                                    <input
                                        type="radio"
                                        name="importMode"
                                        value="merge"
                                        checked={importMode === 'merge'}
                                        onChange={() => setImportMode('merge')}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="font-bold text-sm">Merge with Existing</div>
                                        <div className="text-xs text-[var(--text-secondary)]">Updates existing channels and adds new ones. Keeps existing data if not overwritten.</div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Show Information (only for replace mode) */}
                    {step === 4 && (
                        <div>
                            <p className="text-sm text-[var(--text-secondary)] mb-4">
                                Enter your show information:
                            </p>
                            <div className="space-y-4">
                                <label className="block">
                                    <span className="text-xs text-[var(--text-secondary)]">Show Name</span>
                                    <input
                                        type="text"
                                        value={showMetadata.name}
                                        onChange={e => setShowMetadata({ ...showMetadata, name: e.target.value })}
                                        placeholder="My Show"
                                        className="w-full mt-1 bg-[var(--bg-app)] border border-[var(--border-default)] rounded px-3 py-2 text-sm focus:border-[var(--accent-primary)] focus:outline-none transition-colors"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-xs text-[var(--text-secondary)]">Designer</span>
                                    <input
                                        type="text"
                                        value={showMetadata.designer}
                                        onChange={e => setShowMetadata({ ...showMetadata, designer: e.target.value })}
                                        placeholder="Lighting Designer"
                                        className="w-full mt-1 bg-[var(--bg-app)] border border-[var(--border-default)] rounded px-3 py-2 text-sm focus:border-[var(--accent-primary)] focus:outline-none transition-colors"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-xs text-[var(--text-secondary)]">Venue</span>
                                    <input
                                        type="text"
                                        value={showMetadata.venue}
                                        onChange={e => setShowMetadata({ ...showMetadata, venue: e.target.value })}
                                        placeholder="Theater Name"
                                        className="w-full mt-1 bg-[var(--bg-app)] border border-[var(--border-default)] rounded px-3 py-2 text-sm focus:border-[var(--accent-primary)] focus:outline-none transition-colors"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-xs text-[var(--text-secondary)]">Assistant</span>
                                    <input
                                        type="text"
                                        value={showMetadata.assistant}
                                        onChange={e => setShowMetadata({ ...showMetadata, assistant: e.target.value })}
                                        placeholder="Assistant Designer"
                                        className="w-full mt-1 bg-[var(--bg-app)] border border-[var(--border-default)] rounded px-3 py-2 text-sm focus:border-[var(--accent-primary)] focus:outline-none transition-colors"
                                    />
                                </label>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] mt-4 italic">
                                You can update this information later in Settings.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[var(--border-subtle)] flex justify-between bg-[var(--bg-card)]">
                    <button
                        onClick={step > 1 ? () => setStep(step - 1) : onClose}
                        className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
                    >
                        {step > 1 ? '← Back' : 'Cancel'}
                    </button>

                    <div className="flex gap-3">
                        {step === 2 && (
                            <button
                                onClick={() => setStep(3)}
                                className="px-6 py-2 bg-[var(--accent-primary)] text-white rounded text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors shadow-lg shadow-indigo-500/20"
                            >
                                Continue →
                            </button>
                        )}
                        {step === 3 && (
                            <button
                                onClick={() => {
                                    if (importMode === 'replace') {
                                        setStep(4); // Go to show info step
                                    } else {
                                        handleConfirm(); // Merge mode - import directly
                                    }
                                }}
                                className="px-6 py-2 bg-[var(--accent-primary)] text-white rounded text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors shadow-lg shadow-indigo-500/20"
                            >
                                {importMode === 'replace' ? 'Continue →' : 'Import'}
                            </button>
                        )}
                        {step === 4 && (
                            <button
                                onClick={handleConfirm}
                                className="px-6 py-2 bg-[var(--accent-primary)] text-white rounded text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors shadow-lg shadow-indigo-500/20"
                            >
                                Import
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
