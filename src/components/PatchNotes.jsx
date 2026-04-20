import React from 'react';
import { useNavigate } from 'react-router-dom';

const PATCH_NOTES = [
    {
        version: "0.4.6",
        date: "2026-04-19",
        title: "GDTF & Multi Select Fixes",
        changes: [
            "Fixture Library Re-enabled – GDTF imports engine reworked.",
            "Multiselect Improvements – Can click and drag for multiple rows, Doubleclick to edit on the table, and other QOL changes.",
            "New Export Menu – Can export instrument data to Eos Patch, Lightwright Import (Untested) or Everything into a CSV."
        ]
    },
    {
        version: "0.4.5",
        date: "2026-04-12",
        title: "Stability & Community",
        changes: [
            "GDTF and MVR import disabled until bugs can be sorted out for the imports.",
            "New Mobile Interface - EXPERIMENTAL - let me know what you think.  There is an option in the settings to turn it off. ",
            "Resolved internal dependency conflicts causing Vite reloading loops.",
        ]
    },
    {
        version: "0.4.4",
        date: "2026-04-12",
        title: "GDTF Specification Rebuild",
        changes: [
            "Groundwork for GDTF integration – Completely rebuilt the GDTF parser to adhere to DIN SPEC 15800 standards.",
            "Address-First Resolution – Optimized attribute grouping and split channel support.",
            "Asset Handling – Improved extraction for fixture thumbnails and wheel/slot visualizations.",
            "Fixed critical module crash during engine refactor.",
        ]
    },
    {
        version: "0.4.3",
        date: "2026-04-06",
        title: "Reporting & MVR Integration",
        changes: [
            "Groundwork for MVR importing – Initial implementation of MVR container parsing and asset extraction.",
            "Unified Print Center – Centralized hub for bundling multiple reports into a single, high-fidelity PDF.",
            "Masonry Magic Sheets – Responsive grid engine with dynamic column spanning and 1/3, 2/3, or Full-page cards.",
            "PDF Infrastructure – Migrated all reports to @react-pdf/renderer for pixel-perfect exports and professional cover pages.",
            "Standardized numerical sorting and persistent layout settings across sessions.",
        ]
    },
    {
        version: "0.4.2",
        date: "2026-02-21",
        title: "Magic Sheet Bug Fixes",
        changes: [
            "Fixed magic sheet rendering bugs.",
        ]
    },
    {
        version: "0.4.1",
        date: "2026-02-19",
        title: "Print Center & Flexible Tracking",
        changes: [
            "New Feature: Print Center – Bundle multiple reports into a single unified PDF with professional cover pages.",
            "New Feature: Enhanced Magic Sheets – better display and ordering, more flexibility options added.",
            "New Feature: Flexible Channel Displays – Choose between Parts (P1), Dots (.1), or Legacy display modes across all reports.",
            "Advanced Logic: Support for multi-cell/sub-fixtures and automatic duplicate merging (2-fers) in Magic Sheets.",
            "PDF Engine: Upgraded to @react-pdf/renderer for pixel-perfect, high-fidelity report exports.",
            "Paperwork Fixes: The Hanging Schedule PDF now correctly respects your column visibility and address formatting settings.",
            "UI Consistency: Standardized 'Print' theme for all reports, ensuring light-mode clarity even when the app is in Dark Mode."
        ]
    },
    {
        version: "0.3.5",
        date: "2026-02-13",
        title: "Integrity & UI Refinements",
        changes: [
            "Data Integrity: Auto-clear EOS targets and GDTF library on New Show/Import.",
            "UI Refinement: Moved Collapse button to Detail Panel header and removed redundant icons.",
            "UI Refinement: Standardized GDTF population button size and Color swatch positioning.",
            "Address Enhancements: Added DMX footprint range display to Schedule list.",
            "Address Enhancements: Consistent Universe Separator behavior across the app.",
            "Bug Fix: Preventing 'Enter' key from prematurely closing the detail panel.",
            "Bug Fix: Resolved issue saving and creating new instruments."
        ]
    },
    {
        version: "0.3.1",
        date: "2026-02-01",
        title: "Open Source & Deployment",
        changes: [
            "Now open source! View on GitHub: https://github.com/kaelenfae/LXLog",
            "New Feature: Power Report for calculating load.",
            "New Feature: DMX Universe View for patch visualization.",
            "New Feature: Fixture Library for managing GDTF definitions.",
            "Switched Netlify deployment to automatic (live) builds.",
            "Major code cleanup and optimization.",
            "Documentation updates and Antigravity acknowledgement."
        ]
    },
    {
        version: "0.3.0",
        date: "2026-01-24",
        title: "EOS Targets & Project Restructure",
        changes: [
            "New EOS Targets Report: View Groups, Presets, and Subs from EOS CSV imports.",
            "Improved EOS CSV Import: Better parsing with UUID validation for accurate target detection.",
            "Import Wizard: Field selection now available for EOS CHANNELS section.",
            "Project licensed under GPLv3 for open-source contributions.",
        ]
    },
    {
        version: "0.2.0",
        date: "2026-01-02",
        title: "Performance & UI Refinements",
        changes: [
            "Bug fixes (mobile layout, smoother scrolling for large shows, UI consistency)",
            "Instrument Schedule: Customizeable Columns and Details Panel",
            "Channel Hookup moved to a Report",
            "Magic Sheet: Added custom drag-and-drop and layout lock",
        ]
    },
    {
        version: "0.1.0",
        date: "2025-12-20",
        title: "Initial Version",
        changes: [
            "Initial release of LXLog.",
            "Instrument Schedule, Channel Hookup, and Detail Views.",
            "Reporting: Patch, Hanging Schedule, Magic Sheet.",
            "Import from EOS CSV, Lightwright Text, and MA2 XML.",
            "Database management: Backup, Restore, Duplicate Removal."
        ]
    }
];

export function PatchNotes() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col h-full bg-[var(--bg-app)] text-[var(--text-primary)] relative overflow-y-auto">
            {/* Toolbar */}
            <div className="h-14 border-b border-[var(--border-subtle)] flex items-center px-6 bg-[var(--bg-app)] justify-between shrink-0 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-1 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--bg-hover)] transition-colors"
                        title="Go Back"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h1 className="text-xl font-bold tracking-tight">Patch Notes</h1>
                </div>
            </div>

            <div className="flex-1 p-8 max-w-4xl mx-auto w-full space-y-8">
                {PATCH_NOTES.map((note, index) => (
                    <div key={note.version} className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] flex items-center justify-between">
                            <h2 className="text-lg font-bold">v{note.version} <span className="font-normal text-[var(--text-tertiary)] mx-2">|</span> {note.title}</h2>
                            <span className="text-sm text-[var(--text-secondary)] font-mono">{note.date}</span>
                        </div>
                        <div className="p-6">
                            <ul className="list-disc list-inside space-y-2 text-[var(--text-secondary)]">
                                {note.changes.map((change, i) => (
                                    <li key={i}>{change}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}

                <div className="text-center text-sm text-[var(--text-tertiary)] pt-8 pb-4">
                    End of Patch Notes
                </div>
            </div>
        </div>
    );
}
